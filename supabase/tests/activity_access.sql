-- Run in Supabase SQL Editor AFTER 202610230004_private_activity.sql.
-- All test events are rolled back. A successful run returns passed = true.
begin;

select set_config('request.jwt.claim.sub', 'e5a0d637-a285-447c-b548-98d2945ea579', true);
set local role authenticated;
do $$
begin
  if not public.is_activity_admin() then raise exception 'Ejeren mangler adgang'; end if;
  perform public.get_activity_events();
  perform public.record_activity('login', true);
end;
$$;
reset role;

-- Simulate another identity. No existing user is needed for read-access tests.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $$
declare denied boolean;
begin
  if public.is_activity_admin() then raise exception 'Fremmed bruger fik adminadgang'; end if;
  denied := false;
  begin perform public.get_activity_events(); exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Fremmed bruger kunne læse RPC-loggen'; end if;
  denied := false;
  begin perform 1 from public.activity_events; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Direkte læsning af loggen var tilladt'; end if;
  denied := false;
  begin insert into public.activity_admins(user_id) values (auth.uid()); exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Brugeren kunne gøre sig selv til admin'; end if;
end;
$$;
reset role;

set local role anon;
do $$
declare denied boolean := false;
begin
  begin perform public.get_activity_events(); exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Anonym læsning var tilladt'; end if;
end;
$$;
reset role;
rollback;
select 'Ejer tilladt; fremmed/anonym læsning og egen adminoprettelse afvist' as check_name, true as passed;
