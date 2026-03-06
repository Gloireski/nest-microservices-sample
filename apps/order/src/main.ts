import { NestFactory } from '@nestjs/core';
import { OrderModule } from './order.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // configure the microservice to listen on port 8001 using
  // the TCP transport layer, hybrid instance
  const app = await NestFactory.create(OrderModule);
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
