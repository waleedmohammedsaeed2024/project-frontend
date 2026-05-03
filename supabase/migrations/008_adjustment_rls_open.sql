-- Open adjustment INSERT/UPDATE to any authenticated user.
-- The earlier role-gated policies were rejecting users whose JWT
-- app_metadata.role is unset or not in the allowed list.

-- adjustment
DROP POLICY IF EXISTS adj_insert ON adjustment;
CREATE POLICY adj_insert ON adjustment FOR INSERT TO authenticated
  WITH CHECK (true);

-- adjustment_item
DROP POLICY IF EXISTS adjit_insert ON adjustment_item;
CREATE POLICY adjit_insert ON adjustment_item FOR INSERT TO authenticated
  WITH CHECK (true);

-- inventory (operation header) — adjustments insert here too
DROP POLICY IF EXISTS inv_insert ON inventory;
CREATE POLICY inv_insert ON inventory FOR INSERT TO authenticated
  WITH CHECK (true);

-- inventory_record (per-line stock movement)
DROP POLICY IF EXISTS invrec_insert ON inventory_record;
CREATE POLICY invrec_insert ON inventory_record FOR INSERT TO authenticated
  WITH CHECK (true);

-- inventory_item: adjustments update qty + avg_cost on this aggregate
DROP POLICY IF EXISTS item_update ON inventory_item;
CREATE POLICY item_update ON inventory_item FOR UPDATE TO authenticated
  USING      (true)
  WITH CHECK (true);
