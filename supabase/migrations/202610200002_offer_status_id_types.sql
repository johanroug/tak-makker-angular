begin;

-- Only expose a status change, rather than allowing updates to offer snapshots.
create or replace function public.update_offer_status(
  p_offer_id uuid,
  p_expected_status text,
  p_status text
) returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_offer public.offers%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Du skal være logget ind for at ændre tilbudsstatus.';
  end if;

  if p_status is null or p_status not in ('finalized', 'sent', 'accepted', 'rejected') then
    raise exception 'Ugyldig tilbudsstatus.';
  end if;

  select o.* into saved_offer
  from public.offers o
  join public.projects p on p.id::text = o.project_id::text
  where o.id::text = p_offer_id::text
    and exists (
      select 1 from public.company_members m
      where m.company_id::text = p.company_id::text and m.user_id::text = auth.uid()::text
    )
  for update of o;

  if not found then
    raise exception 'Tilbuddet blev ikke fundet, eller du har ikke adgang.';
  end if;

  if saved_offer.status is distinct from p_expected_status then
    raise exception 'Tilbuddets status er ændret. Genindlæs og prøv igen.';
  end if;

  update public.offers set status = p_status
  where id::text = p_offer_id::text
  returning * into saved_offer;

  return saved_offer;
end;
$$;

revoke all on function public.update_offer_status(uuid, text, text) from public;
revoke all on function public.update_offer_status(uuid, text, text) from anon;
grant execute on function public.update_offer_status(uuid, text, text) to authenticated;

commit;

