export interface WalletBalanceDto {
  walletId: string;
  userId: string;
  availableBalance: number;
  lockedBalance: number;
  currency: string;
}

export abstract class WalletServicePort {
  abstract getBalance(userId: string): Promise<WalletBalanceDto>;
  abstract lockFundsForEscrow(userId: string, amount: number, referenceId: string, idempotencyKey: string): Promise<boolean>;
  abstract releaseEscrowFunds(walletId: string, amount: number, referenceId: string): Promise<boolean>;
}
