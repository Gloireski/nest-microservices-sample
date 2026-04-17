// inventory/inventory.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { EVENTS } from '@app/constants';
import { OrderStatus } from '@app/shared';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }
  @Get()
  getHello(): string {
    return "Hello";
  }

  @Get('products')
  getAllProducts() {
    return this.inventoryService.getAllProducts();
  }

  // @EventPattern = fire-and-forget (original flow, kept intact)
  @EventPattern(EVENTS.ORDER_CREATED)
  handleOrderCreated(data: any) {
    this.inventoryService.handleOrderCreated(data);
  }

  // @MessagePattern = request-response: the caller (UpdateInventoryHandler) awaits a reply.
  // This is what makes the Saga work — it needs to KNOW if the update succeeded or failed
  // so it can trigger compensation (OrderCancelledEvent) when necessary.
  @MessagePattern('update_inventory')
  handleUpdateInventory(
    @Payload() data: { orderId: string; product: string; quantity: number },
  ): { success: boolean; message: string } {
    const { orderId, product, quantity } = data;
    const item = this.inventoryService
      .getAllProducts()
      .find((i) => i.name === product);

    if (!item) {
      return { success: false, message: `Product "${product}" not found` };
    }
    if (item.quantity < quantity) {
      return { success: false, message: `Insufficient stock for "${product}"` };
    }

    // Delegate to service — updateInventory throws for productId 4 (simulated failure)
    try {
      this.inventoryService.updateInventory(item.id, quantity);
      console.log(`[Inventory] Stock updated for order ${orderId}`);
      return { success: true, message: 'Inventory updated' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
  
  // Processes a batch of orders in a single TCP call.
  // Each item in the batch is processed sequentially inside the handler.
  // One network round-trip instead of N — this is the performance gain.
  @MessagePattern('update_inventory_batch')
  handleUpdateInventoryBatch(
    @Payload() orders: { id: string; product: string; quantity: number }[],
  ): { processed: number; failed: number } {
    let processed = 0;
    let failed = 0;

    for (const order of orders) {
      const item = this.inventoryService
        .getAllProducts()
        .find((i) => i.name === order.product);

      if (!item || item.quantity < order.quantity) {
        failed++;
        continue;
      }

      try {
        this.inventoryService.updateInventory(item.id, order.quantity);
        processed++;
      } catch {
        failed++;
      }
    }

    console.log(`[Inventory] Batch processed: ${processed} ok, ${failed} failed`);
    return { processed, failed };
  }

  @Post('add-product')
  addProduct(@Body() product: any) {
    return this.inventoryService.addProduct(product);
  }

  @Get('process-order')
  async processOrder() {
    const order = {
      id: '1',
      product: 'Laptop',
      quantity: 1,
      name: 'Joseph P',
      price: 100,
      status: OrderStatus.PENDING
  };
    return this.inventoryService.processOrder(order);
  }

}
