import { Module } from '@nestjs/common';
// import { ProxyController } from 'apps/api-gateway/src/proxy.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ApiGatewayModule } from 'apps/api-gateway/src/api-gateway.module';

@Module({
  imports: [TerminusModule, HttpModule, ApiGatewayModule],
  controllers: [],
  providers: [

  ],
})
export class AppModule {}
