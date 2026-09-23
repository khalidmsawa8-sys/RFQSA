-- =============================================
-- Deal System Rebuild: Versions, Amendments, Files, Events
-- =============================================

-- 1) Deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  client_id uuid NOT NULL REFERENCES auth.users(id),
  vendor_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','ready','shipped','delivered','completed','cancelled')),
  current_version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals_select_parties" ON public.deals FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = vendor_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "deals_insert_auth" ON public.deals FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "deals_update_parties" ON public.deals FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = vendor_id);

-- 2) Deal Versions
CREATE TABLE IF NOT EXISTS public.deal_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  total_price numeric NOT NULL DEFAULT 0,
  delivery_days integer,
  warranty_terms text,
  warranty_duration text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.deal_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_versions_select" ON public.deal_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

CREATE POLICY "deal_versions_insert" ON public.deal_versions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

-- 3) Deal Version Items
CREATE TABLE IF NOT EXISTS public.deal_version_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.deal_versions(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_number text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  availability text DEFAULT 'available'
);

ALTER TABLE public.deal_version_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_version_items_select" ON public.deal_version_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM deal_versions dv JOIN deals d ON d.id = dv.deal_id
    WHERE dv.id = version_id AND (d.client_id = auth.uid() OR d.vendor_id = auth.uid())
  ));

CREATE POLICY "deal_version_items_insert" ON public.deal_version_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM deal_versions dv JOIN deals d ON d.id = dv.deal_id
    WHERE dv.id = version_id AND (d.client_id = auth.uid() OR d.vendor_id = auth.uid())
  ));

-- 4) Amendment Requests
CREATE TABLE IF NOT EXISTS public.amendment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('add_item','remove_item','modify_item')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.amendment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amendments_select" ON public.amendment_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

CREATE POLICY "amendments_insert" ON public.amendment_requests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

CREATE POLICY "amendments_update" ON public.amendment_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

-- 5) Amendment Items (the proposed changes)
CREATE TABLE IF NOT EXISTS public.amendment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amendment_id uuid NOT NULL REFERENCES public.amendment_requests(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_number text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  original_item_id uuid REFERENCES public.deal_version_items(id)
);

ALTER TABLE public.amendment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amendment_items_select" ON public.amendment_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM amendment_requests ar JOIN deals d ON d.id = ar.deal_id
    WHERE ar.id = amendment_id AND (d.client_id = auth.uid() OR d.vendor_id = auth.uid())
  ));

CREATE POLICY "amendment_items_insert" ON public.amendment_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM amendment_requests ar JOIN deals d ON d.id = ar.deal_id
    WHERE ar.id = amendment_id AND (d.client_id = auth.uid() OR d.vendor_id = auth.uid())
  ));

-- 6) Deal Files
CREATE TABLE IF NOT EXISTS public.deal_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'document' CHECK (file_type IN ('invoice','image','document')),
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','confirmed')),
  confirmed_by uuid REFERENCES auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.deal_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_files_select" ON public.deal_files FOR SELECT
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

CREATE POLICY "deal_files_insert" ON public.deal_files FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

CREATE POLICY "deal_files_update" ON public.deal_files FOR UPDATE
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

-- 7) Deal Events (Timeline)
CREATE TABLE IF NOT EXISTS public.deal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_events_select" ON public.deal_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

CREATE POLICY "deal_events_insert" ON public.deal_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

-- 8) Deal Ratings (only after completed)
CREATE TABLE IF NOT EXISTS public.deal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES auth.users(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(deal_id, rater_id)
);

ALTER TABLE public.deal_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_reviews_select" ON public.deal_reviews FOR SELECT
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

CREATE POLICY "deal_reviews_insert" ON public.deal_reviews FOR INSERT
  WITH CHECK (rater_id = auth.uid() AND EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND deals.status = 'completed'));

-- 9) Create storage bucket for deal files
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-files', 'deal-files', true) ON CONFLICT DO NOTHING;

CREATE POLICY "deal_files_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'deal-files' AND auth.role() = 'authenticated');

CREATE POLICY "deal_files_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'deal-files');
