begin;

create table public.approved_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  approved_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null
);
alter table public.approved_users enable row level security;
revoke all on public.approved_users from public, anon, authenticated;

-- Preserve all existing accounts. Future accounts have no approval record and
-- are denied by default, regardless of user-supplied signup metadata.
insert into public.approved_users(user_id) select id from auth.users;

create or replace function public.can_access_app() returns boolean
language sql stable security definer set search_path = '' as $access$
  select auth.uid() is not null
    and exists (select 1 from auth.users where id = auth.uid())
    and exists (select 1 from public.approved_users where user_id = auth.uid())
    and not exists (select 1 from public.blocked_users where user_id = auth.uid());
$access$;

create function public.get_app_access_state() returns text
language sql stable security definer set search_path = '' as $access$
  select case
    when auth.uid() is null or not exists (select 1 from auth.users where id = auth.uid()) then 'denied'
    when exists (select 1 from public.blocked_users where user_id = auth.uid()) then 'blocked'
    when exists (select 1 from public.approved_users where user_id = auth.uid()) then 'active'
    else 'pending'
  end;
$access$;
revoke all on function public.get_app_access_state() from public, anon;
grant execute on function public.get_app_access_state() to authenticated;

create function public.approve_app_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $approval$
begin
  perform public.assert_app_access();
  if not public.is_activity_admin() then raise exception 'Ingen adgang' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'Brugeren findes ikke'; end if;
  if exists (select 1 from public.blocked_users where user_id = p_user_id) then
    raise exception 'Fjern blokeringen før godkendelse.';
  end if;
  insert into public.approved_users(user_id, approved_by) values (p_user_id, auth.uid())
  on conflict (user_id) do nothing;
end;
$approval$;
revoke all on function public.approve_app_user(uuid) from public, anon;
grant execute on function public.approve_app_user(uuid) to authenticated;

create or replace function public.get_app_users() returns jsonb
language plpgsql security definer set search_path = '' as $users$
declare v_result jsonb;
begin
  perform public.assert_app_access();
  if not public.is_activity_admin() then raise exception 'Ingen adgang' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(users) order by users.created_at desc), '[]'::jsonb)
  into v_result from (
    select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
      b.user_id is not null as blocked,
      a.user_id is not null as approved,
      exists (select 1 from public.activity_admins adm where adm.user_id = u.id) as is_admin,
      (select c.name from public.company_members m join public.companies c on c.id = m.company_id
        where m.user_id = u.id limit 1) as company_name
    from auth.users u
    left join public.blocked_users b on b.user_id = u.id
    left join public.approved_users a on a.user_id = u.id
    order by u.created_at desc limit 1000
  ) users;
  return v_result;
end;
$users$;

-- Existing restrictive policies and guarded RPCs already call can_access_app.
-- The same approval gate therefore covers tables, onboarding and AI requests.
commit;
