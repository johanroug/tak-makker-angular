import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { copyCounts } from './check-restored-row-counts.mjs';
import { omitMissingEmptyStorage } from './prepare-restore-data.mjs';

export const TEST_PROJECT = 'woxioycjdjucxqiyqcyr';
export const SOURCE_PROJECT = 'agbugdzobpkpgfischvi';
export function buildHostedTestRestore(schema, data, managedTables, target, confirmation) {
  if (target !== TEST_PROJECT || target === SOURCE_PROJECT || confirmation !== 'RESTORE hovedet-test') throw new Error('Unexpected test restore target or confirmation');
  const counts = copyCounts(data);
  if (!counts.some(([table]) => table === 'public.projects') || !counts.some(([table]) => table === 'public.offers')) throw new Error('Application archive required');
  if (counts.some(([table]) => !/^(public|auth|storage)\./.test(table))) throw new Error('Unexpected data schema: review external services before restoring');
  const missing = new Set();
  for (const [table] of counts) {
    if (!/^(auth|storage)\./.test(table)) continue;
    if (!/^(auth|storage)\.[a-z_][a-z_0-9]*$/.test(table)) throw new Error('Unexpected managed identifier');
    if (!managedTables.has(table)) missing.add(table);
  }
  const prepared = omitMissingEmptyStorage(data, missing);
  // Official hosted-restore exception: hosted postgres cannot assume ownership
  // as supabase_admin. No data, constraints, policies or other SQL is removed.
  let ownerOmissions = 0;
  const preparedSchema = schema.replace(/^ALTER [^\r\n]* OWNER TO "?supabase_admin"?;\r?$/gm, () => {
    ownerOmissions++; return '-- Hosted compatibility: supabase_admin owner statement omitted';
  });
  const expected = copyCounts(prepared);
  if (new Set(expected.map(([table]) => table)).size !== expected.length) throw new Error('Duplicate COPY table');
  const checks = expected.map(([table, count]) => `DO $$ BEGIN IF (SELECT count(*) FROM ${table}) <> ${count} THEN RAISE EXCEPTION 'Backup row count mismatch'; END IF; END $$;`).join('\n');
  const sql = `\\set VERBOSITY sqlstate
\\set SHOW_CONTEXT never
BEGIN;
SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '10min';
-- Refuse existing application tables. Never DROP or TRUNCATE a hosted target.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e'))
    OR EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM storage.buckets) OR EXISTS(SELECT 1 FROM storage.objects)
  THEN RAISE EXCEPTION 'Hosted test target is not empty'; END IF;
END $$;
${preparedSchema}
SET LOCAL session_replication_role = replica;
${prepared}
SET LOCAL session_replication_role = origin;
${checks}
COMMIT;
`;
  return { sql, ownerOmissions, omittedStorageTables: [...missing], tableCount: expected.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [directory, target, confirmation] = process.argv.slice(2);
  const tables = new Set(readFileSync(`${directory}/managed-tables.txt`, 'utf8').trim().split(/\r?\n/));
  const result = buildHostedTestRestore(readFileSync(`${directory}/schema.sql`, 'utf8'), readFileSync(`${directory}/data.sql`, 'utf8'), tables, target, confirmation);
  writeFileSync(`${directory}/restore.sql`, result.sql, { mode: 0o600 });
  console.log(`Prepared ${result.tableCount} COPY tables. Hosted owner exceptions: ${result.ownerOmissions}.`);
  for (const table of result.omittedStorageTables) console.log(`Compatibility: ${table} absent on target; archive has exactly 0 rows. Empty COPY omitted.`);
  console.log('roles.sql is not executed: hosted Supabase supplies its managed roles. Custom roles/settings require separate review.');
}
