import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRestore } from './build-data-restore.mjs';

const dump = 'COPY public.items (id) FROM stdin;\n1\n\\.\nCOPY auth.users (id) FROM stdin;\n\\.\nSELECT pg_catalog.setval(\'public.items_id_seq\', 42, true);\n';
test('trial checks counts and rolls back without nontransactional sequence writes', () => {
  const sql = buildRestore(dump, true);
  assert.match(sql, /LOCK TABLE public.items, auth.users IN ACCESS EXCLUSIVE MODE/);
  assert.match(sql, /TRUNCATE TABLE public.items, auth.users;/);
  assert.doesNotMatch(sql, /CASCADE|setval/);
  assert.match(sql, /count\(\*\) FROM public.items\) <> 1/);
  assert.match(sql, /count\(\*\) FROM auth.users\) <> 0/);
  assert.ok(sql.endsWith('ROLLBACK;\n'));
});
test('live restores COPY rows and sequence positions before commit', () => {
  const sql = buildRestore(dump, false);
  assert.ok(sql.includes(dump));
  assert.ok(sql.endsWith('COMMIT;\n'));
});
test('rejects unexpected, duplicate, incomplete and application-free archives', () => {
  for (const sql of [dump + dump, dump.replace('public.items', 'other.items'), 'COPY public.items (id) FROM stdin;\n1', 'COPY auth.users (id) FROM stdin;\n\\.\n']) {
    assert.throws(() => buildRestore(sql, true));
  }
});
