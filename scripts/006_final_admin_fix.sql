-- Drop all admin policies first to avoid dependency issues
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "rfqs_select_admin" ON public.rfqs;
DROP POLICY IF EXISTS "rfqs_update_admin" ON public.rfqs;
DROP POLICY IF EXISTS "rfqs_delete_admin" ON public.rfqs;
DROP POLICY IF EXISTS "quotes_select_admin" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_admin" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete_admin" ON public.quotes;

-- Now drop the function
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Create a stable function that checks admin status from raw_user_meta_data in auth.users
-- This avoids infinite recursion by not querying the profiles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Now recreate admin policies for other tables (NOT profiles to avoid recursion)
-- RFQs admin policies
CREATE POLICY "rfqs_admin_all" ON public.rfqs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Quotes admin policies  
CREATE POLICY "quotes_admin_all" ON public.quotes
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Orders admin policies
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Messages admin policies
CREATE POLICY "messages_admin_all" ON public.messages
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Order files admin policies
CREATE POLICY "order_files_admin_all" ON public.order_files
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Profiles: keep only the original policies, NO admin policies to avoid recursion
-- The original policies already exist from migration 001
