import { OrderStatus } from "@app/shared";
import { INestApplication } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { Test, TestingModule } from "@nestjs/testing";
import { InventoryModule } from "apps/inventory/src/inventory.module";
import { OrderModule } from "apps/order/src/order.module";
import { OrderService } from "apps/order/src/order.service";
import { ConsulService } from "apps/infrastructure/consul/consul.service";
import request from "supertest";

const mockConsulService = {
  onModuleInit: jest.fn(),
  onModuleDestroy: jest.fn(),
  discoverService: jest.fn(),
};

describe('Order and Inventory Services Integration Test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule
    ({
    imports: [
      OrderModule,
      InventoryModule,
      ClientsModule.register([
      {
        name: 'ORDER_SERVICE',
        transport: Transport.TCP,
        options: { port: 8001 },
      },
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.TCP,
        options: { port: 8002 },
      },
      ]),
    ],
    })
    .overrideProvider(ConsulService)
    .useValue(mockConsulService)
    .compile();

    app = module.createNestApplication();

    app.connectMicroservice({
      transport: Transport.TCP,
      options: { port: 8001 },
    });

    app.connectMicroservice({
      transport: Transport.TCP,
      options: { port: 8002 },
    });

    await app.startAllMicroservices();
    await app.init();

  });

  afterAll(async () => {
    await app.close();
  });

  it('should create an order and update the inventory accordingly', async () => {
    // Set up spy before triggering the flow so we don't race
    // against the async TCP round-trip
    const orderService = app.get<OrderService>(OrderService);
    const handleOrderProcessedSpy = jest.spyOn(
      orderService, 'handleOrderProcessed'
    );

    // Step 1: Create an order by making a POST request to
    // the Order Service. This also internally emits ORDER_CREATED
    // to the Inventory Service over TCP.
    const createOrderResponse = await request(app.getHttpServer())
    .post('/orders')
    .send({
      product: 'Laptop',
      quantity: 2,
      userId: 'user123'
    })
    .expect(201);

    const order = createOrderResponse.body;
    expect(order.status).toBe(OrderStatus.PENDING);

    // Step 2: Wait for the full async round-trip:
    //   OrderService → (ORDER_CREATED) → InventoryService
    //   InventoryService → (ORDER_PROCESSED) → OrderService
    const inventoryProcessedPayload = {
      success: true,
      message: 'Order processed successfully',
      orderId: order.id,
    };
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify OrderService received the processed result
    // from InventoryService
    expect(handleOrderProcessedSpy)
    .toHaveBeenCalledWith(inventoryProcessedPayload);

    // Step 3: Verify that the Order Service updates the
    // order status to COMPLETED
    const updatedOrder = await request(app.getHttpServer())
    .get(`/orders/${order.id}`)
    .expect(200);
    expect(updatedOrder.body.status)
    .toBe(OrderStatus.COMPLETED);
  });
});