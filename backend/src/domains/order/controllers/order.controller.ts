import { Controller, Post, Get, Body, Param, Headers, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { OrderSagaOrchestrator } from '../services/order-saga.orchestration';
import { OrderRepositoryPort } from '../ports/order-repository.port';

@ApiTags('Order Lifecycle & Saga Engine (إدارة الطلبات)')
@Controller({ version: '1', path: 'orders' })
export class OrderController {
  constructor(
    private readonly orderSaga: OrderSagaOrchestrator,
    private readonly orderRepository: OrderRepositoryPort,
  ) {}

  @Post('create-from-quote')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء طلب وتفعيل حجز المحفظة بـ Saga Pattern و Idempotency Key' })
  @ApiHeader({ name: 'x-idempotency-key', required: true, description: 'متاح لمنع تكرار إنشاء الطلب والخصم' })
  async createFromQuote(
    @Body()
    dto: {
      rfqId: string;
      offerId: string;
      customerId: string;
      supplierId: string;
      amount: number;
    },
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    const key = idempotencyKey || `ORD_${Date.now()}`;
    return this.orderSaga.executeCreateOrderSaga({
      ...dto,
      idempotencyKey: key,
    });
  }

  @Post(':id/confirm-delivery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تأكيد تسليم الطلب وبدء فترة الحجز (15 يوماً تلقائية)' })
  async confirmDelivery(@Param('id') id: string) {
    return this.orderSaga.executeDeliveryConfirmationSaga(id);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'استعراض جميع طلبات العميل الحالية والسابقة' })
  async getCustomerOrders(@Param('customerId') customerId: string) {
    return this.orderRepository.findByCustomerId(customerId);
  }

  @Get('supplier/:supplierId')
  @ApiOperation({ summary: 'استعراض طلبات المورد القائمة والمجهزة' })
  async getSupplierOrders(@Param('supplierId') supplierId: string) {
    return this.orderRepository.findBySupplierId(supplierId);
  }
}
