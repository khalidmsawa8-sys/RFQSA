export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'ESCROW_LOCK' | 'ESCROW_RELEASE' | 'FEE_COMMISSION';
export type EntryType = 'DEBIT' | 'CREDIT';

export class LedgerEntryEntity {
  constructor(
    public readonly id: string,
    public readonly walletId: string,
    public readonly entryType: EntryType,
    public readonly transactionType: TransactionType,
    public readonly amount: number,
    public readonly currency: string,
    public readonly referenceType: string, // e.g. 'ORDER_ESCROW', 'HYPERPAY_PAYMENT'
    public readonly referenceId: string,
    public readonly idempotencyKey: string,
    public readonly createdAt: Date,
  ) {}
}
