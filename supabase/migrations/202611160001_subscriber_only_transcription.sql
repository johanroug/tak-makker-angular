begin;

-- The reservation RPC uses this snapshot under the company billing row lock.
-- Trial and free accounts must never reserve a transcription, even via older clients.
create or replace function public.company_transcription_snapshot(p_company_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with billing as (select * from public.company_billing where company_id=p_company_id),
  flags as (
    select coalesce((select ai_access_override from billing),'none') as override,
      exists(select 1 from billing where subscription_status='active' and access_until>now()
        and billing_period_start<=now() and billing_period_end>now()) as active
  ), usage as (
    select
      count(*) filter(where status='succeeded' and billing_period_start=(select billing_period_start from billing))::int as used,
      count(*) filter(where status='pending' and expires_at>now() and billing_period_start=(select billing_period_start from billing))::int as pending
    from public.company_transcription_requests where company_id=p_company_id
  ), entitlement as (
    select override='internal' as unlimited,
      (override='none' and active) as subscribed
    from flags
  )
  select jsonb_build_object(
    'transcriptionLimit',case when subscribed or unlimited then 100 else 0 end,
    'transcriptionUsed',used,'transcriptionPending',pending,
    'transcriptionRemaining',case when subscribed or unlimited then greatest(0,100-used) else 0 end,
    'canTranscribe',unlimited or (subscribed and used+pending<100)
  ) from entitlement,usage;
$$;
revoke all on function public.company_transcription_snapshot(uuid) from public,anon,authenticated;

commit;
