-- Track which packaging an adjustment line targets, so per-packaging stock
-- (item_stock) can be updated alongside the inventory_item aggregate.

ALTER TABLE adjustment_item
  ADD COLUMN IF NOT EXISTS packaging_id UUID REFERENCES packaging(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_adjustment_item_packaging
  ON adjustment_item(packaging_id);
