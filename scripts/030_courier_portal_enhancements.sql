-- Migration 030: Courier Portal Support & Availability Enhancements
-- Adds Courier support request categories and indices

ALTER TABLE public.support_requests DROP CONSTRAINT IF EXISTS support_requests_request_type_check;

ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_request_type_check CHECK (
  request_type IN (
    -- Client categories
    'order_delay',
    'wrong_part',
    'defective_part',
    'return_exchange',
    -- Vendor categories
    'payout_withdrawal',
    'pickup_delay',
    -- Courier categories
    'client_location_issue',
    'vendor_pickup_issue',
    'courier_payout',
    -- General
    'general_inquiry',
    'other'
  )
);

-- Index for fast courier support tickets lookups
CREATE INDEX IF NOT EXISTS idx_support_requests_client_status ON public.support_requests(client_id, status, created_at DESC);
