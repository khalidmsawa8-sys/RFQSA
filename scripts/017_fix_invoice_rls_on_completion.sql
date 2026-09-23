-- Fix: Allow both client and vendor to create invoice when deal is completed
-- Previously only vendor could INSERT invoice, but completion can be triggered by either party

-- Drop old restrictive insert policy
DROP POLICY IF EXISTS "invoices_insert_vendor" ON public.invoices;

-- New policy: any party to the deal can insert an invoice
CREATE POLICY "invoices_insert_parties" ON public.invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_id
        AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())
    )
  );

-- Same fix for invoice_items
DROP POLICY IF EXISTS "invoice_items_insert" ON public.invoice_items;

CREATE POLICY "invoice_items_insert_parties" ON public.invoice_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_id
        AND EXISTS (
          SELECT 1 FROM deals
          WHERE deals.id = invoices.deal_id
            AND (deals.client_id = auth.uid() OR deals.vendor_id = auth.uid())
        )
    )
  );
