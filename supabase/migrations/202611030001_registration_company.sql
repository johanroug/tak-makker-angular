begin;

alter table public.companies add column trade text;
alter table public.companies add constraint companies_trade_allowed check (
  trade is null or trade in ('Tømrer','Murer','Elektriker','VVS','Maler','Tagdækker',
    'Anlægsgartner','Kloakmester','Gulvlægger','Snedker','Entreprenør','Multiservice','Andet')
);
grant update (trade) on public.companies to authenticated;

create or replace function public.ensure_current_company()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_company uuid;
  v_count integer;
  v_data jsonb;
  v_trade text;
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

  -- Signup metadata provides profile defaults only, never membership or access.
  select raw_user_meta_data into v_data from auth.users where id = v_user;
  v_trade := v_data->>'trade';
  if v_trade not in ('Tømrer','Murer','Elektriker','VVS','Maler','Tagdækker',
    'Anlægsgartner','Kloakmester','Gulvlægger','Snedker','Entreprenør','Multiservice','Andet') then
    v_trade := null;
  end if;
  insert into public.companies(name, cvr, address, phone, email, trade)
  select coalesce(nullif(left(btrim(v_data->>'company_name'),200),''),'Min virksomhed'),
    case when v_data->>'cvr' ~ '^[0-9]{8}$' then v_data->>'cvr' else null end,
    left(btrim(v_data->>'company_address'),500), left(btrim(v_data->>'phone'),25),
    email, v_trade
  from auth.users where id = v_user
  returning id into v_company;
  insert into public.company_members(company_id,user_id) values(v_company,v_user);
  return v_company;
end;
$$;

commit;
