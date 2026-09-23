-- Allow NULL on support_request_items.deal_item_id
-- Items sourced from quotes.items (JSONB) have no real deal_items row to reference.
-- The denormalized columns (part_name, part_number, quantity, unit_price) preserve item info.

ALTER TABLE public.support_request_items
  ALTER COLUMN deal_item_id DROP NOT NULL;
