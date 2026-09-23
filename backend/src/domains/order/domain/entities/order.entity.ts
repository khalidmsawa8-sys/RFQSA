import { OrderStatus } from '../enums/order-status.enum';

export class OrderEntity {
  constructor(
    public readonly id: string,
    public readonly rfqId: string,
    public readonly offerId: string,
    public readonly customerId: string,
    public readonly supplierId: string,
    public readonly courierId: string | null,
    public readonly totalAmount: number,
    public readonly status: OrderStatus,
    public readonly escrowHoldUntil: Date | null,
    public readonly version: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
