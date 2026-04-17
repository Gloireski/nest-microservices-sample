import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { OutboxService } from './outbox.service';
import { OrderCreatedEvent } from '../events/order-created.event';
import { EVENTS } from '@app/constants';

@Injectable()
export class OutboxProcessor implements OnModuleInit {
  // Polling interval in ms — 5 seconds for demo, typically 1-10s in production.
  private readonly POLL_INTERVAL = 5000;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly eventBus: EventBus,
  ) {}

  // Starts the polling loop when the module is ready.
  onModuleInit() {
    console.log('[OutboxProcessor] Starting polling loop...');
    setInterval(() => this.processPendingEvents(), this.POLL_INTERVAL);
  }

  private async processPendingEvents(): Promise<void> {
    const pending = this.outboxService.getPendingEvents();
    if (!pending.length) return;

    console.log(`[OutboxProcessor] Processing ${pending.length} pending event(s)...`);

    for (const outboxEvent of pending) {
      try {
        this.publishEvent(outboxEvent.eventType, outboxEvent.payload);
        this.outboxService.markProcessed(outboxEvent.id);
      } catch (err: any) {
        // Don't crash the loop — mark failed and move to next
        console.error(`[OutboxProcessor] Failed to publish event ${outboxEvent.id}:`, err.message);
        this.outboxService.markFailed(outboxEvent.id);
      }
    }
  }

  // Maps the stored eventType string back to the correct CQRS Event class.
  // In production this could be a registry/map instead of a switch.
  private publishEvent(eventType: string, payload: Record<string, any>): void {
    switch (eventType) {
      case EVENTS.ORDER_CREATED:
        this.eventBus.publish(
          new OrderCreatedEvent(payload.orderId, payload.product, payload.quantity),
        );
        break;
      default:
        console.warn(`[OutboxProcessor] Unknown event type: ${eventType}`);
    }
  }
}
