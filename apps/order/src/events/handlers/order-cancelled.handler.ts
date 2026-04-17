// events/handlers/order-cancelled.handler.ts

import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCancelledEvent } from '../order-cancelled.event';
import { OrderService } from '../../order.service';

// @EventsHandler listens for OrderCancelledEvent on the CQRS EventBus.
// This is the COMPENSATION step: if inventory failed, we roll back by
// marking the order as CANCELLED in our local state.
@EventsHandler(OrderCancelledEvent)
export class OrderCancelledHandler implements IEventHandler<OrderCancelledEvent> {
  constructor(private readonly orderService: OrderService) {}

  handle(event: OrderCancelledEvent): void {
    console.log(
      `[Compensation] Cancelling order ${event.orderId} — reason: ${event.reason}`,
    );
    // Update local order status to CANCELLED (undo the createOrder step)
    this.orderService.cancelOrder(event.orderId, event.reason);
  }
}
