#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ "${GITHUB_ACTIONS:-}" == true ]] || { echo 'GitHub Actions only.' >&2; exit 1; }
[[ "${RESTORE_CONFIRMATION:-}" == 'RESTORE agbugdzobpkpgfischvi' ]] || { echo 'Target confirmation does not match.' >&2; exit 1; }
[[ "${DRY_RUN:-}" == true || "${DRY_RUN:-}" == false ]] || exit 1
[[ "$DRY_RUN" == true || "${MAINTENANCE_CONFIRMED:-}" == true ]] || { echo 'Stop all writers before a live restore.' >&2; exit 1; }
[[ "${BACKUP_FILENAME:-}" =~ ^supabase-[0-9]{8}T[0-9]{6}Z-[0-9]+-[0-9]+\.tar\.gz\.gpg$ ]] || { echo 'Specify an exact completed archive filename.' >&2; exit 1; }
for variable in SUPABASE_DB_PASSWORD BACKUP_ENCRYPTION_PASSWORD SIMPLY_SSH_USER SIMPLY_SSH_PRIVATE_KEY SIMPLY_SSH_KNOWN_HOSTS; do
  [[ -n "${!variable:-}" ]] || { echo "Missing secret: $variable" >&2; exit 1; }
done
[[ "$SIMPLY_SSH_USER" =~ ^[a-zA-Z0-9._-]+$ ]] || exit 1
workspace=$(mktemp -d)
cleanup() { rm -f "$workspace/key" "$workspace/known_hosts" "$workspace/passphrase" "$workspace/backup.gpg" "$workspace/archive.tar.gz" "$workspace/data.sql" "$workspace/manifest.txt" "$workspace/restore.sql" "$workspace/restore.log"; rmdir "$workspace"; }
trap cleanup EXIT
printf '%s\n' "$SIMPLY_SSH_PRIVATE_KEY" > "$workspace/key"
printf '%s\n' "$SIMPLY_SSH_KNOWN_HOSTS" > "$workspace/known_hosts"
printf '%s' "$BACKUP_ENCRYPTION_PASSWORD" > "$workspace/passphrase"
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
    for name in ('data.sql', 'manifest.txt'):
        with archive.extractfile(name) as source, (root / name).open('wb') as target:
            shutil.copyfileobj(source, target)
if 'Project: agbugdzobpkpgfischvi' not in (root / 'manifest.txt').read_text().splitlines():
    raise SystemExit('Archive belongs to another project')
PY
node scripts/build-data-restore.mjs "$workspace/data.sql" "$workspace/restore.sql" "$DRY_RUN"
# A verified, encrypted emergency snapshot is required before any live changes.
# Unlike the daily backup this must not prune activity or old backup archives.
if [[ "$DRY_RUN" == false ]]; then
  PRE_RESTORE_BACKUP=true bash scripts/backup-supabase.sh
fi
export PGPASSWORD="$SUPABASE_DB_PASSWORD"
export PGHOST=aws-1-eu-west-1.pooler.supabase.com PGPORT=5432 PGUSER=postgres.agbugdzobpkpgfischvi PGDATABASE=postgres PGSSLMODE=require
if ! docker run --rm -i --env PGPASSWORD --env PGHOST --env PGPORT --env PGUSER --env PGDATABASE --env PGSSLMODE \
  public.ecr.aws/supabase/postgres:17.6.1.171 psql -X --set ON_ERROR_STOP=1 --file=- \
  < "$workspace/restore.sql" > "$workspace/restore.log" 2>&1; then
  echo 'Restore failed. Transactional table changes are rolled back. Inspect compatibility and connection status before retrying. SQL output withheld to protect personal data.' >&2
  exit 1
fi
if [[ "$DRY_RUN" == true ]]; then
  echo "PASS: $BACKUP_FILENAME restored and row counts verified; transaction rolled back."
else
  echo "PASS: $BACKUP_FILENAME restored and row counts verified; transaction committed."
fi
