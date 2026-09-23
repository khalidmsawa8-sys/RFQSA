-- Deal Enhancements Migration
-- Adds comprehensive deal management features including items, timeline, communications, and ratings

-- 1. Add new columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_method text CHECK (delivery_method IN ('pickup', 'shipping'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_location text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_company text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_terms text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS warranty_duration text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_policy text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0.15;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes_from_vendor text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Update status constraint for orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'completed', 'cancelled'));

-- 3. Create deal_items table
CREATE TABLE IF NOT EXISTS public.deal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_number text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  line_total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  availability_status text CHECK (availability_status IN ('available', 'ordered', 'not_available')) DEFAULT 'available',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create deal_timeline table
CREATE TABLE IF NOT EXISTS public.deal_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_description text NOT NULL,
  performed_by uuid REFERENCES public.profiles(id),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- 5. Create deal_communications table
CREATE TABLE IF NOT EXISTS public.deal_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  communication_type text NOT NULL CHECK (communication_type IN ('status_request', 'quantity_change', 'delivery_inquiry', 'invoice_request', 'ready_notification', 'other')),
  message text NOT NULL,
  response text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'resolved')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

-- 6. Create deal_ratings table
CREATE TABLE IF NOT EXISTS public.deal_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rated_by uuid NOT NULL REFERENCES public.profiles(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id, rated_by)
);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_deal_items_order_id ON public.deal_items(order_id);
CREATE INDEX IF NOT EXISTS idx_deal_timeline_order_id ON public.deal_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_deal_timeline_created_at ON public.deal_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_communications_order_id ON public.deal_communications(order_id);
CREATE INDEX IF NOT EXISTS idx_deal_communications_status ON public.deal_communications(status);
CREATE INDEX IF NOT EXISTS idx_deal_ratings_order_id ON public.deal_ratings(order_id);

-- 8. RLS Policies for deal_items
ALTER TABLE public.deal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_items_select_parties" ON public.deal_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_items.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "deal_items_insert_vendor" ON public.deal_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_items.order_id
      AND o.vendor_id = auth.uid()
    )
  );

CREATE POLICY "deal_items_update_vendor" ON public.deal_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_items.order_id
      AND o.vendor_id = auth.uid()
    )
  );

-- 9. RLS Policies for deal_timeline
ALTER TABLE public.deal_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_timeline_select_parties" ON public.deal_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_timeline.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "deal_timeline_insert_parties" ON public.deal_timeline
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_timeline.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid())
    )
  );

-- 10. RLS Policies for deal_communications
ALTER TABLE public.deal_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_communications_select_parties" ON public.deal_communications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_communications.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "deal_communications_insert_parties" ON public.deal_communications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_communications.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "deal_communications_update_parties" ON public.deal_communications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_communications.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid())
    )
  );

-- 11. RLS Policies for deal_ratings
ALTER TABLE public.deal_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_ratings_select_parties" ON public.deal_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_ratings.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "deal_ratings_insert_own" ON public.deal_ratings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deal_ratings.order_id
      AND (o.client_id = auth.uid() OR o.vendor_id = auth.uid())
      AND o.status = 'completed'
    )
    AND rated_by = auth.uid()
  );

-- 12. Create trigger function for timeline logging
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.deal_timeline (order_id, event_type, event_description, performed_by)
    VALUES (
      NEW.id,
      'status_change',
      'تم تغيير الحالة من ' || OLD.status || ' إلى ' || NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create trigger for order status changes
DROP TRIGGER IF EXISTS order_status_change_trigger ON public.orders;
CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();

-- 14. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 15. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_deal_items_updated_at ON public.deal_items;
CREATE TRIGGER update_deal_items_updated_at
  BEFORE UPDATE ON public.deal_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 16. Create function to calculate order totals
CREATE OR REPLACE FUNCTION public.calculate_order_totals(p_order_id uuid)
RETURNS void AS $$
DECLARE
  v_subtotal numeric;
  v_tax_rate numeric;
  v_tax_amount numeric;
  v_total numeric;
BEGIN
  -- Calculate subtotal from deal_items
  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM public.deal_items
  WHERE order_id = p_order_id;
  
  -- Get tax rate
  SELECT tax_rate INTO v_tax_rate
  FROM public.orders
  WHERE id = p_order_id;
  
  -- Calculate tax and total
  v_tax_amount := v_subtotal * v_tax_rate;
  v_total := v_subtotal + v_tax_amount;
  
  -- Update orders table
  UPDATE public.orders
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total_price = v_total
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create trigger to recalculate totals when deal_items change
CREATE OR REPLACE FUNCTION public.recalculate_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.calculate_order_totals(COALESCE(NEW.order_id, OLD.order_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deal_items_totals_trigger ON public.deal_items;
CREATE TRIGGER deal_items_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.deal_items
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_order_totals();
