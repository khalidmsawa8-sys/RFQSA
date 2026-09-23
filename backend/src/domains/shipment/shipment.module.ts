import { Module } from '@nestjs/common';
import { ShipmentController } from './controllers/shipment.controller';
import { ShipmentService } from './services/shipment.service';
import { ShipmentRepositoryPort } from './ports/shipment-repository.port';
import { InMemoryShipmentRepositoryAdapter } from './adapters/in-memory-shipment-repository.adapter';

@Module({
  controllers: [ShipmentController],
  providers: [
    ShipmentService,
    {
      provide: ShipmentRepositoryPort,
      useClass: InMemoryShipmentRepositoryAdapter,
    },
  ],
  exports: [ShipmentService, ShipmentRepositoryPort],
})
export class ShipmentModule {}
