import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OrderRepositoryPort } from '../ports/order-repository.port';
import { WalletServicePort } from '../../wallet/ports/wallet-service.port';
import { OrderEntity } from '../domain/entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Injectable()
export class OrderSagaOrchestrator {
  private readonly logger = new Logger(OrderSagaOrchestrator.name);

  constructor(
    private readonly orderRepository: OrderRepositoryPort,
    private readonly walletService: WalletServicePort,
  ) {}

  /**
   * Saga Orchestration Flow:
   * Step 1: Create Order entity in OFFER_ACCEPTED state.
   * Step 2: Request Wallet Domain to lock funds for Escrow (with Idempotency Key).
   * Step 3: If Wallet lock fails -> Compensation: Mark Order as CANCELLED.
   * Step 4: Advance Order state to FUNDS_LOCKED_ESCROW -> ORDER_PREPARING.
   */
  async executeCreateOrderSaga(params: {
    rfqId: string;
    offerId: string;
    customerId: string;
    supplierId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<OrderEntity> {
    this.logger.log(`Starting CreateOrderSaga for RFQ ${params.rfqId} - Amount: ${params.amount}`);

    // Step 1: Create Order Pending Lock
    const order = await this.orderRepository.create({
      rfqId: params.rfqId,
      offerId: params.offerId,
      customerId: params.customerId,
      supplierId: params.supplierId,
      courierId: null,
      totalAmount: params.amount,
      status: OrderStatus.OFFER_ACCEPTED,
      escrowHoldUntil: null,
    });

    try {
      // Step 2: Lock Funds via Wallet Service Port
      const lockSuccess = await this.walletService.lockFundsForEscrow(
        params.customerId,
        params.amount,
        order.id,
        params.idempotencyKey,
      );

      if (!lockSuccess) {
        throw new BadRequestException('فشل حجز المبالغ المالية من المحفظة');
      }

      // Step 3: Lock Succeeded -> Transition to FUNDS_LOCKED_ESCROW and ORDER_PREPARING
      await this.orderRepository.updateStatus(order.id, OrderStatus.FUNDS_LOCKED_ESCROW);
      const updatedOrder = await this.orderRepository.updateStatus(order.id, OrderStatus.ORDER_PREPARING);

      this.logger.log(`CreateOrderSaga completed successfully for Order ID ${order.id}`);
      return updatedOrder;

    } catch (error: any) {
      // Saga Compensation Action
      this.logger.error(`CreateOrderSaga failed for Order ID ${order.id}. Executing Compensation Action...`, error?.stack);
      await this.orderRepository.updateStatus(order.id, OrderStatus.CANCELLED);
      throw new BadRequestException(`فشل تنفيذ طلب الشراء: ${error?.message || 'خطأ في عملية حجز المحفظة'}`);
    }
  }

  /**
   * Saga Flow: Confirm Delivery & Start 15-Day Escrow Holding Period
   */
  async executeDeliveryConfirmationSaga(orderId: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new BadRequestException('الطلب غير موجود');

    // Calculate 15 Days Escrow Release Date
    const escrowHoldUntil = new Date();
    escrowHoldUntil.setDate(escrowHoldUntil.getDate() + 15);

    await this.orderRepository.updateStatus(orderId, OrderStatus.DELIVERED_SUCCESS);
    return this.orderRepository.updateStatus(orderId, OrderStatus.ESCROW_HOLDING, escrowHoldUntil);
  }
}
