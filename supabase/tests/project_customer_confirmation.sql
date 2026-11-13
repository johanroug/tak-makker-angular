-- Run in hosted staging after migration 202611130002. All fixtures roll back.
begin;
do $$
declare u uuid; company uuid; p public.projects; c uuid:=gen_random_uuid(); rejected uuid:=gen_random_uuid(); other uuid; foreign_customer uuid:=gen_random_uuid(); denied boolean;
begin
  select m.user_id,m.company_id into u,company from public.company_members m
    join public.approved_users a on a.user_id=m.user_id where not exists(
      select 1 from public.blocked_users b where b.user_id=m.user_id) limit 1;
  if u is null then raise exception 'Approved staging member required'; end if;
  perform set_config('request.jwt.claim.sub',u::text,true);
  p:=public.create_project(company);
  perform public.save_project_customer_details(p.id,c,'{"title":"Confirmation fixture","title_source":"user"}',null,
    '{"name":"Confirmation customer","address":"Contact address","email":"fixture@example.test","phone":"12345678"}');
  if not exists(select 1 from public.projects where id=p.id and customer_id=c and title='Confirmation fixture') then raise exception 'Combined save failed'; end if;
  denied:=false;
  begin perform public.save_project_customer_details(p.id,rejected,'{"title":"Must not save","title_source":"user"}',null,'{"name":"Rejected customer"}');
  exception when raise_exception then denied:=true; end;
  if not denied or exists(select 1 from public.customers where id=rejected)
    or not exists(select 1 from public.projects where id=p.id and customer_id=c and title='Confirmation fixture') then raise exception 'Failed confirmation persisted partial changes'; end if;
  denied:=false;
  begin perform public.save_project_customer_details(p.id,rejected,'{"hourly_rate":-1}',c,'{"name":"Invalid rate"}');
  exception when raise_exception then denied:=true; end;
  if not denied or exists(select 1 from public.customers where id=rejected) then raise exception 'Invalid save persisted a customer'; end if;
  insert into public.companies(name) values('Confirmation isolation fixture') returning id into other;
  insert into public.customers(id,company_id,name) values(foreign_customer,other,'Foreign confirmation fixture');
  denied:=false;
  begin perform public.save_project_customer_details(p.id,foreign_customer,'{}',c); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Foreign confirmation allowed'; end if;
  perform public.save_project_customer_details(p.id,c,'{"work_address":"Independent work address","work_address_source":"user"}',null,
    '{"name":"Confirmation customer","address":"Contact address","email":"fixture@example.test","phone":"12345678"}');
  if (select work_address from public.projects where id=p.id)<>'Independent work address' then raise exception 'Retry failed'; end if;
  perform set_config('test.confirmation_project',p.id::text,true);
  perform set_config('test.confirmation_customer',c::text,true);
end $$;
set local role authenticated;
do $$ begin
  perform public.save_project_customer_details(current_setting('test.confirmation_project')::uuid,
    current_setting('test.confirmation_customer')::uuid,'{"title":"Authenticated confirmation","title_source":"user"}',current_setting('test.confirmation_customer')::uuid);
  if not exists(select 1 from public.projects where id=current_setting('test.confirmation_project')::uuid and title='Authenticated confirmation') then raise exception 'Authenticated confirmation failed'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.save_project_customer_details(uuid,uuid,jsonb,uuid,jsonb)','execute') then raise exception 'Anonymous confirmation access'; end if;
end $$;
rollback;
select 'PASS: hosted atomic customer/project confirmation, retry, rollback, stale choices, validation, company isolation and authenticated access; fixtures rolled back' as result;
