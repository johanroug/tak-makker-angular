-- Reviewed against Johan's metadata export, 20 October 2026.
-- This changes permissions and two RPC definitions, not existing business rows.
-- Run the entire file as one transaction in Supabase SQL Editor.
begin;

-- Fail before changing anything if either RPC has changed since the audit.
do $preflight$
begin
  if md5(replace(pg_get_functiondef('public.create_project(uuid)'::regprocedure), E'\r', '')) <> '112a2b3411c73cf7f6be06b2a99e96e1'
    or md5(replace(pg_get_functiondef('public.finalize_offer(uuid)'::regprocedure), E'\r', '')) <> 'ae0c793167c36747c25e45e59755ac45' then
    raise exception 'RPC-definitionerne er ændret siden sikkerhedsgennemgangen. Kør en ny audit før denne migration.';
  end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('companies', 'company_members', 'projects', 'project_messages',
        'project_work_items', 'project_materials', 'offers', 'offer_work_items', 'offer_materials')
      and not c.relrowsecurity
  ) then
    raise exception 'RLS er ikke aktiveret på alle app-tabeller. Kør en ny audit.';
  end if;
end;
$preflight$;

-- Preserve the audited numbering, validation, calculations and snapshot triggers.
-- These two functions now perform explicit authorization before privileged work.
CREATE OR REPLACE FUNCTION public.create_project(p_company_id uuid)
 RETURNS public.projects
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_year integer := extract(year from now());
  v_next_number integer;
  v_default_hourly_rate numeric;
  v_project public.projects;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members m
    where m.company_id = p_company_id and m.user_id = auth.uid()
  ) then
    raise exception 'Du har ikke adgang til at oprette projekter i denne virksomhed.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended(p_company_id::text || ':' || v_year::text, 0)
  );

  select default_hourly_rate
  into v_default_hourly_rate
  from public.companies
  where id = p_company_id;

  select coalesce(
    max(
      substring(project_number from 6)::integer
    ),
    0
  ) + 1
  into v_next_number
  from public.projects
  where company_id = p_company_id
    and project_number like v_year::text || '-%';

  insert into public.projects (
    company_id,
    project_number,
    hourly_rate
  )
  values (
    p_company_id,
    v_year::text || '-' || lpad(v_next_number::text, 4, '0'),
    v_default_hourly_rate
  )
  returning *
  into v_project;

  return v_project;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_offer(p_project_id uuid)
 RETURNS public.offers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_project public.projects;
  v_company public.companies;
  v_offer public.offers;

  v_offer_number text;
  v_next_number integer;

  v_pricing_labor numeric := 0;
  v_pricing_materials numeric := 0;
  v_pricing_subtotal numeric := 0;
  v_pricing_vat_rate numeric := 0.25;
  v_pricing_vat_amount numeric := 0;
  v_pricing_total numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Du skal være logget ind for at færdiggøre et tilbud.' using errcode = '42501';
  end if;

  -- Authorize before any privileged read; lock the project against reparenting.
  perform 1
  from public.projects p
  join public.company_members m on m.company_id = p.company_id
  where p.id = p_project_id and m.user_id = auth.uid()
  for update of p;
  if not found then
    raise exception 'Projektet blev ikke fundet, eller du har ikke adgang.' using errcode = '42501';
  end if;
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if not found then
    raise exception 'Projektet blev ikke fundet';
  end if;

  select *
  into v_company
  from public.companies
  where id = v_project.company_id;

  if not found then
    raise exception 'Virksomheden blev ikke fundet';
  end if;

  if coalesce(trim(v_project.title), '') = '' then
    raise exception 'Projekttitel mangler';
  end if;

  if coalesce(trim(v_project.customer_name), '') = '' then
    raise exception 'Kundenavn mangler';
  end if;

  if coalesce(trim(v_project.customer_address), '') = '' then
    raise exception 'Kundeadresse mangler';
  end if;

  if coalesce(trim(v_project.description), '') = '' then
    raise exception 'Projektbeskrivelse mangler';
  end if;

  if v_project.hourly_rate is null or v_project.hourly_rate < 0 then
    raise exception 'Projektets timepris mangler';
  end if;

  if not exists (
    select 1
    from public.project_work_items
    where project_id = p_project_id
      and status = 'accepted'
  )
  and not exists (
    select 1
    from public.project_materials
    where project_id = p_project_id
      and status = 'accepted'
  ) then
    raise exception 'Tilbuddet skal indeholde mindst én accepteret linje';
  end if;

  if exists (
    select 1
    from public.project_work_items
    where project_id = p_project_id
      and status = 'accepted'
      and (
        coalesce(trim(trade), '') = ''
        or coalesce(trim(description), '') = ''
        or estimated_hours is null
        or estimated_hours < 0
      )
  ) then
    raise exception 'En accepteret arbejdsopgave mangler oplysninger';
  end if;

  if exists (
    select 1
    from public.project_materials
    where project_id = p_project_id
      and status = 'accepted'
      and (
        coalesce(trim(name), '') = ''
        or coalesce(trim(description), '') = ''
        or quantity is null
        or quantity < 0
        or coalesce(trim(unit), '') = ''
        or unit_price is null
        or unit_price < 0
      )
  ) then
    raise exception 'Et accepteret materiale mangler oplysninger';
  end if;

  select coalesce(
    sum(estimated_hours * v_project.hourly_rate),
    0
  )
  into v_pricing_labor
  from public.project_work_items
  where project_id = p_project_id
    and status = 'accepted';

  select coalesce(
    sum(quantity * unit_price),
    0
  )
  into v_pricing_materials
  from public.project_materials
  where project_id = p_project_id
    and status = 'accepted';

  v_pricing_subtotal :=
    v_pricing_labor + v_pricing_materials;

  v_pricing_vat_amount :=
    v_pricing_subtotal * v_pricing_vat_rate;

  v_pricing_total :=
    v_pricing_subtotal + v_pricing_vat_amount;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'offer:' || p_project_id::text,
      0
    )
  );

  select coalesce(
    max(
      case
        when offer_number ~
          ('^' || v_project.project_number || '-[0-9]+$')
        then substring(
          offer_number
          from '([0-9]+)$'
        )::integer
        else null
      end
    ),
    0
  ) + 1
  into v_next_number
  from public.offers
  where project_id = p_project_id;

  v_offer_number :=
    v_project.project_number
    || '-'
    || lpad(v_next_number::text, 2, '0');

  insert into public.offers (
    id,
    project_id,
    offer_number,
    status,
    finalized_at,

    company_name,
    company_cvr,
    company_contact_name,
    company_phone,
    company_email,
    company_default_hourly_rate,

    customer_name,
    customer_address,

    project_number,
    project_title,
    project_description,
    offer_description,

    pricing_labor,
    pricing_materials,
    pricing_subtotal,
    pricing_vat_rate,
    pricing_vat_amount,
    pricing_total
  )
  values (
    gen_random_uuid(),
    v_project.id,
    v_offer_number,
    'finalized',
    now(),

    coalesce(v_company.name, ''),
    coalesce(v_company.cvr, ''),
    coalesce(v_company.contact_name, ''),
    coalesce(v_company.phone, ''),
    coalesce(v_company.email, ''),
    v_project.hourly_rate,

    coalesce(v_project.customer_name, ''),
    coalesce(v_project.customer_address, ''),

    v_project.project_number,
    coalesce(v_project.title, ''),
    coalesce(v_project.description, ''),
    v_project.offer_description,

    v_pricing_labor,
    v_pricing_materials,
    v_pricing_subtotal,
    v_pricing_vat_rate,
    v_pricing_vat_amount,
    v_pricing_total
  )
  returning *
  into v_offer;

  insert into public.offer_work_items (
    id,
    offer_id,
    trade,
    description,
    estimated_hours,
    hourly_rate,
    total_price
  )
  select
    gen_random_uuid(),
    v_offer.id,
    trade,
    description,
    estimated_hours,
    v_project.hourly_rate,
    estimated_hours * v_project.hourly_rate
  from public.project_work_items
  where project_id = p_project_id
    and status = 'accepted';

  insert into public.offer_materials (
    id,
    offer_id,
    name,
    description,
    quantity,
    unit,
    unit_price,
    total_price
  )
  select
    gen_random_uuid(),
    v_offer.id,
    name,
    description,
    quantity,
    unit,
    unit_price,
    quantity * unit_price
  from public.project_materials
  where project_id = p_project_id
    and status = 'accepted';

  return v_offer;
end;
$function$;


alter function public.create_project(uuid) owner to postgres;
alter function public.finalize_offer(uuid) owner to postgres;

-- Client roles must not create objects in the exposed application schema.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to authenticated;

-- Keep the reviewed RLS policies; reduce the operations reachable by clients.
revoke all privileges on table
  public.companies, public.company_members, public.projects, public.project_messages,
  public.project_work_items, public.project_materials, public.offers,
  public.offer_work_items, public.offer_materials
from public, anon, authenticated;

-- Also remove any column grants, which survive a table-level REVOKE.
do $column_grants$
declare tab record; column_list text;
begin
  for tab in
    select c.oid, c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and c.relname in ('companies', 'company_members', 'projects', 'project_messages',
        'project_work_items', 'project_materials', 'offers', 'offer_work_items', 'offer_materials')
  loop
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into column_list
    from pg_attribute a where a.attrelid = tab.oid and a.attnum > 0 and not a.attisdropped;
    execute format('revoke select (%1$s), insert (%1$s), update (%1$s), references (%1$s) on table public.%2$I from public, anon, authenticated', column_list, tab.relname);
  end loop;
end;
$column_grants$;

grant select on table
  public.companies, public.company_members, public.projects, public.project_messages,
  public.project_work_items, public.project_materials, public.offers,
  public.offer_work_items, public.offer_materials
to authenticated;

grant insert on table public.project_messages, public.project_work_items, public.project_materials to authenticated;

grant update (name, address, logo_data_url, cvr, contact_name, phone, email,
  default_hourly_rate, default_validity_days, default_payment_terms, default_reservations)
on public.companies to authenticated;

grant update (customer_name, customer_name_source, customer_address, customer_address_source,
  title, title_source, description, description_source, offer_description, offer_description_source,
  hourly_rate, validity_days, payment_terms, reservations)
on public.projects to authenticated;

grant update (trade, description, status, estimated_hours, estimated_hours_source)
on public.project_work_items to authenticated;

grant update (name, description, status, quantity, quantity_source, unit, unit_source, unit_price)
on public.project_materials to authenticated;

-- Completed snapshots must only be inserted by the guarded finalize RPC.
drop policy if exists "Users can create own company offers" on public.offers;
drop policy if exists "Users can create own company offer work items" on public.offer_work_items;
drop policy if exists "Users can create own company offer materials" on public.offer_materials;

revoke execute on function public.create_project(uuid), public.finalize_offer(uuid),
  public.update_offer_status(uuid, text, text)
from public, anon;
grant execute on function public.create_project(uuid), public.finalize_offer(uuid),
  public.update_offer_status(uuid, text, text)
to authenticated;

-- Trigger functions are not client RPCs. Triggers still run in their caller's context.
revoke execute on function public.copy_project_offer_terms(), public.snapshot_offer_terms(),
  public.snapshot_offer_company_address(), public.snapshot_offer_company_logo()
from public, anon, authenticated;

commit;
