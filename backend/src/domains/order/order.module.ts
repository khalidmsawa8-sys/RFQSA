import { Module } from '@nestjs/common';
import { OrderController } from './controllers/order.controller';
import { OrderSagaOrchestrator } from './services/order-saga.orchestration';
import { OrderRepositoryPort } from './ports/order-repository.port';
import { InMemoryOrderRepositoryAdapter } from './adapters/in-memory-order-repository.adapter';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [OrderController],
  providers: [
    OrderSagaOrchestrator,
    {
      provide: OrderRepositoryPort,
      useClass: InMemoryOrderRepositoryAdapter,
    },
  ],
  exports: [OrderSagaOrchestrator, OrderRepositoryPort],
})
export class OrderModule {}
