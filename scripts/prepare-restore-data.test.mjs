import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { omitMissingEmptyStorage } from './prepare-restore-data.mjs';
import { copyCounts } from './check-restored-row-counts.mjs';

const app = 'COPY public.companies (id) FROM stdin;\n1\n\\.\n';
const empty = 'COPY storage.bucket_lifecycle_states (id) FROM stdin;\n\\.\n';
test('omits only confirmed missing empty Storage COPY, preserves application rows', () => {
  const result = omitMissingEmptyStorage(app + empty, new Set(['storage.bucket_lifecycle_states']));
  assert.deepEqual(copyCounts(result), [['public.companies', 1]]);
  assert.equal(omitMissingEmptyStorage(app + empty, new Set()), app + empty);
});
test('rejects missing Storage data and any missing application or Auth table', () => {
  assert.throws(() => omitMissingEmptyStorage(app + empty.replace('\\.','1\n\\.'), new Set(['storage.bucket_lifecycle_states'])));
  assert.throws(() => omitMissingEmptyStorage('COPY public.x (id) FROM stdin;\n\\.\n', new Set(['public.x'])));
  assert.throws(() => omitMissingEmptyStorage('COPY auth.users (id) FROM stdin;\n\\.\n', new Set(['auth.users'])));
});
