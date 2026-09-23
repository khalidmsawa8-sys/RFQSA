-- wallet_transactions: سجل كامل لكل عمليات الإضافة والسحب لكل مستخدم
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('credit', 'debit')),   -- دائن / مدين
  amount        numeric(12, 2) NOT NULL CHECK (amount > 0),
  balance_after numeric(12, 2) NOT NULL DEFAULT 0,
  description   text NOT NULL,
  reference     text,          -- رقم مرجعي اختياري
  order_id      uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  performed_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,  -- من أجرى العملية (admin)
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- فهرس للبحث السريع بالمستخدم
CREATE INDEX IF NOT EXISTS wallet_transactions_user_id_idx ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx ON public.wallet_transactions(created_at DESC);

-- تفعيل RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- السياسات
-- المستخدم يرى فقط عملياته الخاصة
CREATE POLICY wallet_select_own ON public.wallet_transactions
  FOR SELECT USING (user_id = auth.uid());

-- المشرف يرى الكل ويضيف
CREATE POLICY wallet_admin_all ON public.wallet_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- دالة لحساب رصيد المستخدم الحالي
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT balance_after FROM public.wallet_transactions
     WHERE user_id = p_user_id
     ORDER BY created_at DESC, id DESC
     LIMIT 1),
    0
  );
$$;
