-- Run after 202611030002_multiple_company_trades.sql. Fixture is rolled back.
begin;
do $$
declare
  v_id uuid;
  v_trade text;
  v_trades text[];
begin
  insert into public.companies(name, trades) values ('Trade test - rollback', array['VVS','Murer'])
  returning id, trade, trades into v_id, v_trade, v_trades;
  if v_trade <> 'VVS' or v_trades <> array['VVS','Murer'] then
    raise exception 'Multiple trades were not preserved';
  end if;
  update public.companies set trades = array['Maler','Tømrer'] where id = v_id;
  select trade, trades into v_trade, v_trades from public.companies where id = v_id;
  if v_trade <> 'Maler' or v_trades <> array['Maler','Tømrer'] then
    raise exception 'Multiple trades update failed';
  end if;
  update public.companies set trade = 'Elektriker' where id = v_id;
  select trades into v_trades from public.companies where id = v_id;
  if v_trades <> array['Elektriker'] then raise exception 'Old client compatibility failed'; end if;
  update public.companies set trades = '{}' where id = v_id;
  select trade, trades into v_trade, v_trades from public.companies where id = v_id;
  if v_trade is not null or cardinality(v_trades) <> 0 then raise exception 'Clearing trades failed'; end if;
  begin
    update public.companies set trades = array['invalid'] where id = v_id;
    raise exception 'Invalid trade accepted';
  exception when check_violation then null;
  end;
  if not has_column_privilege('authenticated','public.companies','trades','UPDATE') then
    raise exception 'Missing trades permission';
  end if;
  if strpos(pg_get_functiondef('public.ensure_current_company()'::regprocedure), 'perform public.assert_app_access()') = 0 then
    raise exception 'Missing access guard';
  end if;
end;
$$;
select true as passed;
rollback;
