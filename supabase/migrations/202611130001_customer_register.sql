begin;

create extension if not exists pg_trgm with schema extensions;
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  name text not null check(length(btrim(name)) between 1 and 200),
  address text not null default '' check(length(address)<=1000),
  email text not null default '' check(length(email)<=320),
  phone text not null default '' check(length(phone)<=100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,id)
);
alter table public.projects add column if not exists customer_id uuid;
alter table public.projects add column if not exists work_address text;
alter table public.projects add column if not exists work_address_source text;
alter table public.projects add column if not exists pending_customer_email text;
alter table public.projects add column if not exists pending_customer_phone text;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='projects_customer_company_fkey' and conrelid='public.projects'::regclass) then
    alter table public.projects add constraint projects_customer_company_fkey
      foreign key(company_id,customer_id) references public.customers(company_id,id);
  end if;
end $$;
create index if not exists customers_company on public.customers(company_id,updated_at desc,id);
create index if not exists customers_name on public.customers(company_id,lower(btrim(name)));
create index if not exists projects_customer on public.projects(company_id,customer_id,created_at desc,id);
create index if not exists customers_search on public.customers using gin
  ((name || ' ' || address || ' ' || email || ' ' || phone) extensions.gin_trgm_ops);
create index if not exists projects_customer_search on public.projects using gin
  ((coalesce(title,'') || ' ' || project_number || ' ' || coalesce(work_address,'')) extensions.gin_trgm_ops);

create table if not exists public.customer_match_decisions (
  company_id uuid not null,
  customer_a uuid not null,
  customer_b uuid not null,
  primary key(customer_a,customer_b),
  check(customer_a < customer_b),
  foreign key(company_id,customer_a) references public.customers(company_id,id) on delete cascade,
  foreign key(company_id,customer_b) references public.customers(company_id,id) on delete cascade
);
create index if not exists customer_decisions_target on public.customer_match_decisions(customer_b);
alter table public.customers enable row level security;
alter table public.customer_match_decisions enable row level security;
revoke all on public.customers, public.customer_match_decisions from public,anon,authenticated;
grant select on public.customers to authenticated;
drop policy if exists customers_company_read on public.customers;
create policy customers_company_read on public.customers for select to authenticated using (
  (select public.can_access_app()) and exists(select 1 from public.company_members m
    where m.company_id=customers.company_id and m.user_id=auth.uid())
);

-- Preserve original addresses, even if they were actually work addresses. Never
-- infer identity from a name/address pair. A project UUID makes backfill retryable.
insert into public.customers(id,company_id,name,address,created_at,updated_at)
select p.id,p.company_id,btrim(p.customer_name),coalesce(p.customer_address,''),p.created_at,coalesce(p.updated_at,p.created_at)
from public.projects p where p.customer_id is null and length(btrim(coalesce(p.customer_name,'')))>0
on conflict(id) do nothing;
update public.projects p set customer_id=p.id,work_address=coalesce(p.work_address,p.customer_address),work_address_source=coalesce(p.work_address_source,p.customer_address_source)
where p.customer_id is null and length(btrim(coalesce(p.customer_name,'')))>0
  and exists(select 1 from public.customers c where c.id=p.id and c.company_id=p.company_id);
update public.projects set work_address=customer_address,work_address_source=customer_address_source where work_address is null;

-- Legacy fields support existing app versions and finalize_offer's snapshots.
-- Linked project writes cannot fork shared contact data.
create or replace function public.project_customer_contact() returns trigger
language plpgsql security definer set search_path='' as $$
declare c public.customers;
begin
  if new.customer_id is not null then
    select * into strict c from public.customers where id=new.customer_id and company_id=new.company_id;
    new.customer_name := c.name; new.customer_address := c.address;
    new.customer_name_source := 'user'; new.customer_address_source := 'user';
  end if;
  return new;
end $$;
drop trigger if exists project_customer_contact on public.projects;
create trigger project_customer_contact before insert or update on public.projects
for each row execute function public.project_customer_contact();

create or replace function public.sync_customer_contact() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists customer_updated_at on public.customers;
create trigger customer_updated_at before update on public.customers
for each row execute function public.sync_customer_contact();
create or replace function public.sync_customer_projects() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.projects set customer_name=new.name,customer_address=new.address
    where company_id=new.company_id and customer_id=new.id;
  return new;
end $$;
drop trigger if exists customer_projects on public.customers;
create trigger customer_projects after update of name,address,email,phone on public.customers
for each row execute function public.sync_customer_projects();
grant update(work_address,work_address_source,pending_customer_email,pending_customer_phone) on public.projects to authenticated;

-- New snapshots gain contact fields. Existing finalized offers are untouched.
alter table public.offers add column if not exists customer_email text;
alter table public.offers add column if not exists customer_phone text;
alter table public.offers add column if not exists project_work_address text;
create or replace function public.snapshot_customer_contact() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  select c.email,c.phone,p.work_address into new.customer_email,new.customer_phone,new.project_work_address
    from public.projects p left join public.customers c on c.id=p.customer_id and c.company_id=p.company_id
    where p.id=new.project_id;
  return new;
end $$;
drop trigger if exists offer_customer_contact on public.offers;
create trigger offer_customer_contact before insert on public.offers
for each row execute function public.snapshot_customer_contact();

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
    and ((c.name || ' ' || c.address || ' ' || c.email || ' ' || c.phone) ilike v_pattern
      or exists(select 1 from public.projects p where p.customer_id=c.id and p.company_id=c.company_id
        and (coalesce(p.title,'') || ' ' || p.project_number || ' ' || coalesce(p.work_address,'')) ilike v_pattern))
    order by last_activity desc,c.id limit p_limit offset p_offset
  ) result);
end $$;

create or replace function public.save_customer(p_id uuid,p_company_id uuid,p_name text,p_address text,p_email text,p_phone text,p_expected_updated_at timestamptz default null)
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
      if (c.name,c.address,c.email,c.phone) is distinct from (btrim(p_name),btrim(p_address),btrim(p_email),btrim(p_phone)) then raise exception 'Kunden findes allerede. Genindlæs.'; end if;
      return c; -- idempotent retry of creation
    end if;
    if c.updated_at<>p_expected_updated_at then raise exception 'Kunden er ændret. Genindlæs før du gemmer.'; end if;
    update public.customers set name=btrim(p_name),address=btrim(p_address),email=btrim(p_email),phone=btrim(p_phone) where id=p_id returning * into c;
  else
    if p_expected_updated_at is not null then raise exception 'Kunden findes ikke længere'; end if;
    insert into public.customers(id,company_id,name,address,email,phone) values(p_id,p_company_id,btrim(p_name),btrim(p_address),btrim(p_email),btrim(p_phone)) returning * into c;
  end if;
  return c;
end $$;

create or replace function public.list_customer_projects(p_customer_id uuid,p_query text default '',p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_company uuid; v_pattern text;
begin
  perform public.assert_app_access();
  select company_id into v_company from public.customers where id=p_customer_id;
  if v_company is null or not exists(select 1 from public.company_members where company_id=v_company and user_id=auth.uid()) then raise exception 'Ingen adgang' using errcode='42501'; end if;
  if p_offset is null or p_offset<0 or p_offset>100000 or length(p_query)>160 then raise exception 'Ugyldig søgning'; end if;
  v_pattern := '%' || replace(replace(replace(btrim(coalesce(p_query,'')),E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_') || '%';
  return (select coalesce(jsonb_agg(to_jsonb(r) order by matches desc,created_at desc,id),'[]'::jsonb) from (
    select p.id,p.project_number,p.title,p.work_address,p.created_at,count(*) over() as total_count,
      (coalesce(p.title,'') || ' ' || p.project_number || ' ' || coalesce(p.work_address,'')) ilike v_pattern as matches
    from public.projects p where p.customer_id=p_customer_id and p.company_id=v_company
    order by matches desc,p.created_at desc,p.id limit 20 offset p_offset
  ) r);
end $$;

create or replace function public.link_project_customer(p_project_id uuid,p_customer_id uuid,p_expected_customer_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_company uuid;
begin
  perform public.assert_app_access();
  select company_id into v_company from public.customers where id=p_customer_id for update;
  if v_company is null or not exists(select 1 from public.company_members where company_id=v_company and user_id=auth.uid()) then raise exception 'Ingen adgang' using errcode='42501'; end if;
  update public.projects set customer_id=p_customer_id where id=p_project_id and company_id=v_company and customer_id is not distinct from p_expected_customer_id;
  if not found then
    if exists(select 1 from public.projects where id=p_project_id and company_id=v_company and customer_id=p_customer_id) then return; end if;
    raise exception 'Projektets kunde er ændret eller tilhører en anden virksomhed. Genindlæs.';
  end if;
end $$;

create or replace function public.resolve_customer_duplicate(p_source uuid,p_target uuid,p_same_customer boolean)
returns void language plpgsql security definer set search_path='' as $$
declare a public.customers; b public.customers;
begin
  perform public.assert_app_access();
  if p_source=p_target or p_same_customer is null then raise exception 'Vælg to kunder'; end if;
  -- Deterministic lock ordering also serializes edits/linking with merges.
  perform 1 from public.customers where id in(p_source,p_target) order by id for update;
  select * into strict a from public.customers where id=p_source;
  select * into strict b from public.customers where id=p_target;
  if a.company_id<>b.company_id or not exists(select 1 from public.company_members where company_id=a.company_id and user_id=auth.uid()) then raise exception 'Ingen adgang' using errcode='42501'; end if;
  if p_same_customer then
    -- Target contact data wins only after explicit user confirmation. Offers and
    -- work addresses are never updated by this operation.
    update public.projects set customer_id=b.id where customer_id=a.id and company_id=a.company_id;
    delete from public.customers where id=a.id;
  else
    insert into public.customer_match_decisions values(a.company_id,least(a.id,b.id),greatest(a.id,b.id)) on conflict do nothing;
  end if;
end $$;

revoke all on function public.project_customer_contact(),public.sync_customer_contact(),public.sync_customer_projects(),public.snapshot_customer_contact() from public,anon,authenticated;
revoke all on function public.search_customers(uuid,text,integer,integer,uuid),public.save_customer(uuid,uuid,text,text,text,text,timestamptz),public.link_project_customer(uuid,uuid,uuid),public.resolve_customer_duplicate(uuid,uuid,boolean) from public,anon;
grant execute on function public.search_customers(uuid,text,integer,integer,uuid),public.save_customer(uuid,uuid,text,text,text,text,timestamptz),public.link_project_customer(uuid,uuid,uuid),public.resolve_customer_duplicate(uuid,uuid,boolean) to authenticated;
revoke all on function public.list_customer_projects(uuid,text,integer) from public,anon;
grant execute on function public.list_customer_projects(uuid,text,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
