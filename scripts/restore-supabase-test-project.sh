#!/usr/bin/env bash
set -euo pipefail
umask 077
command -v psql >/dev/null || { echo 'PostgreSQL client required.' >&2; exit 1; }
# Fixed target and pooler username; never link or address the production DB.
target='woxioycjdjucxqiyqcyr'
[[ "${GITHUB_ACTIONS:-}" == true && "${RESTORE_CONFIRMATION:-}" == 'RESTORE hovedet-test' ]] || { echo 'GitHub Actions and test confirmation required.' >&2; exit 1; }
[[ "$target" != agbugdzobpkpgfischvi ]] || exit 1
[[ "${BACKUP_FILENAME:-}" =~ ^supabase-[0-9]{8}T[0-9]{6}Z-[0-9]+-[0-9]+\.tar\.gz\.gpg$ ]] || { echo 'Invalid backup filename.' >&2; exit 1; }
for variable in SUPABASE_TEST_DB_PASSWORD BACKUP_ENCRYPTION_PASSWORD SIMPLY_SSH_USER SIMPLY_SSH_PRIVATE_KEY SIMPLY_SSH_KNOWN_HOSTS; do
  [[ -n "${!variable:-}" ]] || { echo "Missing secret: $variable" >&2; exit 1; }
done
[[ "$SIMPLY_SSH_USER" =~ ^[a-zA-Z0-9._-]+$ ]] || exit 1
workspace=$(mktemp -d)
cleanup() {
  rm -f "$workspace/key" "$workspace/known_hosts" "$workspace/passphrase" "$workspace/backup.gpg" \
    "$workspace/archive.tar.gz" "$workspace/schema.sql" "$workspace/data.sql" "$workspace/manifest.txt" \
    "$workspace/managed-tables.txt" "$workspace/restore.sql" "$workspace/restore.log"
  rmdir "$workspace"
}
trap cleanup EXIT
printf '%s\n' "$SIMPLY_SSH_PRIVATE_KEY" > "$workspace/key"
printf '%s\n' "$SIMPLY_SSH_KNOWN_HOSTS" > "$workspace/known_hosts"
printf '%s' "$BACKUP_ENCRYPTION_PASSWORD" > "$workspace/passphrase"
unset SIMPLY_SSH_PRIVATE_KEY SIMPLY_SSH_KNOWN_HOSTS BACKUP_ENCRYPTION_PASSWORD
ssh_options=(-i "$workspace/key" -o "UserKnownHostsFile=$workspace/known_hosts" -o StrictHostKeyChecking=yes -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=20)
ssh "${ssh_options[@]}" "$SIMPLY_SSH_USER@ssh.simply.com" "cat /var/www/hovedetpaasommet.dk/private-backups/$BACKUP_FILENAME" > "$workspace/backup.gpg"
gpg --batch --yes --pinentry-mode loopback --passphrase-file "$workspace/passphrase" --output "$workspace/archive.tar.gz" --decrypt "$workspace/backup.gpg"
python3 - "$workspace" <<'PY'
import pathlib, shutil, sys, tarfile
root = pathlib.Path(sys.argv[1])
with tarfile.open(root / 'archive.tar.gz', 'r:gz') as archive:
    members = archive.getmembers()
    if len(members) != 4 or {m.name for m in members} != {'roles.sql','schema.sql','data.sql','manifest.txt'} or any(not m.isfile() for m in members):
        raise SystemExit('Unexpected archive contents')
    for name in ('schema.sql', 'data.sql', 'manifest.txt'):
        with archive.extractfile(name) as source, (root / name).open('wb') as output:
            shutil.copyfileobj(source, output)
if 'Project: agbugdzobpkpgfischvi' not in (root / 'manifest.txt').read_text().splitlines():
    raise SystemExit('Unexpected source project')
PY
export PGPASSWORD="$SUPABASE_TEST_DB_PASSWORD"
unset SUPABASE_TEST_DB_PASSWORD
export PGHOST=aws-1-eu-west-1.pooler.supabase.com PGPORT=5432 PGUSER="postgres.$target" PGDATABASE=postgres PGSSLMODE=require PGCONNECT_TIMEOUT=20
client=(psql -X --set ON_ERROR_STOP=1)
"${client[@]}" -At -c "select format('%I.%I',schemaname,tablename) from pg_tables where schemaname in ('auth','storage')" > "$workspace/managed-tables.txt"
node scripts/build-hosted-test-restore.mjs "$workspace" "$target" "$RESTORE_CONFIRMATION"
if ! "${client[@]}" --file=- < "$workspace/restore.sql" > "$workspace/restore.log" 2>&1; then
  # Only SQLSTATE, never COPY row details, tokens or user data in Actions logs.
  grep -Eo 'ERROR:  [0-9A-Z]{5}$' "$workspace/restore.log" | head -n 1 || true
  echo 'Hosted test restore failed; transactional changes are rolled back. SQL output is withheld to protect backup data.' >&2
  echo 'If connection failed during COMMIT, verify test database state before retrying.' >&2
  exit 1
fi
echo "PASS: $BACKUP_FILENAME schema and data restored and row counts verified in hovedet-test ($target)."
echo 'Customer migration has NOT been applied. No production DB connection was made.'
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '### Hosted test restore passed\n\nTarget: hovedet-test (`%s`)\n\nArchive: `%s`\n\nSchema and COPY row counts verified. Managed roles supplied by target. Customer migration not yet applied.\n' "$target" "$BACKUP_FILENAME" >> "$GITHUB_STEP_SUMMARY"
fi
