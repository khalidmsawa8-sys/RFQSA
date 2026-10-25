-- ============================================================================
-- Migration 031: Wallet Distribution & Idempotency Settlement System
-- Ensures atomic, idempotent wallet splits (Vendor, Courier, Platform Admin)
-- ============================================================================

-- 1. Ensure settlement and payment tracking columns on orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wallet_split_settled boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wallet_split_settled_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS settlement_summary jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Index on settlement status for fast query filtering
CREATE INDEX IF NOT EXISTS idx_orders_wallet_split_settled ON public.orders(wallet_split_settled);

-- 2. Add Unique Index on wallet_transactions(reference) to guarantee DB-level Idempotency
-- Notice: Partial index ensures legacy null references do not conflict, while all structured references are 100% unique.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_wallet_transactions_reference
  ON public.wallet_transactions (reference)
  WHERE reference IS NOT NULL AND reference <> '';

-- Index for fast order lookups
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id ON public.wallet_transactions(order_id);

-- 3. Documented constraint and comments
COMMENT ON COLUMN public.orders.wallet_split_settled IS 'Indicates whether the funds of this order have been distributed to beneficiary wallets';
COMMENT ON COLUMN public.orders.settlement_summary IS 'JSON audit breakdown: { vendor_amount, courier_fee, platform_fee, total_paid }';
