import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as imageHelpers from '../supabase/functions/_shared/ai/image-input.ts';
import * as budgetHelpers from '../supabase/functions/_shared/ai/budget.ts';
import * as openaiErrors from '../supabase/functions/_shared/ai/openai-errors.ts';

const messageId = '11111111-1111-4111-8111-111111111111';
const imageId = '22222222-2222-4222-8222-222222222222';
// Minimal WebP header fixture for the input validator; no real API is called.
const bytes = new Uint8Array(30);
bytes.set(new TextEncoder().encode('RIFF'), 0); bytes[4] = 22;
bytes.set(new TextEncoder().encode('WEBPVP8X'), 8); bytes[16] = 10;
const dataUrl = `data:image/webp;base64,${Buffer.from(bytes).toString('base64')}`;
let handler, state, providerCalls, logs;
function reset(overrides = {}) {
  state = { authenticated: true, membership: true, exists: true, status: 'active', messageExists: true, providerFailure: false, ...overrides };
  providerCalls = []; logs = [];
}
class OpenAI {
  responses = { parse: async input => {
    providerCalls.push(input);
    if (state.providerError) throw state.providerError;
    if (state.providerFailure) throw new Error(`provider error with sensitive payload ${dataUrl}`);
    return { output_parsed: { questions: [], workItems: [], materials: [] }, usage: {} };
  } };
}
const client = {
  auth: { getUser: async () => ({ data: { user: state.authenticated ? { id: 'user' } : null } }) },
  rpc: async (name, args) => {
    if (name === 'claim_offer_generation') {
      state.claims = (state.claims ?? 0) + 1;
      return { data: state.guard ?? { state: 'claimed', requestId: 'generation' } };
    }
    if (name === 'start_offer_generation') { state.started = true; return { error: state.startFailure ? {} : null }; }
    if (name === 'finish_offer_generation') {
      state.guardFinishes ??= []; state.guardFinishes.push(args.p_response);
      return { data: state.finishFailure ? null : { status: state.status }, error: state.finishFailure ? {} : null };
    }
    if (name === 'finish_company_ai_request') { state.quotaReleased = args.p_success === false; return { data: {} }; }
    if (name === 'settle_global_ai_budget') { state.budgetCharge = args.p_amount; return { error: null }; }
    return { data: name === 'can_access_app' ? true
    : name === 'get_company_billing' ? { companyId: 'company', status: state.status }
    : name === 'reserve_company_ai_request' ? { allowed: true, requestId: 'reservation' }
    : name === 'reserve_global_ai_budget' ? state.budgetUnavailable ? null : { allowed: !state.budgetDenied, requestId: 'budget' }
    : { status: state.status } };
  },
  from: table => {
    const query = { select: () => query, eq: () => query, order: () => query, single: () => query, maybeSingle: () => query,
      then: (resolve, reject) => Promise.resolve({ data: table === 'projects' ? state.exists ? { id: 'project', company_id: 'company' } : null
        : table === 'company_members' ? state.membership ? { id: 'membership' } : null
        : table === 'companies' ? { trade: 'Murer' }
        : table === 'project_messages' ? [{ id: state.messageExists ? messageId : 'other-message', role: 'user', content: 'Renover badeværelset' }]
        : [], error: null }).then(resolve, reject) };
    return query;
  },
};
const compiled = ts.transpileModule(readFileSync('supabase/functions/generate-offer/index.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
runInNewContext(compiled, {
  exports: {}, Request, Response, TextDecoder, Uint8Array, performance,
  console: { error: (...args) => logs.push(args.join(' ')), info: (...args) => logs.push(args.join(' ')) },
  Deno: { env: { get: name => name === 'SUPABASE_URL' ? 'https://woxioycjdjucxqiyqcyr.supabase.co' : 'test-placeholder' }, serve: callback => handler = callback },
  require: name => name === 'npm:openai' ? OpenAI
    : name === 'npm:openai/helpers/zod' ? { zodTextFormat: () => ({}) }
    : name === 'npm:@supabase/supabase-js' ? { createClient: () => client }
    : name.includes('image-input') ? imageHelpers
    : name.includes('/ai/budget') ? budgetHelpers
    : name.includes('/ai/openai-errors') ? openaiErrors
    : name.includes('schemas/project') ? { ProjectResponseSchema: {} }
    : name.endsWith('instructions.ts') ? { aiInstructions: 'Existing accepted/rejected rules' }
    : new Proxy({}, { get: () => () => '' }),
});
const call = (body = { projectId: 'project', messageId, images: [{ id: imageId, dataUrl }] }, authorization = 'Bearer test') => handler(new Request('https://woxioycjdjucxqiyqcyr.supabase.co/functions/v1/generate-offer', { method: 'POST', headers: { Authorization: authorization }, body: JSON.stringify(body) }));
for (const status of ['trial', 'exhausted', 'free']) {
  reset({ status }); assert.equal((await call()).status, 403, `Reject ${status}`); assert.equal(providerCalls.length, 0);
}
reset({ status: 'internal' }); assert.equal((await call()).status, 200, 'Internal access includes images'); assert.equal(providerCalls.length, 1);
reset({ authenticated: false }); assert.equal((await call()).status, 401); assert.equal(providerCalls.length, 0);
reset({ membership: false }); assert.equal((await call()).status, 403); assert.equal(providerCalls.length, 0);
reset({ exists: false }); assert.equal((await call()).status, 404); assert.equal(providerCalls.length, 0);
reset({ messageExists: false }); assert.equal((await call()).status, 400); assert.equal(providerCalls.length, 0);
reset(); assert.equal((await call()).status, 200); assert.equal(providerCalls.length, 1);
assert.equal(providerCalls[0].store, false);
assert.equal(providerCalls[0].input.at(-1).content[1].image_url, dataUrl);
assert.ok(!logs.join(' ').includes(dataUrl));
reset({ status: 'trial' }); assert.equal((await call({ projectId: 'project' })).status, 200, 'Text-only trial access preserved');
assert.equal(typeof providerCalls[0].input.at(-1).content, 'string');
reset({ providerFailure: true }); assert.equal((await call()).status, 500);
assert.ok(!logs.join(' ').includes(dataUrl), 'Never log provider errors containing images');
assert.equal(state.quotaReleased, true);
assert.equal(state.budgetCharge, undefined, 'Unknown provider failure retains the budget');
assert.equal(state.guardFinishes.at(-1), null);
for (const code of ['insufficient_quota', 'credit_balance_exhausted', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded']) {
  reset({ providerError: Object.assign(new Error(`Private provider detail ${dataUrl}`), { status: 429, code }) });
  const response = await call();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { code: 'AI_BUDGET_REACHED', error: budgetHelpers.BUDGET_MESSAGE });
  assert.equal(providerCalls.length, 1, 'No automatic retry on provider billing errors');
  assert.equal(state.quotaReleased, true, 'Billing errors refund the customer quota');
  assert.equal(state.budgetCharge, undefined, 'Billing error follows existing conservative cost accounting');
  assert.equal(state.guardFinishes.at(-1), null, 'Billing errors still complete the request guard');
  assert.ok(!logs.join(' ').includes(dataUrl), 'Never log SDK error messages');
}
for (const providerError of [
  { status: 429, type: 'insufficient_quota' },
  { status: 429, error: { code: 'organization_spend_limit_exceeded', type: 'insufficient_quota' } },
]) {
  reset({ providerError }); const response = await call();
  assert.equal(response.status, 503); assert.equal((await response.json()).error, budgetHelpers.BUDGET_MESSAGE);
}
for (const providerError of [
  { status: 429, code: 'rate_limit_exceeded' }, { status: 429, code: 'slow_down' },
  { status: 429 }, { status: 500 }, { status: 401, code: 'invalid_api_key' },
]) {
  reset({ providerError }); const response = await call();
  assert.equal(response.status, 500, 'Ordinary provider errors keep their existing generic response');
  assert.notEqual((await response.json()).code, 'AI_BUDGET_REACHED');
  assert.equal(state.quotaReleased, true); assert.equal(state.budgetCharge, undefined);
}
for (const [guard, status, code] of [
  [{ state: 'busy' }, 409, 'AI_PROJECT_BUSY'],
  [{ state: 'cooldown', retryAfter: 60 }, 429, 'AI_COOLDOWN'],
  [{ state: 'failed' }, 409, 'AI_MESSAGE_FAILED'],
  [{ state: 'stale' }, 409, 'AI_MESSAGE_STALE'],
]) {
  reset({ guard }); const response = await call();
  assert.equal(response.status, status); assert.equal((await response.json()).code, code);
  assert.equal(providerCalls.length, 0);
}
reset({ guard: { state: 'cached', response: { questions: ['Cached'], analyzedImageIds: [imageId] } } });
assert.deepEqual((await (await call()).json()).questions, ['Cached']);
assert.equal(providerCalls.length, 0, 'A retry replays the cached response');
reset({ startFailure: true }); assert.equal((await call()).status, 500);
assert.equal(providerCalls.length, 0); assert.equal(state.budgetCharge, 0);
reset({ finishFailure: true }); assert.equal((await call()).status, 500);
assert.equal(providerCalls.length, 1); assert.equal(state.quotaReleased, true);
assert.equal(state.budgetCharge, undefined);
for (const status of ['active', 'internal', 'trial']) {
  for (const failure of [{ budgetDenied: true }, { budgetUnavailable: true }]) {
    reset({ status, ...failure });
    const response = await call({ projectId: 'project' });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'AI_BUDGET_REACHED');
    assert.equal(providerCalls.length, 0, 'Global stop must prevent OpenAI for every account type');
  }
}
console.log('Passed: actual endpoint with mocked dependencies — auth, project membership, paid-only gating, message ownership, inline image forwarding, store:false, text-only compatibility and provider error redaction. No remote calls.');
