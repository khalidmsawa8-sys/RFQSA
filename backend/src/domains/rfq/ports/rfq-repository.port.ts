import { RFQEntity } from '../domain/entities/rfq.entity';

export abstract class RFQRepositoryPort {
  abstract findById(id: string): Promise<RFQEntity | null>;
  abstract findByCustomerId(customerId: string): Promise<RFQEntity[]>;
  abstract findAllPublished(): Promise<RFQEntity[]>;
  abstract create(rfq: Omit<RFQEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<RFQEntity>;
}
