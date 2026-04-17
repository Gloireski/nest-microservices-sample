import { Injectable } from '@nestjs/common';
import { OutboxEvent, OutboxStatus } from '@app/shared';
import { randomUUID } from 'crypto';

// In a real app this would be a TypeORM/Prisma repository hitting a DB table.
// Here we use in-memory to keep the focus on the pattern itself.
@Injectable()
export class OutboxService {
  private outbox: OutboxEvent[] = [];

  // Called inside createOrder() — persisted atomically with the order.
  // In production: same DB transaction as the order INSERT.
  saveEvent(eventType: string, payload: Record<string, any>): OutboxEvent {
    const event: OutboxEvent = {
      id: randomUUID(),
      eventType,
      payload,
      status: OutboxStatus.PENDING,
      createdAt: new Date(),
      retries: 0,
    };
    this.outbox.push(event);
    console.log(`[Outbox] Event saved: ${eventType} (id=${event.id})`);
    return event;
  }

  // OutboxProcessor polls this to get what needs publishing.
  getPendingEvents(): OutboxEvent[] {
    return this.outbox.filter((e) => e.status === OutboxStatus.PENDING);
  }

  markProcessed(id: string): void {
    const event = this.outbox.find((e) => e.id === id);
    if (event) {
      event.status = OutboxStatus.PROCESSED;
      event.processedAt = new Date();
      console.log(`[Outbox] Event processed: ${event.eventType} (id=${id})`);
    }
  }

  markFailed(id: string): void {
    const event = this.outbox.find((e) => e.id === id);
    if (event) {
      event.retries += 1;
      // Give up after 5 retries
      if (event.retries >= 5) {
        event.status = OutboxStatus.FAILED;
        console.error(`[Outbox] Event permanently failed after ${event.retries} retries: ${event.eventType} (id=${id})`);
      } else {
        console.warn(`[Outbox] Event retry ${event.retries}/5: ${event.eventType} (id=${id})`);
      }
    }
  }

  // For inspection/debugging
  getAllEvents(): OutboxEvent[] {
    return this.outbox;
  }
}
