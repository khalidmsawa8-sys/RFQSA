-- =============================================
-- Invoices and Payments System
-- =============================================

-- 1) Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE UNIQUE,
  invoice_number text UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'approved', 'paid', 'cancelled')),
  issue_date date,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  qr_code_data text,
  notes text,
  issued_by uuid REFERENCES auth.users(id),
  issued_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_parties" ON public.invoices FOR SELECT
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

CREATE POLICY "invoices_insert_vendor" ON public.invoices FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND deals.vendor_id = auth.uid()));

CREATE POLICY "invoices_update_parties" ON public.invoices FOR UPDATE
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

-- 2) Invoice Items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_number text,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  line_total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_items_select" ON public.invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND
    EXISTS (SELECT 1 FROM deals WHERE deals.id = invoices.deal_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid()))));

CREATE POLICY "invoice_items_insert" ON public.invoice_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_id AND
    EXISTS (SELECT 1 FROM deals WHERE deals.id = invoices.deal_id AND deals.vendor_id = auth.uid())));

-- 3) Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('manual', 'transfer', 'check')),
  reference_number text,
  notes text,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_parties" ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM invoices
    INNER JOIN deals ON deals.id = invoices.deal_id
    WHERE invoices.id = invoice_id AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())));

CREATE POLICY "payments_insert_vendor" ON public.payments FOR INSERT
  WITH CHECK (recorded_by = auth.uid() AND EXISTS (SELECT 1 FROM invoices
    INNER JOIN deals ON deals.id = invoices.deal_id
    WHERE invoices.id = invoice_id AND deals.vendor_id = auth.uid()));
