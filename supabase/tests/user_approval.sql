-- Run after 202610230007_user_approval.sql. All changes are rolled back.
begin;
select set_config('test.pending_user', (
  select u.id::text from auth.users u
  where not exists (select 1 from public.activity_admins a where a.user_id = u.id)
    and not exists (select 1 from public.blocked_users b where b.user_id = u.id)
  order by u.created_at desc limit 1
), true);
do $check$
begin
  if coalesce(current_setting('test.pending_user', true), '') = '' then
    raise exception 'Testen kræver en aktiv testbruger ud over administratoren.';
  end if;
end;
$check$;
-- Simulate a new account: absence of an approval row must deny access.
delete from public.approved_users where user_id::text = current_setting('test.pending_user');

select set_config('request.jwt.claim.sub', current_setting('test.pending_user'), true);
set local role authenticated;
do $check$
declare denied boolean; v_table text; v_count integer;
begin
  if public.can_access_app() or public.get_app_access_state() <> 'pending' then
    raise exception 'Bruger uden godkendelse fik adgang';
  end if;
  foreach v_table in array array['companies','company_members','projects','project_messages',
    'project_work_items','project_materials','offers','offer_work_items','offer_materials'] loop
    execute format('select count(*) from public.%I', v_table) into v_count;
    if v_count <> 0 then raise exception 'Ikke-godkendt bruger kunne læse %', v_table; end if;
  end loop;
  denied := false;
  begin perform public.ensure_current_company(); exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Virksomhed blev oprettet uden godkendelse'; end if;
  denied := false;
  begin perform public.approve_app_user(auth.uid()); exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Brugeren kunne godkende sig selv'; end if;
  denied := false;
  begin insert into public.approved_users(user_id) values (auth.uid()); exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Direkte godkendelse var tilladt'; end if;
end;
$check$;
reset role;

select set_config('request.jwt.claim.sub', 'e5a0d637-a285-447c-b548-98d2945ea579', true);
set local role authenticated;
select public.approve_app_user(current_setting('test.pending_user')::uuid);
reset role;
select set_config('request.jwt.claim.sub', current_setting('test.pending_user'), true);
set local role authenticated;
do $check$
begin
  if not public.can_access_app() or public.get_app_access_state() <> 'active' then
    raise exception 'Godkendt bruger mangler adgang';
  end if;
end;
$check$;
reset role;

select set_config('request.jwt.claim.sub', 'e5a0d637-a285-447c-b548-98d2945ea579', true);
set local role authenticated;
select public.set_app_user_blocked(current_setting('test.pending_user')::uuid, true);
reset role;
select set_config('request.jwt.claim.sub', current_setting('test.pending_user'), true);
set local role authenticated;
do $check$
begin
  if public.can_access_app() or public.get_app_access_state() <> 'blocked' then
    raise exception 'Godkendelse tilsidesatte blokering';
  end if;
end;
$check$;
reset role;
rollback;
select 'Nye brugere afventer; egen godkendelse afvist; ejer kan godkende; blokering har forrang' as check_name, true as passed;
