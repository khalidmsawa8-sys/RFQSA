-- ============================================================
-- Super Admin Dashboard - Full Migration
-- ============================================================

-- 1) Reference codes on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ref_code text UNIQUE;

-- Generate ref codes for existing users
CREATE OR REPLACE FUNCTION public.generate_ref_code(user_role text, user_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  num int;
  code text;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN role = user_role
      THEN CAST(REGEXP_REPLACE(COALESCE(ref_code,'0'), '[^0-9]', '', 'g') AS int)
    END
  ), 10000) + 1 INTO num FROM public.profiles;
  IF user_role = 'client' THEN
    code := 'CUST-' || num::text;
  ELSIF user_role = 'vendor' THEN
    code := 'SUP-' || num::text;
  ELSE
    code := 'ADM-' || num::text;
  END IF;
  RETURN code;
END;
$$;

-- Auto-assign ref_code on insert trigger
CREATE OR REPLACE FUNCTION public.assign_ref_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.ref_code IS NULL THEN
    NEW.ref_code := public.generate_ref_code(NEW.role, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_ref_code ON public.profiles;
CREATE TRIGGER trg_assign_ref_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_ref_code();

-- Back-fill existing profiles without ref_code
DO $$
DECLARE r RECORD; num int := 10001; vnum int := 20001; anum int := 90001;
BEGIN
  FOR r IN SELECT id, role FROM public.profiles WHERE ref_code IS NULL ORDER BY created_at LOOP
    IF r.role = 'client' THEN
      UPDATE public.profiles SET ref_code = 'CUST-' || num WHERE id = r.id;
      num := num + 1;
    ELSIF r.role = 'vendor' THEN
      UPDATE public.profiles SET ref_code = 'SUP-' || vnum WHERE id = r.id;
      vnum := vnum + 1;
    ELSE
      UPDATE public.profiles SET ref_code = 'ADM-' || anum WHERE id = r.id;
      anum := anum + 1;
    END IF;
  END LOOP;
END;
$$;

-- 2) Admin RBAC roles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_role text CHECK (admin_role IN ('super_admin','edit','view_only','delete')) DEFAULT NULL;

-- 3) Audit Log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by uuid REFERENCES auth.users(id),
  action text NOT NULL,          -- 'create','update','delete','approve','reject','login_attempt'
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  description text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_admin_all" ON public.audit_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 4) Admin bypass RLS policies (needed for admin to view all data)
-- profiles
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- orders
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- rfqs
DROP POLICY IF EXISTS "rfqs_admin_all" ON public.rfqs;
CREATE POLICY "rfqs_admin_all" ON public.rfqs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- quotes
DROP POLICY IF EXISTS "quotes_admin_all" ON public.quotes;
CREATE POLICY "quotes_admin_all" ON public.quotes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- invoices
DROP POLICY IF EXISTS "invoices_admin_all" ON public.invoices;
CREATE POLICY "invoices_admin_all" ON public.invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- invoice_items
DROP POLICY IF EXISTS "invoice_items_admin_all" ON public.invoice_items;
CREATE POLICY "invoice_items_admin_all" ON public.invoice_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- wallet_transactions
DROP POLICY IF EXISTS "wallet_admin_all" ON public.wallet_transactions;
CREATE POLICY "wallet_admin_all" ON public.wallet_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- deals
DROP POLICY IF EXISTS "deals_admin_all" ON public.deals;
CREATE POLICY "deals_admin_all" ON public.deals FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
