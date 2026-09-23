import { QuotationEntity } from '../domain/entities/quotation.entity';

export abstract class QuotationRepositoryPort {
  abstract findById(id: string): Promise<QuotationEntity | null>;
  abstract findByRfqId(rfqId: string): Promise<QuotationEntity[]>;
  abstract findBySupplierId(supplierId: string): Promise<QuotationEntity[]>;
  abstract create(quote: Omit<QuotationEntity, 'id' | 'createdAt'>): Promise<QuotationEntity>;
  abstract updateStatus(id: string, status: QuotationEntity['status']): Promise<QuotationEntity>;
}
