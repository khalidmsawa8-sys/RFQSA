import { Injectable } from '@nestjs/common';
import { OrderRepositoryPort } from '../ports/order-repository.port';
import { OrderEntity } from '../domain/entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InMemoryOrderRepositoryAdapter implements OrderRepositoryPort {
  private orders: Map<string, OrderEntity> = new Map();

  async findById(id: string): Promise<OrderEntity | null> {
    return this.orders.get(id) || null;
  }

  async findByCustomerId(customerId: string): Promise<OrderEntity[]> {
    const res: OrderEntity[] = [];
    for (const o of this.orders.values()) {
      if (o.customerId === customerId) res.push(o);
    }
    return res;
  }

  async findBySupplierId(supplierId: string): Promise<OrderEntity[]> {
    const res: OrderEntity[] = [];
    for (const o of this.orders.values()) {
      if (o.supplierId === supplierId) res.push(o);
    }
    return res;
  }

  async findByCourierId(courierId: string): Promise<OrderEntity[]> {
    const res: OrderEntity[] = [];
    for (const o of this.orders.values()) {
      if (o.courierId === courierId) res.push(o);
    }
    return res;
  }

  async create(data: Omit<OrderEntity, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<OrderEntity> {
    const id = uuidv4();
    const now = new Date();
    const order = new OrderEntity(
      id,
      data.rfqId,
      data.offerId,
      data.customerId,
      data.supplierId,
      data.courierId,
      data.totalAmount,
      data.status,
      data.escrowHoldUntil,
      1,
      now,
      now,
    );

    this.orders.set(id, order);
    return order;
  }

  async updateStatus(id: string, status: OrderStatus, escrowHoldUntil?: Date): Promise<OrderEntity> {
    const existing = this.orders.get(id);
    if (!existing) throw new Error(`Order with ID ${id} not found`);

    const updated = new OrderEntity(
      existing.id,
      existing.rfqId,
      existing.offerId,
      existing.customerId,
      existing.supplierId,
      existing.courierId,
      existing.totalAmount,
      status,
      escrowHoldUntil !== undefined ? escrowHoldUntil : existing.escrowHoldUntil,
      existing.version + 1,
      existing.createdAt,
      new Date(),
    );

    this.orders.set(id, updated);
    return updated;
  }

  async assignCourier(id: string, courierId: string): Promise<OrderEntity> {
    const existing = this.orders.get(id);
    if (!existing) throw new Error(`Order with ID ${id} not found`);

    const updated = new OrderEntity(
      existing.id,
      existing.rfqId,
      existing.offerId,
      existing.customerId,
      existing.supplierId,
      courierId,
      existing.totalAmount,
      OrderStatus.COURIER_ASSIGNED,
      existing.escrowHoldUntil,
      existing.version + 1,
      existing.createdAt,
      new Date(),
    );

    this.orders.set(id, updated);
    return updated;
  }
}
