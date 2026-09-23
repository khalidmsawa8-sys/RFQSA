-- Add delivery location to RFQs
ALTER TABLE public.rfqs 
ADD COLUMN IF NOT EXISTS delivery_location text;

COMMENT ON COLUMN public.rfqs.delivery_location IS 'موقع استلام الطلب من العميل';
