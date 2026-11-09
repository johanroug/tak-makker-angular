begin;

create table if not exists public.company_transcription_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  billing_period_start timestamptz,
  charge_trial boolean not null,
  status text not null default 'pending' check (status in ('pending','succeeded','failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 minutes'
);
create index if not exists company_transcription_usage on public.company_transcription_requests(company_id,billing_period_start,status);
alter table public.company_transcription_requests enable row level security;
revoke all on public.company_transcription_requests from public,anon,authenticated;

create or replace function public.company_transcription_snapshot(p_company_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with billing as (select * from public.company_billing where company_id=p_company_id),
  flags as (select coalesce((select ai_access_override from billing),'none') <> 'none' as unlimited,
    exists(select 1 from billing where subscription_status='active' and access_until>now()
      and billing_period_start<=now() and billing_period_end>now()) as active),
  usage as (select
    count(*) filter(where status='succeeded' and (case when (select active from flags)
      then billing_period_start=(select billing_period_start from billing) else charge_trial end))::int as used,
    count(*) filter(where status='pending' and expires_at>now() and (case when (select active from flags)
      then billing_period_start=(select billing_period_start from billing) else charge_trial end))::int as pending
    from public.company_transcription_requests where company_id=p_company_id)
  select jsonb_build_object('transcriptionLimit',case when active then 100 else 10 end,
    'transcriptionUsed',used,'transcriptionPending',pending,
    'transcriptionRemaining',greatest(0,(case when active then 100 else 10 end)-used),
    'canTranscribe',unlimited or used+pending<(case when active then 100 else 10 end)) from flags,usage;
$$;
revoke all on function public.company_transcription_snapshot(uuid) from public,anon,authenticated;

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
    'paidLimit',200,'paidUsed',paid_used,'paidPending',paid_pending,'paidRemaining',greatest(0,200-paid_used),
    'periodStart',(select billing_period_start from billing),'periodEnd',(select billing_period_end from billing),
    'cancelAtPeriodEnd',coalesce((select cancel_at_period_end from billing),false),
    'subscriptionState',coalesce((select subscription_status from billing),'trial'),
    'hasStripeCustomer',exists(select 1 from billing where stripe_customer_id is not null),
    'canGenerate',override<>'none' or case when active then paid_used+paid_pending<200 else trial_used+trial_pending<10 end)
    || public.company_transcription_snapshot(p_company_id)
  from flags,usage;
$$;
revoke all on function public.company_billing_snapshot(uuid) from public,anon,authenticated;

create or replace function public.reserve_company_transcription(p_company_id uuid,p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare usage jsonb; request_id uuid; period_start timestamptz;
begin
  if not exists(select 1 from public.company_members where company_id=p_company_id and user_id=p_user_id)
    or exists(select 1 from public.blocked_users where user_id=p_user_id) then
    raise exception 'Ingen adgang' using errcode='42501';
  end if;
  insert into public.company_billing(company_id) values(p_company_id) on conflict do nothing;
  perform 1 from public.company_billing where company_id=p_company_id for update;
  usage:=public.company_billing_snapshot(p_company_id);
  if not (usage->>'canTranscribe')::boolean then
    return jsonb_build_object('allowed',false,'usage',usage);
  end if;
  if usage->>'status'='active' then
    select billing_period_start into period_start from public.company_billing where company_id=p_company_id;
  end if;
  insert into public.company_transcription_requests(company_id,user_id,billing_period_start,charge_trial)
    values(p_company_id,p_user_id,period_start,usage->>'status' not in ('active','internal','free')) returning id into request_id;
  return jsonb_build_object('allowed',true,'requestId',request_id,'usage',public.company_billing_snapshot(p_company_id));
end;
$$;
revoke all on function public.reserve_company_transcription(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_company_transcription(uuid,uuid) to service_role;

create or replace function public.finish_company_transcription(p_request_id uuid,p_succeeded boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare company uuid;
begin
  select company_id into company from public.company_transcription_requests where id=p_request_id;
  if company is null then raise exception 'Ukendt optagelse'; end if;
  perform 1 from public.company_billing where company_id=company for update;
  update public.company_transcription_requests set status=case when p_succeeded then 'succeeded' else 'failed' end
    where id=p_request_id and status='pending';
  return public.company_billing_snapshot(company);
end;
$$;
revoke all on function public.finish_company_transcription(uuid,boolean) from public,anon,authenticated;
grant execute on function public.finish_company_transcription(uuid,boolean) to service_role;
commit;
