import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHostedTestRestore, SOURCE_PROJECT, TEST_PROJECT } from './build-hosted-test-restore.mjs';

const schema='CREATE TABLE public.projects (id integer);\nALTER TABLE public.projects OWNER TO "supabase_admin";\nALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;\nCREATE POLICY members ON public.projects FOR SELECT USING (false);\n';
const data='COPY public.projects (id) FROM stdin;\n1\n\\.\nCOPY public.offers (id) FROM stdin;\n\\.\nCOPY auth.users (id) FROM stdin;\n\\.\nCOPY storage.old_empty_table (id) FROM stdin;\n\\.\n';
const managed=new Set(['auth.users']);
const build=(s=schema,d=data,t=TEST_PROJECT,c='RESTORE hovedet-test')=>buildHostedTestRestore(s,d,managed,t,c);

test('only the exact nonproduction target and confirmation are accepted',()=>{
  for (const ref of [SOURCE_PROJECT,'anotherproject','',undefined]) assert.throws(()=>buildHostedTestRestore(schema,data,managed,ref,'RESTORE hovedet-test'));
  for (const confirmation of ['RESTORE production','',undefined]) assert.throws(()=>buildHostedTestRestore(schema,data,managed,TEST_PROJECT,confirmation));
});
test('preserves application rows, RLS and policies while adapting only documented ownership',()=>{
  const result=build();
  assert.equal(result.ownerOmissions,1); assert.equal(result.tableCount,3);
  assert.deepEqual(result.omittedStorageTables,['storage.old_empty_table']);
  assert.ok(result.sql.includes('COPY public.projects (id) FROM stdin;\n1\n\\.'));
  assert.ok(result.sql.includes('ENABLE ROW LEVEL SECURITY'));
  assert.ok(result.sql.includes('CREATE POLICY members'));
  assert.doesNotMatch(result.sql,/OWNER TO "supabase_admin"/);
  assert.ok(result.sql.indexOf('Hosted test target is not empty')<result.sql.indexOf('CREATE TABLE public.projects'));
  assert.match(result.sql,/count\(\*\) FROM public.projects\) <> 1/);
  assert.ok(result.sql.endsWith('COMMIT;\n'));
  assert.doesNotMatch(result.sql.replace(/^--.*$/gm,''),/\bDROP\s|\bTRUNCATE\s|\bCREATE ROLE\s/);
});
test('never silently omits missing Auth or nonempty Storage tables',()=>{
  assert.throws(()=>build(schema,data.replace('COPY auth.users','COPY auth.unavailable_users')),/no rows were discarded/);
  assert.throws(()=>build(schema,data.replace('COPY storage.old_empty_table (id) FROM stdin;\n\\.','COPY storage.old_empty_table (id) FROM stdin;\n1\n\\.')),/no rows were discarded/);
});
test('accepts quoted pg_dump identifiers and matches them to unquoted target metadata',()=>{
  const quoted=data.replaceAll('public.projects','"public"."projects"').replaceAll('public.offers','"public"."offers"')
    .replaceAll('auth.users','"auth"."users"').replaceAll('storage.old_empty_table','"storage"."old_empty_table"');
  const result=build(schema,quoted);
  assert.equal(result.tableCount,3);
  assert.deepEqual(result.omittedStorageTables,['"storage"."old_empty_table"']);
  assert.ok(result.sql.includes('COPY "public"."projects" (id) FROM stdin;\n1\n\\.'));
  assert.throws(()=>build(schema,data+'COPY "public"."projects" (id) FROM stdin;\n\\.\n'),/Duplicate/);
});
test('rejects incomplete, duplicate and unexpected data schemas',()=>{
  assert.throws(()=>build(schema,data+'COPY public.broken (id) FROM stdin;\n1'),/Incomplete/);
  assert.throws(()=>build(schema,data+data),/Duplicate/);
  assert.throws(()=>build(schema,data+'COPY cron.job (id) FROM stdin;\n\\.\n'),/Unexpected data schema/);
  assert.throws(()=>build(schema,data.replace('COPY public.offers','COPY public.something_else')),/Application archive/);
});
