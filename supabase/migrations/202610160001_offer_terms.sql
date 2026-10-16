begin;
alter table public.companies
  add column default_validity_days integer check (default_validity_days >= 1),
  add column default_payment_terms text,
  add column default_reservations text;
alter table public.projects
  add column validity_days integer check (validity_days >= 1),
  add column payment_terms text,
  add column reservations text;
alter table public.offers
  add column validity_days integer check (validity_days >= 1),
  add column payment_terms text,
  add column reservations text;

-- Keep existing RPCs, numbering, pricing and authorization unchanged.
-- Defaults are copied only when a project is first created.
create function public.copy_project_offer_terms() returns trigger
language plpgsql set search_path = '' as $$
declare company public.companies%rowtype;
begin
  select * into company from public.companies where id = new.company_id;
  new.validity_days := coalesce(new.validity_days, company.default_validity_days);
  new.payment_terms := coalesce(new.payment_terms, company.default_payment_terms);
  new.reservations := coalesce(new.reservations, company.default_reservations);
  return new;
end;
$$;
create trigger copy_project_offer_terms before insert on public.projects
for each row execute function public.copy_project_offer_terms();

-- The snapshot is part of the same transaction as finalize_offer.
-- No backfill: historical offers must not gain newly invented conditions.
create function public.snapshot_offer_terms() returns trigger
language plpgsql set search_path = '' as $$
declare project public.projects%rowtype;
begin
  select * into strict project from public.projects where id = new.project_id for share;
  new.validity_days := project.validity_days;
  new.payment_terms := project.payment_terms;
  new.reservations := project.reservations;
  return new;
end;
$$;
create trigger snapshot_offer_terms before insert on public.offers
for each row execute function public.snapshot_offer_terms();
commit;
