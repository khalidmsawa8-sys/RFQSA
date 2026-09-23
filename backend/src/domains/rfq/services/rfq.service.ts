import { Injectable, NotFoundException } from '@nestjs/common';
import { RFQRepositoryPort } from '../ports/rfq-repository.port';
import { CreateRFQDto } from '../dtos/create-rfq.dto';
import { RFQEntity } from '../domain/entities/rfq.entity';

@Injectable()
export class RFQService {
  constructor(private readonly rfqRepository: RFQRepositoryPort) {}

  async createRFQ(customerId: string, dto: CreateRFQDto): Promise<RFQEntity> {
    return this.rfqRepository.create({
      customerId: customerId,
      vehicleBrand: dto.vehicleBrand,
      vehicleModel: dto.vehicleModel,
      vehicleYear: dto.vehicleYear,
      vin: dto.vin,
      status: 'PUBLISHED',
      items: dto.items,
    });
  }

  async getRFQById(id: string): Promise<RFQEntity> {
    const rfq = await this.rfqRepository.findById(id);
    if (!rfq) throw new NotFoundException('طلب الشراء غير موجود');
    return rfq;
  }

  async getCustomerRFQs(customerId: string): Promise<RFQEntity[]> {
    return this.rfqRepository.findByCustomerId(customerId);
  }

  async getAvailableRFQsForVendors(): Promise<RFQEntity[]> {
    return this.rfqRepository.findAllPublished();
  }
}
