-- Fix: Allow both client and vendor to insert deal_items
-- The client needs to insert items when accepting a quote
DROP POLICY IF EXISTS "deal_items_insert_vendor" ON public.deal_items;

CREATE POLICY "deal_items_insert_parties" ON public.deal_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_items.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid())
    )
  );

-- Also allow both parties to update items (for approval system)
DROP POLICY IF EXISTS "deal_items_update_vendor" ON public.deal_items;

CREATE POLICY "deal_items_update_parties" ON public.deal_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_items.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid())
    )
  );

-- Allow both parties to delete items
CREATE POLICY "deal_items_delete_parties" ON public.deal_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_items.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid())
    )
  );
