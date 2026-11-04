begin;
do $$
declare v_user uuid; v_company uuid; v_project uuid; v_usage jsonb; v_res jsonb; v_lease jsonb;
  v_start timestamptz:=now()-interval '1 day'; v_end timestamptz:=now()+interval '29 days';
  v_customer text:='cus_test_'||gen_random_uuid()::text;
begin
  select u.id into v_user from auth.users u where not exists(select 1 from public.blocked_users where user_id=u.id) limit 1;
  insert into public.companies(name) values('Stripe test - rollback') returning id into v_company;
  insert into public.company_members(company_id,user_id) values(v_company,v_user);
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  select id into v_project from public.create_project(v_company);
  v_lease:=public.claim_company_checkout(v_company,v_user);
  if public.claim_company_checkout(v_company,v_user) is not null then raise exception 'Concurrent checkout allowed'; end if;
  if not public.save_company_checkout(v_company,(v_lease->>'token')::uuid,v_customer) then raise exception 'Customer save failed'; end if;
  if public.save_company_checkout(v_company,(v_lease->>'token')::uuid,'cus_wrong') then raise exception 'Expired checkout lease accepted'; end if;
  if has_function_privilege('authenticated','public.claim_company_checkout(uuid,uuid)','execute') or
     has_function_privilege('authenticated','public.claim_stripe_billing_sync(text)','execute') or
     has_table_privilege('authenticated','public.stripe_billing_events','INSERT') then raise exception 'Stripe functions exposed'; end if;

  v_lease:=public.claim_stripe_billing_sync(v_customer);
  if public.claim_stripe_billing_sync(v_customer) is not null then raise exception 'Concurrent sync allowed'; end if;
  perform public.apply_stripe_billing_sync(v_company,(v_lease->>'token')::uuid,'evt_'||v_company||'_1',100,
    'sub_'||v_company,1,'active',v_start,v_end,false);
  insert into public.company_ai_requests(company_id,user_id,status,charge_trial,billing_period_start)
    select v_company,v_user,'succeeded',false,v_start from generate_series(1,499);
  v_res:=public.reserve_company_ai_request(v_project,v_user);
  if not (v_res->>'allowed')::boolean then raise exception '500th paid request rejected'; end if;
  if (public.reserve_company_ai_request(v_project,v_user)->>'allowed')::boolean then raise exception '501st reservation allowed'; end if;
  v_usage:=public.finish_company_ai_request((v_res->>'requestId')::uuid,true);
  if (v_usage->>'paidUsed')::int<>500 or (v_usage->>'trialUsed')::int<>0 then raise exception 'Paid usage incorrect'; end if;

  -- Replaying an event must not reset the billing period and grant 500 more calls.
  v_lease:=public.claim_stripe_billing_sync(v_customer);
  perform public.apply_stripe_billing_sync(v_company,(v_lease->>'token')::uuid,'evt_'||v_company||'_1',100,
    'sub_'||v_company,1,'active',now()-interval '1 hour',v_end,true);
  if (public.company_billing_snapshot(v_company)->>'paidUsed')::int<>500 then raise exception 'Duplicate event reset quota'; end if;

  -- A newly paid period gets its own quota; old requests stay attached to the old period.
  v_lease:=public.claim_stripe_billing_sync(v_customer);
  perform public.apply_stripe_billing_sync(v_company,(v_lease->>'token')::uuid,'evt_'||v_company||'_2',200,
    'sub_'||v_company,1,'active',now()-interval '1 hour',v_end,true);
  v_usage:=public.company_billing_snapshot(v_company);
  if (v_usage->>'paidUsed')::int<>0 or not (v_usage->>'canGenerate')::boolean or
     not (v_usage->>'cancelAtPeriodEnd')::boolean then raise exception 'Renewal/cancellation-at-end incorrect'; end if;
  v_lease:=public.claim_stripe_billing_sync(v_customer);
  perform public.apply_stripe_billing_sync(v_company,(v_lease->>'token')::uuid,'evt_'||v_company||'_old',150,
    'sub_'||v_company,1,'canceled',v_start,v_end,false);
  if public.company_billing_snapshot(v_company)->>'status'<>'active' then raise exception 'Old event overwrote latest state'; end if;

  -- A failed renewal suspends paid access; paying the same invoice restores
  -- that period without erasing requests already completed in it.
  v_start:=now()-interval '1 hour';
  insert into public.company_ai_requests(company_id,user_id,status,charge_trial,billing_period_start)
    values(v_company,v_user,'succeeded',false,v_start);
  v_lease:=public.claim_stripe_billing_sync(v_customer);
  perform public.apply_stripe_billing_sync(v_company,(v_lease->>'token')::uuid,'evt_'||v_company||'_failed',210,
    'sub_'||v_company,1,'past_due',v_start,v_end,false);
  v_usage:=public.company_billing_snapshot(v_company);
  if v_usage->>'status'='active' or v_usage->>'subscriptionState'<>'past_due' then
    raise exception 'Failed payment retained paid access';
  end if;
  v_lease:=public.claim_stripe_billing_sync(v_customer);
  perform public.apply_stripe_billing_sync(v_company,(v_lease->>'token')::uuid,'evt_'||v_company||'_recovered',220,
    'sub_'||v_company,1,'active',v_start,v_end,false);
  v_usage:=public.company_billing_snapshot(v_company);
  if v_usage->>'status'<>'active' or not (v_usage->>'canGenerate')::boolean or
     (v_usage->>'paidUsed')::int<>1 or (v_usage->>'paidRemaining')::int<>499 or
     (v_usage->>'trialUsed')::int<>0 then raise exception 'Payment recovery lost access or reset usage'; end if;
  v_res:=public.reserve_company_ai_request(v_project,v_user);
  if not (v_res->>'allowed')::boolean then raise exception 'Recovered subscription cannot reserve a call'; end if;
  v_usage:=public.finish_company_ai_request((v_res->>'requestId')::uuid,true);
  if (v_usage->>'paidUsed')::int<>2 or (v_usage->>'paidRemaining')::int<>498 then
    raise exception 'Recovered paid request counted incorrectly';
  end if;

  -- Stripe test clocks do not advance PostgreSQL's clock. A paid future
  -- period is stored as active, but does not grant access before its start.
  v_lease:=public.claim_stripe_billing_sync(v_customer);
  perform public.apply_stripe_billing_sync(v_company,(v_lease->>'token')::uuid,'evt_'||v_company||'_future',230,
    'sub_'||v_company,1,'active',now()+interval '30 days',now()+interval '60 days',false);
  v_usage:=public.company_billing_snapshot(v_company);
  if v_usage->>'subscriptionState'<>'active' or v_usage->>'status'='active' then
    raise exception 'Future simulation period bypassed server clock';
  end if;
  update public.company_billing set ai_access_override='internal' where company_id=v_company;
  v_lease:=public.claim_stripe_billing_sync(v_customer);
  perform public.apply_stripe_billing_sync(v_company,(v_lease->>'token')::uuid,'evt_'||v_company||'_3',300,
    'sub_'||v_company,1,'past_due',v_start,v_end,false);
  if public.company_billing_snapshot(v_company)->>'status'<>'internal' then raise exception 'Stripe erased manual access'; end if;
end;
$$;
select true as passed;
rollback;
