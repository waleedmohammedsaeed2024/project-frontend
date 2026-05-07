-- 013_app_roles.sql
-- Custom roles + privileges system. Admin can create new roles, edit privileges,
-- assign/revoke roles to users. All admin operations are gated by JWT role check.

create table if not exists public.app_roles (
  name         text primary key,
  display_name text not null,
  privileges   jsonb not null default '{}'::jsonb,
  is_builtin   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.app_roles enable row level security;

-- Anyone signed-in can read (the frontend needs this to know its own privileges).
drop policy if exists app_roles_select on public.app_roles;
create policy app_roles_select on public.app_roles
  for select using (auth.role() = 'authenticated');

-- Writes are admin-only via the RPCs below; deny direct table writes.
drop policy if exists app_roles_no_direct_write on public.app_roles;
create policy app_roles_no_direct_write on public.app_roles
  for all using (false) with check (false);

-- Seed built-in roles with the existing useCanDo() matrix as their privileges.
insert into public.app_roles (name, display_name, privileges, is_builtin) values
  ('admin', 'مسؤول', jsonb_build_object(
    'createOrders', true, 'shipOrders', true, 'confirmDelivery', true, 'cancelInvoice', true,
    'createPurchase', true, 'viewPurchase', true,
    'adjustInventory', true, 'manageReturns', true, 'manageItemsPackaging', true,
    'viewInventory', true, 'viewItems', true,
    'managePartners', true, 'viewPartners', true,
    'recordPayments', true, 'viewPayments', true,
    'viewReports', true, 'manageUsers', true, 'manageRoles', true
  ), true),
  ('accountant', 'محاسب', jsonb_build_object(
    'createOrders', true, 'shipOrders', true, 'confirmDelivery', true, 'cancelInvoice', true,
    'createPurchase', true, 'viewPurchase', true,
    'adjustInventory', true, 'manageReturns', true, 'manageItemsPackaging', true,
    'viewInventory', true, 'viewItems', true,
    'managePartners', true, 'viewPartners', true,
    'recordPayments', true, 'viewPayments', true,
    'viewReports', true, 'manageUsers', false, 'manageRoles', false
  ), true),
  ('manager', 'مدير', jsonb_build_object(
    'createOrders', false, 'shipOrders', false, 'confirmDelivery', false, 'cancelInvoice', false,
    'createPurchase', false, 'viewPurchase', true,
    'adjustInventory', false, 'manageReturns', false, 'manageItemsPackaging', false,
    'viewInventory', true, 'viewItems', true,
    'managePartners', false, 'viewPartners', true,
    'recordPayments', false, 'viewPayments', true,
    'viewReports', true, 'manageUsers', false, 'manageRoles', false
  ), true),
  ('purchase_manager', 'مدير مشتريات', jsonb_build_object(
    'createOrders', true, 'shipOrders', true, 'confirmDelivery', true, 'cancelInvoice', false,
    'createPurchase', true, 'viewPurchase', true,
    'adjustInventory', true, 'manageReturns', true, 'manageItemsPackaging', false,
    'viewInventory', true, 'viewItems', true,
    'managePartners', true, 'viewPartners', true,
    'recordPayments', false, 'viewPayments', false,
    'viewReports', true, 'manageUsers', false, 'manageRoles', false
  ), true),
  ('salesman', 'مندوب مبيعات', jsonb_build_object(
    'createOrders', false, 'shipOrders', false, 'confirmDelivery', false, 'cancelInvoice', false,
    'createPurchase', false, 'viewPurchase', false,
    'adjustInventory', false, 'manageReturns', false, 'manageItemsPackaging', false,
    'viewInventory', false, 'viewItems', false,
    'managePartners', false, 'viewPartners', false,
    'recordPayments', false, 'viewPayments', false,
    'viewReports', false, 'manageUsers', false, 'manageRoles', false,
    'salesmanShipToDelivered', true
  ), true)
on conflict (name) do update
  set display_name = excluded.display_name,
      privileges   = excluded.privileges,
      is_builtin   = true,
      updated_at   = now();

-- Helper: is the caller admin?
create or replace function public._is_admin_caller()
returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- Admin: list all roles.
create or replace function public.admin_list_roles()
returns setof public.app_roles
language plpgsql security definer set search_path = public
as $$
begin
  if not public._is_admin_caller() then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;
  return query select * from public.app_roles order by is_builtin desc, name;
end;
$$;
revoke all on function public.admin_list_roles() from public;
grant execute on function public.admin_list_roles() to authenticated;

-- Admin: create or update a role. Built-ins can have privileges edited but cannot
-- have their `name` changed and cannot be marked non-builtin.
create or replace function public.admin_upsert_role(
  p_name         text,
  p_display_name text,
  p_privileges   jsonb
)
returns public.app_roles
language plpgsql security definer set search_path = public
as $$
declare
  result public.app_roles;
begin
  if not public._is_admin_caller() then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'role name required';
  end if;
  if p_name !~ '^[a-z][a-z0-9_]{1,30}$' then
    raise exception 'role name must be lowercase letters/digits/underscore (2-31 chars)';
  end if;

  insert into public.app_roles (name, display_name, privileges, is_builtin)
  values (p_name, coalesce(nullif(btrim(p_display_name), ''), p_name), coalesce(p_privileges, '{}'::jsonb), false)
  on conflict (name) do update
    set display_name = coalesce(nullif(btrim(excluded.display_name), ''), public.app_roles.display_name),
        privileges   = excluded.privileges,
        updated_at   = now()
  returning * into result;

  return result;
end;
$$;
revoke all on function public.admin_upsert_role(text, text, jsonb) from public;
grant execute on function public.admin_upsert_role(text, text, jsonb) to authenticated;

-- Admin: delete a custom role. Built-ins cannot be deleted.
-- Any user currently assigned the deleted role has their role cleared.
create or replace function public.admin_delete_role(p_name text)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public._is_admin_caller() then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;
  if exists (select 1 from public.app_roles where name = p_name and is_builtin) then
    raise exception 'cannot delete built-in role: %', p_name;
  end if;

  -- Clear role from any user assigned to it.
  update auth.users
     set raw_app_meta_data = (raw_app_meta_data - 'role')
   where raw_app_meta_data ->> 'role' = p_name;

  delete from public.app_roles where name = p_name;
end;
$$;
revoke all on function public.admin_delete_role(text) from public;
grant execute on function public.admin_delete_role(text) to authenticated;

-- Admin: set or revoke a user's role. Pass null/empty to revoke.
create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role    text
)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public._is_admin_caller() then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'user id required';
  end if;

  if p_role is null or btrim(p_role) = '' then
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
     where id = p_user_id;
  else
    if not exists (select 1 from public.app_roles where name = p_role) then
      raise exception 'role does not exist: %', p_role;
    end if;
    update auth.users
       set raw_app_meta_data = jsonb_set(
         coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', to_jsonb(p_role), true)
     where id = p_user_id;
  end if;
end;
$$;
revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- Re-create admin_list_users to include the deleted_at filter and role label.
create or replace function public.admin_list_users()
returns table (
  id              uuid,
  email           text,
  phone           text,
  role            text,
  banned_until    timestamptz,
  created_at      timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public._is_admin_caller() then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  return query
    select
      u.id,
      u.email::text,
      u.phone::text,
      (u.raw_app_meta_data ->> 'role')::text,
      u.banned_until,
      u.created_at,
      u.last_sign_in_at
    from auth.users u
    where u.deleted_at is null
    order by u.created_at desc;
end;
$$;
revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

-- Read own role privileges (used by AuthContext to drive useCanDo dynamically).
create or replace function public.my_privileges()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select privileges from public.app_roles
       where name = (auth.jwt() -> 'app_metadata' ->> 'role')),
    '{}'::jsonb
  );
$$;
revoke all on function public.my_privileges() from public;
grant execute on function public.my_privileges() to authenticated;

-- Tell PostgREST to refresh its schema cache so the new RPCs are immediately discoverable.
notify pgrst, 'reload schema';
