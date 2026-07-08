-- 015_security_hardening.sql
-- Security pass. Closes the anonymous-access holes introduced by the "open"
-- policies in 008/011 and the missing RLS on the inventory/return ledger tables.
--
-- Root problems fixed here:
--   1. inventory, inventory_item, inventory_record, item_stock, return, return_item
--      had RLS DISABLED while the `anon` role still held INSERT/UPDATE/DELETE/TRUNCATE
--      grants. The anon key ships in the frontend bundle, so anyone could read,
--      overwrite, or TRUNCATE these tables without logging in. -> enable RLS.
--   2. `anon` had table grants on every business table. anon is only used
--      pre-login; it never needs table access. -> revoke all from anon.
--   3. SECURITY DEFINER reporting/mutation functions (sales_summary, bank_cash_flow,
--      client_statement, supplier_statement, purchase_summary, item_invoices,
--      record_payment, confirm_sales_order_shipped, link/unlink_customer, ...) were
--      EXECUTE-able by anon with no caller check. Being SECURITY DEFINER they bypass
--      RLS, so the anon key could read all financials. -> revoke execute from anon/public.
--   4. record_payment did no role check. -> gate to admin/accountant (matches useCanDo).
--   5. Always-true policies (payments_insert, partner_delete, packaging_*) let any
--      logged-in user write. -> gate to the roles the app's useCanDo matrix intends.
--   6. Ledger writes re-scoped to operational roles so a self-registered, role-less
--      user (see enable_signup) still cannot touch business data.
--
-- Role reference (app_roles / useCanDo matrix in AuthContext.tsx):
--   admin | accountant | purchase_manager | manager | salesman
--     recordPayments    : admin, accountant
--     manageReturns     : admin, accountant, purchase_manager
--     adjustInventory   : admin, accountant, purchase_manager
--     manageItemsPackaging: admin, accountant
--     managePartners    : admin, accountant, purchase_manager (delete: admin only)
--     ledger side-effects (delivery/sales/purchase): + salesman
--
-- Uses (select auth_role()) so the role is read once per query (InitPlan), per 014.

-- ============================================================
-- 1. REVOKE ALL ACCESS FROM anon (pre-login role never needs table/function access)
-- ============================================================
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
-- Keep future objects locked down for anon as well.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- ============================================================
-- 2. ENABLE RLS on the six tables that were left unprotected
-- ============================================================
alter table public.inventory        enable row level security;
alter table public.inventory_item   enable row level security;
alter table public.inventory_record enable row level security;
alter table public.item_stock       enable row level security;
alter table public.return           enable row level security;
alter table public.return_item      enable row level security;

-- ============================================================
-- 3. LOW-LEVEL LEDGER TABLES — inventory, inventory_record, inventory_item, item_stock
--    Written as side-effects of sales/purchase/adjust/return/delivery flows, so writes
--    are allowed for every operational role (incl. salesman for delivery). Reads for any
--    assigned role. Deletes admin-only. Drop the old inconsistent/open policies first.
-- ============================================================

-- ---- inventory ----
drop policy if exists inv_select        on public.inventory;
drop policy if exists inv_insert        on public.inventory;
drop policy if exists inv_insert_open   on public.inventory;
drop policy if exists inv_update        on public.inventory;
drop policy if exists inv_delete        on public.inventory;
drop policy if exists admin_all         on public.inventory;
create policy inv_select on public.inventory for select to authenticated
  using ((select auth_role()) in ('admin','accountant','purchase_manager','manager','salesman'));
create policy inv_insert on public.inventory for insert to authenticated
  with check ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'));
create policy inv_update on public.inventory for update to authenticated
  using      ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'))
  with check ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'));
create policy inv_delete on public.inventory for delete to authenticated
  using ((select auth_role()) = 'admin');

-- ---- inventory_record ----
drop policy if exists invrec_select      on public.inventory_record;
drop policy if exists invrec_insert      on public.inventory_record;
drop policy if exists invrec_insert_open on public.inventory_record;
drop policy if exists invrec_update      on public.inventory_record;
drop policy if exists invrec_delete      on public.inventory_record;
drop policy if exists admin_all          on public.inventory_record;
create policy invrec_select on public.inventory_record for select to authenticated
  using ((select auth_role()) in ('admin','accountant','purchase_manager','manager','salesman'));
create policy invrec_insert on public.inventory_record for insert to authenticated
  with check ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'));
create policy invrec_update on public.inventory_record for update to authenticated
  using      ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'))
  with check ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'));
create policy invrec_delete on public.inventory_record for delete to authenticated
  using ((select auth_role()) = 'admin');

-- ---- inventory_item (aggregate qty + avg_cost) ----
drop policy if exists item_select      on public.inventory_item;
drop policy if exists item_insert      on public.inventory_item;
drop policy if exists item_update      on public.inventory_item;
drop policy if exists item_update_open on public.inventory_item;
drop policy if exists item_delete      on public.inventory_item;
drop policy if exists admin_all        on public.inventory_item;
create policy item_select on public.inventory_item for select to authenticated
  using ((select auth_role()) in ('admin','accountant','purchase_manager','manager','salesman') and deleted_at is null);
create policy item_insert on public.inventory_item for insert to authenticated
  with check ((select auth_role()) in ('admin','purchase_manager','accountant'));
create policy item_update on public.inventory_item for update to authenticated
  using      ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'))
  with check ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'));
create policy item_delete on public.inventory_item for delete to authenticated
  using ((select auth_role()) in ('admin','purchase_manager'));

-- ---- item_stock ----
drop policy if exists istock_select           on public.item_stock;
drop policy if exists item_stock_select_open  on public.item_stock;
drop policy if exists istock_insert           on public.item_stock;
drop policy if exists item_stock_insert_open  on public.item_stock;
drop policy if exists istock_update           on public.item_stock;
drop policy if exists item_stock_update_open  on public.item_stock;
drop policy if exists istock_delete           on public.item_stock;
drop policy if exists admin_all               on public.item_stock;
create policy istock_select on public.item_stock for select to authenticated
  using ((select auth_role()) in ('admin','accountant','purchase_manager','manager','salesman'));
create policy istock_insert on public.item_stock for insert to authenticated
  with check ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'));
create policy istock_update on public.item_stock for update to authenticated
  using      ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'))
  with check ((select auth_role()) in ('admin','accountant','purchase_manager','salesman'));
create policy istock_delete on public.item_stock for delete to authenticated
  using ((select auth_role()) = 'admin');

-- ============================================================
-- 4. RETURN / RETURN_ITEM — manageReturns roles only; reads for any assigned role.
--    (These had ONLY an always-true insert policy and NO select policy, which would
--     have made the Returns page unreadable once RLS was enabled.)
-- ============================================================
drop policy if exists ret_select      on public.return;
drop policy if exists ret_insert      on public.return;
drop policy if exists ret_insert_open on public.return;
drop policy if exists ret_update      on public.return;
drop policy if exists ret_delete      on public.return;
drop policy if exists admin_all       on public.return;
create policy ret_select on public.return for select to authenticated
  using ((select auth_role()) in ('admin','accountant','purchase_manager','manager','salesman') and deleted_at is null);
create policy ret_insert on public.return for insert to authenticated
  with check ((select auth_role()) in ('admin','accountant','purchase_manager'));
create policy ret_update on public.return for update to authenticated
  using      ((select auth_role()) in ('admin','accountant','purchase_manager'))
  with check ((select auth_role()) in ('admin','accountant','purchase_manager'));
create policy ret_delete on public.return for delete to authenticated
  using ((select auth_role()) = 'admin');

drop policy if exists retit_select      on public.return_item;
drop policy if exists retit_insert      on public.return_item;
drop policy if exists retit_insert_open on public.return_item;
drop policy if exists retit_update      on public.return_item;
drop policy if exists retit_delete      on public.return_item;
drop policy if exists admin_all         on public.return_item;
create policy retit_select on public.return_item for select to authenticated
  using ((select auth_role()) in ('admin','accountant','purchase_manager','manager','salesman') and deleted_at is null);
create policy retit_insert on public.return_item for insert to authenticated
  with check ((select auth_role()) in ('admin','accountant','purchase_manager'));
create policy retit_update on public.return_item for update to authenticated
  using      ((select auth_role()) in ('admin','accountant','purchase_manager'))
  with check ((select auth_role()) in ('admin','accountant','purchase_manager'));
create policy retit_delete on public.return_item for delete to authenticated
  using ((select auth_role()) = 'admin');

-- ============================================================
-- 5. ADJUSTMENT / ADJUSTMENT_ITEM — adjustInventory roles only (was always-true insert)
-- ============================================================
drop policy if exists adj_insert_open on public.adjustment;
drop policy if exists adj_insert      on public.adjustment;
create policy adj_insert on public.adjustment for insert to authenticated
  with check ((select auth_role()) in ('admin','accountant','purchase_manager'));

drop policy if exists adjit_insert_open on public.adjustment_item;
drop policy if exists adjit_insert      on public.adjustment_item;
create policy adjit_insert on public.adjustment_item for insert to authenticated
  with check ((select auth_role()) in ('admin','accountant','purchase_manager'));

-- ============================================================
-- 6. PAYMENTS — insert was always-true; restrict to admin/accountant (recordPayments)
-- ============================================================
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert to authenticated
  with check ((select auth_role()) in ('admin','accountant'));

-- record_payment is SECURITY DEFINER and bypasses RLS, so it needs its own gate.
create or replace function public.record_payment(
  p_partner_id uuid,
  p_payamt     numeric,
  p_paytype    payment_type,
  p_paydate    date,
  p_paymemo    text default null
)
returns public.payments
language plpgsql security definer set search_path to 'public'
as $function$
DECLARE
  v_partner public.partner;
  v_payment public.payments;
BEGIN
  IF (select auth_role()) NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'forbidden: recording payments requires accountant or admin'
      USING errcode = '42501';
  END IF;

  IF p_payamt IS NULL OR p_payamt <= 0 THEN
    RAISE EXCEPTION 'pay amount must be positive';
  END IF;

  SELECT * INTO v_partner FROM public.partner
   WHERE id = p_partner_id AND deleted_at IS NULL
   FOR UPDATE;

  IF v_partner.id IS NULL THEN
    RAISE EXCEPTION 'partner not found';
  END IF;

  IF v_partner.partner_type NOT IN ('c', 's') THEN
    RAISE EXCEPTION 'payments are only allowed for clients or suppliers';
  END IF;

  INSERT INTO public.payments (paydate, payamt, paytype, partner_id, paymemo)
  VALUES (p_paydate, p_payamt, p_paytype, p_partner_id, p_paymemo)
  RETURNING * INTO v_payment;

  UPDATE public.partner
     SET balance = COALESCE(balance, 0) - p_payamt,
         updated_at = now()
   WHERE id = p_partner_id;

  RETURN v_payment;
END;
$function$;

-- ============================================================
-- 7. PARTNER / PACKAGING — remove always-true policies
-- ============================================================
drop policy if exists partner_delete on public.partner;
create policy partner_delete on public.partner for delete to authenticated
  using ((select auth_role()) = 'admin');

drop policy if exists packaging_insert on public.packaging;
create policy packaging_insert on public.packaging for insert to authenticated
  with check ((select auth_role()) in ('admin','accountant'));
drop policy if exists packaging_update on public.packaging;
create policy packaging_update on public.packaging for update to authenticated
  using      ((select auth_role()) in ('admin','accountant'))
  with check ((select auth_role()) in ('admin','accountant'));
drop policy if exists packaging_delete on public.packaging;
create policy packaging_delete on public.packaging for delete to authenticated
  using ((select auth_role()) = 'admin');

-- ============================================================
-- 8. SECURITY DEFINER FUNCTIONS — deny anon/public, allow authenticated only.
--    These bypass RLS, so anon execute = full data exposure. Each already runs its
--    own logic; the admin_* ones self-check the caller.
-- ============================================================
do $$
declare
  fn text;
  funcs text[] := array[
    'sales_summary(date, date)',
    'purchase_summary(date, date)',
    'bank_cash_flow(date, date)',
    'client_statement(uuid, date, date)',
    'supplier_statement(uuid, date, date)',
    'item_invoices(uuid)',
    'confirm_sales_order_shipped(uuid)',
    'record_payment(uuid, numeric, payment_type, date, text)',
    'get_my_role()',
    'get_my_partner_id()',
    'get_partner_linked_email(uuid)',
    'link_customer_to_user(uuid, text)',
    'unlink_customer_from_user(uuid)',
    'my_privileges()',
    'admin_list_users()',
    'admin_list_roles()',
    'admin_set_user_role(uuid, text)',
    'admin_upsert_role(text, text, jsonb)',
    'admin_delete_role(text)'
  ];
begin
  foreach fn in array funcs loop
    begin
      execute format('revoke all on function public.%s from public, anon', fn);
      execute format('grant execute on function public.%s to authenticated', fn);
    exception when undefined_function then
      raise notice 'skip missing function: %', fn;
    end;
  end loop;
end $$;

-- Tell PostgREST to refresh its schema cache.
notify pgrst, 'reload schema';
