-- Fix missing INSERT policy on sales_invoice.
-- RLS was enabled but only SELECT/UPDATE were defined, causing every
-- invoice insert to be silently rejected (no policy = no access).
-- Roles that can confirm delivery must also be able to create invoices.

CREATE POLICY si_insert ON sales_invoice FOR INSERT
  WITH CHECK (auth_role() IN ('admin', 'purchase_manager', 'salesman'));
