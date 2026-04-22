-- Many-to-many relationship between inventory_item and packaging
-- Replaces the single packaging_id FK on inventory_item

-- Junction table
CREATE TABLE IF NOT EXISTS item_packaging (
  item_id      UUID NOT NULL REFERENCES inventory_item(id) ON DELETE CASCADE,
  packaging_id UUID NOT NULL REFERENCES packaging(id)      ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_id, packaging_id)
);

CREATE INDEX idx_item_packaging_item ON item_packaging(item_id);
CREATE INDEX idx_item_packaging_pkg  ON item_packaging(packaging_id);

-- Migrate existing single-packaging data into the junction table
INSERT INTO item_packaging (item_id, packaging_id)
SELECT id, packaging_id
FROM inventory_item
WHERE packaging_id IS NOT NULL AND deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Remove the old single-value column
ALTER TABLE inventory_item DROP COLUMN IF EXISTS packaging_id;

-- RLS
ALTER TABLE item_packaging ENABLE ROW LEVEL SECURITY;

CREATE POLICY ip_select ON item_packaging FOR SELECT USING (TRUE);
CREATE POLICY ip_insert ON item_packaging FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));
CREATE POLICY ip_delete ON item_packaging FOR DELETE
  USING (auth_role() IN ('admin', 'purchase_manager'));
