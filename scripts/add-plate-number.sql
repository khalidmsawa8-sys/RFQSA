-- Add plate_number column to rfqs table
ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS plate_number TEXT;

-- Add comment
COMMENT ON COLUMN rfqs.plate_number IS 'رقم اللوحة للمركبة';
