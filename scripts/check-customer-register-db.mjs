// Optional isolated test dependency (never added to application dependencies):
// npm install --prefix tmp/customer-db-test --no-save --no-package-lock @electric-sql/pglite@0.5.16
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const require = createRequire(resolve('tmp/customer-db-test/package.json'));
const { PGlite } = require('@electric-sql/pglite');
const { pg_trgm } = require('@electric-sql/pglite/contrib/pg_trgm');
const db = new PGlite({ extensions: { pg_trgm } });
const company = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
const user = '20000000-0000-0000-0000-000000000001';
const first = '30000000-0000-0000-0000-000000000001';
const second = '30000000-0000-0000-0000-000000000002';
const empty = '30000000-0000-0000-0000-000000000003';
const foreign = '30000000-0000-0000-0000-000000000004';
const newId = '40000000-0000-0000-0000-000000000001';
const scalar = async (sql, params=[]) => Object.values((await db.query(sql,params)).rows[0])[0];
const call = (sql, params=[]) => db.query(sql,params);
let checks = 0;
async function check(label, fn) { await fn(); checks++; console.log(`PASS: ${label}`); }
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema extensions; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function public.can_access_app() returns boolean language sql stable as $$ select auth.uid() is not null and coalesce(current_setting('test.blocked',true),'false')<>'true' $$;
    create function public.assert_app_access() returns void language plpgsql as $$ begin if not public.can_access_app() then raise exception 'Blocked' using errcode='42501'; end if; end $$;
    create table public.companies(id uuid primary key);
    create table public.company_members(company_id uuid references public.companies,user_id uuid);
    create table public.projects(id uuid primary key,company_id uuid not null references public.companies,
      customer_name text,customer_address text,customer_name_source text,customer_address_source text,
      title text,title_source text,description text,description_source text,offer_description text,offer_description_source text,
      hourly_rate numeric,validity_days integer,payment_terms text,reservations text,
      project_number text not null,created_at timestamptz not null default now(),updated_at timestamptz);
    create table public.project_messages(id integer primary key,project_id uuid references public.projects,content text);
    create table public.project_work_items(id integer primary key,project_id uuid references public.projects);
    create table public.project_materials(id integer primary key,project_id uuid references public.projects);
    create table public.offers(id integer primary key,project_id uuid references public.projects,customer_name text,customer_address text);
    alter table public.projects enable row level security;
    create policy projects_read on public.projects for select to authenticated using (exists(select 1 from public.company_members m where m.company_id=projects.company_id and m.user_id=auth.uid()));
    grant usage on schema public,auth to authenticated;
    grant select on public.projects,public.company_members to authenticated;
    insert into public.companies values('${company}'),('${other}');
    insert into public.company_members values('${company}','${user}');
    insert into public.projects(id,company_id,customer_name,customer_address,title,project_number) values
      ('${first}','${company}','Mette Hansen','Skovvej 12','Bad','2026-0001'),
      ('${second}','${company}','Mette Hansen','Skovvej 12','Radiator','2026-0002'),
      ('${empty}','${company}',null,null,'Tomt','2026-0003'),
      ('${foreign}','${other}','Mette Hansen','Skovvej 12','Other company','2026-0001');
    insert into public.offers values(1,'${first}','Mette OLD','Old address');
    insert into public.project_messages values(1,'${first}','Original message');
    insert into public.project_work_items values(1,'${first}');
    insert into public.project_materials values(1,'${first}');
    select set_config('request.jwt.claim.sub','${user}',false);
  `);
  const migration = readFileSync('supabase/migrations/202611130001_customer_register.sql','utf8');
  await check('migration executes and can be repeated without duplicated customers', async () => {
    await db.exec(migration); await db.exec(migration);
    assert.equal(await scalar('select count(*)::int from public.customers'),3);
    assert.equal(await scalar('select count(*)::int from public.projects'),4);
    assert.equal(await scalar('select count(distinct customer_id)::int from public.projects where company_id=$1',[company]),2);
    assert.equal(await scalar('select customer_id from public.projects where id=$1',[empty]),null);
    for (const table of ['project_messages','project_work_items','project_materials','offers']) assert.equal(await scalar(`select count(*)::int from public.${table}`),1);
  });
  await db.exec('set role authenticated');
  await check('RLS and search isolate companies and search project titles/numbers', async () => {
    assert.equal(await scalar('select count(*)::int from public.customers'),2);
    assert.equal((await scalar('select public.search_customers($1,$2)',[company,'Radiator'])).length,1);
    assert.equal((await scalar('select public.search_customers($1,$2)',[company,'2026-0002']))[0].id,second);
    assert.equal((await scalar('select public.search_customers($1,$2)',[company,'%'])).length,0);
    await assert.rejects(call('select public.search_customers($1)',[other]),/Ingen adgang/);
    await assert.rejects(call('select public.list_customer_projects($1)',[foreign]),/Ingen adgang/);
    await assert.rejects(call('update public.customers set name=$1 where id=$2',['No',first]),/permission denied/);
  });
  await check('customer creation is retryable and duplicate names remain distinct', async () => {
    const args=[newId,company,'Mette Hansen','New contact','mette@example.test','12345678'];
    await call('select public.save_customer($1,$2,$3,$4,$5,$6)',args);
    await call('select public.save_customer($1,$2,$3,$4,$5,$6)',args);
    assert.equal(await scalar('select count(*)::int from public.customers'),3);
    await assert.rejects(call('select public.save_customer($1,$2,$3,$4,$5,$6)',[foreign,company,'No','','','']),/Ingen adgang/);
    await assert.rejects(call('select public.save_customer($1,$2,$3,$4,$5,$6)',[crypto.randomUUID(),other,'No','','','']),/Ingen adgang/);
  });
  await check('linking and updates preserve work addresses and old offer snapshots', async () => {
    await call('select public.link_project_customer($1,$2,$3)',[first,newId,first]);
    await call('select public.link_project_customer($1,$2,$3)',[second,newId,second]);
    await call('select public.link_project_customer($1,$2,$3)',[second,newId,second]);
    const timestamp=await scalar('select updated_at::text from public.customers where id=$1',[newId]);
    await call('select public.save_customer($1,$2,$3,$4,$5,$6,$7)',[newId,company,'Mette NEW','Contact NEW','new@example.test','87654321',timestamp]);
    const rows=(await call('select customer_name,customer_address,work_address from public.projects where customer_id=$1',[newId])).rows;
    assert.equal(rows.length,2); assert.ok(rows.every(row => row.customer_name==='Mette NEW' && row.customer_address==='Contact NEW' && row.work_address==='Skovvej 12'));
    await assert.rejects(call('select public.save_customer($1,$2,$3,$4,$5,$6,$7)',[newId,company,'Stale','','','',timestamp]),/Genindlæs/);
    await assert.rejects(call('select public.link_project_customer($1,$2,$3)',[empty,foreign,null]),/Ingen adgang/);
    await assert.rejects(call('select public.link_project_customer($1,$2,$3)',[foreign,newId,foreign]),/anden virksomhed/);
    await db.exec('reset role');
    assert.equal(await scalar('select customer_name from public.offers where id=1'),'Mette OLD');
    await call('insert into public.offers(id,project_id,customer_name,customer_address) select 2,id,customer_name,customer_address from public.projects where id=$1',[first]);
    assert.equal(await scalar('select customer_email from public.offers where id=2'),'new@example.test');
    await assert.rejects(call('update public.projects set customer_id=$1 where id=$2',[foreign,empty]),/returned no rows|foreign key/);
    await db.exec('set role authenticated');
  });
  await check('duplicate decisions and explicit merges move projects without changing snapshots', async () => {
    const candidates=await scalar('select public.search_customers($1,$2,0,25,$3)',[company,'',first]);
    assert.ok(candidates.some(row=>row.id===second));
    await call('select public.resolve_customer_duplicate($1,$2,false)',[first,second]);
    assert.equal((await scalar('select public.search_customers($1,$2,0,25,$3)',[company,'',first])).length,0);
    await call('select public.resolve_customer_duplicate($1,$2,true)',[second,newId]);
    assert.equal(await scalar('select count(*)::int from public.customers where id=$1',[second]),0);
    await assert.rejects(call('select public.resolve_customer_duplicate($1,$2,true)',[first,foreign]),/Ingen adgang/);
    await db.exec('reset role');
    assert.equal(await scalar('select customer_name from public.offers where id=1'),'Mette OLD');
    await db.exec('set role authenticated');
  });
  await check('bounded pagination, contact search and blocked users', async () => {
    assert.equal((await scalar('select public.search_customers($1,$2,0,1)',[company,''])).length,1);
    assert.equal((await scalar('select public.search_customers($1,$2)',[company,'87654321']))[0].id,newId);
    assert.equal((await scalar('select public.list_customer_projects($1,$2)',[newId,'Radiator']))[0].id,second);
    await assert.rejects(call('select public.search_customers($1,$2,-1)',[company,'']),/Ugyldig/);
    await db.exec("select set_config('test.blocked','true',false)");
    assert.equal(await scalar('select count(*)::int from public.customers'),0);
    await assert.rejects(call('select public.search_customers($1)',[company]),/Blocked/);
    await db.exec("select set_config('test.blocked','false',false); reset role; set role anon;");
    await assert.rejects(call('select public.search_customers($1)',[company]),/permission denied/);
    await assert.rejects(call('select * from public.customers'),/permission denied/);
  });
  await db.exec('reset role');
  await db.exec(readFileSync('supabase/migrations/202611130002_save_project_customer_details.sql','utf8'));
  await db.exec('set role authenticated');
  await check('customer and project save is atomic, rejects stale choices and preserves contacts on failure', async () => {
    const created=crypto.randomUUID();
    await call('select public.save_project_customer_details($1,$2,$3,$4,$5)',[empty,created,{title:'Saved together',title_source:'user'},null,{name:'New confirmed customer',address:'Contact',email:'',phone:''}]);
    assert.equal(await scalar('select customer_id from public.projects where id=$1',[empty]),created);
    assert.equal(await scalar('select title from public.projects where id=$1',[empty]),'Saved together');
    const rejected=crypto.randomUUID();
    await assert.rejects(call('select public.save_project_customer_details($1,$2,$3,$4,$5)',[empty,rejected,{title:'Must not save',title_source:'user'},null,{name:'Rollback customer'}]),/ændret/);
    assert.equal(await scalar('select count(*)::int from public.customers where id=$1',[rejected]),0);
    assert.equal(await scalar('select title from public.projects where id=$1',[empty]),'Saved together');
    await assert.rejects(call('select public.save_project_customer_details($1,$2,$3,$4)',[empty,newId,{hourly_rate:-1},created]),/timepris/);
    await assert.rejects(call('select public.save_project_customer_details($1,$2,$3,$4)',[empty,foreign,{},created]),/Ingen adgang/);
    await assert.rejects(call('select public.save_project_customer_details($1,$2,$3,$4)',[empty,newId,{company_id:other},created]),/projektfelter/);
    assert.equal(await scalar('select customer_id from public.projects where id=$1',[empty]),created);
    await call('select public.save_project_customer_details($1,$2,$3,$4)',[empty,newId,{work_address:'Independent job address',work_address_source:'user'},created]);
    await call('select public.save_project_customer_details($1,$2,$3,$4)',[empty,newId,{},created]);
    assert.equal(await scalar('select work_address from public.projects where id=$1',[empty]),'Independent job address');
  });
  await db.exec('reset role');
  await db.exec(readFileSync('supabase/migrations/202611140001_customer_postal_address.sql','utf8'));
  await check('postal addresses sync to projects, preserve snapshots and save atomically', async () => {
    await db.exec('set role authenticated');
    const id=crypto.randomUUID();
    const result=await call('select public.save_customer_details($1,$2,$3,$4,$5,$6,null,$7,$8)',[id,company,'Postal customer','Testvej 123','','','3460','Birkerød']);
    await call('select public.link_project_customer($1,$2,$3)',[empty,id,newId]);
    assert.equal(await scalar('select customer_address from public.projects where id=$1',[empty]),'Testvej 123\n3460 Birkerød');
    const results=await scalar('select public.search_customers($1,$2)',[company,'3460']);
    assert.ok(results.some(customer=>customer.id===id));
    const fresh=crypto.randomUUID();
    await call('select public.save_project_customer_details($1,$2,$3,$4,$5)',[empty,fresh,{},id,{name:'Atomic postal',address:'Vej 4',postal_code:'8000',city:'Aarhus'}]);
    assert.equal(await scalar('select customer_address from public.projects where id=$1',[empty]),'Vej 4\n8000 Aarhus');
    await db.exec('reset role');
    assert.equal(await scalar('select customer_address from public.offers where id=1'),'Old address');
  });
  await check('post-deployment read-only integrity SQL', async () => {
    await db.exec(readFileSync('supabase/tests/customer_register.sql','utf8'));
  });
  console.log(`${checks} isolated PostgreSQL customer-register checks passed. Production was not contacted.`);
} catch(error) {
  console.error(error.message); process.exitCode=1;
} finally { await db.close(); }
