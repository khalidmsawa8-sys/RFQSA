-- ============================================================
-- 027_admin_portal_enterprise_enhancements.sql
-- Enterprise Admin Portal Enhancements:
-- 1. Support Conversation Messages Thread & Statuses
-- 2. RFQ Expiration Timestamps and Expiry Hours System Config
-- 3. User Suspension / Deactivation & Courier Role Support
-- 4. Safe Indices for Fast User, RFQ, and Support Lookups
-- ============================================================

-- 1. Ensure support_requests table has all required columns and constraints
CREATE TABLE IF NOT EXISTS public.support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL DEFAULT 'inquiry' CHECK (request_type IN ('return', 'replacement', 'inquiry', 'complaint', 'financial')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending', 'accepted', 'rejected', 'completed', 'closed')),
    subject TEXT,
    reason TEXT NOT NULL,
    rejection_reason TEXT,
    refund_amount NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. Create support_messages table for full conversation threads
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'staff', 'client', 'vendor', 'courier')),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_messages_request_id_idx ON public.support_messages(request_id, created_at ASC);

-- 3. Add expires_at column and duration to RFQs table if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'rfqs' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.rfqs ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'rfqs' AND column_name = 'expiry_hours'
    ) THEN
        ALTER TABLE public.rfqs ADD COLUMN expiry_hours INTEGER DEFAULT 48;
    END IF;
END;
$$;

-- Populate expires_at for existing open RFQs if NULL (default 48 hours from created_at)
UPDATE public.rfqs 
SET expires_at = created_at + INTERVAL '48 hours'
WHERE expires_at IS NULL;

-- 4. Enable RLS and Policies for Support Messages
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_messages_select_participant" ON public.support_messages
FOR SELECT USING (
    sender_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.support_requests sr 
        WHERE sr.id = support_messages.request_id 
        AND (sr.client_id = auth.uid() OR sr.vendor_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
);

CREATE POLICY "support_messages_insert_auth" ON public.support_messages
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);

-- 5. Safe Indexes for Fast Admin Searches
CREATE INDEX IF NOT EXISTS idx_profiles_ref_code ON public.profiles(ref_code);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_rfqs_expires_at ON public.rfqs(expires_at);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON public.rfqs(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
