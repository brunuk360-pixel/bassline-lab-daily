# Unsigned — private database continuity runbook
Updated 28 November 2026. **Runbook only; no production backup has been taken.**

## Current constraints
- Free Render PostgreSQL database expires 27 December 2026 at 23:29 UTC. Do not rely on the grace period: expiry makes the free database inaccessible, and deletion follows the grace period.
- Render Free Postgres does not provide managed backups. Free web services cannot use dashboard shell or SSH. Only one free database can be active per workspace.
- Database external IP allowlist is empty by design. Keep it private. No public backup endpoint, live member data in GitHub/chat, logging database URLs, or indiscriminate public IP access.
- Official documentation: https://render.com/docs/free ; https://render.com/docs/postgresql-backups ; https://render.com/docs/ssh ; https://render.com/docs/postgresql-creating-connecting

## Decision before 13 December
Choose and approve one of:
1. Upgrade the existing database to an appropriate paid plan, check cost and managed recovery configuration, then create a private logical backup.
2. Migrate to an approved durable PostgreSQL provider. Review its pricing, region, retention, private networking, TLS, capacity and backup policy. A different free trial is not a durable storage guarantee.
3. If remaining a disposable beta, stop new submissions before expiry and notify members to download their own account data. This is NOT a full-service backup.

No automatic plan change is authorized. Existing member downloads are not database backups.

## Operator-only logical backup
Use a trusted local machine with PostgreSQL client tools matching or newer than the server's major version, plus a locally controlled encrypted volume. Access must be explicitly authorized. For a local connection, the operator must separately approve a narrowly scoped temporary external IP rule (only their fixed public IP /32) and remove it immediately after backup; never open access to the internet. Alternatively use an approved private-network client. If neither is possible, stop; do not circumvent the allowlist. Obtain the connection details privately from the Render dashboard. Never paste credentials into chat, source code, command history or a public issue. Use the libpq password prompt or a protected local credential file; require TLS with server certificate verification and trusted CA. Do not disable verification to fix a connection error.

On the trusted computer, outside any synced/shared repository, set an absolute output directory on the encrypted volume. Set PGHOST, PGPORT, PGDATABASE, PGUSER and PGSSLMODE=verify-full using the approved connection details (no password in the command line). Set PGSSLROOTCERT if needed. Execute the helper:
    python backup_operator.py backup /private/encrypted/unsigned-2026-12-13.dump
It creates a custom-format logical dump, validates its table-of-contents, writes a SHA-256 checksum and refuses to overwrite existing backup files. Restrict access to the encrypted directory, keep another encrypted copy in an approved location, and record only the backup date/checksum in the operational log. Do not upload the dump to GitHub. Credentials and backup contents are sensitive (including authentication hashes).

## Restore rehearsal
Before switching the service, create an isolated disposable **empty** PostgreSQL database with explicit approval; do not use the live database. With the destination connection settings, verify its identity and TLS, then run:
    python backup_operator.py verify /private/encrypted/unsigned-2026-12-13.dump
    pg_restore --exit-on-error --single-transaction --no-owner --no-privileges --dbname=destination_database /private/encrypted/unsigned-2026-12-13.dump
The destination_database must be a real new empty database, not the production database. Do not use --clean or --create against production. Compare aggregate row counts and sequences, check foreign keys and schema versions, verify a synthetic login/review/moderation workflow using a controlled isolated test account, and confirm private/withdrawn content remains private. Never send row contents to chat/logs. Use the existing integration_check.py on a staging database; its synthetic schema is rolled back. Verify backup readability and restoration before deleting or replacing anything.

## Cutover
Schedule a short write freeze and communicate downtime. Take a final verified backup after writes stop. Restore to the approved empty destination, verify row counts and integrity, then update only Unsigned's DATABASE_URL privately through Render (not GitHub) with the approved connection. Keep the original database and original URL until successful health and account checks, with a documented rollback plan. Do not change the main static site or its environment chunks. Session signing keys must remain private; consider invalidating old sessions at cutover. Remove any temporary IP rule and securely retire backups according to approved retention. Retain member privacy/deletion requirements when restoring older backups.

## Acceptance checklist
- [ ] Owner approves destination/plan and any necessary temporary narrowly scoped access.
- [ ] Encrypted backup created and checksum/TOC verified.
- [ ] Restore rehearsed in isolated empty database.
- [ ] Freeze and final backup taken.
- [ ] Health, session, moderation and data checks passed on destination.
- [ ] Temporary access removed and retention/rollback documented.

**Status:** only the runbook and local helper are prepared. No production export, database migration, network change, or paid plan change has occurred.
