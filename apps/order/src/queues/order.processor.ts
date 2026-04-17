import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { OrderCreatedEvent } from '../events/order-created.event';
import { OrderCancelledEvent } from '../events/order-cancelled.event';
import { SERVICE_TOKENS } from '@app/constants/tokens';

export interface OrderJobData {
  orderId: string;
  product: string;
  quantity: number;
}

// @Processor links this class to the 'order_queue' Bull queue.
// NestJS will automatically spin up worker(s) that consume jobs from this queue.
// Jobs are processed in the background — the HTTP request that enqueued the job
// has already returned a response by the time this runs.
@Processor('order_queue')
export class OrderProcessor {
  constructor(
    private readonly eventBus: EventBus,
    @Inject(SERVICE_TOKENS.inventory) private readonly inventoryClient: ClientProxy,
  ) {}

  // @Process('process_order') handles jobs of type 'process_order'.
  // A queue can have multiple job types, each with its own @Process handler.
  @Process('process_order')
  async handleOrder(job: Job<OrderJobData>): Promise<void> {
    const { orderId, product, quantity } = job.data;

    console.log(`[OrderProcessor] Processing job ${job.id} for order ${orderId}`);

    // Bull automatically retries this if it throws — configured in addJob() options.
    // This is the long-running work that would have blocked the HTTP thread before.
    try {
      const result = await firstValueFrom(
        this.inventoryClient.send<{ success: boolean; message: string }>(
          'update_inventory',
          { orderId, product, quantity },
        ),
      );

      if (result.success) {
        console.log(`[OrderProcessor] Job ${job.id} completed — inventory updated for order ${orderId}`);
        this.eventBus.publish(new OrderCreatedEvent(orderId, product, quantity));
      } else {
        console.warn(`[OrderProcessor] Job ${job.id} — inventory failed: ${result.message}`);
        this.eventBus.publish(new OrderCancelledEvent(orderId, result.message));
      }
    } catch (err: any) {
      console.error(`[OrderProcessor] Job ${job.id} failed:`, err.message);
      // Re-throwing causes Bull to retry the job (up to the configured attempts)
      throw err;
    }
  }
}
