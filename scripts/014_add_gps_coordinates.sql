-- Add GPS coordinates to rfqs table
ALTER TABLE public.rfqs 
ADD COLUMN IF NOT EXISTS delivery_latitude numeric(10, 8),
ADD COLUMN IF NOT EXISTS delivery_longitude numeric(11, 8);

COMMENT ON COLUMN public.rfqs.delivery_latitude IS 'GPS latitude for delivery location';
COMMENT ON COLUMN public.rfqs.delivery_longitude IS 'GPS longitude for delivery location';
