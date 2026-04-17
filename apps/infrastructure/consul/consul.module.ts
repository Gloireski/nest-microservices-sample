// consul.module.ts
import { DynamicModule, Module } from "@nestjs/common";
import { CONSUL_SERVICE_CONFIG, ConsulService, ConsulServiceConfig } from "./consul.service";

@Module({})
export class ConsulModule {
  static register(config?: ConsulServiceConfig): DynamicModule {
    return {
      module: ConsulModule,
      providers: [
        { provide: CONSUL_SERVICE_CONFIG, useValue: config },
        ConsulService,
      ],
      exports: [ConsulService],
    };
  }
}