// order.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderInput } from './dto/create-order.dto';
import { Order } from '@app/shared';
import type { OrderProcessPayload } from '@app/shared';
import { EventPattern } from '@nestjs/microservices';
import { EVENTS } from '@app/constants';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  getHello(): string {
    return this.orderService.getHello();
  }

  @EventPattern(EVENTS.ORDER_PROCESSED)
  async handleOrderProcessed(data: OrderProcessPayload) {
    this.orderService.handleOrderProcessed(data);
  }

  @Post('create-order')
  createOrder(@Body() createOrderInput: CreateOrderInput): Order {
    return this.orderService.createOrder(createOrderInput);
  }
}
