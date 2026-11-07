#!/usr/bin/env bash
set -euo pipefail
umask 077

for variable in SUPABASE_DB_PASSWORD BACKUP_ENCRYPTION_PASSWORD SIMPLY_SSH_USER SIMPLY_SSH_PRIVATE_KEY SIMPLY_SSH_KNOWN_HOSTS; do
  [[ -n "${!variable:-}" ]] || { echo "Missing secret: $variable" >&2; exit 1; }
done
[[ "$SIMPLY_SSH_USER" =~ ^[a-zA-Z0-9._-]+$ ]] || exit 1
[[ ${#BACKUP_ENCRYPTION_PASSWORD} -ge 24 ]] || { echo 'Use an encryption password of at least 24 characters.' >&2; exit 1; }

workspace=$(mktemp -d)
cleanup() {
  # Only these explicitly named files in our fresh temporary directory are removed.
  rm -f "$workspace/roles.sql" "$workspace/schema.sql" "$workspace/data.sql" \
    "$workspace/manifest.txt" "$workspace/archive.tar.gz" "$workspace/check.tar.gz" \
    "$workspace/backup.gpg" "$workspace/passphrase" "$workspace/key" "$workspace/known_hosts"
  rmdir "$workspace"
}
trap cleanup EXIT
printf '%s\n' "$SIMPLY_SSH_PRIVATE_KEY" > "$workspace/key"
printf '%s\n' "$SIMPLY_SSH_KNOWN_HOSTS" > "$workspace/known_hosts"
printf '%s' "$BACKUP_ENCRYPTION_PASSWORD" > "$workspace/passphrase"
unset SIMPLY_SSH_PRIVATE_KEY SIMPLY_SSH_KNOWN_HOSTS BACKUP_ENCRYPTION_PASSWORD

ssh_options=(-i "$workspace/key" -o "UserKnownHostsFile=$workspace/known_hosts"
  -o StrictHostKeyChecking=yes -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=20)
remote="$SIMPLY_SSH_USER@ssh.simply.com"

# Fail before dumping if the account does not match the already deployed site.
ssh "${ssh_options[@]}" "$remote" 'test "$(pwd -P)" = /var/www/hovedetpaasommet.dk && test -d public_html && command -v sha256sum >/dev/null'

# Keep credentials out of the URL/command line; CLI reads SUPABASE_DB_PASSWORD.
database_url='postgresql://postgres.agbugdzobpkpgfischvi@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require'
supabase db dump --db-url "$database_url" --role-only --file "$workspace/roles.sql"
supabase db dump --db-url "$database_url" --file "$workspace/schema.sql"
supabase db dump --db-url "$database_url" --data-only --use-copy \
  -x storage.buckets_vectors -x storage.vector_indexes --file "$workspace/data.sql"
unset SUPABASE_DB_PASSWORD
for name in roles schema data; do
  [[ -s "$workspace/$name.sql" ]] || { echo "Empty $name dump" >&2; exit 1; }
done

printf 'Project: agbugdzobpkpgfischvi\nUTC: %s\nCLI: 2.118.0\nStorage object files: not included\n' "$(date -u +%FT%TZ)" > "$workspace/manifest.txt"
tar -czf "$workspace/archive.tar.gz" -C "$workspace" roles.sql schema.sql data.sql manifest.txt
gpg --batch --yes --pinentry-mode loopback --passphrase-file "$workspace/passphrase" \
  --symmetric --cipher-algo AES256 --output "$workspace/backup.gpg" "$workspace/archive.tar.gz"
# Verify encryption round trip before publishing; this is not a database restore test.
gpg --batch --yes --pinentry-mode loopback --passphrase-file "$workspace/passphrase" \
  --output "$workspace/check.tar.gz" --decrypt "$workspace/backup.gpg"
cmp "$workspace/archive.tar.gz" "$workspace/check.tar.gz"
filename="supabase-$(date -u +%Y%m%dT%H%M%SZ)-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}.tar.gz.gpg"
checksum=$(sha256sum "$workspace/backup.gpg" | cut -d ' ' -f 1)

# Fixed sibling of public_html; refuse symlinks so data cannot land on the website.
ssh "${ssh_options[@]}" "$remote" 'set -eu; test ! -L private-backups; mkdir -p private-backups; chmod 700 private-backups; test "$(cd private-backups && pwd -P)" = /var/www/hovedetpaasommet.dk/private-backups'
ssh "${ssh_options[@]}" "$remote" "set -eu; umask 077; cat > private-backups/$filename.part; printf '%s  %s\n' '$checksum' 'private-backups/$filename.part' | sha256sum -c -; mv private-backups/$filename.part private-backups/$filename" < "$workspace/backup.gpg"
echo "Verified encrypted backup uploaded: $filename"
# No deletion of previous backups. Monitor the hosting quota before adding retention.
ssh "${ssh_options[@]}" "$remote" 'du -sh private-backups'
