import { Module } from '@nestjs/common';
import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceService } from './services/invoice.service';
import { ZATCAGatewayPort } from './ports/zatca-gateway.port';
import { ZATCAPhase2GatewayAdapter } from './adapters/zatca-phase2-gateway.adapter';

@Module({
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    {
      provide: ZATCAGatewayPort,
      useClass: ZATCAPhase2GatewayAdapter,
    },
  ],
  exports: [InvoiceService, ZATCAGatewayPort],
})
export class InvoiceModule {}
