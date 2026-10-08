# Deployment guide

The repository prepares deployment; it does not provision a domain, infrastructure, TLS certificate or mail account. Backend tests use real local MySQL; browser tests use API fixtures.

## Release prerequisites

Use Node 24 and MySQL 8.0+ (CI uses the native MySQL service on Ubuntu 24.04). Complete README setup and testing first. Keep lockfiles and deploy a selected revision. Back up an existing database and rehearse migrations on a restored staging copy before release.

Required production settings: NODE_ENV=production, PORT, DB_HOST/PORT/USER/PASSWORD/NAME, JWT_SECRET, JWT_EXPIRES_IN and FRONTEND_URL. Startup requires a dedicated non-root DB user, nonempty password, a random secret of at least 32 bytes and exact HTTPS origin. APP_TIMEZONE and REMINDER_CRON control reminders. SMTP_HOST empty disables mail; configured SMTP requires SMTP_FROM and verified TLS.

Do not put secrets in VITE_* variables. VITE_API_URL=/api is the default for the same-origin proxy. It is replaced during build, so changing it requires rebuilding the frontend.

## MySQL accounts and migrations

Create an utf8mb4 database and separate credentials for migrations/runtime, constrained to the application host. For example, with your DBA replacing the password/host placeholders:

```sql
CREATE DATABASE project_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pms_app'@'<app-host>' IDENTIFIED BY '<random-runtime-password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON project_management.* TO 'pms_app'@'<app-host>';
```

A temporary migration identity needs schema privileges (CREATE, ALTER, INDEX, REFERENCES plus data read/write) on this database. Use it for npm --prefix server run db:migrate, then restore runtime credentials and revoke/remove migration access.

The command requires explicit DB_NAME, preserves records and applies the documented migration sequence. DDL is not transactionally rolled back in MySQL; stop on any error, investigate and restore/rehearse rather than blindly retrying an incompatible historical schema. See [migration ordering](../database/README.md) and [schema/ER diagram](../DATABASE.md).

For a managed remote database, set DB_SSL=true and, where needed, DB_SSL_CA to the mounted CA file path. Certificates are verified. Never publish port 3306 to the internet.

## Manual deployment

For a fresh Aiven MySQL database and Render backend, follow [Aiven/Render setup](AIVEN_RENDER.md) and [the database settings template](../deployment/aiven.env.example). `npm --prefix server run db:check` verifies connectivity/TLS before schema creation.

1. Install root/server dependencies with npm ci and npm ci --omit=dev --prefix server.
2. Supply server/.env or process environment through your host's secret configuration.
3. Migrate with migration credentials; bootstrap the first Super Admin once with SUPER_ADMIN_EMAIL/NAME/PASSWORD and npm --prefix server run bootstrap:admin. Remove those credentials afterwards.
4. Start npm --prefix server start under your process/service manager. Send SIGTERM for rolling stops; the server drains requests, stops jobs and closes its pool.
5. Install client dependencies and run npm --prefix client run build with VITE_API_URL configured before build.
6. Serve client/dist with an HTTPS reverse proxy. Preserve SPA fallback for /projects/:id etc.; route /api/* to Express without stripping /api. Do not use vite preview as the production host.
7. Verify /api/health and /api/ready, then the smoke checks below.

Use private/local binding for Express behind your proxy. On a single-host Nginx deployment, set TRUST_PROXY=loopback only if connections actually arrive over loopback. The edge must overwrite X-Forwarded-For with the real remote client, never forward arbitrary client-supplied chains. Keep the database private.

## Host environment and HTTPS proxy

Use deployment/deployment.env.example as a production settings template for server/.env or your process manager. Set independent database/JWT secrets, your exact HTTPS frontend origin and optional SMTP settings. The example assumes MySQL and the API run on the same host; adjust DB_HOST for a managed database.

The [Nginx example](../deployment/nginx.conf) serves client/dist directly, redirects HTTP to HTTPS, sets security headers/CSP and proxies /api to 127.0.0.1:5000. Edit the domain, certificate/key paths, frontend root and API port before installing it in your host's Nginx configuration. Obtain a valid TLS certificate first, check with nginx -t, then reload the service.

Set TRUST_PROXY=loopback only when Nginx connects to Express over loopback. The example overwrites X-Forwarded-For with the actual remote client address. For a managed proxy on another host, configure only its known IP/subnet and have the edge overwrite forwarding headers. Restrict direct access to Express using your host firewall; MySQL must stay private. Confirm distinct real client IPs receive separate auth rate-limit buckets in staging.

CSP assumes the API uses /api on the frontend origin. External API hosting requires updating connect-src and FRONTEND_URL/CORS accordingly. Configure a process manager/service for the API and keep the previous release for rollback.

## Health, scheduling and operations

/api/health reports process liveness; /api/ready returns 200 only when a database query succeeds, otherwise safe 503. Startup also checks required migration tables/columns. Configure your service monitoring to check readiness before routing traffic.

Use a single scheduler-enabled API instance. If another instance is required, set SCHEDULER_ENABLED=false there; distributed rate limiting needs a shared store before horizontal scaling. Monitor startup_failed, request_failed, scheduled job failures and FAILED/PROCESSING notification_logs. SMTP failures are safe for user requests but require operational attention.

Choose audit/notification retention according to your deployment needs. Restrict log and backup access because audit records include account names/emails/business metadata. Do not export raw database credentials with support logs.

## Backups and restore

Use a separate restricted backup identity and protected option file (not a password on the command line). For the current InnoDB schema:

```powershell
mysqldump --defaults-extra-file=/secure/backup.cnf --single-transaction --no-tablespaces --set-gtid-purged=OFF --result-file=/secure/pms-backup.sql project_management
```

Use paths appropriate to the host. Check the exit code, nonempty dump, encrypt/restrict backup storage, keep off-host copies and test a restore into a separate staging database. Do not run schema changes while the dump is active. Privileges vary with views/triggers/GTID configuration; see the [MySQL 8.4 mysqldump reference](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html).

Restore through your database tool into a deliberately selected empty staging database. Never restore over production while the application is serving writes. Record backup time, revision and migration status.

## Rollback

Keep the previous backend release and frontend dist. Deploy additive migrations before application rollout. If application checks fail, stop traffic and restore the previous application revision only when compatible with the migrated schema. There is no automatic down migration; a destructive/incompatible schema rollback requires the verified backup and maintenance downtime. Record/replay or reconcile writes made after the backup before reopening traffic.

## Staging smoke checks

- HTTPS, frontend direct links and /api health/readiness work; database access is private and direct API access is restricted.
- Login/me/logout work; missing/expired token is 401; unrelated work and non-admin admin calls are 403.
- Exercise project/task creation, membership, assignment, completion and deletion confirmation with staging-only data.
- Role changes/deactivation take effect immediately; member status updates stay within own assignments.
- Dashboard/analytics totals are scoped, mobile menu/tables/calendar remain usable.
- Own notifications/read-all/preferences work. With a sandbox mail account, verify recipient/TLS and assignment/due/overdue behavior; disabled preferences prevent sending.
- Audit entries exist without passwords/hashes/JWTs; jobs have one scheduler and no duplicate daily delivery.
- Proxy headers cannot spoof client identity; auth limits apply per real client.
- Backup/restore and rollback are rehearsed before release.

These deployment checks remain operator actions until performed on the actual hosting target.
