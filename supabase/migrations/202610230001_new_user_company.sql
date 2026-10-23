begin;

-- Only the signed-in user's company can be returned or created.
create or replace function public.ensure_current_company()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_company uuid;
  v_count integer;
begin
  if v_user is null then
    raise exception 'Brugeren er ikke logget ind.' using errcode = '42501';
  end if;

  -- Serialize onboarding for this user across tabs and simultaneous requests.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  select count(*) into v_count from public.company_members where user_id = v_user;
  if v_count > 1 then
    raise exception 'Brugeren har flere virksomhedstilknytninger. Kontakt administratoren.';
  end if;
  select company_id into v_company from public.company_members where user_id = v_user;
  if v_company is not null then
    return v_company;
  end if;

  insert into public.companies (name) values ('Min virksomhed') returning id into v_company;
  insert into public.company_members (company_id, user_id) values (v_company, v_user);
  return v_company;
end;
$$;

revoke all on function public.ensure_current_company() from public, anon;
grant execute on function public.ensure_current_company() to authenticated;

commit;
