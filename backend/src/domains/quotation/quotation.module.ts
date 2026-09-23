import { Module } from '@nestjs/common';
import { QuotationController } from './controllers/quotation.controller';
import { QuotationService } from './services/quotation.service';
import { QuotationRepositoryPort } from './ports/quotation-repository.port';
import { InMemoryQuotationRepositoryAdapter } from './adapters/in-memory-quotation-repository.adapter';

@Module({
  controllers: [QuotationController],
  providers: [
    QuotationService,
    {
      provide: QuotationRepositoryPort,
      useClass: InMemoryQuotationRepositoryAdapter,
    },
  ],
  exports: [QuotationService, QuotationRepositoryPort],
})
export class QuotationModule {}
