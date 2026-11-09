-- Separate abuse limit for dictation. Does not consume an offer generation credit.
create table if not exists public.speech_upload_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  uploads integer not null
);
alter table public.speech_upload_limits enable row level security;
revoke all on public.speech_upload_limits from anon, authenticated;

create or replace function public.reserve_speech_upload()
returns boolean language plpgsql security definer set search_path = '' as $$
declare upload_count integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.speech_upload_limits as limits (user_id, window_start, uploads)
  values (auth.uid(), now(), 1)
  on conflict (user_id) do update set
    uploads = case when limits.window_start < now() - interval '1 hour' then 1 else limits.uploads + 1 end,
    window_start = case when limits.window_start < now() - interval '1 hour' then now() else limits.window_start end
  returning uploads into upload_count;
  return upload_count <= 30;
end;
$$;
revoke all on function public.reserve_speech_upload() from public, anon;
grant execute on function public.reserve_speech_upload() to authenticated;
