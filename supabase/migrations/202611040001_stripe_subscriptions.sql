begin;

alter table public.company_billing
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text unique,
  add column stripe_subscription_created bigint not null default 0,
  add column stripe_event_created bigint not null default 0,
  add column billing_period_start timestamptz,
  add column billing_period_end timestamptz,
  add column cancel_at_period_end boolean not null default false,
  add column checkout_session_id text,
  add column checkout_attempt uuid not null default gen_random_uuid(),
  add column checkout_expires_at timestamptz,
  add column checkout_lock uuid,
  add column checkout_lock_until timestamptz,
  add column stripe_sync_lock uuid,
  add column stripe_sync_until timestamptz;
alter table public.company_ai_requests add column billing_period_start timestamptz;
create index company_ai_requests_paid_usage on public.company_ai_requests(company_id,billing_period_start,status)
  where billing_period_start is not null;
create table public.stripe_billing_events (
  event_id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  processed_at timestamptz not null default now()
);
alter table public.stripe_billing_events enable row level security;
revoke all on public.stripe_billing_events from public,anon,authenticated;

create or replace function public.company_billing_snapshot(p_company_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with billing as (
    select b.* from public.company_billing b where company_id=p_company_id
  ), flags as (
    select coalesce((select ai_access_override from billing),'none') as override,
      exists(select 1 from billing where subscription_status='active' and access_until>now()
        and billing_period_start<=now() and billing_period_end>now()) as active
  ), usage as (
    select count(*) filter(where charge_trial and status='succeeded')::int as trial_used,
      count(*) filter(where charge_trial and status='pending' and expires_at>now())::int as trial_pending,
      count(*) filter(where billing_period_start=(select billing_period_start from billing) and status='succeeded')::int as paid_used,
      count(*) filter(where billing_period_start=(select billing_period_start from billing) and status='pending' and expires_at>now())::int as paid_pending
    from public.company_ai_requests where company_id=p_company_id
  )
  select jsonb_build_object('companyId',p_company_id,
    'status',case when override<>'none' then override when active then 'active'
      when trial_used>=10 then 'exhausted' else 'trial' end,
    'trialLimit',10,'trialUsed',trial_used,'trialPending',trial_pending,'trialRemaining',greatest(0,10-trial_used),
    'paidLimit',500,'paidUsed',paid_used,'paidPending',paid_pending,'paidRemaining',greatest(0,500-paid_used),
    'periodStart',(select billing_period_start from billing),'periodEnd',(select billing_period_end from billing),
    'cancelAtPeriodEnd',coalesce((select cancel_at_period_end from billing),false),
    'subscriptionState',coalesce((select subscription_status from billing),'trial'),
    'hasStripeCustomer',exists(select 1 from billing where stripe_customer_id is not null),
    'canGenerate',override<>'none' or case when active then paid_used+paid_pending<500 else trial_used+trial_pending<10 end)
  from flags,usage;
$$;

create or replace function public.reserve_company_ai_request(p_project_id uuid,p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_company uuid; v_usage jsonb; v_id uuid; v_period timestamptz;
begin
  select p.company_id into v_company from public.projects p
    join public.company_members m on m.company_id=p.company_id and m.user_id=p_user_id
    join auth.users u on u.id=m.user_id
    where p.id=p_project_id and not exists(select 1 from public.blocked_users where user_id=p_user_id);
  if v_company is null then raise exception 'Ingen adgang' using errcode='42501'; end if;
  insert into public.company_billing(company_id) values(v_company) on conflict do nothing;
  perform 1 from public.company_billing where company_id=v_company for update;
  v_usage:=public.company_billing_snapshot(v_company);
  if not (v_usage->>'canGenerate')::boolean then
    return jsonb_build_object('allowed',false,'usage',v_usage);
  end if;
  if v_usage->>'status'='active' then
    select billing_period_start into v_period from public.company_billing where company_id=v_company;
  end if;
  insert into public.company_ai_requests(company_id,user_id,charge_trial,billing_period_start)
    values(v_company,p_user_id,v_usage->>'status' not in ('active','free','internal'),v_period) returning id into v_id;
  return jsonb_build_object('allowed',true,'requestId',v_id,'usage',public.company_billing_snapshot(v_company));
end;
$$;

create function public.claim_company_checkout(p_company_id uuid,p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_row public.company_billing; v_token uuid:=gen_random_uuid();
begin
  if not exists(select 1 from public.company_members where company_id=p_company_id and user_id=p_user_id)
    or exists(select 1 from public.blocked_users where user_id=p_user_id) then
    raise exception 'Ingen adgang' using errcode='42501';
  end if;
  insert into public.company_billing(company_id) values(p_company_id) on conflict do nothing;
  select * into v_row from public.company_billing where company_id=p_company_id for update;
  if v_row.checkout_lock_until>now() then return null; end if;
  update public.company_billing set checkout_lock=v_token,checkout_lock_until=now()+interval '2 minutes'
    where company_id=p_company_id;
  return jsonb_build_object('token',v_token,'customerId',v_row.stripe_customer_id,
    'sessionId',v_row.checkout_session_id,'attempt',v_row.checkout_attempt,'accessOverride',v_row.ai_access_override);
end;
$$;

create function public.save_company_checkout(p_company_id uuid,p_token uuid,p_customer_id text,
  p_session_id text default null,p_expires_at timestamptz default null,p_release boolean default true) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.company_billing set stripe_customer_id=coalesce(p_customer_id,stripe_customer_id),
    checkout_session_id=coalesce(p_session_id,checkout_session_id),
    checkout_expires_at=coalesce(p_expires_at,checkout_expires_at),
    checkout_lock=case when p_release then null else checkout_lock end,
    checkout_lock_until=case when p_release then null else checkout_lock_until end
    where company_id=p_company_id and checkout_lock=p_token and checkout_lock_until>now()
      and (stripe_customer_id is null or p_customer_id is null or stripe_customer_id=p_customer_id);
  return found;
end;
$$;

create function public.claim_stripe_billing_sync(p_customer_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_row public.company_billing; v_token uuid:=gen_random_uuid();
begin
  select * into v_row from public.company_billing where stripe_customer_id=p_customer_id for update;
  if not found then return jsonb_build_object('unknown',true); end if;
  if v_row.stripe_sync_until>now() then return null; end if;
  update public.company_billing set stripe_sync_lock=v_token,stripe_sync_until=now()+interval '2 minutes'
    where company_id=v_row.company_id;
  return jsonb_build_object('companyId',v_row.company_id,'token',v_token);
end;
$$;

create function public.rotate_company_checkout_attempt(p_company_id uuid,p_token uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_attempt uuid;
begin
  update public.company_billing set checkout_attempt=gen_random_uuid(),checkout_session_id=null,checkout_expires_at=null
    where company_id=p_company_id and checkout_lock=p_token and checkout_lock_until>now()
    returning checkout_attempt into v_attempt;
  if v_attempt is null then raise exception 'Checkout lease expired'; end if;
  return v_attempt;
end;
$$;

create function public.apply_stripe_billing_sync(p_company_id uuid,p_token uuid,p_event_id text,p_event_created bigint,
  p_subscription_id text,p_subscription_created bigint,p_status text,p_period_start timestamptz,
  p_period_end timestamptz,p_cancel_at_period_end boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_row public.company_billing;
begin
  select * into v_row from public.company_billing where company_id=p_company_id for update;
  if v_row.stripe_sync_lock is distinct from p_token or v_row.stripe_sync_until<=now() then
    raise exception 'Sync lease expired';
  end if;
  if p_status not in ('active','past_due','canceled') then raise exception 'Invalid subscription state'; end if;
  insert into public.stripe_billing_events(event_id,company_id) values(p_event_id,p_company_id) on conflict do nothing;
  if found and p_subscription_created>=v_row.stripe_subscription_created and
    (p_subscription_created>v_row.stripe_subscription_created or p_event_created>=v_row.stripe_event_created) then
    update public.company_billing set stripe_subscription_id=p_subscription_id,
      stripe_subscription_created=p_subscription_created,stripe_event_created=p_event_created,
      subscription_status=p_status,access_until=case when p_status='active' then p_period_end else null end,
      billing_period_start=p_period_start,billing_period_end=p_period_end,
      cancel_at_period_end=p_cancel_at_period_end
    where company_id=p_company_id;
  end if;
  update public.company_billing set stripe_sync_lock=null,stripe_sync_until=null where company_id=p_company_id;
  return true;
end;
$$;

create function public.release_stripe_billing_sync(p_company_id uuid,p_token uuid) returns void
language sql security definer set search_path = '' as $$
  update public.company_billing set stripe_sync_lock=null,stripe_sync_until=null
    where company_id=p_company_id and stripe_sync_lock=p_token;
$$;

revoke all on function public.claim_company_checkout(uuid,uuid),
  public.rotate_company_checkout_attempt(uuid,uuid),
  public.save_company_checkout(uuid,uuid,text,text,timestamptz,boolean),
  public.claim_stripe_billing_sync(text),
  public.apply_stripe_billing_sync(uuid,uuid,text,bigint,text,bigint,text,timestamptz,timestamptz,boolean),
  public.release_stripe_billing_sync(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_company_checkout(uuid,uuid),
  public.rotate_company_checkout_attempt(uuid,uuid),
  public.save_company_checkout(uuid,uuid,text,text,timestamptz,boolean),
  public.claim_stripe_billing_sync(text),
  public.apply_stripe_billing_sync(uuid,uuid,text,bigint,text,bigint,text,timestamptz,timestamptz,boolean),
  public.release_stripe_billing_sync(uuid,uuid) to service_role;

commit;
