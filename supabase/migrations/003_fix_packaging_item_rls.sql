-- Fix RLS: allow purchase_manager to manage packaging and inventory_item
-- (consistent with partner, purchase_invoice, inventory, adjustment, etc.)

-- packaging
DROP POLICY IF EXISTS packaging_insert ON packaging;
DROP POLICY IF EXISTS packaging_update ON packaging;
DROP POLICY IF EXISTS packaging_delete ON packaging;

CREATE POLICY packaging_insert ON packaging
  FOR INSERT WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

CREATE POLICY packaging_update ON packaging
  FOR UPDATE USING (auth_role() IN ('admin', 'purchase_manager'))
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

CREATE POLICY packaging_delete ON packaging
  FOR DELETE USING (auth_role() IN ('admin', 'purchase_manager'));

-- inventory_item
DROP POLICY IF EXISTS item_insert ON inventory_item;
DROP POLICY IF EXISTS item_update ON inventory_item;
DROP POLICY IF EXISTS item_delete ON inventory_item;

CREATE POLICY item_insert ON inventory_item
  FOR INSERT WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

CREATE POLICY item_update ON inventory_item
  FOR UPDATE USING (auth_role() IN ('admin', 'purchase_manager'))
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

CREATE POLICY item_delete ON inventory_item
  FOR DELETE USING (auth_role() IN ('admin', 'purchase_manager'));
