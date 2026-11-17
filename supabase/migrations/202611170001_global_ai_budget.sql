begin;

-- Amounts are micro-DKK, excluding VAT. Only trusted backend code may spend.
create table public.ai_budget_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  daily_limit bigint not null default 10000000 check (daily_limit >= 0),
  monthly_limit bigint not null default 100000000 check (monthly_limit >= 0)
);
insert into public.ai_budget_settings(id) values(true);

create table public.ai_budget_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('offer','transcription')),
  reserved_amount bigint not null check (reserved_amount > 0),
  charged_amount bigint not null check (charged_amount >= 0),
  settled boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  budget_day date not null,
  budget_month date not null
);
create index ai_budget_requests_day on public.ai_budget_requests(budget_day);
create index ai_budget_requests_month on public.ai_budget_requests(budget_month);
alter table public.ai_budget_settings enable row level security;
alter table public.ai_budget_requests enable row level security;
revoke all on public.ai_budget_settings, public.ai_budget_requests from public, anon, authenticated;
grant select, update on public.ai_budget_settings to service_role;
grant select on public.ai_budget_requests to service_role;

create function public.reserve_global_ai_budget(p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare settings public.ai_budget_settings; today date; month_start date;
  daily_used bigint; monthly_used bigint; request_id uuid;
  amount constant bigint := 3000000;
begin
  if p_kind is null or p_kind not in ('offer','transcription') then raise exception 'Unknown AI operation'; end if;
  -- One lock serializes both endpoints, including internal/free accounts.
  select * into settings from public.ai_budget_settings where id=true for update;
  if not found then raise exception 'AI budget is not configured'; end if;
  today := (clock_timestamp() at time zone 'Europe/Copenhagen')::date;
  month_start := date_trunc('month',today)::date;
  select coalesce(sum(charged_amount) filter(where budget_day=today),0),
    coalesce(sum(charged_amount),0) into daily_used,monthly_used
    from public.ai_budget_requests where budget_month=month_start;
  if not settings.enabled or daily_used+amount>settings.daily_limit or monthly_used+amount>settings.monthly_limit then
    return jsonb_build_object('allowed',false);
  end if;
  insert into public.ai_budget_requests(kind,reserved_amount,charged_amount,budget_day,budget_month)
    values(p_kind,amount,amount,today,month_start) returning id into request_id;
  return jsonb_build_object('allowed',true,'requestId',request_id);
end;
$$;

create function public.settle_global_ai_budget(p_request_id uuid,p_amount bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare reservation public.ai_budget_requests;
begin
  if p_amount is null or p_amount<0 then raise exception 'Invalid AI cost'; end if;
  perform 1 from public.ai_budget_settings where id=true for update;
  if not found then raise exception 'AI budget is not configured'; end if;
  select * into reservation from public.ai_budget_requests where id=p_request_id for update;
  if not found then raise exception 'Unknown AI budget reservation'; end if;
  if reservation.settled then return; end if;
  update public.ai_budget_requests set charged_amount=p_amount,settled=true where id=p_request_id;
  -- An unexpected provider price/usage change must stop subsequent requests.
  if p_amount>reservation.reserved_amount then
    update public.ai_budget_settings set enabled=false where id=true;
  end if;
end;
$$;
revoke all on function public.reserve_global_ai_budget(text) from public,anon,authenticated;
revoke all on function public.settle_global_ai_budget(uuid,bigint) from public,anon,authenticated;
grant execute on function public.reserve_global_ai_budget(text) to service_role;
grant execute on function public.settle_global_ai_budget(uuid,bigint) to service_role;
commit;
