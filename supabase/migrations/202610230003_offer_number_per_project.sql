begin;

-- create_project numbers projects per company, and finalize_offer numbers
-- revisions per project. Different companies may therefore produce the same
-- display number, e.g. 2026-0001-01. The project UUID identifies the series.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'public'
      and tablename = 'offers'
      and indexname = 'offers_offer_number_unique'
      and indexdef = 'CREATE UNIQUE INDEX offers_offer_number_unique ON public.offers USING btree (offer_number) WHERE (offer_number IS NOT NULL)'
  ) then
    raise exception 'Det forventede globale tilbudsnummer-indeks blev ikke fundet. Ingen ændringer udført.';
  end if;
end;
$$;

-- Add the replacement before removing the global index. No CASCADE:
-- unexpected dependencies cause the entire transaction to roll back.
create unique index offers_project_offer_number_unique
  on public.offers (project_id, offer_number)
  where offer_number is not null;

drop index public.offers_offer_number_unique;

commit;
