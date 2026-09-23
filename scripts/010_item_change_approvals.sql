-- Create table for tracking item change requests that need approval
CREATE TABLE IF NOT EXISTS public.deal_item_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  deal_item_id uuid REFERENCES public.deal_items(id) ON DELETE CASCADE,
  change_type text NOT NULL, -- 'add', 'update', 'delete'
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  part_name text,
  part_number text,
  quantity integer,
  unit_price numeric,
  notes text,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.deal_item_changes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "deal_item_changes_select_parties"
  ON public.deal_item_changes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = deal_item_changes.order_id
      AND (orders.client_id = auth.uid() OR orders.vendor_id = auth.uid())
    )
    OR is_admin()
  );

CREATE POLICY "deal_item_changes_insert_parties"
  ON public.deal_item_changes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = deal_item_changes.order_id
      AND (orders.client_id = auth.uid() OR orders.vendor_id = auth.uid())
    )
  );

CREATE POLICY "deal_item_changes_update_parties"
  ON public.deal_item_changes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = deal_item_changes.order_id
      AND (orders.client_id = auth.uid() OR orders.vendor_id = auth.uid())
    )
  );

-- Create index
CREATE INDEX IF NOT EXISTS idx_deal_item_changes_order_id ON public.deal_item_changes(order_id);
CREATE INDEX IF NOT EXISTS idx_deal_item_changes_status ON public.deal_item_changes(status);
