export class WalletEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly availableBalance: number, // Derived Cached View from Ledger
    public readonly lockedBalance: number,   // Escrow Locked Funds View
    public readonly currency: string,
    public readonly version: number,          // Optimistic Locking Version (@Version)
    public readonly updatedAt: Date,
  ) {}
}
