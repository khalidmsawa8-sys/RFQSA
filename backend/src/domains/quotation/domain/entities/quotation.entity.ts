export type QuotationStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface QuotationItem {
  partName: string;
  unitPrice: number;
  quantity: number;
  isAvailable: boolean;
  warrantyDays: number;
}

export class QuotationEntity {
  constructor(
    public readonly id: string,
    public readonly rfqId: string,
    public readonly supplierId: string,
    public readonly supplierName: string,
    public readonly partsTotal: number,
    public readonly deliveryFee: number,
    public readonly grandTotal: number,
    public readonly estimatedHours: number,
    public readonly status: QuotationStatus,
    public readonly items: QuotationItem[],
    public readonly createdAt: Date,
  ) {}
}
