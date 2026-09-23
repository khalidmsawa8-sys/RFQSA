-- ============================================================
-- 028_client_vehicles_schema.sql
-- Client Vehicles & Enhanced Support Categories Migration
-- ============================================================

-- 1. Create client_vehicles table for persistent multi-vehicle storage
CREATE TABLE IF NOT EXISTS public.client_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    brand_id TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    year INTEGER NOT NULL,
    trim TEXT,
    vin TEXT,
    plate_number TEXT NOT NULL,
    color TEXT DEFAULT 'أبيض',
    branch_id TEXT DEFAULT 'br-riyadh',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'archived')),
    is_default BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_client_vehicles_user_id ON public.client_vehicles(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_vehicles_plate ON public.client_vehicles(plate_number);

-- Enable RLS for client_vehicles
ALTER TABLE public.client_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_vehicles_select_own" ON public.client_vehicles
FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "client_vehicles_insert_own" ON public.client_vehicles
FOR INSERT WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "client_vehicles_update_own" ON public.client_vehicles
FOR UPDATE USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "client_vehicles_delete_own" ON public.client_vehicles
FOR DELETE USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 2. Expand support_requests categories check constraint
DO $$
BEGIN
    ALTER TABLE public.support_requests DROP CONSTRAINT IF EXISTS support_requests_request_type_check;
    ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_request_type_check CHECK (
        request_type IN (
            'return_replacement',
            'item_mismatch',
            'delivery_delay',
            'suggestion',
            'other',
            'return',
            'replacement',
            'inquiry',
            'complaint',
            'financial'
        )
    );
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$;
