// order/order.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CreateOrderInput } from './dto/create-order.dto';
import { Order, OrderStatus, OrderProcessPayload } from '@app/shared';
import { OrderCreatedEvent } from './events/order-created.event';
import { OutboxService } from './outbox/outbox.service';
import { EVENTS } from '@app/constants';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICE_TOKENS } from '@app/constants/tokens';
import { firstValueFrom } from 'rxjs';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class OrderService {
  constructor(
    private readonly eventBus: EventBus,
    private readonly outboxService: OutboxService,
    @Inject(SERVICE_TOKENS.inventory) private readonly inventoryClient: ClientProxy,
    // Inject the Bull queue — used to enqueue background jobs
    @InjectQueue('order_queue') private readonly orderQueue: Queue,
  ) {}

  // In-memory storage for demo purposes
  private orders: Order[] = [];

  getHello(): string {
    return 'Hello World! -- Order Service';
  }

  createOrder(createOrderInput: CreateOrderInput): Order {
    const order: Order = {
      ...createOrderInput,
      id: `${this.orders.length + 1}`,
      status: OrderStatus.PENDING,
    };
    this.orders.push(order);
    console.log('[OrderService] Order created:', order);

    // OUTBOX PATTERN:
    // Instead of publishing directly to EventBus (which could be lost on crash),
    // we save the event to the outbox first.
    // OutboxProcessor will pick it up and publish it within POLL_INTERVAL seconds.
    // In production: this saveEvent() call happens in the SAME DB transaction as orders.push().
    this.outboxService.saveEvent(EVENTS.ORDER_CREATED, {
      orderId: order.id,
      product: order.product,
      quantity: order.quantity,
    });

    return order;
  }

  findOne(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  // Called by OrderCancelledHandler as the COMPENSATION step.
  // Rolls back the order status when inventory update fails.
  cancelOrder(orderId: string, reason: string): void {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = OrderStatus.CANCELLED;
      console.log(`[OrderService] Order ${orderId} cancelled — ${reason}`);
    }
  }

  // ─── ASYNC QUEUE: enqueue instead of processing synchronously ───────────────
  // The HTTP request returns immediately with the order in PENDING status.
  // OrderProcessor picks up the job from Redis and processes it in the background.
  // Options:
  //   attempts: retry up to 3 times if the job throws
  //   backoff:  wait 2s between retries (exponential possible too)
  //   removeOnComplete: keep the last 100 completed jobs for inspection
  async enqueueOrder(createOrderInput: CreateOrderInput): Promise<Order> {
    const order: Order = {
      ...createOrderInput,
      id: `q-${this.orders.length + 1}`,
      status: OrderStatus.PENDING,
    };
    this.orders.push(order);

    const job = await this.orderQueue.add(
      'process_order',           // job type — matches @Process('process_order')
      { orderId: order.id, product: order.product, quantity: order.quantity },
      { attempts: 3, backoff: 2000, removeOnComplete: 100 },
    );

    console.log(`[OrderService] Order ${order.id} enqueued as job ${job.id}`);
    return order; // returns immediately — job runs in background
  }

  // ─── STRESS TEST: one TCP call per order ────────────────────────────────────
  // Sends each order individually to InventoryService.
  // With 1000 orders this means 1000 TCP round-trips — slow by design.
  async stressTestNoBatch(count: number): Promise<{ duration: number; orders: number }> {
    const start = Date.now();
    const products = ['Laptop', 'Mouse', 'Keyboard'];

    for (let i = 0; i < count; i++) {
      const order: Order = {
        id: `stress-${i + 1}`,
        name: `Stress User ${i + 1}`,
        product: products[i % products.length],
        price: 100,
        quantity: 1,
        status: OrderStatus.PENDING,
      };
      this.orders.push(order);

      // One TCP call per order — this is the bottleneck we're demonstrating
      await firstValueFrom(
        this.inventoryClient.send<{ success: boolean }>('update_inventory', {
          orderId: order.id,
          product: order.product,
          quantity: order.quantity,
        }),
      ).catch(() => null); // ignore failures in stress test
    }

    return { duration: Date.now() - start, orders: count };
  }

  // ─── STRESS TEST: batched TCP calls ─────────────────────────────────────────
  // Groups orders into chunks and sends each chunk in a single TCP call.
  // 1000 orders with batchSize=100 → 10 TCP calls instead of 1000.
  async stressTestWithBatch(
    count: number,
    batchSize: number = 100,
  ): Promise<{ duration: number; orders: number; batches: number }> {
    const start = Date.now();
    const products = ['Laptop', 'Mouse', 'Keyboard'];

    // Build all orders first
    const orders: Order[] = Array.from({ length: count }, (_, i) => ({
      id: `batch-${i + 1}`,
      name: `Batch User ${i + 1}`,
      product: products[i % products.length],
      price: 100,
      quantity: 1,
      status: OrderStatus.PENDING,
    }));
    this.orders.push(...orders);

    // Slice into chunks and send each chunk as ONE TCP call
    const batches: Order[][] = [];
    for (let i = 0; i < orders.length; i += batchSize) {
      batches.push(orders.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await firstValueFrom(
        this.inventoryClient.send<{ processed: number }>('update_inventory_batch', batch),
      ).catch(() => null);
    }

    return { duration: Date.now() - start, orders: count, batches: batches.length };
  }

  // Still used by the existing TCP EventPattern flow (ORDER_PROCESSED from inventory)
  handleOrderProcessed(data: OrderProcessPayload): void {
    const order = this.orders.find((o) => o.id === data.orderId);
    if (order) {
      order.status = data.success ? OrderStatus.COMPLETED : OrderStatus.CANCELLED;
      console.log('[OrderService] Order status updated:', order);
    } else {
      console.log('[OrderService] Order not found:', data.orderId);
    }
  }
}
