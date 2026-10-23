-- Run AFTER 202610230006_registration_and_access.sql.
-- This test temporarily blocks one existing non-admin user; ROLLBACK restores it.
begin;
select set_config('test.target_user', (
  select id::text from auth.users
  where id not in (select user_id from public.activity_admins)
    and id not in (select user_id from public.blocked_users)
  order by created_at desc limit 1
), true);
do $test$
begin
  if coalesce(current_setting('test.target_user', true), '') = '' then
    raise exception 'Testen kræver en aktiv testbruger ud over administratoren.';
  end if;
end;
$test$;

select set_config('request.jwt.claim.sub', 'e5a0d637-a285-447c-b548-98d2945ea579', true);
set local role authenticated;
do $test$
declare denied boolean := false;
begin
  if not public.can_access_app() or not public.is_activity_admin() then raise exception 'Ejer mangler adgang'; end if;
  perform public.get_app_users();
  begin perform public.set_app_user_blocked(auth.uid(), true); exception when raise_exception then denied := true; end;
  if not denied then raise exception 'Administrator kunne blokere sig selv'; end if;
  perform public.set_app_user_blocked(current_setting('test.target_user')::uuid, true);
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', current_setting('test.target_user'), true);
set local role authenticated;
do $test$
declare denied boolean; v_table text; v_count integer; v_signature text;
begin
  if public.can_access_app() then raise exception 'Blokeret bruger fik adgang'; end if;
  foreach v_table in array array['companies','company_members','projects','project_messages',
    'project_work_items','project_materials','offers','offer_work_items','offer_materials'] loop
    execute format('select count(*) from public.%I', v_table) into v_count;
    if v_count <> 0 then raise exception 'Blokeret bruger kunne læse %', v_table; end if;
  end loop;
  foreach v_signature in array array[
    'select public.create_project(''00000000-0000-4000-8000-000000000001''::uuid)',
    'select public.finalize_offer(''00000000-0000-4000-8000-000000000001''::uuid)',
    'select public.update_offer_status(''00000000-0000-4000-8000-000000000001''::uuid,''finalized'',''sent'')',
    'select public.ensure_current_company()',
    'select public.record_activity(''login'',true)',
    'select public.get_activity_events()',
    'select public.get_app_users()'
  ] loop
    denied := false;
    begin execute v_signature; exception when insufficient_privilege then denied := true; end;
    if not denied then raise exception 'Blokeret bruger kunne kalde %', v_signature; end if;
  end loop;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', 'e5a0d637-a285-447c-b548-98d2945ea579', true);
set local role authenticated;
select public.set_app_user_blocked(current_setting('test.target_user')::uuid, false);
reset role;
select set_config('request.jwt.claim.sub', current_setting('test.target_user'), true);
set local role authenticated;
do $test$
declare denied boolean := false;
begin
  if not public.can_access_app() then raise exception 'Genåbnet bruger mangler adgang'; end if;
  begin perform public.set_app_user_blocked(auth.uid(), false); exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Almindelig bruger kunne ændre adgang'; end if;
end;
$test$;
reset role;
rollback;
select 'Ejer tilladt; blokering stopper tabel/RPC-adgang; genåbning tilladt; bruger kan ikke administrere adgang' as check_name, true as passed;
