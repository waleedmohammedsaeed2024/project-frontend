-- 012_admin_users_rpc.sql
-- Admin-only RPC to list users from auth.users.
-- SECURITY DEFINER bypasses RLS; the function gates itself on the caller's JWT role.

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
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
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
