import { Injectable, NotFoundException } from '@nestjs/common';
import { ShipmentRepositoryPort } from '../ports/shipment-repository.port';
import { ShipmentEntity } from '../domain/entities/shipment.entity';

@Injectable()
export class ShipmentService {
  constructor(private readonly shipmentRepository: ShipmentRepositoryPort) {}

  async assignCourier(orderId: string, courierId: string, courierName: string): Promise<ShipmentEntity> {
    return this.shipmentRepository.create({
      orderId,
      courierId,
      courierName,
      status: 'DISPATCHED',
      currentLat: 24.7136, // Default Riyadh coordinates
      currentLng: 46.6753,
      proofImageBase64: null,
      signatureBase64: null,
    });
  }

  async updateGPSLocation(orderId: string, lat: number, lng: number): Promise<ShipmentEntity> {
    return this.shipmentRepository.updateLocation(orderId, lat, lng);
  }

  async recordProofOfDelivery(orderId: string, proofImageBase64: string, signatureBase64: string): Promise<ShipmentEntity> {
    return this.shipmentRepository.completeDelivery(orderId, proofImageBase64, signatureBase64);
  }

  async getShipmentStatus(orderId: string): Promise<ShipmentEntity> {
    const shipment = await this.shipmentRepository.findByOrderId(orderId);
    if (!shipment) throw new NotFoundException('شحنة الطلب غير موجودة');
    return shipment;
  }
}
