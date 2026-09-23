import { LedgerEntryEntity } from '../domain/entities/ledger-entry.entity';
import { WalletEntity } from '../domain/entities/wallet.entity';

export abstract class LedgerRepositoryPort {
  abstract findWalletByUserId(userId: string): Promise<WalletEntity | null>;
  abstract createWallet(userId: string, currency?: string): Promise<WalletEntity>;
  abstract findEntryByIdempotencyKey(key: string): Promise<LedgerEntryEntity | null>;
  abstract addLedgerEntry(entry: Omit<LedgerEntryEntity, 'id' | 'createdAt'>): Promise<LedgerEntryEntity>;
  abstract computeDerivedBalance(walletId: string): Promise<{ available: number; locked: number }>;
}
