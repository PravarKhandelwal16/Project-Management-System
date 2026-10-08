# Deployment guide

The repository prepares deployment; it does not provision a domain, infrastructure, TLS certificate or mail account. Docker is not installed in the development environment used for this stage, so container startup must be verified in staging. Backend tests use real local MySQL; browser tests use API fixtures.

## Release prerequisites

Use Node 24 and MySQL 8.0+ (the container/CI target is MySQL 8.4). Complete README setup and testing first. Keep lockfiles and deploy a selected revision. Back up an existing database and rehearse migrations on a restored staging copy before release.

Required production settings: NODE_ENV=production, PORT, DB_HOST/PORT/USER/PASSWORD/NAME, JWT_SECRET, JWT_EXPIRES_IN and FRONTEND_URL. Startup requires a dedicated non-root DB user, nonempty password, a random secret of at least 32 bytes and exact HTTPS origin. APP_TIMEZONE and REMINDER_CRON control reminders. SMTP_HOST empty disables mail; configured SMTP requires SMTP_FROM and verified TLS.

Do not put secrets in VITE_* variables. VITE_API_URL=/api is the default for the same-origin proxy. It is replaced during build, so changing it requires rebuilding the frontend.

## MySQL accounts and migrations

Create an utf8mb4 database and separate credentials for migrations/runtime, constrained to the application host. For example, with your DBA replacing the password/host placeholders:

```sql
CREATE DATABASE project_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pms_app'@'<app-host>' IDENTIFIED BY '<random-runtime-password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON project_management.* TO 'pms_app'@'<app-host>';
```

A temporary migration identity needs schema privileges (CREATE, ALTER, INDEX, REFERENCES plus data read/write) on this database. Use it for npm --prefix server run db:migrate, then restore runtime credentials and revoke/remove migration access. The supplied Compose MySQL image creates an account with schema-wide privileges for first setup; reduce those grants after migration and use a DBA migration identity for later releases.

The command requires explicit DB_NAME, preserves records and applies the documented migration sequence. DDL is not transactionally rolled back in MySQL; stop on any error, investigate and restore/rehearse rather than blindly retrying an incompatible historical schema. See [migration ordering](../database/README.md) and [schema/ER diagram](../DATABASE.md).

For a managed remote database, set DB_SSL=true and, where needed, DB_SSL_CA to the mounted CA file path. Certificates are verified. Never publish port 3306 to the internet.

## Manual deployment

1. Install root/server dependencies with npm ci and npm ci --omit=dev --prefix server.
2. Supply server/.env or process environment through your host's secret configuration.
3. Migrate with migration credentials; bootstrap the first Super Admin once with SUPER_ADMIN_EMAIL/NAME/PASSWORD and npm --prefix server run bootstrap:admin. Remove those credentials afterwards.
4. Start npm --prefix server start under your process/service manager. Send SIGTERM for rolling stops; the server drains requests, stops jobs and closes its pool.
5. Install client dependencies and run npm --prefix client run build with VITE_API_URL configured before build.
6. Serve client/dist with an HTTPS reverse proxy. Preserve SPA fallback for /projects/:id etc.; route /api/* to Express without stripping /api. Do not use vite preview as the production host.
7. Verify /api/health and /api/ready, then the smoke checks below.

Use private/local binding for Express behind your proxy. On a single-host Nginx deployment, set TRUST_PROXY=loopback only if connections actually arrive over loopback. The edge must overwrite X-Forwarded-For with the real remote client, never forward arbitrary client-supplied chains. Keep the database private.

## Docker Compose preparation

From the repository root, copy deployment/deployment.env.example to deployment/deployment.env. Fill independent DB_PASSWORD, MYSQL_ROOT_PASSWORD and JWT_SECRET, your exact FRONTEND_URL, timezone and optional SMTP settings. The configured env file is ignored by Git.

The default isolated bridge uses 172.29.0.0/24. Client Nginx has 172.29.0.10; Express trusts only that address. The host HTTPS proxy appears as gateway 172.29.0.1, which Nginx trusts for X-Real-IP. If the subnet conflicts, change PMS_SUBNET, PMS_CLIENT_IP, TRUST_PROXY and TRUSTED_EDGE_PROXY consistently. On Docker Desktop or a different network topology, inspect the actual trusted host/proxy address in staging and update TRUSTED_EDGE_PROXY. Do not use an arbitrary broad trust range.

```powershell
docker compose --env-file deployment/deployment.env -f deployment/compose.yml config --quiet
docker compose --env-file deployment/deployment.env -f deployment/compose.yml up -d db
docker compose --env-file deployment/deployment.env -f deployment/compose.yml run --rm --build migrate
```

Temporarily add strong SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME and SUPER_ADMIN_PASSWORD to deployment/deployment.env, then:

```powershell
docker compose --env-file deployment/deployment.env -f deployment/compose.yml run --rm migrate npm run bootstrap:admin
```

Remove those bootstrap values, reduce database runtime privileges, then:

```powershell
docker compose --env-file deployment/deployment.env -f deployment/compose.yml up -d --build server client
docker compose --env-file deployment/deployment.env -f deployment/compose.yml ps
docker compose --env-file deployment/deployment.env -f deployment/compose.yml logs --tail 100 server
```

MySQL persists in mysql_data. The frontend binds only 127.0.0.1:8080; Express/MySQL have no published ports. Never use down --volumes on an existing deployment. Database initialization variables only apply to a new volume: changing DB_PASSWORD in the env file does not rotate an existing MySQL account.

## Public HTTPS proxy

Put a managed load balancer or host Nginx in front of 127.0.0.1:8080. The example below is the HTTPS server section; install a valid certificate, configure an HTTP-to-HTTPS redirect, and use your real domain/certificate paths:

```nginx
server {
    listen 443 ssl;
    server_name pms.example.com;
    ssl_certificate /etc/letsencrypt/live/pms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pms.example.com/privkey.pem;
    add_header Strict-Transport-Security "max-age=31536000" always;
    client_max_body_size 64k;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Do not expose the inner proxy publicly while trusting gateway headers. The inner Nginx resolves X-Real-IP only from the configured edge, then overwrites X-Forwarded-For for Express with that resolved address. Confirm two distinct real client IPs receive separate auth rate-limit buckets in staging. This is required before accepting production traffic.

## Health, scheduling and operations

/api/health reports process liveness; /api/ready returns 200 only when a database query succeeds, otherwise safe 503. Startup also checks required migration tables/columns. Compose waits for database/API health.

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

Keep the previous backend release and frontend dist/image. Deploy additive migrations before application rollout. If application checks fail, stop traffic and restore the previous application revision only when compatible with the migrated schema. There is no automatic down migration; a destructive/incompatible schema rollback requires the verified backup and maintenance downtime. Record/replay or reconcile writes made after the backup before reopening traffic.

## Staging smoke checks

- HTTPS, frontend direct links and /api health/readiness work; no public database/API container ports.
- Login/me/logout work; missing/expired token is 401; unrelated work and non-admin admin calls are 403.
- Exercise project/task creation, membership, assignment, completion and deletion confirmation with staging-only data.
- Role changes/deactivation take effect immediately; member status updates stay within own assignments.
- Dashboard/analytics totals are scoped, mobile menu/tables/calendar remain usable.
- Own notifications/read-all/preferences work. With a sandbox mail account, verify recipient/TLS and assignment/due/overdue behavior; disabled preferences prevent sending.
- Audit entries exist without passwords/hashes/JWTs; jobs have one scheduler and no duplicate daily delivery.
- Proxy headers cannot spoof client identity; auth limits apply per real client.
- Backup/restore and rollback are rehearsed before release.

These deployment checks remain operator actions until performed on the actual hosting target.
