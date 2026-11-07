import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function copyCounts(sql) {
  const counts = [];
  let active;
  for (const line of sql.split(/\r?\n/)) {
    if (active) {
      if (line === '\\.') {
        counts.push(active);
        active = undefined;
      } else {
        active[1]++;
      }
    } else {
      const match = /^COPY ((?:"[^"]+"|[a-z_][a-z_0-9]*)\.(?:"[^"]+"|[a-z_][a-z_0-9]*)) \(/.exec(line);
      if (match) active = [match[1], 0];
    }
  }
  if (active || !counts.length) throw new Error('Incomplete or empty COPY archive');
  return counts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const container = process.argv[3];
  if (container !== 'supabase_db_backup-restore-check') throw new Error('Unexpected restore target');
  const counts = copyCounts(readFileSync(process.argv[2], 'utf8'));
  for (const [table, expected] of counts) {
    const result = execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-At',
      '-U', 'supabase_admin', '-d', 'postgres', '-c', `SELECT count(*) FROM ${table}`],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (Number(result.trim()) !== expected) throw new Error(`Row count mismatch in ${table}`);
  }
  console.log(`PASS: all ${counts.length} COPY tables have matching row counts.`);
}
