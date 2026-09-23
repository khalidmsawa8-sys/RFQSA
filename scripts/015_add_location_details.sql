-- Add detailed location fields to rfqs table
ALTER TABLE rfqs ADD COLUMN delivery_street VARCHAR NULL;
ALTER TABLE rfqs ADD COLUMN delivery_district VARCHAR NULL;
ALTER TABLE rfqs ADD COLUMN delivery_city VARCHAR NULL;

-- Create index for faster location queries
CREATE INDEX idx_rfqs_delivery_city ON rfqs(delivery_city);
