import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { copyCounts } from './check-restored-row-counts.mjs';

// Hosted Storage can have newer empty system tables than the pinned local image.
// Never invent schema or discard rows to make a restore test pass.
export function omitMissingEmptyStorage(sql, missing) {
  const counts = copyCounts(sql);
  for (const table of missing) {
    const item = counts.find(([name]) => name === table);
    if (!item || !/^(?:storage|"storage")\./.test(table) || item[1] !== 0) {
      throw new Error(`Restore target needs the source schema for ${table}; no rows were discarded.`);
    }
  }
  const lines = sql.split(/\r?\n/);
  const output = [];
  let skipping = false;
  for (const line of lines) {
    if (skipping) {
      if (line === '\\.') skipping = false;
      continue;
    }
    const match = /^COPY (.+?) \(/.exec(line);
    if (match && missing.has(match[1])) skipping = true;
    else output.push(line);
  }
  return output.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output, container] = process.argv.slice(2);
  if (container !== 'supabase_db_backup-restore-check') throw new Error('Unexpected restore target');
  const sql = readFileSync(input, 'utf8');
  const missing = new Set();
  // Only inspect managed schemas here. Public application tables do not exist
  // until schema.sql is restored and must never be skipped.
  for (const [table] of copyCounts(sql).filter(([name]) => /^(?:storage|"storage"|auth|"auth")\./.test(name))) {
    const literal = table.replaceAll("'", "''");
    const result = execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-At',
      '-U', 'supabase_admin', '-d', 'postgres', '-c', `SELECT to_regclass('${literal}') IS NOT NULL`],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (result.trim() !== 't') missing.add(table);
  }
  const prepared = omitMissingEmptyStorage(sql, missing);
  writeFileSync(output, prepared, { mode: 0o600 });
  for (const table of missing) console.log(`Compatibility: ${table} absent locally; archive has 0 rows. Empty COPY omitted.`);
}
