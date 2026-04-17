// events/order-cancelled.event.ts

// This is the COMPENSATION event — published when inventory update fails.
// In a Saga, compensation = undoing a previous step to restore consistency.
// Here: order was created (step 1), inventory failed (step 2) → cancel order (rollback step 1).
export class OrderCancelledEvent {
  constructor(
    public readonly orderId: string,
    public readonly reason: string,
  ) {}
}
