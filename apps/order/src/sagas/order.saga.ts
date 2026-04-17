// sagas/order.saga.ts

import { Injectable } from '@nestjs/common';
import { Saga, ICommand, ofType } from '@nestjs/cqrs';
import { Observable, EMPTY } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { OrderCreatedEvent } from '../events/order-created.event';
import { UpdateInventoryCommand } from '../commands/update-inventory.command';

@Injectable()
export class OrderSaga {
  // @Saga() receives the full EventBus stream and must return an Observable<ICommand>.
  // Every command emitted by this observable is automatically dispatched by the CqrsModule.
  //
  // Think of it as: "whenever THIS event happens, dispatch THAT command".
  @Saga()
  orderCreated = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      // ofType() filters the stream — only OrderCreatedEvent passes through.
      // All other events on the EventBus are ignored here.
      ofType(OrderCreatedEvent),

      // map() transforms the event into a command.
      // The CqrsModule will automatically call CommandBus.execute() with this command.
      map(
        (event: OrderCreatedEvent) =>
          new UpdateInventoryCommand(
            event.orderId,
            event.product,
            event.quantity,
          ),
      ),

      // catchError handles unexpected errors in the stream itself (not in the handler).
      // Returning EMPTY keeps the saga alive — it won't crash on a single bad event.
      catchError((err) => {
        console.error('[Saga] Unexpected error in orderCreated saga:', err);
        return EMPTY;
      }),
    );
  };
}
