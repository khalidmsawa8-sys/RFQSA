-- Drop the problematic admin policies
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "rfqs_select_admin" ON public.rfqs;
DROP POLICY IF EXISTS "quotes_select_admin" ON public.quotes;
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
DROP POLICY IF EXISTS "messages_select_admin" ON public.messages;
DROP POLICY IF EXISTS "order_files_select_admin" ON public.order_files;

-- Create a security definer function to check if user is admin
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

-- Recreate admin policies using the security definer function
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "rfqs_select_admin" ON public.rfqs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "rfqs_update_admin" ON public.rfqs
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "quotes_select_admin" ON public.quotes
  FOR SELECT USING (public.is_admin());

CREATE POLICY "quotes_update_admin" ON public.quotes
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT USING (public.is_admin());

CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "messages_select_admin" ON public.messages
  FOR SELECT USING (public.is_admin());

CREATE POLICY "order_files_select_admin" ON public.order_files
  FOR SELECT USING (public.is_admin());
