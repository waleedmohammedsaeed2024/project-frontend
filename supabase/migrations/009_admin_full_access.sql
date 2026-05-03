-- Grant the admin role unrestricted access on every RLS-enabled table.
-- Postgres OR's all matching policies, so adding an `admin_all` policy
-- alongside existing policies effectively makes admin bypass them.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'partner',
    'packaging',
    'inventory_item',
    'item_packaging',
    'purchase_invoice',
    'purchase_invoice_item',
    'sales_order',
    'sales_order_item',
    'delivery_note',
    'sales_invoice',
    'inventory',
    'inventory_record',
    'return',
    'return_item',
    'adjustment',
    'adjustment_item',
    'audit_log',
    'notification_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_all ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY admin_all ON %I FOR ALL TO authenticated USING (auth_role() = ''admin'') WITH CHECK (auth_role() = ''admin'')',
      tbl
    );
  END LOOP;
END $$;

-- item_stock is referenced from code but not yet defined in any migration.
-- Once it's created (with RLS enabled), add the same policy:
--   CREATE POLICY admin_all ON item_stock FOR ALL TO authenticated
--     USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');
