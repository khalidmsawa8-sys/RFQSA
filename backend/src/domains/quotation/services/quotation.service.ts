import { Injectable, NotFoundException } from '@nestjs/common';
import { QuotationRepositoryPort } from '../ports/quotation-repository.port';
import { SubmitQuoteDto } from '../dtos/submit-quote.dto';
import { QuotationEntity } from '../domain/entities/quotation.entity';

@Injectable()
export class QuotationService {
  constructor(private readonly quotationRepository: QuotationRepositoryPort) {}

  async submitQuote(supplierId: string, dto: SubmitQuoteDto): Promise<QuotationEntity> {
    const partsTotal = dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const grandTotal = partsTotal + dto.deliveryFee;

    const formattedItems = dto.items.map((item) => ({
      partName: item.partName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      isAvailable: true,
      warrantyDays: item.warrantyDays,
    }));

    return this.quotationRepository.create({
      rfqId: dto.rfqId,
      supplierId: supplierId,
      supplierName: dto.supplierName,
      partsTotal: partsTotal,
      deliveryFee: dto.deliveryFee,
      grandTotal: grandTotal,
      estimatedHours: dto.estimatedHours,
      status: 'SUBMITTED',
      items: formattedItems,
    });
  }

  async getQuotesForRFQ(rfqId: string): Promise<QuotationEntity[]> {
    return this.quotationRepository.findByRfqId(rfqId);
  }

  async acceptQuote(quoteId: string): Promise<QuotationEntity> {
    const quote = await this.quotationRepository.findById(quoteId);
    if (!quote) throw new NotFoundException('عرض السعر غير موجود');

    return this.quotationRepository.updateStatus(quoteId, 'ACCEPTED');
  }
}
