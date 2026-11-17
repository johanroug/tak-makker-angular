import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import * as budgetHelpers from '../supabase/functions/_shared/ai/budget.ts';

let handler;
let status;
let canTranscribe = true;
let providerCalls = 0;
let reservations = 0;
const billingSource = readFileSync('src/app/core/billing/billing.service.ts', 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^@Injectable\([^\n]+\)\r?\n/gm, '')
  .replaceAll('export class ', 'class ');
const billingScope = {
  signal: initial => { let value = initial; const read = () => value; read.set = next => { value = next; }; return read; },
  supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } },
};
runInNewContext(stripTypeScriptTypes(billingSource) + '\nglobalThis.Service = BillingService;', billingScope);
const billing = new billingScope.Service();
assert.equal(billing.speechAccess(), false, 'No speech before billing is loaded');
for (const status of ['trial', 'exhausted', 'free', 'active', 'internal']) {
  billing.usage.set({ companyId: 'company', status, canTranscribe: true });
  assert.equal(billing.speechAccess('company'), ['active', 'internal'].includes(status));
  assert.equal(billing.speechAccess('other-company'), false);
}
const client = {
  auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
  rpc: async name => {
    if (name === 'can_access_app') return { data: true };
    if (name === 'get_company_billing') return { data: { companyId: 'company', status, canTranscribe } };
    reservations++;
    throw new Error('A denied request must not reserve usage');
  },
};
const source = readFileSync('supabase/functions/transcribe-audio/index.ts', 'utf8').replace(/^import .*;\r?\n/gm, '');
runInNewContext(stripTypeScriptTypes(source), {
  ...budgetHelpers,
  createClient: () => client,
  Deno: { env: { get: () => 'test' }, serve: callback => { handler = callback; } },
  Response, File, FormData, AbortSignal, console,
  fetch: () => { providerCalls++; throw new Error('Unexpected provider call'); },
});
for (status of ['trial', 'exhausted', 'free']) {
  const response = await handler(new Request('https://speech.test', {
    method: 'POST', headers: { Authorization: 'Bearer test' }, body: new FormData(),
  }));
  assert.equal(response.status, 403, `${status} must be denied even with a stale canTranscribe=true`);
  assert.match((await response.json()).error, /kræver aktivt abonnement/);
}
for (status of ['active', 'internal']) {
  for (canTranscribe of [true, false]) {
    const response = await handler(new Request('https://speech.test', {
      method: 'POST', headers: { Authorization: 'Bearer test' }, body: new FormData(),
    }));
    // Entitled accounts reach file validation; exhausted quotas are denied first.
    assert.equal(response.status, canTranscribe ? 400 : 403);
  }
}
assert.equal(providerCalls, 0);
assert.equal(reservations, 0);
console.log('Speech access checks passed: free/trial denied, subscriber/internal access and quotas preserved.');
