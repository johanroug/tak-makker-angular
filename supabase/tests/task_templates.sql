-- Run after the template migration. All fixtures and quota changes are rolled back.
begin;
do $$
declare
  v_user uuid; v_company uuid; v_other uuid; v_project uuid; v_target uuid;
  v_template uuid := gen_random_uuid(); v_request uuid := gen_random_uuid();
  v_work text := gen_random_uuid()::text; v_material text := gen_random_uuid()::text;
  v_snapshot jsonb; v_result jsonb; v_calls bigint; v_new public.projects; v_blocked boolean;
begin
  select id into v_user from auth.users u where not exists(
    select 1 from public.blocked_users b where b.user_id=u.id) limit 1;
  if v_user is null then raise exception 'Needs an existing active test member'; end if;
  insert into public.companies(name,default_hourly_rate) values('Template fixture',450) returning id into v_company;
  insert into public.companies(name) values('Other fixture') returning id into v_other;
  insert into public.company_members(company_id,user_id) values(v_company,v_user);
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  v_blocked := false;
  begin perform public.create_manual_project(v_company);
  exception when insufficient_privilege then v_blocked := true; end;
  if not v_blocked then raise exception 'Trial allowed manual creation'; end if;
  insert into public.company_billing(company_id,ai_access_override) values(v_company,'internal');
  select id into v_project from public.create_manual_project(v_company);
  select id into v_target from public.create_project(v_company);
  insert into public.project_work_items(id,project_id,trade,description,estimated_hours,estimated_hours_source,status)
    values(v_work,v_project,'VVS','Generic work',3,'user','accepted');
  insert into public.project_materials(id,project_id,name,quantity,quantity_source,unit,unit_source,unit_price,status)
    values(v_material,v_project,'Generic material',2,'user','stk.','user',75,'accepted');
  update public.projects set customer_name='PRIVATE CUSTOMER',description='PRIVATE PROJECT' where id=v_project;
  select count(*) into v_calls from public.company_ai_requests;
  perform public.save_task_template(v_project,'Radiator',array[v_work],array[v_material],v_template);
  v_snapshot := public.list_task_templates(v_company)->0;
  if v_snapshot::text like '%PRIVATE%' or v_snapshot->'work_items'->0->>'estimated_hours'<>'3' then
    raise exception 'Wrong template snapshot';
  end if;
  update public.project_work_items set description='Changed source' where id=v_work;
  if public.list_task_templates(v_company)->0->'work_items'->0->>'description'<>'Generic work' then
    raise exception 'Source change mutated template';
  end if;
  perform public.apply_task_template(v_target,v_template,v_request);
  perform public.apply_task_template(v_target,v_template,v_request);
  if (select count(*) from public.project_work_items where project_id=v_target)<>1 or
     (select count(*) from public.project_materials where project_id=v_target)<>1 or
     exists(select 1 from public.project_work_items where project_id=v_target and (status<>'suggested' or id=v_work)) then
    raise exception 'Repeated application duplicated or approved lines';
  end if;
  -- Removing access blocks templates and manual inserts, while existing lines remain editable.
  update public.company_billing set ai_access_override='none' where company_id=v_company;
  v_blocked := false;
  begin perform public.apply_task_template(v_target,v_template,gen_random_uuid());
  exception when insufficient_privilege then v_blocked := true; end;
  if not v_blocked then raise exception 'Trial allowed template application'; end if;
  v_blocked := false;
  begin
    insert into public.project_work_items(id,project_id,trade,description,estimated_hours_source)
    values(gen_random_uuid()::text,v_target,'VVS','Blocked','user');
  exception when insufficient_privilege then v_blocked := true; end;
  if not v_blocked then raise exception 'Trial allowed manual insert'; end if;
  update public.project_work_items set description='Existing line still editable' where id=v_work;
  update public.company_billing set ai_access_override='internal' where company_id=v_company;
  -- Exhausting AI quota does not block subscriber tools.
  insert into public.company_billing(company_id) values(v_company) on conflict do nothing;
  insert into public.company_ai_requests(company_id,user_id,status,charge_trial)
    select v_company,v_user,'succeeded',true from generate_series(1,10);
  v_request := gen_random_uuid();
  v_new := public.create_project_from_template(v_company,v_template,v_request);
  if (public.create_project_from_template(v_company,v_template,v_request)).id<>v_new.id then
    raise exception 'Creation retry duplicated project';
  end if;
  if v_new.title<>'Radiator' or v_new.hourly_rate<>450 or
     (select count(*) from public.company_ai_requests)<>v_calls+10 then
    raise exception 'Template creation failed or consumed AI quota';
  end if;
  v_blocked := false;
  begin perform public.list_task_templates(v_other);
  exception when insufficient_privilege then v_blocked := true; end;
  if not v_blocked then raise exception 'Other company templates exposed'; end if;
  v_blocked := false;
  begin perform public.create_project_from_template(v_other,v_template,gen_random_uuid());
  exception when insufficient_privilege then v_blocked := true; end;
  if not v_blocked then raise exception 'Other company creation allowed'; end if;
  v_blocked := false;
  begin perform public.save_task_template(v_target,'Foreign lines',array[v_work],array[]::text[],gen_random_uuid());
  exception when raise_exception then v_blocked := true; end;
  if not v_blocked then raise exception 'Foreign project lines accepted'; end if;
  perform public.delete_task_template(v_template);
  if jsonb_array_length(public.list_task_templates(v_company))<>0 or
     (select count(*) from public.project_work_items where project_id=v_target)<>1 then
    raise exception 'Deletion mutated existing project';
  end if;
  if has_table_privilege('authenticated','public.task_templates','INSERT') or
     has_table_privilege('authenticated','public.task_template_applications','SELECT') or
     has_function_privilege('anon','public.list_task_templates(uuid)','execute') then
    raise exception 'Template permissions too broad';
  end if;
end;
$$;
rollback;
select 'PASS: snapshots, company isolation, retry, quota exhaustion, deletion and permissions' as result;
