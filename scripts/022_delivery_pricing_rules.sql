-- =============================================================================
-- Migration 022: RIFQ Centralized Delivery Pricing Rules & Immutable Snapshots
-- =============================================================================

-- 1. Create delivery_pricing_rules table
CREATE TABLE IF NOT EXISTS public.delivery_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city TEXT NOT NULL,
    base_fee NUMERIC(10, 2) NOT NULL DEFAULT 25.00,
    base_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
    extra_fee_per_km NUMERIC(10, 2) NOT NULL DEFAULT 1.50,
    intercity_fee NUMERIC(10, 2) NOT NULL DEFAULT 45.00,
    min_fee NUMERIC(10, 2) NOT NULL DEFAULT 25.00,
    estimated_delivery_hours INTEGER NOT NULL DEFAULT 24,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to prevent duplicate active cities
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_rules_city_lower ON public.delivery_pricing_rules(LOWER(TRIM(city)));

-- 2. Create delivery_audit_logs table
CREATE TABLE IF NOT EXISTS public.delivery_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.delivery_pricing_rules(id) ON DELETE SET NULL,
    city TEXT NOT NULL,
    user_id UUID,
    user_name TEXT,
    action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'toggle_status', 'set_default'
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add delivery_snapshot column to quotes table if not exists
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS delivery_snapshot JSONB;

-- 4. Enable RLS
ALTER TABLE public.delivery_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users & anon
CREATE POLICY "Allow read access to delivery rules" 
ON public.delivery_pricing_rules 
FOR SELECT 
USING (true);

-- Allow full admin access
CREATE POLICY "Allow admin full access to delivery rules" 
ON public.delivery_pricing_rules 
FOR ALL 
USING (
  auth.role() = 'service_role' OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);

CREATE POLICY "Allow admin read delivery audit logs" 
ON public.delivery_audit_logs 
FOR SELECT 
USING (
  auth.role() = 'service_role' OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);

-- 5. Seed default delivery rules
INSERT INTO public.delivery_pricing_rules (city, base_fee, base_distance_km, extra_fee_per_km, intercity_fee, min_fee, estimated_delivery_hours, is_active, is_default)
VALUES 
  ('الرياض', 25.00, 15.00, 1.50, 45.00, 25.00, 24, true, false),
  ('جدة', 25.00, 15.00, 1.50, 45.00, 25.00, 24, true, false),
  ('الدمام', 25.00, 15.00, 1.50, 45.00, 25.00, 24, true, false),
  ('الخبر', 25.00, 15.00, 1.50, 45.00, 25.00, 24, true, false),
  ('مكة المكرمة', 30.00, 15.00, 1.50, 45.00, 30.00, 24, true, false),
  ('المدينة المنورة', 30.00, 15.00, 1.50, 45.00, 30.00, 24, true, false),
  ('القصيم', 25.00, 15.00, 1.50, 45.00, 25.00, 24, true, false),
  ('تبوك', 30.00, 15.00, 1.75, 55.00, 30.00, 48, true, false),
  ('أبها', 30.00, 15.00, 1.75, 55.00, 30.00, 48, true, false),
  ('كافة المدن الأخرى (افتراضي)', 35.00, 15.00, 2.00, 55.00, 35.00, 48, true, true)
ON CONFLICT (LOWER(TRIM(city))) DO NOTHING;
