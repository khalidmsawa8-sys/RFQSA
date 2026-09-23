-- ============================================================
-- Migration 024: Vendors Map, Structured Location & Self-Pickup
-- Fully Additive & Backward-Compatible
-- ============================================================

-- 1) Add Structured Location & Vendor Settings to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS accepts_pickup boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS business_hours jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 4.8,
  ADD COLUMN IF NOT EXISTS logo_url text;

-- 2) Create relational vendor_brands table
CREATE TABLE IF NOT EXISTS public.vendor_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (vendor_id, brand_id)
);

ALTER TABLE public.vendor_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_brands_select_all" ON public.vendor_brands;
CREATE POLICY "vendor_brands_select_all" ON public.vendor_brands
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "vendor_brands_manage_own" ON public.vendor_brands;
CREATE POLICY "vendor_brands_manage_own" ON public.vendor_brands
  FOR ALL USING (
    auth.uid() = vendor_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Create index for high-speed brand lookups
CREATE INDEX IF NOT EXISTS idx_vendor_brands_brand_id ON public.vendor_brands(brand_id);
CREATE INDEX IF NOT EXISTS idx_vendor_brands_vendor_id ON public.vendor_brands(vendor_id);

-- 3) Add Self-Pickup, Source & Snapshot tracking to public.rfqs
ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS target_vendor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS fulfillment_method text DEFAULT 'DELIVERY',
  ADD COLUMN IF NOT EXISTS pickup_snapshot jsonb;

CREATE INDEX IF NOT EXISTS idx_rfqs_target_vendor ON public.rfqs(target_vendor_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_fulfillment_method ON public.rfqs(fulfillment_method);
CREATE INDEX IF NOT EXISTS idx_rfqs_source ON public.rfqs(source);

-- 4) Add audit log action policy if not present
COMMENT ON COLUMN public.rfqs.pickup_snapshot IS 'Immutable historic snapshot of vendor pickup location and contact details at creation time';
COMMENT ON COLUMN public.rfqs.fulfillment_method IS 'DELIVERY or SELF_PICKUP';
COMMENT ON COLUMN public.rfqs.source IS 'DIRECT, VENDOR_MAP, REORDER, etc.';
