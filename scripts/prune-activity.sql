-- Only technical activity events. AI quota, billing, projects and messages
-- are deliberately not included: their retention has different purposes.
begin;
set local statement_timeout = '30s';
delete from public.activity_events
where created_at <= statement_timestamp() - interval '30 days';
commit;
