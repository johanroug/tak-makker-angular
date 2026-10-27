begin;

-- Patch only material handling in the installed function, preserving later
-- access-control and snapshot changes from other migrations.
do $migration$
declare
  original text := replace(pg_get_functiondef('public.finalize_offer(uuid)'::regprocedure), E'\r', '');
  updated text;
  snapshot text;
  snapshot_start integer;
begin
  updated := replace(original,
    $old$        coalesce(trim(name), '') = ''
        or coalesce(trim(description), '') = ''$old$,
    $new$        coalesce(trim(name), '') = ''$new$);
  if updated = original then
    raise exception 'Expected material validation was not found; no changes applied';
  end if;
  snapshot_start := strpos(updated, '  insert into public.offer_materials (');
  if snapshot_start = 0 then
    raise exception 'Expected material snapshot insert was not found';
  end if;
  snapshot := substr(updated, snapshot_start);
  if (length(snapshot) - length(replace(snapshot, E'    description,\n', ''))) / length(E'    description,\n') <> 2 then
    raise exception 'Unexpected material snapshot format; no changes applied';
  end if;
  snapshot := replace(snapshot, E'    description,\n', '');
  updated := substr(updated, 1, snapshot_start - 1) || snapshot;
  execute updated;
end;
$migration$;

-- No CASCADE: unexpected dependencies roll back the entire migration.
alter table public.project_materials drop column description;
alter table public.offer_materials drop column description;

commit;
