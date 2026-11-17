begin;

create table public.offer_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  message_id uuid not null unique references public.project_messages(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','succeeded','failed')),
  quota_request_id uuid references public.company_ai_requests(id),
  dispatched_at timestamptz,
  expires_at timestamptz not null default clock_timestamp()+interval '5 minutes',
  finished_at timestamptz,
  response jsonb
);
create unique index offer_generations_one_pending_project on public.offer_generations(project_id) where status='pending';
create index offer_generations_company_failures on public.offer_generations(company_id,finished_at) where status='failed';
alter table public.offer_generations enable row level security;
revoke all on public.offer_generations from public,anon,authenticated;
grant select on public.offer_generations to service_role;

create function public.claim_offer_generation(p_project_id uuid,p_message_id uuid,p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare company uuid; prior public.offer_generations; stale public.offer_generations;
  request_id uuid; failures int; last_failure timestamptz;
begin
  select p.company_id into company from public.projects p
    join public.company_members m on m.company_id=p.company_id and m.user_id=p_user_id
    where p.id=p_project_id and not exists(select 1 from public.blocked_users where user_id=p_user_id);
  if company is null then raise exception 'Ingen adgang' using errcode='42501'; end if;
  insert into public.company_billing(company_id) values(company) on conflict do nothing;
  -- Common lock with quota settlement; also serializes the company error circuit.
  perform 1 from public.company_billing where company_id=company for update;
  if not exists(select 1 from public.project_messages where id=p_message_id and project_id=p_project_id and role='user') then
    raise exception 'Unknown user message';
  end if;
  -- Expired dispatched calls must never be retried. Unknown costs stay reserved.
  for stale in select * from public.offer_generations where company_id=company and status='pending' and expires_at<=clock_timestamp() loop
    if stale.quota_request_id is not null then perform public.finish_company_ai_request(stale.quota_request_id,false); end if;
    if stale.dispatched_at is null then
      delete from public.offer_generations where id=stale.id;
    else
      update public.offer_generations set status='failed',finished_at=clock_timestamp() where id=stale.id;
    end if;
  end loop;
  select * into prior from public.offer_generations where message_id=p_message_id;
  if found then
    if prior.status='succeeded' then return jsonb_build_object('state','cached','response',prior.response); end if;
    return jsonb_build_object('state',case when prior.status='pending' then 'busy' else 'failed' end);
  end if;
  -- Do not generate an obsolete snapshot when another tab saved a newer message.
  if p_message_id is distinct from (select id from public.project_messages where project_id=p_project_id and role='user' order by created_at desc,id desc limit 1) then
    return jsonb_build_object('state','stale');
  end if;
  if exists(select 1 from public.offer_generations where project_id=p_project_id and status='pending') then
    return jsonb_build_object('state','busy');
  end if;
  select count(*),max(finished_at) into failures,last_failure from public.offer_generations
    where company_id=company and status='failed' and dispatched_at is not null and finished_at>clock_timestamp()-interval '5 minutes';
  if failures>=3 and last_failure+interval '1 minute'>clock_timestamp() then
    return jsonb_build_object('state','cooldown','retryAfter',greatest(1,ceil(extract(epoch from last_failure+interval '1 minute'-clock_timestamp()))::int));
  end if;
  insert into public.offer_generations(project_id,message_id,company_id) values(p_project_id,p_message_id,company) returning id into request_id;
  return jsonb_build_object('state','claimed','requestId',request_id);
end;
$$;

create function public.start_offer_generation(p_request_id uuid,p_quota_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare company uuid;
begin
  select company_id into company from public.offer_generations where id=p_request_id;
  if company is null then raise exception 'Unknown generation'; end if;
  perform 1 from public.company_billing where company_id=company for update;
  if not exists(select 1 from public.company_ai_requests where id=p_quota_request_id and company_id=company and status='pending' and expires_at>clock_timestamp()) then
    raise exception 'Invalid quota reservation';
  end if;
  update public.offer_generations set dispatched_at=clock_timestamp(),quota_request_id=p_quota_request_id
    where id=p_request_id and status='pending' and dispatched_at is null and expires_at>clock_timestamp();
  if not found then raise exception 'Generation already started or expired'; end if;
end;
$$;

-- Successful caching and customer quota settlement are one transaction.
create function public.finish_offer_generation(p_request_id uuid,p_response jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare company uuid; generation public.offer_generations; usage jsonb;
begin
  select company_id into company from public.offer_generations where id=p_request_id;
  if company is null then return null; end if;
  perform 1 from public.company_billing where company_id=company for update;
  select * into generation from public.offer_generations where id=p_request_id for update;
  if not found then return null; end if;
  if generation.status='succeeded' then return public.company_billing_snapshot(company); end if;
  if generation.status<>'pending' then
    if p_response is not null then raise exception 'Generation already failed'; end if;
    return public.company_billing_snapshot(company);
  end if;
  if p_response is not null then
    if generation.dispatched_at is null or jsonb_typeof(p_response)<>'object' then raise exception 'Invalid generation result'; end if;
    usage:=public.finish_company_ai_request(generation.quota_request_id,true);
    update public.offer_generations set status='succeeded',response=p_response,finished_at=clock_timestamp() where id=p_request_id;
  else
    if generation.quota_request_id is not null then usage:=public.finish_company_ai_request(generation.quota_request_id,false); end if;
    if generation.dispatched_at is null then
      delete from public.offer_generations where id=p_request_id;
    else
      update public.offer_generations set status='failed',finished_at=clock_timestamp() where id=p_request_id;
    end if;
  end if;
  return coalesce(usage,public.company_billing_snapshot(company));
end;
$$;

revoke all on function public.claim_offer_generation(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.start_offer_generation(uuid,uuid) from public,anon,authenticated;
revoke all on function public.finish_offer_generation(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.claim_offer_generation(uuid,uuid,uuid) to service_role;
grant execute on function public.start_offer_generation(uuid,uuid) to service_role;
grant execute on function public.finish_offer_generation(uuid,jsonb) to service_role;
commit;
