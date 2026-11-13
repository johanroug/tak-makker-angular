# Database backup to Simply

## Manual production data restore

Workflow: **Restore Supabase data from Simply**, manual only, on `main`.
This restores the table data (including Auth) into the existing project's
current schema. It does NOT restore roles, functions, policies, schema definitions,
Storage files or external settings. For an older incompatible schema or a lost
project, use a separate hosted-project disaster recovery procedure instead.

1. Copy the exact completed archive filename from Simply, e.g.
   `supabase-20261113T094328Z-43403543491-1.tar.gz.gpg`.
2. Run the workflow with that filename, confirmation
   `RESTORE agbugdzobpkpgfischvi`, and **dry_run checked** (the default).
   It temporarily locks affected production tables, loads and counts the rows,
   then rolls back. Sequence updates are omitted in trials because PostgreSQL
   sequence changes cannot be rolled back. A trial can interrupt requests while
   locks are held; schedule it appropriately.
3. Before a live run, stop all application, Auth, scheduled and external writers.
   The workflow does not automatically put the site or Supabase into maintenance.
   Changes since the chosen archive will be replaced.
4. Run again with the SAME filename, dry_run unchecked, and
   maintenance_confirmed checked. A fresh encrypted backup is uploaded and
   checksum-verified before restoring. This emergency snapshot skips activity
   pruning and backup retention cleanup. Find its exact filename in the log.
5. Check the workflow result and verify login, companies, projects and offers
   before re-enabling writers. Existing sessions and external billing state may
   no longer correspond to the restored database.

The action uses the existing five backup secrets in `simply-production`.
It serializes with the daily backup and refuses other project confirmations,
branch names and archive filename patterns. TRUNCATE has no CASCADE: references
from additional tables cause failure rather than deleting data outside the dump.
The transaction uses ON_ERROR_STOP and checks every COPY table's row count before
commit. Compatibility or privilege failures abort table changes; sequence values
in a live restore are not transactional and can change even if a later statement
fails. A lost connection during COMMIT requires checking database state before
retrying. SQL logs are deliberately not published because errors may contain
personal data. No plaintext dumps or artifacts are uploaded.

The hosted restore workflow must be trialed against the actual hosted project;
the disposable-container test alone does not verify hosted permissions. Row counts
do not prove application behavior or validate every relationship and external
integration. Configure required environment reviewers in GitHub separately if an
additional approval gate is desired.

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
After a verified new upload, completed archives older than 30 days are deleted
automatically using their UTC filenames. Directory and symlink checks prevent
deletion outside the fixed private backup folder; the latest verified archive is
always preserved. Watch the 10 GB hosting quota; the job prints directory size.
A failed run before upload/verification leaves existing backups
untouched; a failed transfer may leave a `.part` file that is not a valid backup.

The same daily job deletes only `public.activity_events` rows at least 30 days
old **before** creating a new snapshot. AI usage, invoices, messages and projects
are not included in this cleanup. The job must be merged to main and run
successfully before these automatic policies are active. Monitor failures; if
backups fail, old archives are deliberately preserved until manual follow-up.
Simply's separate webhosting backups may retain removed archives for roughly
another 30 days. Our archive expiry is not immediate erasure of those copies.

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
Simply). The disposable-database restore test passed on 7 November 2026, as
confirmed by Johan's successful GitHub Actions run. Its scope and Storage
compatibility exceptions are described below.
GitHub schedules may be delayed; monitor Actions failures and last successful
backup date. Enable GitHub Actions failure notifications for the account.

## Manual restore test in GitHub Actions

After merging to main, run **Test Supabase backup restore** with Run workflow.
It needs only the existing encryption and SSH secrets, not the production
database password. It downloads the newest completed archive from Simply,
decrypts it, starts an isolated local Supabase stack (including Storage so its
managed table migrations run) on the hosted runner,
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

Storage schema compatibility: before restoring, the test checks the local managed
Auth/Storage tables against COPY entries in the original archive. A missing
Storage table may be omitted from the **temporary restore input only** if the
archive contains exactly zero rows for it; each omission is logged explicitly.
Missing Auth tables, application tables, or nonempty Storage tables are never
silently skipped. The encrypted original archive is not changed. Row counts are
compared for all COPY tables in the prepared restore input. This checks all
archived rows, but not the schema of newer empty managed Storage tables.
