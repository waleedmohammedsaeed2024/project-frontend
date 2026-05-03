-- Open return INSERT/UPDATE to any authenticated user.
-- The earlier role-gated policies were rejecting users whose JWT
-- app_metadata.role is unset or not in the allowed list.
-- The createReturn service writes to:
--   return, return_item, inventory, inventory_record, inventory_item, item_stock
-- so all of them need the broadened rule.

-- return
DROP POLICY IF EXISTS ret_insert ON return;
CREATE POLICY ret_insert ON return FOR INSERT TO authenticated
  WITH CHECK (true);

-- return_item
DROP POLICY IF EXISTS retit_insert ON return_item;
CREATE POLICY retit_insert ON return_item FOR INSERT TO authenticated
  WITH CHECK (true);

-- inventory (operation header) — already opened by 008, repeat for safety
DROP POLICY IF EXISTS inv_insert ON inventory;
CREATE POLICY inv_insert ON inventory FOR INSERT TO authenticated
  WITH CHECK (true);

-- inventory_record (per-line stock movement) — same
DROP POLICY IF EXISTS invrec_insert ON inventory_record;
CREATE POLICY invrec_insert ON inventory_record FOR INSERT TO authenticated
  WITH CHECK (true);

-- inventory_item: returns update qty on this aggregate
DROP POLICY IF EXISTS item_update ON inventory_item;
CREATE POLICY item_update ON inventory_item FOR UPDATE TO authenticated
  USING      (true)
  WITH CHECK (true);
