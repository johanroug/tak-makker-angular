begin;

create table public.activity_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.activity_admins enable row level security;
revoke all on public.activity_admins from anon, authenticated;

create function public.is_activity_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.activity_admins where user_id = auth.uid());
$$;
revoke all on function public.is_activity_admin() from public, anon;
grant execute on function public.is_activity_admin() to authenticated;

create table public.activity_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  action text not null check (action in ('login','project_opened','project_created','ai_request','work_edited','material_edited','work_status_changed','material_status_changed','offer_finalized','offer_opened','offer_status_changed','pdf_downloaded','profile_saved','app_error')),
  success boolean not null,
  state text check (state in ('accepted','rejected','suggested','finalized','sent')),
  duration_ms integer check (duration_ms between 0 and 3600000),
  error_code text check (length(error_code) <= 50),
  project_id uuid,
  offer_id uuid
);
create index activity_events_time on public.activity_events (created_at desc);
create index activity_events_user_time on public.activity_events (user_id, created_at desc);
alter table public.activity_events enable row level security;
-- No direct read/write access, including the identity sequence.
revoke all on public.activity_events from anon, authenticated;
revoke all on sequence public.activity_events_id_seq from anon, authenticated;

create function public.record_activity(p_action text, p_success boolean,
  p_duration_ms integer default null, p_error_code text default null,
  p_project_id uuid default null, p_offer_id uuid default null, p_state text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_company uuid;
begin
  if v_user is null then raise exception 'Login kræves' using errcode = '42501'; end if;
  select company_id into v_company from public.company_members where user_id = v_user limit 1;
  if p_project_id is not null and not exists (
    select 1 from public.projects p join public.company_members m on m.company_id = p.company_id
    where p.id = p_project_id and m.user_id = v_user
  ) then raise exception 'Ingen adgang' using errcode = '42501'; end if;
  if p_offer_id is not null and not exists (
    select 1 from public.offers o join public.projects p on p.id = o.project_id
    join public.company_members m on m.company_id = p.company_id
    where o.id::text = p_offer_id::text and m.user_id = v_user
  ) then raise exception 'Ingen adgang' using errcode = '42501'; end if;
  if p_error_code is not null and p_error_code !~ '^[A-Za-z0-9_.-]{1,50}$' then
    raise exception 'Ugyldig fejlkode';
  end if;
  insert into public.activity_events(user_id, company_id, action, success, duration_ms, error_code, project_id, offer_id, state)
  values (v_user, v_company, p_action, p_success, p_duration_ms, p_error_code, p_project_id, p_offer_id, p_state);
end;
$$;
revoke all on function public.record_activity(text, boolean, integer, text, uuid, uuid, text) from public, anon;
grant execute on function public.record_activity(text, boolean, integer, text, uuid, uuid, text) to authenticated;

create function public.get_activity_events() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not public.is_activity_admin() then raise exception 'Ingen adgang' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(events) order by events.created_at desc, events.id desc), '[]'::jsonb)
  into v_result from (
    select e.*, u.email, c.name as company_name
    from public.activity_events e
    join auth.users u on u.id = e.user_id
    left join public.companies c on c.id = e.company_id
    where e.created_at >= now() - interval '30 days'
    order by e.created_at desc, e.id desc limit 500
  ) events;
  return v_result;
end;
$$;
revoke all on function public.get_activity_events() from public, anon;
grant execute on function public.get_activity_events() to authenticated;

-- Johan confirmed this exact account as the only viewer.
do $admin_setup$
begin
  if not exists (select 1 from auth.users where id = 'e5a0d637-a285-447c-b548-98d2945ea579'::uuid) then
    raise exception 'Johans bekræftede bruger-ID findes ikke. Ingen ændringer udført.';
  end if;
  if exists (select 1 from public.activity_admins where user_id <> 'e5a0d637-a285-447c-b548-98d2945ea579'::uuid) then
    raise exception 'Der findes en anden aktivitetsadministrator. Ingen ændringer udført.';
  end if;
  insert into public.activity_admins(user_id) values ('e5a0d637-a285-447c-b548-98d2945ea579');
end;
$admin_setup$;
commit;
