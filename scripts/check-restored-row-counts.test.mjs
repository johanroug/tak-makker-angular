import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { copyCounts } from './check-restored-row-counts.mjs';

test('counts COPY rows including escaped newlines and empty tables', () => {
  const sql = 'COPY "public"."companies" (id, name) FROM stdin;\n1\tA\\nB\n2\tC\n\\.\nCOPY auth.users (id) FROM stdin;\n\\.\n';
  assert.deepEqual(copyCounts(sql), [['"public"."companies"', 2], ['auth.users', 0]]);
  assert.deepEqual(copyCounts(sql.replaceAll('\n', '\r\n')), [['"public"."companies"', 2], ['auth.users', 0]]);
});
test('rejects missing or unfinished COPY sections', () => {
  assert.throws(() => copyCounts(''));
  assert.throws(() => copyCounts('COPY public.x (id) FROM stdin;\n1\n'));
});
