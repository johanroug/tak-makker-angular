begin;

alter table public.project_materials add column category text
  check (category in ('El og belysning', 'VVS og sanitet', 'Fliser, mørtel og vådrum',
    'Træ, plader og isolering', 'Maling og overflader', 'Fastgørelse og forbrug', 'Øvrige materialer'));
alter table public.offer_materials add column category text
  check (category in ('El og belysning', 'VVS og sanitet', 'Fliser, mørtel og vådrum',
    'Træ, plader og isolering', 'Maling og overflader', 'Fastgørelse og forbrug', 'Øvrige materialer'));
grant update (category) on public.project_materials to authenticated;

-- Modify only material copies in the installed functions; preserve access checks,
-- subscription gates, prices and all other snapshot behavior. Fail atomically
-- if the expected function definitions have changed.
do $migration$
declare
  original text;
  updated text;
  snapshot text;
  snapshot_start integer;
begin
  original := replace(pg_get_functiondef('public.finalize_offer(uuid)'::regprocedure), E'\r', '');
  snapshot_start := strpos(original, '  insert into public.offer_materials (');
  if snapshot_start = 0 then raise exception 'Material snapshot insert not found'; end if;
  snapshot := substr(original, snapshot_start);
  if (length(snapshot) - length(replace(snapshot, E'    name,\n', ''))) / length(E'    name,\n') <> 2 then
    raise exception 'Unexpected material snapshot format';
  end if;
  snapshot := replace(snapshot, E'    name,\n', E'    name,\n    category,\n');
  execute substr(original, 1, snapshot_start - 1) || snapshot;

  original := pg_get_functiondef('public.save_task_template(uuid,text,text[],text[],uuid)'::regprocedure);
  updated := replace(original, '''unit_price'',unit_price) order by id)',
    '''unit_price'',unit_price,''category'',category) order by id)');
  if updated = original then raise exception 'Template material snapshot not found'; end if;
  execute updated;

  original := pg_get_functiondef('public.apply_task_template(uuid,uuid,uuid)'::regprocedure);
  updated := replace(original,
    'insert into public.project_materials(id,project_id,name,quantity,quantity_source,unit,unit_source,unit_price,status)',
    'insert into public.project_materials(id,project_id,name,category,quantity,quantity_source,unit,unit_source,unit_price,status)');
  if updated = original then raise exception 'Template material insert not found'; end if;
  original := updated;
  updated := replace(original,
    'values(gen_random_uuid()::text,p_project_id,v_row->>''name'',',
    'values(gen_random_uuid()::text,p_project_id,v_row->>''name'',v_row->>''category'',');
  if updated = original then raise exception 'Template material values not found'; end if;
  execute updated;
end;
$migration$;

commit;
