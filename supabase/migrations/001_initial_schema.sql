-- ============================================================
-- Inventory-Centric ERP — Initial Schema Migration
-- Version: 001
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- HELPERS: auto-update updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: partner
-- Types: c=Client, s=Supplier, u=Customer
-- ============================================================
CREATE TABLE IF NOT EXISTS partner (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name     VARCHAR(255)  NOT NULL,
  partner_type     CHAR(1)       NOT NULL CHECK (partner_type IN ('c', 's', 'u')),
  phone            VARCHAR(20),
  balance          NUMERIC(14,4) NOT NULL DEFAULT 0,
  parent_client_id UUID          REFERENCES partner(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL,
  -- Customers must belong to a client; clients/suppliers must NOT have a parent
  CONSTRAINT chk_customer_parent CHECK (
    (partner_type = 'u' AND parent_client_id IS NOT NULL) OR
    (partner_type IN ('c', 's') AND parent_client_id IS NULL)
  )
);

CREATE TRIGGER trg_partner_updated_at
  BEFORE UPDATE ON partner
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_partner_type ON partner(partner_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_partner_parent ON partner(parent_client_id) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE: packaging
-- ============================================================
CREATE TABLE IF NOT EXISTS packaging (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_arab    VARCHAR(100) NOT NULL,
  pack_eng     VARCHAR(100) NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ  DEFAULT NULL
);

CREATE TRIGGER trg_packaging_updated_at
  BEFORE UPDATE ON packaging
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: inventory_item  (master Item catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_item (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name         VARCHAR(255)  NOT NULL,
  item_english_name VARCHAR(255),
  item_code         VARCHAR(100)  NOT NULL UNIQUE,
  packaging_id      UUID          REFERENCES packaging(id) ON DELETE RESTRICT,
  item_image        TEXT,                           -- URL / storage path
  avg_cost          NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (avg_cost >= 0),
  quantity          NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  orderpoint        NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (orderpoint >= 0),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ   DEFAULT NULL
);

CREATE TRIGGER trg_inventory_item_updated_at
  BEFORE UPDATE ON inventory_item
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_item_code ON inventory_item(item_code) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE: purchase_invoice
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_invoice (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no       VARCHAR(100) NOT NULL UNIQUE,
  invoice_date     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  supplier_id      UUID         NOT NULL REFERENCES partner(id) ON DELETE RESTRICT,
  supplier_inv_no  VARCHAR(100),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ  DEFAULT NULL
);

CREATE TRIGGER trg_purchase_invoice_updated_at
  BEFORE UPDATE ON purchase_invoice
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_purchase_invoice_supplier ON purchase_invoice(supplier_id) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE: purchase_invoice_item
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_invoice_item (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id  UUID          NOT NULL REFERENCES purchase_invoice(id) ON DELETE CASCADE,
  item_id              UUID          NOT NULL REFERENCES inventory_item(id) ON DELETE RESTRICT,
  quantity             NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  item_cost            NUMERIC(14,4) NOT NULL CHECK (item_cost >= 0),
  repack_factor        FLOAT         NOT NULL DEFAULT 1 CHECK (repack_factor > 0),
  tax                  NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  description          TEXT,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ   DEFAULT NULL
);

CREATE TRIGGER trg_purchase_invoice_item_updated_at
  BEFORE UPDATE ON purchase_invoice_item
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: sales_order
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_order (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_date   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  client_id    UUID         NOT NULL REFERENCES partner(id) ON DELETE RESTRICT,
  customer_id  UUID         NOT NULL REFERENCES partner(id) ON DELETE RESTRICT,
  site         VARCHAR(255),
  status       CHAR(1)      NOT NULL DEFAULT 'o' CHECK (status IN ('o', 'p', 'c', 'd')),
  description  TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ  DEFAULT NULL
);

CREATE TRIGGER trg_sales_order_updated_at
  BEFORE UPDATE ON sales_order
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_sales_order_status   ON sales_order(status)    WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_order_client   ON sales_order(client_id) WHERE deleted_at IS NULL;

-- Prevent backward status transitions
CREATE OR REPLACE FUNCTION chk_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed BOOLEAN := FALSE;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'o' AND NEW.status IN ('p', 'd') THEN allowed := TRUE; END IF;
  IF OLD.status = 'p' AND NEW.status = 'c'          THEN allowed := TRUE; END IF;
  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_transition
  BEFORE UPDATE OF status ON sales_order
  FOR EACH ROW EXECUTE FUNCTION chk_order_status_transition();

-- ============================================================
-- TABLE: sales_order_item
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_order_item (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id  UUID          NOT NULL REFERENCES sales_order(id) ON DELETE CASCADE,
  item_id         UUID          NOT NULL REFERENCES inventory_item(id) ON DELETE RESTRICT,
  quantity        NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  item_cost       NUMERIC(14,4) NOT NULL CHECK (item_cost >= 0),  -- snapshot at creation
  item_price      NUMERIC(14,4) NOT NULL CHECK (item_price >= 0), -- item_cost * 1.15
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ   DEFAULT NULL
);

CREATE TRIGGER trg_sales_order_item_updated_at
  BEFORE UPDATE ON sales_order_item
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: delivery_note
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_note (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id  UUID        NOT NULL UNIQUE REFERENCES sales_order(id) ON DELETE RESTRICT,
  delivery_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT,
  confirmed_at    TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER trg_delivery_note_updated_at
  BEFORE UPDATE ON delivery_note
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: sales_invoice
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_invoice (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id  UUID          NOT NULL UNIQUE REFERENCES sales_order(id) ON DELETE RESTRICT,
  invoice_no      VARCHAR(100)  NOT NULL UNIQUE,
  invoice_date    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  total_amount    NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  is_cancelled    BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ   DEFAULT NULL
);

CREATE TRIGGER trg_sales_invoice_updated_at
  BEFORE UPDATE ON sales_invoice
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Prevent duplicate auto-cancellation
CREATE OR REPLACE FUNCTION chk_invoice_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_cancelled = TRUE THEN
    RAISE EXCEPTION 'Cannot modify a cancelled invoice (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_immutable
  BEFORE UPDATE ON sales_invoice
  FOR EACH ROW
  WHEN (OLD.is_cancelled IS DISTINCT FROM NEW.is_cancelled AND OLD.is_cancelled = TRUE)
  EXECUTE FUNCTION chk_invoice_immutable();

-- ============================================================
-- TABLE: inventory  (operation header)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type  CHAR(3)     NOT NULL CHECK (operation_type IN ('pur', 'sal', 'adj', 'ren')),
  reference_id    UUID,                         -- FK to source document
  operation_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_inventory_type ON inventory(operation_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_ref  ON inventory(reference_id)   WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE: inventory_record  (operation lines)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_record (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id     UUID          NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  item_id          UUID          NOT NULL REFERENCES inventory_item(id) ON DELETE RESTRICT,
  qty_change       NUMERIC(14,4) NOT NULL,       -- positive = in, negative = out
  cost_at_operation NUMERIC(14,4) NOT NULL CHECK (cost_at_operation >= 0),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ   DEFAULT NULL
);

CREATE TRIGGER trg_inventory_record_updated_at
  BEFORE UPDATE ON inventory_record
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: return  (header)
-- ============================================================
CREATE TABLE IF NOT EXISTS return (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  return_type     VARCHAR(10) NOT NULL CHECK (return_type IN ('sales', 'purchase')),
  ref_invoice_id  UUID        NOT NULL,          -- FK to sales_invoice or purchase_invoice
  reason          TEXT,
  return_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER trg_return_updated_at
  BEFORE UPDATE ON return
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: return_item  (lines)
-- ============================================================
CREATE TABLE IF NOT EXISTS return_item (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id   UUID          NOT NULL REFERENCES return(id) ON DELETE CASCADE,
  item_id     UUID          NOT NULL REFERENCES inventory_item(id) ON DELETE RESTRICT,
  quantity    NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  cost_price  NUMERIC(14,4) NOT NULL CHECK (cost_price >= 0),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ   DEFAULT NULL
);

CREATE TRIGGER trg_return_item_updated_at
  BEFORE UPDATE ON return_item
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: adjustment  (header)
-- ============================================================
CREATE TABLE IF NOT EXISTS adjustment (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reason           TEXT        NOT NULL,          -- mandatory
  adjustment_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER trg_adjustment_updated_at
  BEFORE UPDATE ON adjustment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: adjustment_item  (lines)
-- ============================================================
CREATE TABLE IF NOT EXISTS adjustment_item (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id  UUID          NOT NULL REFERENCES adjustment(id) ON DELETE CASCADE,
  item_id        UUID          NOT NULL REFERENCES inventory_item(id) ON DELETE RESTRICT,
  quantity       NUMERIC(14,4) NOT NULL,           -- can be negative (reduction)
  cost_price     NUMERIC(14,4) NOT NULL CHECK (cost_price >= 0),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ   DEFAULT NULL
);

CREATE TRIGGER trg_adjustment_item_updated_at
  BEFORE UPDATE ON adjustment_item
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  table_name  VARCHAR(100) NOT NULL,
  record_id   UUID        NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  action      VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX idx_audit_log_table    ON audit_log(table_name);
CREATE INDEX idx_audit_log_record   ON audit_log(record_id);
CREATE INDEX idx_audit_log_user     ON audit_log(user_id);
CREATE INDEX idx_audit_log_time     ON audit_log(timestamp DESC);

-- ============================================================
-- TABLE: notification_log
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID        REFERENCES partner(id) ON DELETE SET NULL,
  message       TEXT        NOT NULL,
  status        VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at       TIMESTAMPTZ DEFAULT NULL,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_notification_log_updated_at
  BEFORE UPDATE ON notification_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: Prevent inventory_item.quantity from going negative
-- ============================================================
CREATE OR REPLACE FUNCTION chk_no_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Stock cannot go negative for item id: %', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_negative_stock
  BEFORE UPDATE OF quantity ON inventory_item
  FOR EACH ROW EXECUTE FUNCTION chk_no_negative_stock();

-- ============================================================
-- RLS: Enable Row Level Security on all tables
-- ============================================================
ALTER TABLE partner             ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_item    ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_record    ENABLE ROW LEVEL SECURITY;
ALTER TABLE return              ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_item         ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment          ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment_item     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- Role stored in auth.jwt() -> app_metadata -> role
-- Roles: admin | purchase_manager | salesman | manager
-- ============================================================

-- Helper: extract role from JWT
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  );
$$ LANGUAGE sql STABLE;

-- ---- partner ----
CREATE POLICY partner_select ON partner FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY partner_insert ON partner FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

CREATE POLICY partner_update ON partner FOR UPDATE
  USING (auth_role() IN ('admin', 'purchase_manager'))
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

CREATE POLICY partner_delete ON partner FOR DELETE
  USING (auth_role() = 'admin');

-- ---- packaging ----
CREATE POLICY packaging_select ON packaging FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY packaging_insert ON packaging FOR INSERT WITH CHECK (auth_role() = 'admin');
CREATE POLICY packaging_update ON packaging FOR UPDATE USING (auth_role() = 'admin');
CREATE POLICY packaging_delete ON packaging FOR DELETE USING (auth_role() = 'admin');

-- ---- inventory_item ----
CREATE POLICY item_select ON inventory_item FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY item_insert ON inventory_item FOR INSERT WITH CHECK (auth_role() = 'admin');
CREATE POLICY item_update ON inventory_item FOR UPDATE USING (auth_role() = 'admin');
CREATE POLICY item_delete ON inventory_item FOR DELETE USING (auth_role() = 'admin');

-- ---- purchase_invoice ----
CREATE POLICY pi_select ON purchase_invoice FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY pi_insert ON purchase_invoice FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));
CREATE POLICY pi_delete ON purchase_invoice FOR DELETE USING (auth_role() = 'admin');

-- ---- purchase_invoice_item ----
CREATE POLICY pii_select ON purchase_invoice_item FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY pii_insert ON purchase_invoice_item FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

-- ---- sales_order ----
CREATE POLICY so_select ON sales_order FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY so_insert ON sales_order FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));
CREATE POLICY so_update ON sales_order FOR UPDATE
  USING (auth_role() IN ('admin', 'purchase_manager', 'salesman'));
CREATE POLICY so_delete ON sales_order FOR DELETE USING (auth_role() = 'admin');

-- ---- sales_order_item ----
CREATE POLICY soi_select ON sales_order_item FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY soi_insert ON sales_order_item FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

-- ---- delivery_note ----
CREATE POLICY dn_select ON delivery_note FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY dn_insert ON delivery_note FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));
CREATE POLICY dn_update ON delivery_note FOR UPDATE
  USING (auth_role() IN ('admin', 'purchase_manager', 'salesman'));

-- ---- sales_invoice ----
CREATE POLICY si_select ON sales_invoice FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY si_update ON sales_invoice FOR UPDATE USING (auth_role() = 'admin');

-- ---- inventory / inventory_record ----
CREATE POLICY inv_select ON inventory FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY inv_insert ON inventory FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));
CREATE POLICY invrec_select ON inventory_record FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY invrec_insert ON inventory_record FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

-- ---- return / return_item ----
CREATE POLICY ret_select   ON return      FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY ret_insert   ON return      FOR INSERT WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));
CREATE POLICY retit_select ON return_item FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY retit_insert ON return_item FOR INSERT WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

-- ---- adjustment / adjustment_item ----
CREATE POLICY adj_select   ON adjustment      FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY adj_insert   ON adjustment      FOR INSERT WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));
CREATE POLICY adjit_select ON adjustment_item FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY adjit_insert ON adjustment_item FOR INSERT WITH CHECK (auth_role() IN ('admin', 'purchase_manager'));

-- ---- audit_log ----
CREATE POLICY al_select ON audit_log FOR SELECT
  USING (auth_role() IN ('admin', 'manager'));
CREATE POLICY al_insert ON audit_log FOR INSERT WITH CHECK (TRUE); -- system inserts

-- ---- notification_log ----
CREATE POLICY nl_select ON notification_log FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY nl_insert ON notification_log FOR INSERT WITH CHECK (TRUE); -- system inserts
