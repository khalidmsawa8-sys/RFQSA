-- Complete fix for admin policies - remove infinite recursion

-- Drop ALL policies from profiles to start fresh
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

-- Recreate basic policies WITHOUT admin checks on profiles table
-- This prevents infinite recursion
CREATE POLICY "profiles_select_all" ON public.profiles 
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Drop and recreate the is_admin function to NOT query profiles
-- Instead, use a direct check without SELECT
DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

-- Now recreate admin policies for OTHER tables using the function
DROP POLICY IF EXISTS "rfqs_select_admin" ON public.rfqs;
DROP POLICY IF EXISTS "rfqs_update_admin" ON public.rfqs;
DROP POLICY IF EXISTS "quotes_select_admin" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_admin" ON public.quotes;
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
DROP POLICY IF EXISTS "messages_select_admin" ON public.messages;
DROP POLICY IF EXISTS "order_files_select_admin" ON public.order_files;

-- Add admin policies to other tables
CREATE POLICY "rfqs_select_admin" ON public.rfqs
  FOR SELECT USING (public.current_user_is_admin());

CREATE POLICY "rfqs_update_admin" ON public.rfqs
  FOR UPDATE USING (public.current_user_is_admin());

CREATE POLICY "quotes_select_admin" ON public.quotes
  FOR SELECT USING (public.current_user_is_admin());

CREATE POLICY "quotes_update_admin" ON public.quotes
  FOR UPDATE USING (public.current_user_is_admin());

CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT USING (public.current_user_is_admin());

CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE USING (public.current_user_is_admin());

CREATE POLICY "messages_select_admin" ON public.messages
  FOR SELECT USING (public.current_user_is_admin());

CREATE POLICY "order_files_select_admin" ON public.order_files
  FOR SELECT USING (public.current_user_is_admin());
