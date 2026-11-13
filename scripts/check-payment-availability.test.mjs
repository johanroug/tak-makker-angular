import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { paymentsEnabled } from '../supabase/functions/_shared/billing/stripe.ts';

test('sandbox sessions are closed on public origins, including with live switch enabled', () => {
  for (const origin of ['https://xn--hovedetpsmmet-wfb00a.dk', 'https://hovedetpaasommet.dk', 'https://localhost:4200', 'http://localhost:4200.evil.example']) {
    assert.equal(paymentsEnabled(origin, 'sk_test_dummy', false), false);
    assert.equal(paymentsEnabled(origin, 'sk_test_dummy', true), false);
  }
});
test('sandbox is available on local development and staging origins', () => {
  for (const origin of ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://localhost:4201', 'http://127.0.0.1:4201'])
    assert.equal(paymentsEnabled(origin, 'sk_test_dummy', false), true);
});
test('live sessions need the explicit live switch and a live key', () => {
  const origin = 'https://xn--hovedetpsmmet-wfb00a.dk';
  assert.equal(paymentsEnabled(origin, 'sk_live_dummy', false), false);
  assert.equal(paymentsEnabled(origin, 'sk_live_dummy', true), true);
  assert.equal(paymentsEnabled(origin, '', true), false);
});
