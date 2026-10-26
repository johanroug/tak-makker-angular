begin;

-- Update only the displayed brand. Keep the existing access decision and grants.
create or replace function public.assert_app_access() returns void
language plpgsql security definer set search_path = '' as $access$
begin
  if not public.can_access_app() then
    raise exception 'Din adgang til Hovedet på sømmet er blokeret.' using errcode = '42501';
  end if;
end;
$access$;

commit;
