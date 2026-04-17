// api-gateway.module.ts
import { ConsulModule } from 'apps/infrastructure/consul/consul.module';
import { HttpModule } from '@nestjs/axios';
import { ProxyController } from './proxy.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConsulModule.register(),  // ← pas de config, juste discovery
    HttpModule,
  ],
  controllers: [ProxyController],
})
export class ApiGatewayModule {}