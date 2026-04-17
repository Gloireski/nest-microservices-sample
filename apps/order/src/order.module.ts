// order/order.module.ts

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bull';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ConsulModule } from 'apps/infrastructure/consul/consul.module';
import { SERVICE_TOKENS } from '@app/constants/tokens';
import { OrderProcessor } from './queues/order.processor';

// Command handlers — each handles one Command class
import { UpdateInventoryHandler } from './commands/handlers/update-inventory.handler';

// Event handlers — each handles one Event class (compensation logic lives here)
import { OrderCancelledHandler } from './events/handlers/order-cancelled.handler';

// Sagas — coordinate multi-step flows across services
import { OrderSaga } from './sagas/order.saga';

// Outbox pattern — persists events before publishing
import { OutboxService } from './outbox/outbox.service';
import { OutboxProcessor } from './outbox/outbox.processor';

// Gather all handlers and sagas for clean registration
const CommandHandlers = [UpdateInventoryHandler];
const EventHandlers   = [OrderCancelledHandler];
const Sagas           = [OrderSaga];

@Module({
  imports: [
    CqrsModule,

    // Bull queue backed by Redis.
    // In production: use BullModule.forRootAsync() to load Redis config from env.
    BullModule.forRoot({
      redis: { host: 'localhost', port: 6379 },
    }),
    // Register the specific queue — name must match @Processor('order_queue')
    BullModule.registerQueue({ name: 'order_queue' }),

    ConsulModule.register({
      serviceId:   'order-service',
      serviceName: 'order-service',
      serviceHost: 'localhost',
      servicePort: 3001,
    }),

    ClientsModule.register([
      {
        name: SERVICE_TOKENS.inventory,
        transport: Transport.TCP,
        options: { port: 8002 },
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OutboxService,
    OutboxProcessor,
    OrderProcessor,    // Bull worker — processes jobs from order_queue
    ...CommandHandlers,
    ...EventHandlers,
    ...Sagas,
  ],
})
export class OrderModule {}
