-- Fixture data is rolled back. Uses two existing, nonblocked accounts only as members.
begin;
do $$
declare
  v_users uuid[]; v_company uuid; v_other uuid; v_project uuid;
  v_res jsonb; v_usage jsonb; v_id uuid; v_ids uuid[] := '{}'; v_i integer;
begin
  select array_agg(id) into v_users from (
    select id from auth.users where not exists(select 1 from public.blocked_users where user_id=id) limit 2
  ) users;
  if coalesce(cardinality(v_users),0) < 2 then raise exception 'Test requires two existing nonblocked users'; end if;
  insert into public.companies(name) values('Trial test - rollback') returning id into v_company;
  insert into public.companies(name) values('Other trial test - rollback') returning id into v_other;
  insert into public.company_members(company_id,user_id) values(v_company,v_users[1]),(v_company,v_users[2]);
  -- Use create_project as a member so numbering and all deployed invariants apply.
  perform set_config('request.jwt.claim.sub',v_users[1]::text,true);
  select id into v_project from public.create_project(v_company);
  if has_function_privilege('authenticated','public.reserve_company_ai_request(uuid,uuid)','execute') or
     has_function_privilege('authenticated','public.finish_company_ai_request(uuid,boolean)','execute') or
     has_table_privilege('authenticated','public.company_billing','UPDATE') or
     has_function_privilege('anon','public.get_company_billing(uuid)','execute') then
    raise exception 'Quota permissions are too broad';
  end if;
  v_res := public.reserve_company_ai_request(v_project,v_users[1]);
  v_usage := public.finish_company_ai_request((v_res->>'requestId')::uuid,false);
  if (v_usage->>'trialUsed')::int <> 0 then raise exception 'Failed call consumed trial'; end if;
  v_res := public.reserve_company_ai_request(v_project,v_users[1]);
  v_id := (v_res->>'requestId')::uuid;
  update public.company_ai_requests set expires_at=now()-interval '1 second' where id=v_id;
  begin
    perform public.finish_company_ai_request(v_id,true);
    raise exception 'Expired reservation was charged';
  exception when raise_exception then
    if sqlerrm <> 'Forespørgslen er udløbet' then raise; end if;
  end;
  -- Reserve all 10 slots across two employees before completing any of them.
  for v_i in 1..10 loop
    v_res := public.reserve_company_ai_request(v_project,v_users[1+v_i%2]);
    if not (v_res->>'allowed')::boolean then raise exception 'Expected a free slot'; end if;
    v_ids := array_append(v_ids,(v_res->>'requestId')::uuid);
  end loop;
  v_res := public.reserve_company_ai_request(v_project,v_users[1]);
  if (v_res->>'allowed')::boolean then raise exception 'Concurrent slots exceeded 10'; end if;
  for v_i in 1..10 loop v_usage := public.finish_company_ai_request(v_ids[v_i],true); end loop;
  if v_usage->>'status' <> 'exhausted' or (v_usage->>'trialUsed')::int <> 10 then
    raise exception 'Tenth completion did not exhaust trial';
  end if;
  v_usage := public.finish_company_ai_request(v_ids[1],true);
  if (v_usage->>'trialUsed')::int <> 10 then raise exception 'Duplicate completion counted twice'; end if;
  v_res := public.reserve_company_ai_request(v_project,v_users[2]);
  if (v_res->>'allowed')::boolean then raise exception 'Employee bypassed company limit'; end if;
  if (public.company_billing_snapshot(v_other)->>'trialUsed')::int <> 0 then raise exception 'Other company affected'; end if;
  update public.company_billing set ai_access_override='free' where company_id=v_company;
  if has_column_privilege('authenticated','public.company_billing','ai_access_override','UPDATE') then
    raise exception 'User may grant free access';
  end if;
  -- A free company can exceed the trial limit without consuming trial calls.
  for v_i in 1..11 loop
    v_res := public.reserve_company_ai_request(v_project,v_users[1]);
    if not (v_res->>'allowed')::boolean then raise exception 'Free access was limited'; end if;
    v_usage := public.finish_company_ai_request((v_res->>'requestId')::uuid,true);
  end loop;
  if v_usage->>'status' <> 'free' or (v_usage->>'trialUsed')::int <> 10 then
    raise exception 'Free calls affected trial usage';
  end if;
  update public.company_billing set ai_access_override='none' where company_id=v_company;
  v_res := public.reserve_company_ai_request(v_project,v_users[1]);
  if (v_res->>'allowed')::boolean then raise exception 'Revoked free access still bypasses quota'; end if;
  update public.company_billing set ai_access_override='internal',subscription_status='canceled' where company_id=v_company;
  v_res := public.reserve_company_ai_request(v_project,v_users[1]);
  if not (v_res->>'allowed')::boolean or v_res->'usage'->>'status' <> 'internal' then
    raise exception 'Internal access depends on paid subscription';
  end if;
  perform public.finish_company_ai_request((v_res->>'requestId')::uuid,true);
  -- Exhaustion restricts generation, not the member's access to project/profile data.
  if not public.can_access_app() then raise exception 'Exhaustion blocked app access'; end if;
  begin
    perform public.get_company_billing(v_other);
    raise exception 'Other company usage exposed';
  exception when insufficient_privilege then null;
  end;
  insert into public.blocked_users(user_id,blocked_by) values(v_users[2],v_users[1]);
  begin
    perform public.reserve_company_ai_request(v_project,v_users[2]);
    raise exception 'Blocked user could reserve';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select true as passed;
rollback;
