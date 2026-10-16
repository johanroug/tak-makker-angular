begin;

-- Small PNG data URLs avoid a separate public file store and preserve old logos.
alter table public.companies add column logo_data_url text
  check (logo_data_url is null or (
    length(logo_data_url) <= 300000
    and logo_data_url ~ '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$'
  ));
alter table public.offers add column company_logo_data_url text
  check (company_logo_data_url is null or (
    length(company_logo_data_url) <= 300000
    and company_logo_data_url ~ '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$'
  ));

create function public.snapshot_offer_company_logo() returns trigger
language plpgsql set search_path = '' as $$
begin
  select c.logo_data_url into new.company_logo_data_url
  from public.projects p
  join public.companies c on c.id = p.company_id
  where p.id = new.project_id;
  return new;
end;
$$;

create trigger snapshot_offer_company_logo before insert on public.offers
for each row execute function public.snapshot_offer_company_logo();

-- No backfill: existing offers retain their original appearance.
commit;
