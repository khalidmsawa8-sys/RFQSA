import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LedgerRepositoryPort } from '../ports/ledger-repository.port';
import { WalletEntity } from '../domain/entities/wallet.entity';
import { WalletServicePort, WalletBalanceDto } from '../ports/wallet-service.port';

@Injectable()
export class WalletService implements WalletServicePort {
  constructor(private readonly ledgerRepository: LedgerRepositoryPort) {}

  async getOrCreateWallet(userId: string): Promise<WalletEntity> {
    let wallet = await this.ledgerRepository.findWalletByUserId(userId);
    if (!wallet) {
      wallet = await this.ledgerRepository.createWallet(userId);
    }
    return wallet;
  }

  async getBalance(userId: string): Promise<WalletBalanceDto> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      walletId: wallet.id,
      userId: wallet.userId,
      availableBalance: wallet.availableBalance,
      lockedBalance: wallet.lockedBalance,
      currency: wallet.currency,
    };
  }

  async deposit(userId: string, amount: number, idempotencyKey: string): Promise<WalletEntity> {
    if (amount <= 0) throw new BadRequestException('مبلغ الشحن يجب أن يكون أكبر من 0');

    // Idempotency Check
    const existing = await this.ledgerRepository.findEntryByIdempotencyKey(idempotencyKey);
    if (existing) {
      const wallet = await this.getOrCreateWallet(userId);
      return wallet;
    }

    const wallet = await this.getOrCreateWallet(userId);

    await this.ledgerRepository.addLedgerEntry({
      walletId: wallet.id,
      entryType: 'CREDIT',
      transactionType: 'DEPOSIT',
      amount: amount,
      currency: wallet.currency,
      referenceType: 'HYPERPAY_TOPUP',
      referenceId: `TOPUP_${Date.now()}`,
      idempotencyKey: idempotencyKey,
    });

    return (await this.ledgerRepository.findWalletByUserId(userId))!;
  }

  async lockFundsForEscrow(userId: string, amount: number, referenceId: string, idempotencyKey: string): Promise<boolean> {
    const wallet = await this.getOrCreateWallet(userId);

    // Check Idempotency
    const existing = await this.ledgerRepository.findEntryByIdempotencyKey(idempotencyKey);
    if (existing) return true;

    if (wallet.availableBalance < amount) {
      throw new BadRequestException('رصيد المحفظة المتاح غير كافٍ لحجز مبلغ الطلب');
    }

    await this.ledgerRepository.addLedgerEntry({
      walletId: wallet.id,
      entryType: 'DEBIT',
      transactionType: 'ESCROW_LOCK',
      amount: amount,
      currency: wallet.currency,
      referenceType: 'ORDER_ESCROW',
      referenceId: referenceId,
      idempotencyKey: idempotencyKey,
    });

    return true;
  }

  async releaseEscrowFunds(walletId: string, amount: number, referenceId: string): Promise<boolean> {
    await this.ledgerRepository.addLedgerEntry({
      walletId: walletId,
      entryType: 'CREDIT',
      transactionType: 'ESCROW_RELEASE',
      amount: amount,
      currency: 'SAR',
      referenceType: 'ORDER_ESCROW_RELEASE',
      referenceId: referenceId,
      idempotencyKey: `RELEASE_${referenceId}_${Date.now()}`,
    });

    return true;
  }
}
