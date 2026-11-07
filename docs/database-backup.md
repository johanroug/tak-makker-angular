# Database backup to Simply

Workflow: `.github/workflows/backup-supabase.yml`. Runs from `main` daily at
02:23 UTC and manually through Actions. Requires the existing SSH secrets in
`simply-production`, plus `SUPABASE_DB_PASSWORD` and
`BACKUP_ENCRYPTION_PASSWORD` (at least 24 characters). Save the encryption
password in a password manager independently of GitHub. Losing it means the
backups cannot be decrypted. Keep earlier passwords if rotating the secret.

Database: `agbugdzobpkpgfischvi`, EU West 1 session pooler on port 5432.
Uses the pinned Supabase CLI 2.118.0, following the official three-dump method:
https://supabase.com/docs/guides/deployment/ci/backups

Contains roles, schema and table data including Auth users. Supabase-managed
schema definitions are excluded by the CLI. Restore into a compatible Supabase
project, not an empty vanilla PostgreSQL server. Storage object files, hosted
secrets, dashboard settings and deployed Edge Functions are not in this archive.
The repository contains function code and migrations separately. Company logos
currently live in database columns and are included in the data dump.

The runner creates temporary plaintext dumps, compresses and encrypts with GPG
AES-256, verifies a decryption round trip, then uploads only encrypted bytes over
SSH. Remote SHA-256 must match before the `.part` file becomes a finished backup.
No backup is committed or uploaded as a GitHub artifact. Files are stored under
`/var/www/hovedetpaasommet.dk/private-backups`, outside `public_html`, mode 700.
Existing backups are not deleted automatically. Watch the 10 GB hosting quota;
the job prints total backup directory size. A failed run leaves existing backups
untouched; a failed transfer may leave a `.part` file that is not a valid backup.

## Activation and verification

1. Add both secrets, merge the workflow to main and run it manually in Actions.
2. Check that the job ends with a verified upload and a directory size.
3. Download one encrypted archive over SSH/SFTP to a protected local folder.
4. Decrypt interactively: `gpg --output backup.tar.gz --decrypt BACKUP.tar.gz.gpg`.
5. Extract into a private temporary directory, then test a restore into a
   **separate disposable Supabase project** with compatible extensions. Follow
   https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
   using roles.sql, schema.sql and data.sql. Never restore over production to test.
6. Verify Auth users, company records, offers, functions and policies. Remove
   temporary plaintext files securely when finished.

An encryption/checksum check does not prove the database can be restored. The
first live backup completed on 7 November 2026 (581 KB encrypted, verified on
Simply). The disposable-database restore test is still pending.
GitHub schedules may be delayed; monitor Actions failures and last successful
backup date. Enable GitHub Actions failure notifications for the account.

## Manual restore test in GitHub Actions

After merging to main, run **Test Supabase backup restore** with Run workflow.
It needs only the existing encryption and SSH secrets, not the production
database password. It downloads the newest completed archive from Simply,
decrypts it, starts an isolated local Supabase database on the hosted runner,
restores roles/schema/data in one transaction as the disposable container's
`supabase_admin` bootstrap administrator (needed for backed-up role settings),
and compares every COPY table's
row count with the archive. The temporary database is stopped after the test;
the runner and plaintext files are discarded. Nothing is uploaded as an artifact.
It does not test live login, Storage objects, external services or a full disaster
recovery onto a newly hosted project. No writes are made to the production site
or database.
Hosted projects do not expose this superuser. A hosted disaster recovery may
require adapting privileged role settings separately; the container test does
not prove that an unchanged dump can be restored as hosted `postgres`.
