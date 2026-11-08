begin;
create function public.assert_subscriber_access(p_company_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform public.assert_app_access();
  if not exists(select 1 from public.company_members where company_id=p_company_id and user_id=auth.uid()) then
    raise exception 'Ingen adgang' using errcode='42501';
  end if;
  if coalesce(public.company_billing_snapshot(p_company_id)->>'status','') not in ('active','free','internal') then
    raise exception 'Denne funktion kræver abonnement.' using errcode='42501';
  end if;
end;
$$;
revoke all on function public.assert_subscriber_access(uuid) from public,anon,authenticated;
create function public.create_manual_project(p_company_id uuid) returns public.projects
language plpgsql security definer set search_path='' as $$
begin
  perform public.assert_subscriber_access(p_company_id);
  return public.create_project(p_company_id);
end;
$$;
revoke all on function public.create_manual_project(uuid) from public,anon;
grant execute on function public.create_manual_project(uuid) to authenticated;
create or replace function public.save_task_template(p_project_id uuid,p_name text,p_work_ids text[],p_material_ids text[],p_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid; v_work jsonb; v_materials jsonb;
begin
  perform public.assert_app_access();
  select p.company_id into v_company from public.projects p
    join public.company_members m on m.company_id=p.company_id and m.user_id=auth.uid()
    where p.id=p_project_id;
  if v_company is null then raise exception 'Ingen adgang' using errcode='42501'; end if;
  perform public.assert_subscriber_access(v_company);
  if p_id is null or p_name is null or length(btrim(p_name)) not between 1 and 100 then
    raise exception 'Angiv et navn på højst 100 tegn.';
  end if;
  if exists(select 1 from public.task_templates where id=p_id and company_id=v_company) then return p_id; end if;
  if coalesce(cardinality(p_work_ids),0)+coalesce(cardinality(p_material_ids),0) not between 1 and 500 then
    raise exception 'Vælg mellem 1 og 500 linjer.';
  end if;
  -- Copy only allowlisted line fields, never customers, project text or chat.
  select coalesce(jsonb_agg(jsonb_build_object('trade',trade,'description',description,
    'estimated_hours',estimated_hours) order by id),'[]'::jsonb) into v_work
    from public.project_work_items where project_id=p_project_id and id=any(p_work_ids) and coalesce(status,'suggested')<>'rejected';
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'quantity',quantity,'unit',unit,
    'unit_price',unit_price) order by id),'[]'::jsonb) into v_materials
    from public.project_materials where project_id=p_project_id and id=any(p_material_ids) and coalesce(status,'suggested')<>'rejected';
  if jsonb_array_length(v_work)<>coalesce(cardinality(p_work_ids),0)
    or jsonb_array_length(v_materials)<>coalesce(cardinality(p_material_ids),0) then
    raise exception 'Linjerne er ændret eller tilhører et andet projekt. Genindlæs projektet.';
  end if;
  insert into public.task_templates(id,company_id,name,work_items,materials)
    values(p_id,v_company,btrim(p_name),v_work,v_materials);
  return p_id;
end;
$$;
create or replace function public.apply_task_template(p_project_id uuid,p_template_id uuid,p_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_company uuid; v_template public.task_templates; v_row jsonb; v_previous uuid;
begin
  perform public.assert_app_access();
  select p.company_id into v_company from public.projects p
    join public.company_members m on m.company_id=p.company_id and m.user_id=auth.uid()
    where p.id=p_project_id for update of p;
  if v_company is null then raise exception 'Ingen adgang' using errcode='42501'; end if;
  perform public.assert_subscriber_access(v_company);
  if p_request_id is null then raise exception 'Anmodningens ID mangler'; end if;
  select template_id into v_previous from public.task_template_applications
    where project_id=p_project_id and request_id=p_request_id;
  if found then
    if v_previous<>p_template_id then raise exception 'Anmodningens ID er allerede brugt'; end if;
    return;
  end if;
  select * into v_template from public.task_templates where id=p_template_id and company_id=v_company;
  if not found then raise exception 'Skabelonen findes ikke i virksomheden.'; end if;
  for v_row in select value from jsonb_array_elements(v_template.work_items) loop
    insert into public.project_work_items(id,project_id,trade,description,estimated_hours,estimated_hours_source,status)
    values(gen_random_uuid()::text,p_project_id,v_row->>'trade',v_row->>'description',
      (v_row->>'estimated_hours')::numeric,'user','suggested');
  end loop;
  for v_row in select value from jsonb_array_elements(v_template.materials) loop
    insert into public.project_materials(id,project_id,name,quantity,quantity_source,unit,unit_source,unit_price,status)
    values(gen_random_uuid()::text,p_project_id,v_row->>'name',(v_row->>'quantity')::numeric,
      'user',v_row->>'unit','user',(v_row->>'unit_price')::numeric,'suggested');
  end loop;
  insert into public.task_template_applications values(p_project_id,p_request_id,p_template_id);
end;
$$;
create or replace function public.create_project_from_template(p_company_id uuid,p_template_id uuid,p_request_id uuid) returns public.projects
language plpgsql security definer set search_path='' as $$
declare v_project public.projects; v_name text;
begin
  perform public.assert_subscriber_access(p_company_id);
  if not exists(select 1 from public.company_members where company_id=p_company_id and user_id=auth.uid()) then
    raise exception 'Ingen adgang' using errcode='42501';
  end if;
  if p_request_id is null then raise exception 'Anmodningens ID mangler'; end if;
  perform 1 from public.companies where id=p_company_id for update;
  select p.* into v_project from public.task_template_applications a
    join public.projects p on p.id=a.project_id
    where a.request_id=p_request_id and p.company_id=p_company_id and a.template_id=p_template_id;
  if found then return v_project; end if;
  select name into v_name from public.task_templates where id=p_template_id and company_id=p_company_id;
  if not found then raise exception 'Skabelonen findes ikke i virksomheden.'; end if;
  v_project := public.create_project(p_company_id);
  perform public.apply_task_template(v_project.id,p_template_id,p_request_id);
  update public.projects set title=v_name,title_source='user' where id=v_project.id returning * into v_project;
  return v_project;
end;
$$;
create function public.guard_manual_project_line() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_company uuid;
begin
  if auth.uid() is not null and (case when TG_TABLE_NAME='project_work_items' then to_jsonb(new)->>'estimated_hours_source' else to_jsonb(new)->>'quantity_source' end)='user' then
    select company_id into v_company from public.projects where id=new.project_id;
    perform public.assert_subscriber_access(v_company);
  end if;
  return new;
end;
$$;
revoke all on function public.guard_manual_project_line() from public,anon,authenticated;
create trigger subscriber_manual_work before insert on public.project_work_items for each row execute function public.guard_manual_project_line();
create trigger subscriber_manual_material before insert on public.project_materials for each row execute function public.guard_manual_project_line();
commit;
