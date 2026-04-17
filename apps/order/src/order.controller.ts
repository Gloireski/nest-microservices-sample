// order.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderInput } from './dto/create-order.dto';
import { Order } from '@app/shared';
import type { OrderProcessPayload } from '@app/shared';
import { EventPattern } from '@nestjs/microservices';
import { EVENTS } from '@app/constants';
import { OutboxService } from './outbox/outbox.service';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly outboxService: OutboxService,
  ) {}

  @Get()
  getHello(): string {
    return this.orderService.getHello();
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // Debug endpoint — lets you inspect the outbox table state
  @Get('outbox')
  getOutbox() {
    return this.outboxService.getAllEvents();
  }

  @EventPattern(EVENTS.ORDER_PROCESSED)
  async handleOrderProcessed(data: OrderProcessPayload) {
    this.orderService.handleOrderProcessed(data);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Order | undefined {
    return this.orderService.findOne(id);
  }

  @Post()
  createOrder(@Body() createOrderInput: CreateOrderInput): Order {
    return this.orderService.createOrder(createOrderInput);
  }

  // Async variant — returns immediately with PENDING order.
  // The actual inventory update happens in the background via Bull/Redis.
  // POST /orders/async
  @Post('async')
  async createOrderAsync(@Body() createOrderInput: CreateOrderInput) {
    const order = await this.orderService.enqueueOrder(createOrderInput);
    return {
      message: 'Order accepted and queued for processing',
      order,
    };
  }

  // Sends each order as a separate TCP call — demonstrates the bottleneck
  // POST /orders/stress-test  { "count": 100 }
  @Post('stress-test')
  async stressTest(@Body('count') count: number = 100) {
    const result = await this.orderService.stressTestNoBatch(count);
    return {
      mode: 'no-batching',
      ...result,
      avgPerOrder: `${(result.duration / result.orders).toFixed(2)}ms`,
    };
  }

  // Sends orders in batches — fewer TCP calls, much faster
  // POST /orders/stress-test-batch  { "count": 100, "batchSize": 10 }
  @Post('stress-test-batch')
  async stressTestBatch(
    @Body('count') count: number = 100,
    @Body('batchSize') batchSize: number = 10,
  ) {
    const result = await this.orderService.stressTestWithBatch(count, batchSize);
    return {
      mode: 'batching',
      ...result,
      avgPerBatch: `${(result.duration / result.batches).toFixed(2)}ms`,
    };
  }
}
