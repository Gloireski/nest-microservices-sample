// commands/update-inventory.command.ts

// A Command is an intent: "please do this".
// Unlike an Event ("this happened"), a Command can be rejected.
// The Saga will dispatch this command after it receives OrderCreatedEvent.
export class UpdateInventoryCommand {
  constructor(
    public readonly orderId: string,
    public readonly product: string,
    public readonly quantity: number,
  ) {}
}
