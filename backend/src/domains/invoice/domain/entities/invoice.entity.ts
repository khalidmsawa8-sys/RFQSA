export type ZATCAStatus = 'SUBMITTED' | 'REPORTED' | 'CLEARED' | 'FAILED';

export class InvoiceEntity {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly customerName: string,
    public readonly supplierName: string,
    public readonly subtotal: number,
    public readonly vatRate: number, // 0.15 (15%)
    public readonly vatAmount: number,
    public readonly grandTotal: number,
    public readonly zatcaUuid: string,
    public readonly xmlHash: string,
    public readonly qrCode: string,
    public readonly zatcaStatus: ZATCAStatus,
    public readonly createdAt: Date,
  ) {}
}
