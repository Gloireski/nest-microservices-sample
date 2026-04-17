// events/order-created.event.ts

// An Event represents something that already happened.
// The CQRS EventBus broadcasts it to all listeners (sagas, event handlers).
// We carry the full order data so sagas/handlers have everything they need.
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly product: string,
    public readonly quantity: number,
  ) {}
}
