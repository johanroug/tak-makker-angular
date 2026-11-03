begin;

alter table public.project_work_items add column estimate_basis text;
grant update (estimate_basis) on public.project_work_items to authenticated;

-- Move only the recognizable trailing estimate sentence on unapproved draft
-- tasks. Preserve its information as an internal note. Final offers are untouched.
with notes as (
  select project_id, id, regexp_match(description,
    '(?is)^(.+[.!?])[[:space:]]+(Foreløbigt?[[:space:]]+estimeret[[:space:]].*)$') as parts
  from public.project_work_items where status='suggested'
)
update public.project_work_items w
set description=btrim(n.parts[1]),
  estimate_basis=regexp_replace(n.parts[2],
    '(?i)^Foreløbigt?[[:space:]]+estimeret[[:space:]]+(ud fra|for)[[:space:]]+', 'Beregnet ud fra ')
from notes n where w.project_id=n.project_id and w.id=n.id and n.parts is not null;

commit;
