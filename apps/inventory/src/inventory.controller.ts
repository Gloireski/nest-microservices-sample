// inventory/inventory.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { EventPattern } from '@nestjs/microservices';
import { EVENTS } from '@app/constants';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getHello(): string {
    return "Hello";
  }

  @EventPattern(EVENTS.ORDER_CREATED)
  handleOrderCreated(data: any) {
    // console.log("Order created, ", data)
    // change this line
    this.inventoryService.handleOrderCreated(data);
  }

}
