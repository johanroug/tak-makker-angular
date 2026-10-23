begin;

-- offers.id is text in the existing database. Keep authorization intact
-- while comparing the UUID argument through its textual representation.
create or replace function public.record_activity(p_action text, p_success boolean,
  p_duration_ms integer default null, p_error_code text default null,
  p_project_id uuid default null, p_offer_id uuid default null, p_state text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_company uuid;
begin
  if v_user is null then raise exception 'Login kræves' using errcode = '42501'; end if;
  select company_id into v_company from public.company_members where user_id = v_user limit 1;
  if p_project_id is not null and not exists (
    select 1 from public.projects p join public.company_members m on m.company_id = p.company_id
    where p.id = p_project_id and m.user_id = v_user
  ) then raise exception 'Ingen adgang' using errcode = '42501'; end if;
  if p_offer_id is not null and not exists (
    select 1 from public.offers o join public.projects p on p.id = o.project_id
    join public.company_members m on m.company_id = p.company_id
    where o.id::text = p_offer_id::text and m.user_id = v_user
  ) then raise exception 'Ingen adgang' using errcode = '42501'; end if;
  if p_error_code is not null and p_error_code !~ '^[A-Za-z0-9_.-]{1,50}$' then
    raise exception 'Ugyldig fejlkode';
  end if;
  insert into public.activity_events(user_id, company_id, action, success, duration_ms, error_code, project_id, offer_id, state)
  values (v_user, v_company, p_action, p_success, p_duration_ms, p_error_code, p_project_id, p_offer_id, p_state);
end;
$$;
revoke all on function public.record_activity(text, boolean, integer, text, uuid, uuid, text) from public, anon;
grant execute on function public.record_activity(text, boolean, integer, text, uuid, uuid, text) to authenticated;


commit;
