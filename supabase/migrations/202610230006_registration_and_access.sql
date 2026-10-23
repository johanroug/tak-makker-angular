begin;

create table public.blocked_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blocked_at timestamptz not null default now(),
  blocked_by uuid not null references auth.users(id)
);
alter table public.blocked_users enable row level security;
revoke all on public.blocked_users from public, anon, authenticated;

create function public.can_access_app() returns boolean
language sql stable security definer set search_path = '' as $access$
  select auth.uid() is not null
    and exists (select 1 from auth.users where id = auth.uid())
    and not exists (select 1 from public.blocked_users where user_id = auth.uid());
$access$;
revoke all on function public.can_access_app() from public, anon;
grant execute on function public.can_access_app() to authenticated;

create function public.assert_app_access() returns void
language plpgsql security definer set search_path = '' as $access$
begin
  if not public.can_access_app() then
    raise exception 'Din adgang til Tak Makker er blokeret.' using errcode = '42501';
  end if;
end;
$access$;
revoke all on function public.assert_app_access() from public, anon;
grant execute on function public.assert_app_access() to authenticated;

-- AND the existing company-isolation policies with the live blocklist.
do $policies$
declare v_table text;
begin
  foreach v_table in array array['companies','company_members','projects','project_messages',
    'project_work_items','project_materials','offers','offer_work_items','offer_materials'] loop
    if not exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_table and c.relrowsecurity) then
      raise exception 'RLS mangler på %. Ingen ændringer udført.', v_table;
    end if;
    execute format('create policy active_user_required on public.%I as restrictive for all to authenticated using ((select public.can_access_app())) with check ((select public.can_access_app()))', v_table);
  end loop;
end;
$policies$;

-- Preserve each deployed function's numbering, type fixes and validations.
-- SECURITY DEFINER bypasses RLS, so guard these entry points explicitly too.
do $rpc_guards$
declare v_signature text; v_oid regprocedure; v_definition text; v_guarded text;
begin
  foreach v_signature in array array[
    'public.create_project(uuid)', 'public.finalize_offer(uuid)',
    'public.update_offer_status(uuid,text,text)', 'public.ensure_current_company()',
    'public.record_activity(text,boolean,integer,text,uuid,uuid,text)',
    'public.get_activity_events()'
  ] loop
    v_oid := to_regprocedure(v_signature);
    if v_oid is null then raise exception 'Funktionen % mangler. Ingen ændringer udført.', v_signature; end if;
    if not exists (select 1 from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid = p.prolang
      where p.oid = v_oid and l.lanname = 'plpgsql' and p.prosecdef) then
      raise exception 'Uventet funktionstype for %. Ingen ændringer udført.', v_signature;
    end if;
    v_definition := pg_catalog.pg_get_functiondef(v_oid);
    -- Match only the BEGIN token, preserving CRLF, comments and following SQL.
    v_guarded := regexp_replace(v_definition, '^[[:blank:]]*begin\M',
      'begin' || chr(10) || '  perform public.assert_app_access();' || chr(10), 'in');
    if v_guarded = v_definition then raise exception 'Kunne ikke beskytte %. Ingen ændringer udført.', v_signature; end if;
    execute v_guarded;
  end loop;
end;
$rpc_guards$;

create or replace function public.is_activity_admin() returns boolean
language sql stable security definer set search_path = '' as $admin$
  select public.can_access_app() and exists (select 1 from public.activity_admins where user_id = auth.uid());
$admin$;

create function public.get_app_users() returns jsonb
language plpgsql security definer set search_path = '' as $users$
declare v_result jsonb;
begin
  perform public.assert_app_access();
  if not public.is_activity_admin() then raise exception 'Ingen adgang' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(users) order by users.created_at desc), '[]'::jsonb)
  into v_result from (
    select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
      b.user_id is not null as blocked,
      exists (select 1 from public.activity_admins a where a.user_id = u.id) as is_admin,
      (select c.name from public.company_members m join public.companies c on c.id = m.company_id
        where m.user_id = u.id limit 1) as company_name
    from auth.users u left join public.blocked_users b on b.user_id = u.id
    order by u.created_at desc limit 1000
  ) users;
  return v_result;
end;
$users$;
revoke all on function public.get_app_users() from public, anon;
grant execute on function public.get_app_users() to authenticated;

create function public.set_app_user_blocked(p_user_id uuid, p_blocked boolean) returns void
language plpgsql security definer set search_path = '' as $users$
begin
  perform public.assert_app_access();
  if not public.is_activity_admin() then raise exception 'Ingen adgang' using errcode = '42501'; end if;
  if p_blocked is null then raise exception 'Vælg adgangsstatus'; end if;
  if p_user_id = auth.uid() or exists (select 1 from public.activity_admins where user_id = p_user_id) then
    raise exception 'Administratorens adgang kan ikke blokeres.';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'Brugeren findes ikke'; end if;
  if p_blocked then
    insert into public.blocked_users(user_id, blocked_by) values (p_user_id, auth.uid())
    on conflict (user_id) do nothing;
  else
    delete from public.blocked_users where user_id = p_user_id;
  end if;
end;
$users$;
revoke all on function public.set_app_user_blocked(uuid,boolean) from public, anon;
grant execute on function public.set_app_user_blocked(uuid,boolean) to authenticated;

commit;
