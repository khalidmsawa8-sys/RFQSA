import { Injectable } from '@nestjs/common';
import { QuotationRepositoryPort } from '../ports/quotation-repository.port';
import { QuotationEntity } from '../domain/entities/quotation.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InMemoryQuotationRepositoryAdapter implements QuotationRepositoryPort {
  private quotes: Map<string, QuotationEntity> = new Map();

  async findById(id: string): Promise<QuotationEntity | null> {
    return this.quotes.get(id) || null;
  }

  async findByRfqId(rfqId: string): Promise<QuotationEntity[]> {
    const results: QuotationEntity[] = [];
    for (const q of this.quotes.values()) {
      if (q.rfqId === rfqId) results.push(q);
    }
    return results;
  }

  async findBySupplierId(supplierId: string): Promise<QuotationEntity[]> {
    const results: QuotationEntity[] = [];
    for (const q of this.quotes.values()) {
      if (q.supplierId === supplierId) results.push(q);
    }
    return results;
  }

  async create(data: Omit<QuotationEntity, 'id' | 'createdAt'>): Promise<QuotationEntity> {
    const id = uuidv4();
    const quote = new QuotationEntity(
      id,
      data.rfqId,
      data.supplierId,
      data.supplierName,
      data.partsTotal,
      data.deliveryFee,
      data.grandTotal,
      data.estimatedHours,
      data.status,
      data.items,
      new Date(),
    );

    this.quotes.set(id, quote);
    return quote;
  }

  async updateStatus(id: string, status: QuotationEntity['status']): Promise<QuotationEntity> {
    const existing = this.quotes.get(id);
    if (!existing) throw new Error(`Quotation with ID ${id} not found`);

    const updated = new QuotationEntity(
      existing.id,
      existing.rfqId,
      existing.supplierId,
      existing.supplierName,
      existing.partsTotal,
      existing.deliveryFee,
      existing.grandTotal,
      existing.estimatedHours,
      status,
      existing.items,
      existing.createdAt,
    );

    this.quotes.set(id, updated);
    return updated;
  }
}
