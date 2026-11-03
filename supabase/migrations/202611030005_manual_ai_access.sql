begin;

alter table public.company_billing add column ai_access_override text not null default 'none'
  check (ai_access_override in ('none','free','internal'));

create or replace function public.company_billing_snapshot(p_company_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with usage as (
    select count(*) filter (where status='succeeded')::integer as used,
      count(*) filter (where status='pending' and expires_at > now())::integer as pending
    from public.company_ai_requests where company_id=p_company_id and charge_trial
  ), subscription as (
    select exists(select 1 from public.company_billing where company_id=p_company_id
      and subscription_status='active' and access_until > now()) as active,
      coalesce((select ai_access_override from public.company_billing where company_id=p_company_id),'none') as override
  )
  select jsonb_build_object('companyId', p_company_id,
    'status', case when override <> 'none' then override when active then 'active'
      when used >= 10 then 'exhausted' else 'trial' end,
    'trialLimit', 10, 'trialUsed', used, 'trialPending', pending,
    'trialRemaining', greatest(0,10-used),
    'canGenerate', override <> 'none' or active or used+pending < 10)
  from usage, subscription;
$$;

create or replace function public.reserve_company_ai_request(p_project_id uuid, p_user_id uuid) returns jsonb
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
    values(v_company,p_user_id,v_usage->>'status' not in ('active','free','internal')) returning id into v_id;
  return jsonb_build_object('allowed',true,'requestId',v_id,'usage',public.company_billing_snapshot(v_company));
end;
$$;

-- No browser grants are added. This flag is controlled through the Supabase
-- Dashboard/SQL Editor, independently of paid subscription status.
commit;
