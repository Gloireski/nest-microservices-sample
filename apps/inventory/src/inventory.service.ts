//inventory.services.ts
import { EVENTS } from '@app/constants';
import { SERVICE_TOKENS } from '@app/constants/tokens';
import {
  Inventory,
  Order,
  OrderProcessPayload
} from '@app/shared';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConsulService } from 'apps/infrastructure/consul/consul.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(SERVICE_TOKENS.order) private orderClient: ClientProxy,
    private readonly consulService: ConsulService,
    private readonly httpService: HttpService
) {}
  // in memory storage of inventory - for demo purposes
  private inventory: Inventory[] = [
    { id: 1, name: 'Laptop', quantity: 100 },
    { id: 2, name: 'Mouse', quantity: 50 },
    { id: 3, name: 'Keyboard', quantity: 75 },

  ];

  getAllProducts() {
    return this.inventory;
  }

  addProduct(product: Inventory) {;
    this.inventory.push(product)
    return {
      message: 'Product added',
      product
    }
  }

  async processOrder(order: Order) {
    // Discover the Order service
    const services = await this.consulService.discoverService('order-service');
    if (!services.length) {
    throw new Error('Order service not found');
    }
    const orderService = services[0];

    const orderUrl = `http://${orderService.ServiceAddress || orderService.Address}:${orderService.ServicePort}/orders`;

    const response = await firstValueFrom(
      this.httpService.post(orderUrl, order)
    );

    return response.data;
  }

  handleOrderCreated(order: Order) {
    let success = false;
    let message = '';
    const item = this.inventory.find((i) => i.name === order.product);

    if (item) {
      if (item.quantity < order.quantity) {
        message = 'Insufficient quantity in inventory';
      } else {
        // item.quantity -= order.quantity;
        this.updateInventory(item.id, item.quantity);
        success = true;
        message = 'Order processed successfully';
      }
    } else {
      message = `Product ${order.product} not found in
      inventory`;
    }

    const payload: OrderProcessPayload = {
      success,
      message,
      orderId: order.id,
    };
    console.log('Order processed with the payload:',
    payload);
    // emit event to the order service
    return this.orderClient.emit(EVENTS.ORDER_PROCESSED,
    payload);
  }

  updateInventory(productId: number, quantity: number):
    void {
      if (productId === 4) {
        throw new Error(
        'Simulated inventory update failure'
        );
    }
    // Proceed with inventory update logic
    const item = this.inventory.find((i) => i.id === productId);
    if (item) {
      item.quantity -= quantity;
    }

  }
  // keep whatever we had before
}