import { Injectable } from '@nestjs/common';
import { ShipmentRepositoryPort } from '../ports/shipment-repository.port';
import { ShipmentEntity } from '../domain/entities/shipment.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InMemoryShipmentRepositoryAdapter implements ShipmentRepositoryPort {
  private shipments: Map<string, ShipmentEntity> = new Map();

  async findByOrderId(orderId: string): Promise<ShipmentEntity | null> {
    for (const s of this.shipments.values()) {
      if (s.orderId === orderId) return s;
    }
    return null;
  }

  async create(data: Omit<ShipmentEntity, 'id' | 'updatedAt'>): Promise<ShipmentEntity> {
    const id = uuidv4();
    const shipment = new ShipmentEntity(
      id,
      data.orderId,
      data.courierId,
      data.courierName,
      data.status,
      data.currentLat,
      data.currentLng,
      data.proofImageBase64,
      data.signatureBase64,
      new Date(),
    );

    this.shipments.set(id, shipment);
    return shipment;
  }

  async updateLocation(orderId: string, lat: number, lng: number): Promise<ShipmentEntity> {
    const existing = await this.findByOrderId(orderId);
    if (!existing) throw new Error(`Shipment for order ${orderId} not found`);

    const updated = new ShipmentEntity(
      existing.id,
      existing.orderId,
      existing.courierId,
      existing.courierName,
      'IN_TRANSIT',
      lat,
      lng,
      existing.proofImageBase64,
      existing.signatureBase64,
      new Date(),
    );

    this.shipments.set(existing.id, updated);
    return updated;
  }

  async completeDelivery(orderId: string, proofImageBase64: string, signatureBase64: string): Promise<ShipmentEntity> {
    const existing = await this.findByOrderId(orderId);
    if (!existing) throw new Error(`Shipment for order ${orderId} not found`);

    const updated = new ShipmentEntity(
      existing.id,
      existing.orderId,
      existing.courierId,
      existing.courierName,
      'DELIVERED',
      existing.currentLat,
      existing.currentLng,
      proofImageBase64,
      signatureBase64,
      new Date(),
    );

    this.shipments.set(existing.id, updated);
    return updated;
  }
}
