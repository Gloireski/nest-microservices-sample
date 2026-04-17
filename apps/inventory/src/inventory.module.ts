// inventory/invenoty.module.ts
import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConsulModule } from 'apps/infrastructure/consul/consul.module';
import { HttpModule } from '@nestjs/axios';
import { SERVICE_TOKENS } from '@app/constants/tokens';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICE_TOKENS.order,
        transport: Transport.TCP,
        options: {
          // port: 8001,
          port: Number(process.env.ORDER_SERVICE_PORT) || 8001,
          retryAttempts: 5, // Retry 5 times before
                            // failing
          retryDelay: 3000, // Delay of 3 seconds between
                            // retries
        }
      }
    ]),
    ConsulModule.register({
      serviceId: 'inventory-service',
      serviceName: 'inventory-service',
      serviceHost: 'localhost',
      servicePort: 3002,
    }),
    HttpModule
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
