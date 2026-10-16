begin;

alter table public.companies add column address text;
alter table public.offers add column company_address text;

-- Capture the address in the same transaction as finalize_offer.
-- Historical offers stay unchanged; never use the current profile when reading them.
create function public.snapshot_offer_company_address() returns trigger
language plpgsql set search_path = '' as $$
declare company public.companies%rowtype;
begin
  select c.* into strict company
  from public.projects p
  join public.companies c on c.id = p.company_id
  where p.id = new.project_id;
  if nullif(btrim(company.name), '') is null
    or coalesce(btrim(company.cvr), '') !~ '^[0-9]{8}$'
    or nullif(btrim(company.address), '') is null
    or nullif(btrim(company.phone), '') is null
    or nullif(btrim(company.email), '') is null then
    raise exception 'Udfyld virksomhedsprofilens navn, CVR (8 cifre), adresse, telefon og e-mail, før tilbuddet færdiggøres.';
  end if;
  new.company_address := btrim(company.address);
  return new;
end;
$$;

create trigger snapshot_offer_company_address before insert on public.offers
for each row execute function public.snapshot_offer_company_address();

commit;
