begin;
do $$
declare v_parts text[]; v_note text;
begin
  v_parts := regexp_match('Montering og tilslutning af nye radiatorer. Foreløbigt estimeret for én radiator.',
    '(?is)^(.+[.!?])[[:space:]]+(Foreløbigt?[[:space:]]+estimeret[[:space:]].*)$');
  if v_parts[1] <> 'Montering og tilslutning af nye radiatorer.' then raise exception 'Description split failed'; end if;
  v_note := regexp_replace(v_parts[2],
    '(?i)^Foreløbigt?[[:space:]]+estimeret[[:space:]]+(ud fra|for)[[:space:]]+', 'Beregnet ud fra ');
  if v_note <> 'Beregnet ud fra én radiator.' then raise exception 'Estimate note split failed'; end if;
  v_parts := regexp_match('Forbehandling og maling af vægge i dagligstue. Foreløbigt estimeret ud fra et standardrum.',
    '(?is)^(.+[.!?])[[:space:]]+(Foreløbigt?[[:space:]]+estimeret[[:space:]].*)$');
  if v_parts[2] <> 'Foreløbigt estimeret ud fra et standardrum.' then raise exception 'Room note failed'; end if;
  if regexp_match('Foreløbig afdækning før maling.',
    '(?is)^(.+[.!?])[[:space:]]+(Foreløbigt?[[:space:]]+estimeret[[:space:]].*)$') is not null then
    raise exception 'Legitimate description was changed';
  end if;
  if not has_column_privilege('authenticated','public.project_work_items','estimate_basis','UPDATE') then
    raise exception 'Cannot save estimate notes';
  end if;
  if strpos(pg_get_functiondef('public.finalize_offer(uuid)'::regprocedure), 'estimate_basis') > 0 then
    raise exception 'Internal note is included in finalization';
  end if;
end;
$$;
select true as passed;
rollback;
