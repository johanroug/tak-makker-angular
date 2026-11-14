begin;
alter table public.customers add column if not exists postal_code text not null default '' check(length(postal_code)<=20);
alter table public.customers add column if not exists city text not null default '' check(length(city)<=200);
create index if not exists customers_postal_search on public.customers using gin
  ((name || ' ' || address || ' ' || email || ' ' || phone || ' ' || postal_code || ' ' || city) extensions.gin_trgm_ops);
create or replace function public.save_customer_details(p_id uuid,p_company_id uuid,p_name text,p_address text,p_email text,p_phone text,p_expected_updated_at timestamptz default null,p_postal_code text default '',p_city text default '')
returns public.customers language plpgsql security definer set search_path='' as $$
declare c public.customers;
begin
  perform public.assert_app_access();
  if not exists(select 1 from public.company_members where company_id=p_company_id and user_id=auth.uid()) then raise exception 'Ingen adgang' using errcode='42501'; end if;
  if p_id is null or p_name is null or length(btrim(p_name)) not between 1 and 200 then raise exception 'Angiv kundenavn'; end if;
  select * into c from public.customers where id=p_id for update;
  if found then
    if c.company_id<>p_company_id then raise exception 'Ingen adgang' using errcode='42501'; end if;
    if p_expected_updated_at is null then
      if (c.name,c.address,c.email,c.phone,c.postal_code,c.city) is distinct from (btrim(p_name),btrim(p_address),btrim(p_email),btrim(p_phone),btrim(p_postal_code),btrim(p_city)) then raise exception 'Kunden findes allerede. Genindlæs.'; end if;
      return c; -- idempotent retry of creation
    end if;
    if c.updated_at<>p_expected_updated_at then raise exception 'Kunden er ændret. Genindlæs før du gemmer.'; end if;
    update public.customers set name=btrim(p_name),address=btrim(p_address),email=btrim(p_email),phone=btrim(p_phone),postal_code=btrim(p_postal_code),city=btrim(p_city) where id=p_id returning * into c;
  else
    if p_expected_updated_at is not null then raise exception 'Kunden findes ikke længere'; end if;
    insert into public.customers(id,company_id,name,address,email,phone,postal_code,city) values(p_id,p_company_id,btrim(p_name),btrim(p_address),btrim(p_email),btrim(p_phone),btrim(p_postal_code),btrim(p_city)) returning * into c;
  end if;
  return c;
end $$;
revoke all on function public.save_customer_details(uuid,uuid,text,text,text,text,timestamptz,text,text) from public,anon;
grant execute on function public.save_customer_details(uuid,uuid,text,text,text,text,timestamptz,text,text) to authenticated;
create or replace function public.save_project_customer_details(
  p_project_id uuid,p_customer_id uuid,p_changes jsonb,
  p_expected_customer_id uuid default null,p_new_customer jsonb default null
) returns void language plpgsql security definer set search_path='' as $$
declare company uuid; original public.projects; patch public.projects;
begin
  perform public.assert_app_access();
  select p.company_id into company from public.projects p
    join public.company_members m on m.company_id=p.company_id and m.user_id=auth.uid()
    where p.id=p_project_id;
  if company is null or p_customer_id is null then raise exception 'Ingen adgang' using errcode='42501'; end if;
  if jsonb_typeof(p_changes) is distinct from 'object' or p_changes - array[
    'hourly_rate','work_address','work_address_source','title','title_source',
    'description','description_source','offer_description','offer_description_source',
    'validity_days','payment_terms','reservations'] <> '{}'::jsonb then raise exception 'Ugyldige projektfelter'; end if;
  patch := jsonb_populate_record(null::public.projects,p_changes);
  if p_changes ? 'title' and nullif(btrim(patch.title),'') is null then raise exception 'Angiv projekttitel'; end if;
  if p_changes ? 'hourly_rate' and patch.hourly_rate is not null
    and (patch.hourly_rate<0 or patch.hourly_rate::text in ('NaN','Infinity','-Infinity')) then raise exception 'Ugyldig timepris'; end if;
  if p_changes ? 'validity_days' and patch.validity_days is not null and patch.validity_days<1 then raise exception 'Ugyldig gyldighed'; end if;
  if exists(select 1 from jsonb_each(p_changes) e where e.key like '%\_source' escape '\' and e.value <> '"user"'::jsonb) then raise exception 'Ugyldig feltkilde'; end if;
  -- Match existing lock ordering: customer before project. New rows and their
  -- links are in this transaction, so a conflict cannot leave an orphan customer.
  if p_new_customer is not null then
    if jsonb_typeof(p_new_customer) is distinct from 'object'
      or p_new_customer - array['name','address','email','phone','postal_code','city'] <> '{}'::jsonb
      or jsonb_typeof(p_new_customer->'name') is distinct from 'string' then raise exception 'Ugyldige kundeoplysninger'; end if;
    perform public.save_customer_details(p_customer_id,company,p_new_customer->>'name',
      coalesce(p_new_customer->>'address',''),coalesce(p_new_customer->>'email',''),coalesce(p_new_customer->>'phone',''),null,coalesce(p_new_customer->>'postal_code',''),coalesce(p_new_customer->>'city',''));
  else
    perform 1 from public.customers where id=p_customer_id and company_id=company for update;
    if not found then raise exception 'Ingen adgang' using errcode='42501'; end if;
  end if;
  select * into strict original from public.projects where id=p_project_id and company_id=company for update;
  if original.customer_id is distinct from p_expected_customer_id
    and original.customer_id is distinct from p_customer_id then raise exception 'Projektets kunde er ændret. Genindlæs før du gemmer.'; end if;
  update public.projects set customer_id=p_customer_id,
    hourly_rate=case when p_changes ? 'hourly_rate' then patch.hourly_rate else original.hourly_rate end,
    work_address=case when p_changes ? 'work_address' then patch.work_address else original.work_address end,
    work_address_source=case when p_changes ? 'work_address_source' then patch.work_address_source else original.work_address_source end,
    title=case when p_changes ? 'title' then patch.title else original.title end,
    title_source=case when p_changes ? 'title_source' then patch.title_source else original.title_source end,
    description=case when p_changes ? 'description' then patch.description else original.description end,
    description_source=case when p_changes ? 'description_source' then patch.description_source else original.description_source end,
    offer_description=case when p_changes ? 'offer_description' then patch.offer_description else original.offer_description end,
    offer_description_source=case when p_changes ? 'offer_description_source' then patch.offer_description_source else original.offer_description_source end,
    validity_days=case when p_changes ? 'validity_days' then patch.validity_days else original.validity_days end,
    payment_terms=case when p_changes ? 'payment_terms' then patch.payment_terms else original.payment_terms end,
    reservations=case when p_changes ? 'reservations' then patch.reservations else original.reservations end
    where id=p_project_id and company_id=company;
end $$;
create or replace function public.project_customer_contact() returns trigger
language plpgsql security definer set search_path='' as $$
declare c public.customers;
begin
  if new.customer_id is not null then
    select * into strict c from public.customers where id=new.customer_id and company_id=new.company_id;
    new.customer_name := c.name; new.customer_address := concat_ws(E'\n',nullif(c.address,''),nullif(concat_ws(' ',nullif(c.postal_code,''),nullif(c.city,'')),''));
    new.customer_name_source := 'user'; new.customer_address_source := 'user';
  end if;
  return new;
end $$;
create or replace function public.sync_customer_projects() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.projects set customer_name=new.name,customer_address=concat_ws(E'\n',nullif(new.address,''),nullif(concat_ws(' ',nullif(new.postal_code,''),nullif(new.city,'')),''))
    where company_id=new.company_id and customer_id=new.id;
  return new;
end $$;
drop trigger if exists customer_projects on public.customers;
create trigger customer_projects after update of name,address,email,phone,postal_code,city on public.customers for each row execute function public.sync_customer_projects();
create or replace function public.search_customers(p_company_id uuid,p_query text default '',p_offset integer default 0,p_limit integer default 25,p_duplicates_of uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_pattern text; v_name text;
begin
  perform public.assert_app_access();
  if not exists(select 1 from public.company_members where company_id=p_company_id and user_id=auth.uid()) then
    raise exception 'Ingen adgang' using errcode='42501';
  end if;
  if p_offset is null or p_offset<0 or p_offset>100000 or p_limit is null or p_limit not between 1 and 50 or length(p_query)>160 then raise exception 'Ugyldig søgning'; end if;
  v_pattern := '%' || replace(replace(replace(btrim(coalesce(p_query,'')),E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_') || '%';
  if p_duplicates_of is not null then
    select lower(btrim(name)) into strict v_name from public.customers where id=p_duplicates_of and company_id=p_company_id;
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(result) order by last_activity desc,id),'[]'::jsonb) from (
    select c.*, (select count(*) from public.projects p where p.customer_id=c.id and p.company_id=c.company_id) as project_count,
      greatest(c.updated_at,coalesce((select max(coalesce(p.updated_at,p.created_at)) from public.projects p where p.customer_id=c.id and p.company_id=c.company_id),c.updated_at)) as last_activity,
      exists(select 1 from public.customers d where d.company_id=c.company_id and d.id<>c.id and lower(btrim(d.name))=lower(btrim(c.name))
        and not exists(select 1 from public.customer_match_decisions x where x.customer_a=least(c.id,d.id) and x.customer_b=greatest(c.id,d.id))) as possible_duplicate
    from public.customers c where c.company_id=p_company_id
    and (p_duplicates_of is null or (c.id<>p_duplicates_of and lower(btrim(c.name))=v_name
      and not exists(select 1 from public.customer_match_decisions x where x.customer_a=least(c.id,p_duplicates_of) and x.customer_b=greatest(c.id,p_duplicates_of))))
    and ((c.name || ' ' || c.address || ' ' || c.email || ' ' || c.phone || ' ' || c.postal_code || ' ' || c.city) ilike v_pattern
      or exists(select 1 from public.projects p where p.customer_id=c.id and p.company_id=c.company_id
        and (coalesce(p.title,'') || ' ' || p.project_number || ' ' || coalesce(p.work_address,'')) ilike v_pattern))
    order by last_activity desc,c.id limit p_limit offset p_offset
  ) result);
end $$;
notify pgrst, 'reload schema';
commit;
