// tracing.ts MUST be imported first — before any NestJS or Node.js modules
import { otelSDK } from './tracing';
import { NestFactory } from '@nestjs/core';
import { InventoryModule } from './inventory.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  await otelSDK.start();
  const app = await NestFactory.create(InventoryModule)
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: {
        port: 8002,
        host: 'localhost'
      }
    }
  )
  app.startAllMicroservices();
  await app.listen(3002);
}
bootstrap();
