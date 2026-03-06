import { OrderStatus } from "../types/order-status";

export class Order {
    id: string;
    name: string;
    product: string;
    price: number;
    status: OrderStatus;
    quantity: number;
}