-- Hosted staging regression test. Fixtures, memberships and block checks are
-- rolled back. Uses an already approved, nonblocked user without printing PII.
begin;
set local lock_timeout='15s';
set local statement_timeout='120s';
do $$
declare
  u uuid; company uuid; other_company uuid; p1 uuid; p2 uuid; foreign_project uuid;
  c1 public.customers; c2 public.customers; foreign_customer uuid := gen_random_uuid();
  offer public.offers; snapshot jsonb; results jsonb; denied boolean;
begin
  select a.user_id into u from public.approved_users a join auth.users au on au.id=a.user_id
    where not exists(select 1 from public.blocked_users b where b.user_id=a.user_id) limit 1;
  if u is null then raise exception 'An approved staging user is required'; end if;
  perform set_config('request.jwt.claim.sub',u::text,true);
  insert into public.companies(name,cvr,address,contact_name,email,phone,default_hourly_rate)
    values('Customer fixture','12345678','Firmaadresse','Testperson','test@example.test','12345678',450) returning id into company;
  insert into public.companies(name) values('Other customer fixture') returning id into other_company;
  insert into public.company_members(company_id,user_id) values(company,u),(other_company,u);
  insert into public.company_billing(company_id,ai_access_override) values(company,'internal'),(other_company,'internal');
  select id into p1 from public.create_project(company);
  select id into p2 from public.create_project(company);
  select id into foreign_project from public.create_project(other_company);
  delete from public.company_members where company_id=other_company and user_id=u;
  insert into public.customers(id,company_id,name,address) values(foreign_customer,other_company,'Same fixture name','Other address');
  c1 := public.save_customer(gen_random_uuid(),company,'Same fixture name','Contact address','old@example.test','11111111');
  -- Creation retry must not duplicate the customer or mutate values.
  if (public.save_customer(c1.id,company,c1.name,c1.address,c1.email,c1.phone)).id<>c1.id then raise exception 'Customer retry failed'; end if;
  update public.projects set title='Customer fixture Alpha',description='Fixture description',hourly_rate=450,
    work_address='Job address A',work_address_source='user' where id=p1;
  update public.projects set title='Customer fixture Beta',work_address='Job address B',work_address_source='user' where id=p2;
  perform public.link_project_customer(p1,c1.id,null);
  perform public.link_project_customer(p2,c1.id,null);
  perform public.link_project_customer(p2,c1.id,null);
  insert into public.project_work_items(id,project_id,trade,description,estimated_hours,estimated_hours_source,status)
    values(gen_random_uuid()::text,p1,'VVS','Fixture work',1,'user','accepted');
  offer := public.finalize_offer(p1);
  snapshot := to_jsonb(offer);
  if offer.customer_email<>'old@example.test' or offer.customer_phone<>'11111111' or offer.project_work_address<>'Job address A'
    or offer.pricing_total<>562.5 then raise exception 'New offer snapshot or calculation incorrect'; end if;
  c1 := public.save_customer(c1.id,company,'Changed fixture name','Changed contact','new@example.test','22222222',c1.updated_at);
  if (select count(*) from public.projects where customer_id=c1.id and customer_name=c1.name and customer_address=c1.address)<>2 then raise exception 'Contact propagation failed'; end if;
  if (select work_address from public.projects where id=p1)<>'Job address A' or (select work_address from public.projects where id=p2)<>'Job address B' then raise exception 'Work address changed'; end if;
  if (select to_jsonb(o) from public.offers o where id=offer.id)<>snapshot then raise exception 'Finalized offer changed'; end if;
  results := public.search_customers(company,'Customer fixture Alpha');
  if jsonb_array_length(results)<>1 or results->0->>'id'<>c1.id::text then raise exception 'Project title search failed'; end if;
  results := public.search_customers(company,(select project_number from public.projects where id=p1));
  if jsonb_array_length(results)<>1 then raise exception 'Project number search failed'; end if;
  if jsonb_array_length(public.search_customers(company,'22222222'))<>1 then raise exception 'Phone search failed'; end if;
  if (public.list_customer_projects(c1.id,'Customer fixture Beta')->0->>'id')<>p2::text then raise exception 'Matching project not first'; end if;
  denied := false;
  begin perform public.link_project_customer(p1,foreign_customer,c1.id); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Cross-company customer link allowed'; end if;
  denied := false;
  begin perform public.link_project_customer(foreign_project,c1.id,null); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'Cross-company project link allowed'; end if;
  c2 := public.save_customer(gen_random_uuid(),company,c1.name,'Other contact','','');
  if jsonb_array_length(public.search_customers(company,'',0,25,c1.id))<>1 then raise exception 'Possible duplicate not found'; end if;
  perform public.resolve_customer_duplicate(c1.id,c2.id,false);
  if jsonb_array_length(public.search_customers(company,'',0,25,c1.id))<>0 then raise exception 'Different-customer decision not recorded'; end if;
  perform public.link_project_customer(p2,c2.id,c1.id);
  perform public.resolve_customer_duplicate(c2.id,c1.id,true);
  if exists(select 1 from public.customers where id=c2.id) or (select customer_id from public.projects where id=p2)<>c1.id then raise exception 'Explicit merge failed'; end if;
  if (select work_address from public.projects where id=p2)<>'Job address B' or (select to_jsonb(o) from public.offers o where id=offer.id)<>snapshot then raise exception 'Merge changed work address or snapshot'; end if;
  perform set_config('test.customer_fixture_company',company::text,true);
  perform set_config('test.customer_fixture_other_company',other_company::text,true);
  perform set_config('test.customer_fixture_foreign',foreign_customer::text,true);
end $$;
set local role authenticated;
do $$ declare denied boolean; company uuid := current_setting('test.customer_fixture_company')::uuid; begin
  if (select count(*) from public.customers where company_id=company)<>1 then raise exception 'Own customer RLS read failed'; end if;
  if exists(select 1 from public.customers where id=current_setting('test.customer_fixture_foreign')::uuid) then raise exception 'Foreign customer exposed by RLS'; end if;
  denied:=false;
  begin perform public.search_customers(current_setting('test.customer_fixture_other_company')::uuid); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Foreign company RPC allowed'; end if;
  denied:=false;
  begin update public.customers set name='Direct update' where company_id=company; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Direct customer update allowed'; end if;
end $$;
reset role;
insert into public.blocked_users(user_id,blocked_by) values(auth.uid(),auth.uid());
set local role authenticated;
do $$ declare denied boolean; begin
  if exists(select 1 from public.customers) then raise exception 'Blocked user read customers'; end if;
  denied:=false;
  begin perform public.search_customers(current_setting('test.customer_fixture_company')::uuid); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Blocked user used customer RPC'; end if;
end $$;
reset role;
set local role anon;
do $$ declare denied boolean; begin
  denied:=false;
  begin perform public.search_customers(current_setting('test.customer_fixture_company')::uuid); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Anonymous customer RPC allowed'; end if;
end $$;
reset role;
rollback;
select 'PASS: hosted customer creation/retry, linking, updates, search, merge, work addresses, actual finalize_offer snapshots/calculations, authenticated RLS, blocked and anonymous access; fixtures rolled back' as result;
