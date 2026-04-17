// commands/handlers/update-inventory.handler.ts

import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { UpdateInventoryCommand } from '../update-inventory.command';
import { OrderCancelledEvent } from '../../events/order-cancelled.event';
import { SERVICE_TOKENS } from '@app/constants/tokens';

// @CommandHandler links this class to UpdateInventoryCommand.
// When CommandBus.execute(new UpdateInventoryCommand(...)) is called,
// this handler runs.
@CommandHandler(UpdateInventoryCommand)
export class UpdateInventoryHandler
  implements ICommandHandler<UpdateInventoryCommand>
{
  constructor(
    // Inject the TCP client pointing to the Inventory microservice
    @Inject(SERVICE_TOKENS.inventory) private inventoryClient: ClientProxy,

    // EventBus lets us publish compensation events if something fails
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateInventoryCommand): Promise<void> {
    const { orderId, product, quantity } = command;

    try {
      // send() is request-response (unlike emit() which is fire-and-forget).
      // We NEED a response here to know if inventory update succeeded or failed.
      // The Inventory service must have a @MessagePattern('update_inventory') handler.
      const result = await firstValueFrom(
        this.inventoryClient.send<{ success: boolean; message: string }>(
          'update_inventory',
          { orderId, product, quantity },
        ),
      );

      if (!result.success) {
        // Inventory update failed (e.g. out of stock) — trigger compensation
        console.log(`[Saga] Inventory update failed for order ${orderId}: ${result.message}`);
        this.eventBus.publish(new OrderCancelledEvent(orderId, result.message));
      } else {
        console.log(`[Saga] Inventory updated successfully for order ${orderId}`);
      }
    } catch (err: any) {
      // Network/timeout error — also trigger compensation
      console.error(`[Saga] Inventory service unreachable for order ${orderId}:`, err.message);
      this.eventBus.publish(
        new OrderCancelledEvent(orderId, 'Inventory service unavailable'),
      );
    }
  }
}
