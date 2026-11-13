begin;
-- One confirmation saves the customer choice and project edits atomically.
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
      or p_new_customer - array['name','address','email','phone'] <> '{}'::jsonb
      or jsonb_typeof(p_new_customer->'name') is distinct from 'string' then raise exception 'Ugyldige kundeoplysninger'; end if;
    perform public.save_customer(p_customer_id,company,p_new_customer->>'name',
      coalesce(p_new_customer->>'address',''),coalesce(p_new_customer->>'email',''),coalesce(p_new_customer->>'phone',''));
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
revoke all on function public.save_project_customer_details(uuid,uuid,jsonb,uuid,jsonb) from public,anon;
grant execute on function public.save_project_customer_details(uuid,uuid,jsonb,uuid,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
