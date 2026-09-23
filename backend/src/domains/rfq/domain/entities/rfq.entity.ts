export type RFQStatus = 'DRAFT' | 'PUBLISHED' | 'RECEIVING_OFFERS' | 'CLOSED' | 'CANCELLED';

export interface RFQItem {
  id: string;
  partName: string;
  partNumber?: string;
  quantity: number;
  notes?: string;
}

export class RFQEntity {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly vehicleBrand: string,
    public readonly vehicleModel: string,
    public readonly vehicleYear: number,
    public readonly vin: string,
    public readonly status: RFQStatus,
    public readonly items: RFQItem[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
