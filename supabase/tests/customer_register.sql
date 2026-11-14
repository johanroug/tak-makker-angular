-- Read-only post-migration integrity checks. No customer details are printed.
begin transaction read only;
do $$
begin
  if exists(select 1 from public.projects p left join public.customers c
    on c.id=p.customer_id and c.company_id=p.company_id
    where p.customer_id is not null and c.id is null) then
    raise exception 'Customer link is missing or crosses companies';
  end if;
  if exists(select 1 from public.projects p join public.customers c
    on c.id=p.customer_id and c.company_id=p.company_id
    where p.customer_name is distinct from c.name or p.customer_address is distinct from concat_ws(E'\n',nullif(c.address,''),nullif(concat_ws(' ',nullif(c.postal_code,''),nullif(c.city,'')),''))) then
    raise exception 'Legacy customer contact fields are out of sync';
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.projects'::regclass
    and conname='projects_customer_company_fkey' and contype='f' and convalidated) then
    raise exception 'Validated company/customer foreign key missing';
  end if;
  if exists(select 1 from pg_class where oid in('public.customers'::regclass,'public.customer_match_decisions'::regclass) and not relrowsecurity) then
    raise exception 'Customer RLS missing';
  end if;
  if has_table_privilege('authenticated','public.customers','INSERT')
    or has_table_privilege('authenticated','public.customers','UPDATE')
    or has_table_privilege('authenticated','public.customers','DELETE')
    or has_table_privilege('authenticated','public.customer_match_decisions','SELECT')
    or has_table_privilege('anon','public.customers','SELECT') then
    raise exception 'Customer table permissions too broad';
  end if;
  if exists(select 1 from unnest(array[
    'public.search_customers(uuid,text,integer,integer,uuid)',
    'public.save_customer(uuid,uuid,text,text,text,text,timestamptz)',
    'public.save_customer_details(uuid,uuid,text,text,text,text,timestamptz,text,text)',
    'public.link_project_customer(uuid,uuid,uuid)',
    'public.resolve_customer_duplicate(uuid,uuid,boolean)',
    'public.list_customer_projects(uuid,text,integer)',
    'public.save_project_customer_details(uuid,uuid,jsonb,uuid,jsonb)'
  ]) as expected(signature) where to_regprocedure(expected.signature) is null) then
    raise exception 'Required customer RPC missing';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('search_customers','save_customer','link_project_customer',
      'resolve_customer_duplicate','list_customer_projects','save_project_customer_details','save_customer_details')
    and (not p.prosecdef or has_function_privilege('anon',p.oid,'execute')
      or not has_function_privilege('authenticated',p.oid,'execute')
      or not ('search_path=""'=any(p.proconfig)))) then
    raise exception 'Customer function permissions or search path incorrect';
  end if;
end $$;
rollback;
select 'PASS: customer relationships, contact synchronization, RLS and RPC permissions' as result;
