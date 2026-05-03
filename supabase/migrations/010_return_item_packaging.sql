-- Track which packaging a return line refers to, so per-packaging stock
-- (item_stock) can be updated alongside the inventory_item aggregate.

ALTER TABLE return_item
  ADD COLUMN IF NOT EXISTS packaging_id UUID REFERENCES packaging(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_return_item_packaging
  ON return_item(packaging_id);
