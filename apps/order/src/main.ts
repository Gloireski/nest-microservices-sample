// tracing.ts MUST be imported first — before any NestJS or Node.js modules
import { otelSDK } from './tracing';
import { NestFactory } from '@nestjs/core';
import { OrderModule } from './order.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Start OpenTelemetry SDK before NestJS bootstraps
  await otelSDK.start();
  const app = await NestFactory.create(OrderModule, {
    // DevTools connects to this port to inspect module graph and providers.
    // ONLY enable in development — never in production.
    snapshot: process.env.NODE_ENV !== 'production',
  });
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: {
        port: 8001,
        host: 'localhost'
      }
    }
  )
  // to connect to the microservices linked to the order service
  app.startAllMicroservices();
  // listen to http connection on port 3001
  await app.listen(3001);
}
bootstrap();
