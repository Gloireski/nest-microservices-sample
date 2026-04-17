// consul.service.ts

import { SERVICE_TOKENS } from "@app/constants/tokens";
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Consul from "consul";

export const CONSUL_SERVICE_CONFIG = 'CONSUL_SERVICE_CONFIG';

export interface ConsulServiceConfig {
  serviceId: string;
  serviceName: string;
  serviceHost: string;
  servicePort: number;
}
@Injectable()
export class ConsulService implements OnModuleInit, OnModuleDestroy {
    private consul: any;
    private serviceId: string;

    constructor(
        @Inject(CONSUL_SERVICE_CONFIG) private config: ConsulServiceConfig
    ) {
        // Initialize Consul client
        this.consul = new Consul({
        host: 'localhost', // Change to your Consul server
        // address
        port: 8500, // Default port for Consul
        });
        // this.serviceId = SERVICE_TOKENS.inventory; // Unique ID for the service
    }
    
    // Register the service in Consul when the module
    // initializes
    async onModuleInit() {
        if (!this.config) return; 
        const { serviceId, serviceName, serviceHost, servicePort } = this.config;
        try {
            await this.consul.agent.service.register({
                id: serviceId,
                name: serviceName,
                address: serviceHost,
                port: servicePort,
                check: {
                http:
                    `http://${serviceHost}:${servicePort}/health`,
                    interval: '10s', // Health check every 10 seconds
                    timeout: '5s', // Timeout for the health check
                },
            });
            console.log(`${serviceName} registered with Consul`);
        } catch (error) {
            console.error(
                'Error registering service with Consul:', error
            );
        }
    }
    
    // Deregister the service in Consul when the module is
    // destroyed
    async onModuleDestroy() {
        if (!this.config) return;
        try {
            await this.consul.agent.service.deregister(this.serviceId);
            console.log(
            `${this.serviceId} deregistered from Consul`
            );
            } catch (error) {
                console.error(
                    'Error deregistering service from Consul:', error
                );
            }
    }

    // Discover other services using Consul
    async discoverService(serviceName: string) {
        try {
            const services = await this.consul.catalog.service.nodes(serviceName);
            if (!services || services.length === 0) {
                throw new Error(`Service "${serviceName}" not found in Consul`);
            }
            return services;
        } catch (error) {
            console.error(
            'Error discovering service with Consul:', error
            );
            return null;
        }
    }
}