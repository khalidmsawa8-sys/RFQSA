-- =============================================
-- 019: Order Activity Log + Rejection Reason on deal_item_changes
-- =============================================

-- 1) Add rejection_reason to deal_item_changes (if not exists)
ALTER TABLE public.deal_item_changes
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2) Add reviewed_by to deal_item_changes for approval audit trail
ALTER TABLE public.deal_item_changes
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

-- 3) Create order_activity_log table — unified timeline per order
CREATE TABLE IF NOT EXISTS public.order_activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id),
  event_type   text NOT NULL,
  -- e.g. 'status_changed' | 'item_added' | 'item_edited' | 'item_deleted'
  --      'edit_requested' | 'edit_approved' | 'edit_rejected' | 'review_submitted'
  description  text NOT NULL,
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.order_activity_log ENABLE ROW LEVEL SECURITY;

-- Parties + admin can read
CREATE POLICY "activity_log_select_parties"
  ON public.order_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_activity_log.order_id
        AND (orders.client_id = auth.uid() OR orders.vendor_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Parties can insert their own events
CREATE POLICY "activity_log_insert_parties"
  ON public.order_activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_activity_log.order_id
        AND (orders.client_id = auth.uid() OR orders.vendor_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_order_id  ON public.order_activity_log(order_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created   ON public.order_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_item_changes_reviewed ON public.deal_item_changes(reviewed_by);
