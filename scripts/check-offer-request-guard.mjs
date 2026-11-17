import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(resolve('tmp/customer-db-test/package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const id = () => crypto.randomUUID();
const company = id(), otherCompany = id(), user = id(), outsider = id(), project = id(), otherProject = id();
const claim = (message, p = project, u = user) => scalar('select public.claim_offer_generation($1,$2,$3)', [p, message, u]);
const finish = (request, response = null) => scalar('select public.finish_offer_generation($1,$2)', [request, response]);
let sequence = 0;
const message = async (p = project) => {
  const m = id();
  await db.query("insert into public.project_messages(id,project_id,role,created_at) values($1,$2,'user',now()+$3*interval '1 second')", [m, p, ++sequence]);
  return m;
};
const start = async generation => {
  const q = await scalar('select public.reserve_company_ai_request($1,$2)', [project, user]);
  await db.query('select public.start_offer_generation($1,$2)', [generation.requestId, q.requestId]);
  return q.requestId;
};
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create table public.companies(id uuid primary key);
    create table public.projects(id uuid primary key,company_id uuid references public.companies);
    create table public.company_members(company_id uuid,user_id uuid);
    create table public.blocked_users(user_id uuid);
    create table public.project_messages(id uuid primary key,project_id uuid references public.projects,role text,created_at timestamptz default clock_timestamp());
    create table public.company_billing(company_id uuid primary key,billing_period_start timestamptz);
    create table public.company_ai_requests(id uuid primary key default gen_random_uuid(),company_id uuid,user_id uuid,
      charge_trial boolean,billing_period_start timestamptz,status text default 'pending',expires_at timestamptz default now()+interval '5 minutes');
    create function public.company_billing_snapshot(p_company_id uuid) returns jsonb language sql as $$
      select jsonb_build_object('status','internal','canGenerate',true,'used',count(*) filter(where status='succeeded'),
        'pending',count(*) filter(where status='pending')) from public.company_ai_requests where company_id=p_company_id $$;`);
  const original = readFileSync('supabase/migrations/202611030003_company_trial.sql', 'utf8');
  await db.exec(original.slice(original.indexOf('create function public.finish_company_ai_request'), original.indexOf('-- Self-service trial access.')));
  const stripe = readFileSync('supabase/migrations/202611040001_stripe_subscriptions.sql', 'utf8');
  const begin = stripe.indexOf('create or replace function public.reserve_company_ai_request');
  await db.exec(stripe.slice(begin, stripe.indexOf('$$;', begin) + 3));
  await db.exec(readFileSync('supabase/migrations/202611170002_offer_request_guard.sql', 'utf8'));
  await db.query('insert into public.companies values($1),($2)', [company, otherCompany]);
  await db.query('insert into auth.users values($1),($2)', [user, outsider]);
  await db.query('insert into public.company_members values($1,$2)', [company, user]);
  await db.query('insert into public.projects values($1,$2),($3,$2)', [project, company, otherProject]);
  for (const role of ['anon', 'authenticated']) {
    for (const fn of ['claim_offer_generation(uuid,uuid,uuid)', 'start_offer_generation(uuid,uuid)', 'finish_offer_generation(uuid,jsonb)'])
      assert.equal(await scalar(`select has_function_privilege('${role}','public.${fn}','execute')`), false);
    assert.equal(await scalar(`select has_table_privilege('${role}','public.offer_generations','SELECT')`), false);
  }
  const m = await message();
  await assert.rejects(() => claim(m, project, outsider), /Ingen adgang/);
  await assert.rejects(() => claim(id()), /Unknown user message/);
  const claims = await Promise.all([claim(m), claim(m), claim(m)]);
  assert.equal(claims.filter(c => c.state === 'claimed').length, 1);
  assert.equal(claims.filter(c => c.state === 'busy').length, 2);
  const first = claims.find(c => c.state === 'claimed');
  const newer = await message();
  assert.equal((await claim(newer)).state, 'busy', 'Different messages cannot run concurrently within a project');
  const separate = await claim(await message(otherProject), otherProject);
  assert.equal(separate.state, 'claimed', 'Other projects may run concurrently');
  await finish(separate.requestId);
  const quota = await start(first);
  await assert.rejects(() => db.query('select public.start_offer_generation($1,$2)', [first.requestId, quota]), /already started/);
  const response = { questions: ['Saved response'], workItems: [], materials: [], analyzedImageIds: [] };
  await finish(first.requestId, response);
  assert.deepEqual((await claim(m)).response, response, 'Lost responses replay without any new provider call');
  await finish(first.requestId); // An ambiguous finish must not undo success.
  assert.equal(await scalar('select status from public.company_ai_requests where id=$1', [quota]), 'succeeded');
  await finish(first.requestId, response);
  assert.equal(await scalar("select count(*)::int from public.company_ai_requests where status='succeeded'"), 1);
  const second = await claim(newer);
  await finish(second.requestId); // Unsent preflight failures are safe to retry.
  assert.equal((await claim(newer)).state, 'claimed');
  const pending = await scalar('select id from public.offer_generations where message_id=$1', [newer]);
  await db.query("update public.offer_generations set expires_at=clock_timestamp()-interval '1 second' where id=$1", [pending]);
  const replacement = await claim(newer);
  assert.equal(replacement.state, 'claimed');
  await assert.rejects(() => db.query('select public.start_offer_generation($1,$2)', [pending, quota]), /Unknown generation/);
  await finish(replacement.requestId);
  assert.equal((await claim(m)).state, 'cached');
  assert.equal((await claim(newer)).state, 'claimed');
  await db.exec("delete from public.offer_generations where status='pending'");
  // Three failed dispatched attempts across different projects open a company-wide circuit.
  for (let i = 0; i < 3; i++) {
    const msg = await message(); const g = await claim(msg); const q = await start(g);
    if (i === 2) {
      await db.query("update public.offer_generations set expires_at=clock_timestamp()-interval '1 second' where id=$1", [g.requestId]);
      assert.equal((await claim(msg)).state, 'failed', 'Expired dispatched calls are never reissued');
    } else await finish(g.requestId);
    assert.equal(await scalar('select status from public.company_ai_requests where id=$1', [q]), 'failed');
    assert.equal((await claim(msg)).state, 'failed');
  }
  const next = await message(otherProject);
  const paused = await claim(next, otherProject);
  assert.equal(paused.state, 'cooldown'); assert.ok(paused.retryAfter > 0 && paused.retryAfter <= 60);
  await db.exec("update public.offer_generations set finished_at=clock_timestamp()-interval '61 seconds' where status='failed'");
  assert.equal((await claim(next, otherProject)).state, 'claimed', 'Cooldown ends without deployment');
  assert.equal((await claim(m)).state, 'cached', 'Completed results remain accessible during and after cooldown');
  const stale = await message(); await message();
  assert.equal((await claim(stale)).state, 'stale');
  console.log('Offer request guard checks passed: PostgreSQL permissions, overlapping claims, per-project serialization, cached replay, at-most-once dispatch, quota refunds, expired worker fencing and company-wide cooldown. No remote calls.');
} finally { await db.close(); }
