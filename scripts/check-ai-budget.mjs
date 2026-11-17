import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { AiBudget, AiBudgetError, TRANSCRIPTION_MODEL } from '../supabase/functions/_shared/ai/budget.ts';

// Uses the existing isolated PostgreSQL test runtime, never the linked project.
const require = createRequire(resolve('tmp/customer-db-test/package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
const reserve = kind => scalar('select public.reserve_global_ai_budget($1)', [kind]);
const settle = (id, cost) => db.query('select public.settle_global_ai_budget($1,$2)', [id, cost]);
try {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(readFileSync('supabase/migrations/202611170001_global_ai_budget.sql', 'utf8'));
  assert.equal(await scalar('select daily_limit from public.ai_budget_settings'), 10000000);
  assert.equal(await scalar('select monthly_limit from public.ai_budget_settings'), 100000000);
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar(`select has_function_privilege('${role}','public.reserve_global_ai_budget(text)','execute')`), false);
    assert.equal(await scalar(`select has_function_privilege('${role}','public.settle_global_ai_budget(uuid,bigint)','execute')`), false);
    assert.equal(await scalar(`select has_table_privilege('${role}','public.ai_budget_settings','UPDATE')`), false);
    assert.equal(await scalar(`select has_table_privilege('${role}','public.ai_budget_requests','INSERT')`), false);
  }
  // Overlapping demand: both operations compete for the same remaining budget.
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => reserve(i % 2 ? 'offer' : 'transcription')));
  assert.equal(results.filter(r => r.allowed).length, 3);
  assert.equal(await scalar('select sum(charged_amount)::int from public.ai_budget_requests'), 9000000);
  await db.exec('update public.ai_budget_settings set daily_limit=12000000,monthly_limit=120000000');
  const afterIncrease = await reserve('offer');
  assert.equal(afterIncrease.allowed, true, 'Admin budget increase applies to the next call without redeployment');
  await settle(afterIncrease.requestId, 0);
  await db.exec('update public.ai_budget_settings set daily_limit=8000000');
  assert.equal((await reserve('offer')).allowed, false, 'Lowering a budget preserves prior spending');
  assert.equal(await scalar('select sum(charged_amount)::int from public.ai_budget_requests'), 9000000);
  await db.exec('update public.ai_budget_settings set daily_limit=10000000,monthly_limit=0');
  assert.equal((await reserve('transcription')).allowed, false, 'Zero monthly budget stops new calls immediately');
  await db.exec('update public.ai_budget_settings set monthly_limit=100000000');
  await settle(results[0].requestId, 10000);
  await settle(results[0].requestId, 0); // Replaying settlement cannot erase a charge.
  assert.equal(await scalar('select charged_amount from public.ai_budget_requests where id=$1', [results[0].requestId]), 10000);
  assert.equal((await reserve('offer')).allowed, true);
  await db.exec('update public.ai_budget_settings set enabled=false');
  assert.equal((await reserve('offer')).allowed, false);
  await db.exec('update public.ai_budget_settings set enabled=true; delete from public.ai_budget_requests;');
  // Prior-day spending still counts against this month's limit.
  await db.exec(`insert into public.ai_budget_requests(kind,reserved_amount,charged_amount,budget_day,budget_month)
    values('offer',98000000,98000000,'2000-01-01',date_trunc('month',clock_timestamp() at time zone 'Europe/Copenhagen')::date)`);
  assert.equal((await reserve('transcription')).allowed, false);
  await db.exec("update public.ai_budget_requests set budget_month='2000-01-01'");
  assert.equal((await reserve('transcription')).allowed, true, 'Previous months do not consume current budget');
  const current = await reserve('offer');
  await settle(current.requestId, 3000001);
  assert.equal(await scalar('select enabled from public.ai_budget_settings'), false, 'Unexpected cost trips emergency stop');
  assert.equal((await reserve('offer')).allowed, false);
  await db.exec('delete from public.ai_budget_settings;');
  await assert.rejects(() => reserve('offer'), /not configured/);
} finally { await db.close(); }

let calls = [];
let denied = false;
const client = { rpc: async (name, args) => {
  calls.push({ name, args });
  return { data: name === 'reserve_global_ai_budget' ? { allowed: !denied, requestId: 'budget' } : null, error: null };
} };
let budget = new AiBudget(client);
await budget.reserve('offer'); budget.start();
await budget.record('offer', { input_tokens: 10000, output_tokens: 2000 });
assert.equal(calls.at(-1).args.p_amount, 35200);
calls = []; budget = new AiBudget(client);
await budget.reserve('offer'); budget.start();
await budget.record('offer', { input_tokens: 922000, output_tokens: 128000 });
assert.ok(calls.at(-1).args.p_amount <= 3000000, 'Reservation covers documented maximum Luna cost');
calls = []; budget = new AiBudget(client);
await budget.reserve('offer'); budget.start(); await budget.releaseUnsent();
assert.equal(calls.length, 1, 'Timeout/unknown outcomes retain the full reservation');
await budget.record('offer', { input_tokens: NaN, output_tokens: 5 });
assert.equal(calls.length, 1);
calls = []; budget = new AiBudget(client);
await budget.reserve('transcription'); await budget.releaseUnsent();
assert.equal(calls.at(-1).args.p_amount, 0, 'An unsent request may release its budget');
denied = true;
await assert.rejects(() => new AiBudget(client).reserve('offer'), AiBudgetError);
await assert.rejects(() => new AiBudget({ rpc: async () => { throw Error('Connection failed'); } }).reserve('offer'), AiBudgetError);
calls = []; budget = new AiBudget({ rpc: async (name, args) => {
  calls.push({ name, args });
  return name === 'reserve_global_ai_budget' ? { data: { allowed: true, requestId: 'budget' }, error: null } : { data: null, error: 'offline' };
} });
await budget.reserve('offer'); budget.start();
await budget.record('offer', { input_tokens: 100, output_tokens: 10 });
await budget.releaseUnsent();
assert.equal(calls.length, 2, 'Failed settlement must not issue a compensating release');

// Execute the actual transcription endpoint with the actual budget helper.
let handler, providerCalls = 0, finishes = [], failProvider = false;
let speechAllowed = true, budgetError = false;
const speechClient = {
  auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
  rpc: async (name, args) => {
    if (name === 'can_access_app' || name === 'reserve_speech_upload') return { data: true };
    if (name === 'get_company_billing') return { data: { companyId: 'company', status: 'internal', canTranscribe: true } };
    if (name === 'reserve_company_transcription') return { data: { allowed: true, requestId: 'quota' } };
    if (name === 'reserve_global_ai_budget') return { data: { allowed: speechAllowed, requestId: 'global' }, error: budgetError };
    finishes.push({ name, args });
    return { data: {} };
  },
};
const helpers = await import('../supabase/functions/_shared/ai/budget.ts');
runInNewContext(stripTypeScriptTypes(readFileSync('supabase/functions/transcribe-audio/index.ts', 'utf8').replace(/^import .*;\r?\n/gm, '')), {
  ...helpers, createClient: () => speechClient, Response, File, FormData, AbortSignal, console,
  Deno: { env: { get: name => name === 'OPENAI_TRANSCRIPTION_MODEL' ? TRANSCRIPTION_MODEL : 'test' }, serve: callback => handler = callback },
  fetch: async () => { providerCalls++; if (failProvider) throw Error('Timeout'); return Response.json({ text: 'Hej', usage: { input_tokens: 500, output_tokens: 10 } }); },
});
const speech = () => { const form = new FormData(); form.append('file', new File(['test audio'], 'test.webm', { type: 'audio/webm' }));
  return handler(new Request('https://test.invalid', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: form })); };
for (const unavailable of [false, true]) {
  speechAllowed = false; budgetError = unavailable;
  const response = await speech(); assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'AI_BUDGET_REACHED');
  assert.equal(providerCalls, 0);
  assert.equal(finishes.at(-1).args.p_succeeded, false, 'Denied budget releases customer quota');
}
speechAllowed = true; budgetError = false; finishes = [];
assert.equal((await speech()).status, 200); assert.equal(providerCalls, 1);
assert.equal(finishes.find(c => c.name === 'settle_global_ai_budget').args.p_amount, 22440);
finishes = []; failProvider = true;
assert.equal((await speech()).status, 500);
assert.ok(!finishes.some(c => c.name === 'settle_global_ai_budget'), 'Provider failure must retain budget');
console.log('AI budget checks passed: SQL limits, permissions, shared reservations, settlement, month rollover, fail-closed and actual speech endpoint. No remote calls.');
