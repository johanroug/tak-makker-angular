import { readFileSync, writeFileSync } from 'node:fs';
import { copyCounts } from './check-restored-row-counts.mjs';

// All COPY tables are truncated together, deliberately without CASCADE. A new
// referencing table must cause failure rather than lose unarchived data.
export function buildRestore(sql, dryRun) {
  const counts = copyCounts(sql);
  const tables = counts.map(([table]) => table);
  if (new Set(tables).size !== tables.length) throw new Error('Duplicate COPY table');
  if (!tables.some(table => table.startsWith('public.'))) throw new Error('No application tables');
  if (tables.some(table => !/^(public|auth|storage)\./.test(table))) throw new Error('Unexpected schema');
  // COPY data remains byte-for-byte unchanged. pg_dump statements execute with
  // ON_ERROR_STOP, inside the same transaction as clearing and verification.
  const checks = counts.map(([table, expected]) =>
    `DO $$ BEGIN IF (SELECT count(*) FROM ${table}) <> ${expected} THEN RAISE EXCEPTION 'Restore row count mismatch'; END IF; END $$;`).join('\n');
  // setval is not transactional in PostgreSQL. Never execute it in a trial.
  const data = dryRun ? sql.replace(/^SELECT pg_catalog\.setval\([^\r\n]*\);\r?$/gm, '-- Sequence change omitted in trial') : sql;
  return `BEGIN;
SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '10min';
LOCK TABLE ${tables.join(', ')} IN ACCESS EXCLUSIVE MODE;
SET LOCAL session_replication_role = replica;
TRUNCATE TABLE ${tables.join(', ')};
${data}
SET LOCAL session_replication_role = origin;
${checks}
${dryRun ? 'ROLLBACK' : 'COMMIT'};
`;
}

if (process.argv[1]?.endsWith('build-data-restore.mjs')) {
  const [input, output, mode] = process.argv.slice(2);
  if (!['true', 'false'].includes(mode)) throw new Error('Invalid dry run');
  writeFileSync(output, buildRestore(readFileSync(input, 'utf8'), mode === 'true'), { mode: 0o600 });
}
