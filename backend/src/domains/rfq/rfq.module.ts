import { Module } from '@nestjs/common';
import { RFQController } from './controllers/rfq.controller';
import { RFQService } from './services/rfq.service';
import { RFQRepositoryPort } from './ports/rfq-repository.port';
import { InMemoryRFQRepositoryAdapter } from './adapters/in-memory-rfq-repository.adapter';

@Module({
  controllers: [RFQController],
  providers: [
    RFQService,
    {
      provide: RFQRepositoryPort,
      useClass: InMemoryRFQRepositoryAdapter,
    },
  ],
  exports: [RFQService, RFQRepositoryPort],
})
export class RFQModule {}
