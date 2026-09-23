import { ShipmentEntity, ShipmentStatus } from '../domain/entities/shipment.entity';

export abstract class ShipmentRepositoryPort {
  abstract findByOrderId(orderId: string): Promise<ShipmentEntity | null>;
  abstract create(shipment: Omit<ShipmentEntity, 'id' | 'updatedAt'>): Promise<ShipmentEntity>;
  abstract updateLocation(orderId: string, lat: number, lng: number): Promise<ShipmentEntity>;
  abstract completeDelivery(orderId: string, proofImageBase64: string, signatureBase64: string): Promise<ShipmentEntity>;
}
