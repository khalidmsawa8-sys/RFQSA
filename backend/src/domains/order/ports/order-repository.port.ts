import { OrderEntity } from '../domain/entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';

export abstract class OrderRepositoryPort {
  abstract findById(id: string): Promise<OrderEntity | null>;
  abstract findByCustomerId(customerId: string): Promise<OrderEntity[]>;
  abstract findBySupplierId(supplierId: string): Promise<OrderEntity[]>;
  abstract findByCourierId(courierId: string): Promise<OrderEntity[]>;
  abstract create(order: Omit<OrderEntity, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<OrderEntity>;
  abstract updateStatus(id: string, status: OrderStatus, escrowHoldUntil?: Date): Promise<OrderEntity>;
  abstract assignCourier(id: string, courierId: string): Promise<OrderEntity>;
}
