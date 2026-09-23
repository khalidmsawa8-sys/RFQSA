import { Injectable } from '@nestjs/common';
import { LedgerRepositoryPort } from '../ports/ledger-repository.port';
import { LedgerEntryEntity } from '../domain/entities/ledger-entry.entity';
import { WalletEntity } from '../domain/entities/wallet.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InMemoryLedgerRepositoryAdapter implements LedgerRepositoryPort {
  private wallets: Map<string, WalletEntity> = new Map();
  private entries: LedgerEntryEntity[] = [];

  async findWalletByUserId(userId: string): Promise<WalletEntity | null> {
    for (const wallet of this.wallets.values()) {
      if (wallet.userId === userId) return wallet;
    }
    return null;
  }

  async createWallet(userId: string, currency: string = 'SAR'): Promise<WalletEntity> {
    const id = uuidv4();
    const wallet = new WalletEntity(id, userId, 0, 0, currency, 1, new Date());
    this.wallets.set(id, wallet);
    return wallet;
  }

  async findEntryByIdempotencyKey(key: string): Promise<LedgerEntryEntity | null> {
    return this.entries.find((e) => e.idempotencyKey === key) || null;
  }

  async addLedgerEntry(entryData: Omit<LedgerEntryEntity, 'id' | 'createdAt'>): Promise<LedgerEntryEntity> {
    const entry = new LedgerEntryEntity(
      uuidv4(),
      entryData.walletId,
      entryData.entryType,
      entryData.transactionType,
      entryData.amount,
      entryData.currency,
      entryData.referenceType,
      entryData.referenceId,
      entryData.idempotencyKey,
      new Date(),
    );

    this.entries.push(entry);

    // Re-compute derived balances for the wallet
    const balances = await this.computeDerivedBalance(entryData.walletId);
    const wallet = this.wallets.get(entryData.walletId);
    if (wallet) {
      const updatedWallet = new WalletEntity(
        wallet.id,
        wallet.userId,
        balances.available,
        balances.locked,
        wallet.currency,
        wallet.version + 1,
        new Date(),
      );
      this.wallets.set(wallet.id, updatedWallet);
    }

    return entry;
  }

  async computeDerivedBalance(walletId: string): Promise<{ available: number; locked: number }> {
    let available = 0;
    let locked = 0;

    for (const entry of this.entries) {
      if (entry.walletId !== walletId) continue;

      if (entry.transactionType === 'DEPOSIT') {
        if (entry.entryType === 'CREDIT') available += entry.amount;
      } else if (entry.transactionType === 'ESCROW_LOCK') {
        if (entry.entryType === 'DEBIT') {
          available -= entry.amount;
          locked += entry.amount;
        }
      } else if (entry.transactionType === 'ESCROW_RELEASE') {
        if (entry.entryType === 'CREDIT') {
          locked -= entry.amount;
        }
      } else if (entry.transactionType === 'WITHDRAWAL') {
        if (entry.entryType === 'DEBIT') available -= entry.amount;
      }
    }

    return { available: Math.max(0, available), locked: Math.max(0, locked) };
  }
}
