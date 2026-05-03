-- Allow 'manager' role (in addition to admin / purchase_manager) to create
-- inventory adjustments. The createAdjustment service writes to:
--   adjustment, adjustment_item, inventory, inventory_record, inventory_item
-- so all of them need the broadened INSERT/UPDATE rule.

-- adjustment
DROP POLICY IF EXISTS adj_insert ON adjustment;
CREATE POLICY adj_insert ON adjustment FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager', 'manager'));

-- adjustment_item
DROP POLICY IF EXISTS adjit_insert ON adjustment_item;
CREATE POLICY adjit_insert ON adjustment_item FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager', 'manager'));

-- inventory (operation header)
DROP POLICY IF EXISTS inv_insert ON inventory;
CREATE POLICY inv_insert ON inventory FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager', 'manager'));

-- inventory_record (per-line stock movement)
DROP POLICY IF EXISTS invrec_insert ON inventory_record;
CREATE POLICY invrec_insert ON inventory_record FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager', 'manager'));

-- inventory_item aggregate update (qty + avg_cost)
DROP POLICY IF EXISTS item_update ON inventory_item;
CREATE POLICY item_update ON inventory_item FOR UPDATE
  USING      (auth_role() IN ('admin', 'purchase_manager', 'manager'))
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager', 'manager'));
