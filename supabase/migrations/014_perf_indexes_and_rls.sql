-- 014_perf_indexes_and_rls.sql
-- Performance pass: no behavioral changes.
--   1. Add indexes on every foreign-key column that wasn't already covered by a
--      UNIQUE constraint or an existing index. Unindexed FKs cause seq scans on
--      JOINs and table-wide locks on ON DELETE CASCADE.
--   2. Rewrite every RLS policy that calls auth_role() so the call is wrapped in
--      a scalar subquery: (select auth_role()) instead of auth_role().
--      Postgres can then evaluate it once per query (InitPlan) instead of once
--      per row. See: https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations

-- ============================================================
-- 1. FOREIGN-KEY INDEXES
-- ============================================================
-- Soft-deleted-aware partial indexes match the pattern used in 001.

CREATE INDEX IF NOT EXISTS idx_pii_invoice
  ON purchase_invoice_item(purchase_invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pii_item
  ON purchase_invoice_item(item_id)             WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_so_customer
  ON sales_order(customer_id)                   WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_soi_order
  ON sales_order_item(sales_order_id)           WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_soi_item
  ON sales_order_item(item_id)                  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invrec_inventory
  ON inventory_record(inventory_id)             WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invrec_item
  ON inventory_record(item_id)                  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_retit_return
  ON return_item(return_id)                     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_retit_item
  ON return_item(item_id)                       WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_adjit_adjustment
  ON adjustment_item(adjustment_id)             WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_adjit_item
  ON adjustment_item(item_id)                   WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notif_partner
  ON notification_log(partner_id);

-- return.ref_invoice_id is polymorphic (no FK), but it's looked up on every
-- return view; index it together with return_type for selectivity.
CREATE INDEX IF NOT EXISTS idx_return_ref
  ON return(return_type, ref_invoice_id)        WHERE deleted_at IS NULL;

-- ============================================================
-- 2. RLS POLICY REWRITES — wrap auth_role() in (select ...)
-- ============================================================
-- Each block: drop the existing policy, recreate with the same predicate but
-- using (select auth_role()) so it's evaluated once per query, not per row.

-- ---- partner ----
DROP POLICY IF EXISTS partner_insert ON partner;
CREATE POLICY partner_insert ON partner FOR INSERT
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

DROP POLICY IF EXISTS partner_update ON partner;
CREATE POLICY partner_update ON partner FOR UPDATE
  USING      ((select auth_role()) IN ('admin', 'purchase_manager'))
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

DROP POLICY IF EXISTS partner_delete ON partner;
CREATE POLICY partner_delete ON partner FOR DELETE
  USING ((select auth_role()) = 'admin');

-- ---- packaging ----
DROP POLICY IF EXISTS packaging_insert ON packaging;
CREATE POLICY packaging_insert ON packaging FOR INSERT
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

DROP POLICY IF EXISTS packaging_update ON packaging;
CREATE POLICY packaging_update ON packaging FOR UPDATE
  USING      ((select auth_role()) IN ('admin', 'purchase_manager'))
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

DROP POLICY IF EXISTS packaging_delete ON packaging;
CREATE POLICY packaging_delete ON packaging FOR DELETE
  USING ((select auth_role()) IN ('admin', 'purchase_manager'));

-- ---- inventory_item ----
DROP POLICY IF EXISTS item_insert ON inventory_item;
CREATE POLICY item_insert ON inventory_item FOR INSERT
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

DROP POLICY IF EXISTS item_delete ON inventory_item;
CREATE POLICY item_delete ON inventory_item FOR DELETE
  USING ((select auth_role()) IN ('admin', 'purchase_manager'));
-- item_update is intentionally left as the open `to authenticated using (true)`
-- policy from 011 — adjustments and returns need to update qty/avg_cost from
-- any role, and there's no auth_role() call to optimize there.

-- ---- item_packaging ----
DROP POLICY IF EXISTS ip_insert ON item_packaging;
CREATE POLICY ip_insert ON item_packaging FOR INSERT
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

DROP POLICY IF EXISTS ip_delete ON item_packaging;
CREATE POLICY ip_delete ON item_packaging FOR DELETE
  USING ((select auth_role()) IN ('admin', 'purchase_manager'));

-- ---- purchase_invoice ----
DROP POLICY IF EXISTS pi_insert ON purchase_invoice;
CREATE POLICY pi_insert ON purchase_invoice FOR INSERT
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

DROP POLICY IF EXISTS pi_delete ON purchase_invoice;
CREATE POLICY pi_delete ON purchase_invoice FOR DELETE
  USING ((select auth_role()) = 'admin');

-- ---- purchase_invoice_item ----
DROP POLICY IF EXISTS pii_insert ON purchase_invoice_item;
CREATE POLICY pii_insert ON purchase_invoice_item FOR INSERT
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

-- ---- sales_order ----
DROP POLICY IF EXISTS so_insert ON sales_order;
CREATE POLICY so_insert ON sales_order FOR INSERT
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

DROP POLICY IF EXISTS so_update ON sales_order;
CREATE POLICY so_update ON sales_order FOR UPDATE
  USING ((select auth_role()) IN ('admin', 'purchase_manager', 'salesman'));

DROP POLICY IF EXISTS so_delete ON sales_order;
CREATE POLICY so_delete ON sales_order FOR DELETE
  USING ((select auth_role()) = 'admin');

-- ---- sales_order_item ----
DROP POLICY IF EXISTS soi_insert ON sales_order_item;
CREATE POLICY soi_insert ON sales_order_item FOR INSERT
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

-- ---- delivery_note ----
DROP POLICY IF EXISTS dn_insert ON delivery_note;
CREATE POLICY dn_insert ON delivery_note FOR INSERT
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager'));

DROP POLICY IF EXISTS dn_update ON delivery_note;
CREATE POLICY dn_update ON delivery_note FOR UPDATE
  USING ((select auth_role()) IN ('admin', 'purchase_manager', 'salesman'));

-- ---- sales_invoice ----
DROP POLICY IF EXISTS si_insert ON sales_invoice;
CREATE POLICY si_insert ON sales_invoice FOR INSERT
  WITH CHECK ((select auth_role()) IN ('admin', 'purchase_manager', 'salesman'));

DROP POLICY IF EXISTS si_update ON sales_invoice;
CREATE POLICY si_update ON sales_invoice FOR UPDATE
  USING ((select auth_role()) = 'admin');

-- ---- audit_log ----
DROP POLICY IF EXISTS al_select ON audit_log;
CREATE POLICY al_select ON audit_log FOR SELECT
  USING ((select auth_role()) IN ('admin', 'manager'));

-- ---- notification_log ----
DROP POLICY IF EXISTS nl_select ON notification_log;
CREATE POLICY nl_select ON notification_log FOR SELECT
  USING ((select auth_role()) = 'admin');

-- ---- admin_all (across every RLS-enabled table) ----
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
      'CREATE POLICY admin_all ON %I FOR ALL TO authenticated '
      'USING ((select auth_role()) = ''admin'') '
      'WITH CHECK ((select auth_role()) = ''admin'')',
      tbl
    );
  END LOOP;
END $$;

-- Tell PostgREST to refresh its schema cache.
notify pgrst, 'reload schema';
