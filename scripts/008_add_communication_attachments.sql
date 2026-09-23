-- Add attachment columns to deal_communications table
ALTER TABLE public.deal_communications
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Add comment
COMMENT ON COLUMN public.deal_communications.attachment_url IS 'URL to uploaded file (invoice, images, etc)';
COMMENT ON COLUMN public.deal_communications.attachment_name IS 'Original filename of the attachment';
