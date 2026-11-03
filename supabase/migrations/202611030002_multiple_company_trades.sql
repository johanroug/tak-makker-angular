begin;

alter table public.companies add column trades text[] not null default '{}';
update public.companies set trades = array[trade] where trade is not null;
alter table public.companies add constraint companies_trades_allowed check (
  cardinality(trades) <= 13
  and array_position(trades, null) is null
  and trades <@ array['Tømrer','Murer','Elektriker','VVS','Maler','Tagdækker',
    'Anlægsgartner','Kloakmester','Gulvlægger','Snedker','Entreprenør','Multiservice','Andet']::text[]
);
grant update (trades) on public.companies to authenticated;

-- Retain compatibility for already-open clients with the old single-fag field.
create function public.sync_company_trades() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.trades is distinct from old.trades then
      new.trade := new.trades[1];
    elsif new.trade is distinct from old.trade then
      new.trades := case when new.trade is null then '{}'::text[] else array[new.trade] end;
    end if;
  elsif cardinality(new.trades) > 0 then
    new.trade := new.trades[1];
  elsif new.trade is not null then
    new.trades := array[new.trade];
  end if;
  return new;
end;
$$;
revoke all on function public.sync_company_trades() from public, anon, authenticated;
create trigger sync_company_trades before insert or update of trade, trades
on public.companies for each row execute function public.sync_company_trades();

create or replace function public.ensure_current_company()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_company uuid;
  v_count integer;
  v_data jsonb;
  v_trades text[] := '{}';
begin
  perform public.assert_app_access();
  if v_user is null then
    raise exception 'Brugeren er ikke logget ind.' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  select count(*) into v_count from public.company_members where user_id = v_user;
  if v_count > 1 then
    raise exception 'Brugeren har flere virksomhedstilknytninger. Kontakt administratoren.';
  end if;
  select company_id into v_company from public.company_members where user_id = v_user;
  if v_company is not null then return v_company; end if;

  select raw_user_meta_data into v_data from auth.users where id = v_user;
  if jsonb_typeof(v_data->'trades') = 'array' then
    select coalesce(array_agg(distinct value), '{}'::text[]) into v_trades
    from jsonb_array_elements_text(v_data->'trades') as item(value)
    where value in ('Tømrer','Murer','Elektriker','VVS','Maler','Tagdækker',
      'Anlægsgartner','Kloakmester','Gulvlægger','Snedker','Entreprenør','Multiservice','Andet');
  elsif v_data->>'trade' in ('Tømrer','Murer','Elektriker','VVS','Maler','Tagdækker',
    'Anlægsgartner','Kloakmester','Gulvlægger','Snedker','Entreprenør','Multiservice','Andet') then
    v_trades := array[v_data->>'trade'];
  end if;

  insert into public.companies(name, cvr, address, phone, email, trades)
  select coalesce(nullif(left(btrim(v_data->>'company_name'),200),''),'Min virksomhed'),
    case when v_data->>'cvr' ~ '^[0-9]{8}$' then v_data->>'cvr' else null end,
    left(btrim(v_data->>'company_address'),500), left(btrim(v_data->>'phone'),25),
    email, v_trades
  from auth.users where id = v_user returning id into v_company;
  insert into public.company_members(company_id,user_id) values(v_company,v_user);
  return v_company;
end;
$$;

commit;
