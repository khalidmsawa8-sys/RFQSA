import { Module } from '@nestjs/common';
import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import { LedgerRepositoryPort } from './ports/ledger-repository.port';
import { InMemoryLedgerRepositoryAdapter } from './adapters/in-memory-ledger-repository.adapter';
import { WalletServicePort } from './ports/wallet-service.port';

@Module({
  controllers: [WalletController],
  providers: [
    WalletService,
    {
      provide: LedgerRepositoryPort,
      useClass: InMemoryLedgerRepositoryAdapter,
    },
    {
      provide: WalletServicePort,
      useExisting: WalletService,
    },
  ],
  exports: [WalletService, WalletServicePort, LedgerRepositoryPort],
})
export class WalletModule {}
