import assert from 'node:assert/strict';
import { isOpenAiBudgetError } from '../supabase/functions/_shared/ai/openai-errors.ts';

for (const code of ['insufficient_quota', 'credit_balance_exhausted', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded']) {
  // SDK RateLimitError and raw fetch error payload shapes.
  assert.equal(isOpenAiBudgetError(Object.assign(new Error('Private provider detail'), { status: 429, code })), true);
  assert.equal(isOpenAiBudgetError({ error: { code, type: 'insufficient_quota' } }), true);
}
for (const value of [
  { status: 429, code: null, type: 'insufficient_quota' },
  { error: { code: null, type: 'insufficient_quota' } },
  { status: 429, error: { code: 'credit_balance_exhausted' } },
]) assert.equal(isOpenAiBudgetError(value), true);
for (const value of [
  null, undefined, false, '', 'insufficient_quota', [], {},
  { status: 429 }, { status: 500 },
  { status: 429, code: 'rate_limit_exceeded', type: 'rate_limit_error' },
  { error: { code: 'slow_down', type: 'rate_limit_error' } },
  { code: 'rate_limit_exceeded', type: 'insufficient_quota' },
  { error: { code: 'slow_down', type: 'insufficient_quota' } },
  { error: { code: 'unknown_error', message: 'insufficient_quota' } },
  { error: { code: 'invalid_api_key' } },
  { error: { type: 'server_error' } },
  new Error('429 insufficient_quota: private provider details'),
]) assert.equal(isOpenAiBudgetError(value), false);
console.log('OpenAI error classification passed: billing codes and insufficient_quota type; ordinary/unknown 429, malformed payloads, authentication/server errors and message text excluded.');
