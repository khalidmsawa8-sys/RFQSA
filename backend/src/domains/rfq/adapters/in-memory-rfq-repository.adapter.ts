import { Injectable } from '@nestjs/common';
import { RFQRepositoryPort } from '../ports/rfq-repository.port';
import { RFQEntity, RFQItem } from '../domain/entities/rfq.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InMemoryRFQRepositoryAdapter implements RFQRepositoryPort {
  private rfqs: Map<string, RFQEntity> = new Map();

  async findById(id: string): Promise<RFQEntity | null> {
    return this.rfqs.get(id) || null;
  }

  async findByCustomerId(customerId: string): Promise<RFQEntity[]> {
    const results: RFQEntity[] = [];
    for (const rfq of this.rfqs.values()) {
      if (rfq.customerId === customerId) results.push(rfq);
    }
    return results;
  }

  async findAllPublished(): Promise<RFQEntity[]> {
    const results: RFQEntity[] = [];
    for (const rfq of this.rfqs.values()) {
      if (rfq.status === 'PUBLISHED' || rfq.status === 'RECEIVING_OFFERS') {
        results.push(rfq);
      }
    }
    return results;
  }

  async create(data: Omit<RFQEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<RFQEntity> {
    const id = uuidv4();
    const now = new Date();
    const itemsWithIds: RFQItem[] = data.items.map((item) => ({
      ...item,
      id: item.id || uuidv4(),
    }));

    const rfq = new RFQEntity(
      id,
      data.customerId,
      data.vehicleBrand,
      data.vehicleModel,
      data.vehicleYear,
      data.vin,
      data.status,
      itemsWithIds,
      now,
      now,
    );

    this.rfqs.set(id, rfq);
    return rfq;
  }
}
