import { Injectable, NotFoundException } from '@nestjs/common';
import { ZATCAGatewayPort } from '../ports/zatca-gateway.port';
import { InvoiceEntity } from '../domain/entities/invoice.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InvoiceService {
  private invoices: Map<string, InvoiceEntity> = new Map();

  constructor(private readonly zatcaGateway: ZATCAGatewayPort) {}

  async issueInvoice(orderData: { orderId: string; customerName: string; supplierName: string; subtotal: number }): Promise<InvoiceEntity> {
    const vatRate = 0.15; // 15% VAT in Saudi Arabia
    const vatAmount = Math.round(orderData.subtotal * vatRate * 100) / 100;
    const grandTotal = orderData.subtotal + vatAmount;

    // Generate ZATCA Phase 2 Signature, UUID, Hash & QR Code
    const zatcaResult = await this.zatcaGateway.generateAndSignInvoiceXML({
      id: `INV-${Date.now()}`,
      customerName: orderData.customerName,
      supplierName: orderData.supplierName,
      subtotal: orderData.subtotal,
      vatAmount,
      grandTotal,
    });

    const invoiceId = uuidv4();
    const invoice = new InvoiceEntity(
      invoiceId,
      orderData.orderId,
      orderData.customerName,
      orderData.supplierName,
      orderData.subtotal,
      vatRate,
      vatAmount,
      grandTotal,
      zatcaResult.uuid,
      zatcaResult.xmlHash,
      zatcaResult.qrCode,
      'REPORTED',
      new Date(),
    );

    this.invoices.set(invoiceId, invoice);
    return invoice;
  }

  async getInvoiceById(id: string): Promise<InvoiceEntity> {
    const invoice = this.invoices.get(id);
    if (!invoice) throw new NotFoundException('الفاتورة غير موجودة');
    return invoice;
  }
}
