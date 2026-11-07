#!/usr/bin/env bash
set -euo pipefail
umask 077
# No production database credentials: restore only in a disposable runner container.
for variable in BACKUP_ENCRYPTION_PASSWORD SIMPLY_SSH_USER SIMPLY_SSH_PRIVATE_KEY SIMPLY_SSH_KNOWN_HOSTS; do
  [[ -n "${!variable:-}" ]] || { echo "Missing secret: $variable" >&2; exit 1; }
done
[[ "$SIMPLY_SSH_USER" =~ ^[a-zA-Z0-9._-]+$ ]] || exit 1
[[ "${GITHUB_ACTIONS:-}" == true ]] || { echo 'Run on a disposable GitHub runner.' >&2; exit 1; }
workspace=$(mktemp -d)
container='supabase_db_backup-restore-check'
started=false
cleanup() {
  if [[ "$started" == true ]]; then
    supabase stop --workdir "$workspace" --no-backup >/dev/null 2>&1 || true
  fi
  rm -f "$workspace/key" "$workspace/known_hosts" "$workspace/passphrase" \
    "$workspace/roles.sql" "$workspace/schema.sql" "$workspace/data.sql" \
    "$workspace/archive.tar.gz" "$workspace/backup.gpg" "$workspace/manifest.txt" "$workspace/restore.log"
}
trap cleanup EXIT
printf '%s\n' "$SIMPLY_SSH_PRIVATE_KEY" > "$workspace/key"
printf '%s\n' "$SIMPLY_SSH_KNOWN_HOSTS" > "$workspace/known_hosts"
printf '%s' "$BACKUP_ENCRYPTION_PASSWORD" > "$workspace/passphrase"
unset SIMPLY_SSH_PRIVATE_KEY SIMPLY_SSH_KNOWN_HOSTS BACKUP_ENCRYPTION_PASSWORD
ssh_options=(-i "$workspace/key" -o "UserKnownHostsFile=$workspace/known_hosts"
  -o StrictHostKeyChecking=yes -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=20)
remote="$SIMPLY_SSH_USER@ssh.simply.com"
filename=$(ssh "${ssh_options[@]}" "$remote" 'cd /var/www/hovedetpaasommet.dk/private-backups && ls -1 supabase-*.tar.gz.gpg | LC_ALL=C sort | tail -n 1')
[[ "$filename" =~ ^supabase-[0-9]{8}T[0-9]{6}Z-[0-9]+-[0-9]+\.tar\.gz\.gpg$ ]] || { echo 'No completed backup found.' >&2; exit 1; }
ssh "${ssh_options[@]}" "$remote" "cat /var/www/hovedetpaasommet.dk/private-backups/$filename" > "$workspace/backup.gpg"
gpg --batch --yes --pinentry-mode loopback --passphrase-file "$workspace/passphrase" \
  --output "$workspace/archive.tar.gz" --decrypt "$workspace/backup.gpg"
# Only extract the four expected regular files, never paths or symlinks.
python3 - "$workspace" <<'PY'
import pathlib, shutil, sys, tarfile
root = pathlib.Path(sys.argv[1])
with tarfile.open(root / 'archive.tar.gz', 'r:gz') as archive:
    members = archive.getmembers()
    if len(members) != 4 or {m.name for m in members} != {'roles.sql','schema.sql','data.sql','manifest.txt'} or any(not m.isfile() for m in members):
        raise SystemExit('Unexpected archive contents')
    for member in members:
        with archive.extractfile(member) as source, (root / member.name).open('wb') as target:
            shutil.copyfileobj(source, target)
PY
supabase init --workdir "$workspace" --yes
sed -i 's/^project_id = .*/project_id = "backup-restore-check"/' "$workspace/supabase/config.toml"
started=true
supabase db start --workdir "$workspace"
[[ "$(docker inspect --format '{{.Name}}' "$container")" == "/$container" ]] || exit 1
# Use the local container's bootstrap administrator for role settings such as
# log_min_messages. The hosted postgres role is intentionally not a superuser.
# This account is only used inside the disposable container, never remotely.
# One transaction and ON_ERROR_STOP: a failed statement fails the test.
if ! {
  printf 'BEGIN;\n'
  cat "$workspace/roles.sql" "$workspace/schema.sql"
  printf '\nSET session_replication_role = replica;\n'
  cat "$workspace/data.sql"
  printf '\nSET session_replication_role = origin;\nCOMMIT;\n'
} | docker exec -i "$container" psql -X -U supabase_admin -d postgres \
    --set ON_ERROR_STOP=1 > "$workspace/restore.log" 2>&1; then
  grep -m 1 'ERROR:' "$workspace/restore.log" || true
  echo 'Restore failed in disposable database; production was not contacted.' >&2
  exit 1
fi
node scripts/check-restored-row-counts.mjs "$workspace/data.sql" "$container"
echo "PASS: downloaded, decrypted and restored $filename in disposable Supabase."
