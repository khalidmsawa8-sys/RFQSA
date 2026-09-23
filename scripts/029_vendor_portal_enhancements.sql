-- Migration 029: Vendor Portal Enhancements & Support Categories
-- Expand support_requests check constraint to support vendor-specific categories

DO $$
BEGIN
    -- Drop old check constraint if exists
    ALTER TABLE IF EXISTS public.support_requests 
        DROP CONSTRAINT IF EXISTS support_requests_request_type_check;

    -- Add comprehensive check constraint for Client, Vendor, and System categories
    ALTER TABLE public.support_requests
        ADD CONSTRAINT support_requests_request_type_check
        CHECK (request_type IN (
            'return', 
            'replacement', 
            'return_replacement', 
            'item_mismatch', 
            'delivery_delay', 
            'suggestion', 
            'payout_withdrawal', 
            'pickup_delay', 
            'other'
        ));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint update handled safely: %', SQLERRM;
END $$;

-- Create vendor support index for fast lookups
CREATE INDEX IF NOT EXISTS idx_support_requests_vendor_client 
    ON public.support_requests(client_id, request_type, status);
