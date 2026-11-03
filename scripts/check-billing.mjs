import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

let authChange;
let resolveUsage;
let requestStarted;
const started = new Promise((resolve) => { requestStarted = resolve; });
let sessionFails = false;
const usage = { companyId: 'company', status: 'trial', trialLimit: 10, trialUsed: 8,
  trialPending: 0, trialRemaining: 2, canGenerate: true };
const source = readFileSync('src/app/core/billing/billing.service.ts','utf8')
  .replace(/^import .*;\r?\n/gm,'').replace(/^@Injectable\([^\n]+\)\r?\n/gm,'')
  .replaceAll('export class ', 'class ');
const scope = {
  signal: (initial) => { let value = initial; const read = () => value; read.set = (next) => value = next; return read; },
  supabase: {
    auth: {
      onAuthStateChange: (callback) => { authChange = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      getSession: async () => { if (sessionFails) throw new Error('Network'); },
    },
    rpc: async () => new Promise((resolve) => { resolveUsage = resolve; requestStarted(); }),
  },
};
runInNewContext(stripTypeScriptTypes(source) + '\nglobalThis.Service = BillingService;',scope);
const service = new scope.Service();
authChange('INITIAL_SESSION',{ user: { id: 'first-user' } });
service.accept(usage);
assert.equal(service.usage().trialRemaining,2);
service.accept({ ...usage, status:'exhausted',trialUsed:10,trialRemaining:0,canGenerate:false },true);
assert.equal(service.endedNotice(),true);
const pending = service.load();
await started;
authChange('SIGNED_OUT',null);
resolveUsage({ data:usage,error:null });
await pending;
assert.equal(service.usage(),null,'A stale response must not restore another user’s company usage');
assert.equal(service.endedNotice(),false);
sessionFails = true;
await service.load();
assert.match(service.error(),/Kunne ikke hente/,'Session network errors should be shown, not thrown');
console.log('Billing service checks passed (remaining calls, exhaustion notice, logout race and network error).');
