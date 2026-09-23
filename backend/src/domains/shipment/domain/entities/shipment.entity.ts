export type ShipmentStatus = 'DISPATCHED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';

export class ShipmentEntity {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly courierId: string,
    public readonly courierName: string,
    public readonly status: ShipmentStatus,
    public readonly currentLat: number,
    public readonly currentLng: number,
    public readonly proofImageBase64: string | null,
    public readonly signatureBase64: string | null,
    public readonly updatedAt: Date,
  ) {}
}
