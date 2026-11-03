begin;

create table public.company_billing (
  company_id uuid primary key references public.companies(id) on delete cascade,
  subscription_status text not null default 'trial' check (subscription_status in ('trial','active','past_due','canceled')),
  access_until timestamptz
);
create table public.company_ai_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','succeeded','failed')),
  charge_trial boolean not null,
  expires_at timestamptz not null default now() + interval '5 minutes',
  created_at timestamptz not null default now()
);
create index company_ai_requests_usage on public.company_ai_requests(company_id, status) where charge_trial;
alter table public.company_billing enable row level security;
alter table public.company_ai_requests enable row level security;
revoke all on public.company_billing, public.company_ai_requests from public, anon, authenticated;

-- Private helper. Only guarded RPCs below may expose usage to a member.
create function public.company_billing_snapshot(p_company_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with usage as (
    select count(*) filter (where status='succeeded')::integer as used,
      count(*) filter (where status='pending' and expires_at > now())::integer as pending
    from public.company_ai_requests where company_id=p_company_id and charge_trial
  ), subscription as (
    select exists(select 1 from public.company_billing where company_id=p_company_id
      and subscription_status='active' and access_until > now()) as active
  )
  select jsonb_build_object('companyId', p_company_id,
    'status', case when active then 'active' when used >= 10 then 'exhausted' else 'trial' end,
    'trialLimit', 10, 'trialUsed', used, 'trialPending', pending,
    'trialRemaining', greatest(0,10-used),
    'canGenerate', active or used+pending < 10)
  from usage, subscription;
$$;
revoke all on function public.company_billing_snapshot(uuid) from public, anon, authenticated;

create function public.get_company_billing(p_company_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_company uuid := p_company_id;
begin
  perform public.assert_app_access();
  if v_company is null then v_company := public.ensure_current_company(); end if;
  if not exists(select 1 from public.company_members where company_id=v_company and user_id=auth.uid()) then
    raise exception 'Ingen adgang' using errcode='42501';
  end if;
  return public.company_billing_snapshot(v_company);
end;
$$;
revoke all on function public.get_company_billing(uuid) from public, anon;
grant execute on function public.get_company_billing(uuid) to authenticated;

-- Only the Edge Function's service client can reserve/settle. Browser users
-- cannot fake success/failure, reset a counter or grant themselves paid access.
create function public.reserve_company_ai_request(p_project_id uuid, p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_company uuid; v_usage jsonb; v_id uuid;
begin
  select p.company_id into v_company from public.projects p
    join public.company_members m on m.company_id=p.company_id and m.user_id=p_user_id
    join auth.users u on u.id=m.user_id
    where p.id=p_project_id and not exists(select 1 from public.blocked_users where user_id=p_user_id);
  if v_company is null then raise exception 'Ingen adgang' using errcode='42501'; end if;
  insert into public.company_billing(company_id) values(v_company) on conflict do nothing;
  perform 1 from public.company_billing where company_id=v_company for update;
  v_usage := public.company_billing_snapshot(v_company);
  if not (v_usage->>'canGenerate')::boolean then
    return jsonb_build_object('allowed', false, 'usage', v_usage);
  end if;
  insert into public.company_ai_requests(company_id,user_id,charge_trial)
    values(v_company,p_user_id,v_usage->>'status' <> 'active') returning id into v_id;
  return jsonb_build_object('allowed',true,'requestId',v_id,'usage',public.company_billing_snapshot(v_company));
end;
$$;
revoke all on function public.reserve_company_ai_request(uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_company_ai_request(uuid,uuid) to service_role;

create function public.finish_company_ai_request(p_request_id uuid, p_success boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_company uuid; v_request public.company_ai_requests;
begin
  select company_id into v_company from public.company_ai_requests where id=p_request_id;
  if v_company is null or p_success is null then raise exception 'Ukendt forespørgsel'; end if;
  perform 1 from public.company_billing where company_id=v_company for update;
  select * into v_request from public.company_ai_requests where id=p_request_id for update;
  if v_request.status='pending' then
    if p_success and v_request.expires_at <= now() then raise exception 'Forespørgslen er udløbet'; end if;
    update public.company_ai_requests set status=case when p_success then 'succeeded' else 'failed' end
      where id=p_request_id;
  elsif p_success and v_request.status <> 'succeeded' then
    raise exception 'Forespørgslen er allerede afsluttet';
  end if;
  return public.company_billing_snapshot(v_company);
end;
$$;
revoke all on function public.finish_company_ai_request(uuid,boolean) from public, anon, authenticated;
grant execute on function public.finish_company_ai_request(uuid,boolean) to service_role;

-- Self-service trial access. Blocking and admin checks remain effective.
create or replace function public.can_access_app() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid())
    and not exists(select 1 from public.blocked_users where user_id=auth.uid());
$$;
create or replace function public.get_app_access_state() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid()) then 'denied'
    when exists(select 1 from public.blocked_users where user_id=auth.uid()) then 'blocked'
    else 'active' end;
$$;

commit;
