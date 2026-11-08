-- Local-only test: prepend .local-tools/export-company.sql with public.
-- replaced by pg_temp. The helper is deliberately not distributed via Git.
-- Run in one transaction, ending in rollback. No public-table reads/writes.
create temporary table companies(id uuid, name text);
create temporary table company_members(id uuid, company_id uuid, user_id uuid);
create temporary table task_templates(id uuid, company_id uuid, name text);
create temporary table projects(id uuid, company_id uuid, title text);
create temporary table project_messages(id uuid, project_id uuid, created_at timestamptz, content text);
create temporary table project_work_items(id text, project_id uuid, status text);
create temporary table project_materials(id text, project_id uuid, status text);
create temporary table offers(id text, project_id uuid, customer_name text);
create temporary table offer_work_items(id text, offer_id text, description text);
create temporary table offer_materials(id text, offer_id text, name text);

insert into companies values
 ('00000000-0000-0000-0000-000000000001', 'First'),
 ('00000000-0000-0000-0000-000000000002', 'Second'),
 ('00000000-0000-0000-0000-000000000003', 'Empty');
insert into projects
 select id, id, name from companies where name <> 'Empty';
insert into task_templates select id, id, name from companies where name <> 'Empty';
insert into company_members
 select id, id, '00000000-0000-0000-0000-000000000099'::uuid from projects;
-- Same member in both companies must not widen the export.
insert into project_messages select id, id, now(), title from projects;
insert into project_work_items select id::text, id, 'rejected' from projects;
insert into project_materials select id::text, id, 'pending' from projects;
insert into offers select id::text, id, title from projects;
insert into offer_work_items select id, id, customer_name from offers;
insert into offer_materials select id, id, customer_name from offers;

do $$
declare
  c record;
  payload jsonb;
  section text;
  row_data jsonb;
  rejected boolean;
begin
  for c in select * from pg_temp.companies loop
    payload := pg_temp.export_company(c.id);
    if payload->>'company_id' <> c.id::text
       or payload->'company'->>'id' <> c.id::text then
      raise exception 'Incorrect company';
    end if;
    foreach section in array array['task_templates','memberships','projects','messages','work_items',
      'materials','offers','offer_work_items','offer_materials'] loop
      if jsonb_array_length(payload->section) <> (case when c.name = 'Empty' then 0 else 1 end) then
        raise exception 'Missing or extra rows in %', section;
      end if;
      for row_data in select value from jsonb_array_elements(payload->section) loop
        if coalesce(row_data->>'company_id', row_data->>'project_id', row_data->>'offer_id') <> c.id::text then
          raise exception 'Cross-company data in %', section;
        end if;
      end loop;
    end loop;
    if c.name <> 'Empty' and (
      payload->'messages'->0->>'content' <> c.name
      or payload->'offers'->0->>'customer_name' <> c.name
      or payload->'offer_work_items'->0->>'description' <> c.name
      or payload->'offer_materials'->0->>'name' <> c.name
      or payload->'work_items'->0->>'status' <> 'rejected'
    ) then raise exception 'Export lost content'; end if;
  end loop;
  rejected := false;
  begin
    perform pg_temp.export_company(null);
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Null company accepted'; end if;
  rejected := false;
  begin
    perform pg_temp.export_company('00000000-0000-0000-0000-000000000004');
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Unknown company accepted'; end if;
end;
$$;
