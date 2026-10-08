# Fresh Aiven MySQL database and Render backend

This setup uses your existing Aiven MySQL `defaultdb` as a fresh application database. It creates the project tables and an initial Super Admin, without importing local data. Aiven hosts MySQL; Render hosts Express. Web and mobile continue calling Express, never the MySQL hostname.

## 1. Configure Aiven locally

Wait for the Aiven service to show Running. In Overview > Connection information, copy the individual host, port, username and password. Download the project's CA certificate. Use the exact service DNS hostname and port; do not assume port 3306 or replace the hostname with an IP.

Stop the local backend while changing its database configuration. Keep a private backup of its existing settings if you want to return to local MySQL. Save the downloaded CA at `server/certs/aiven-ca.pem`; this folder is ignored by Git.

Replace only the DB settings in `server/.env`, preserving your existing JWT and other app configuration:

```dotenv
DB_HOST=<your Aiven MySQL hostname>
DB_PORT=<your Aiven MySQL port>
DB_USER=<your Aiven username, usually avnadmin>
DB_PASSWORD="<your Aiven password>"
DB_NAME=defaultdb
DB_POOL_SIZE=5
DB_SSL=true
DB_SSL_CA=C:/Work/Project-Management-System/server/certs/aiven-ca.pem
```

Do not paste credentials into chat or put them in frontend/mobile public environment variables. Aiven passwords containing `#` need quotes in a dotenv file. Render's individual environment value fields use the password itself, without these wrapping quotes.

The [connection template](../deployment/aiven.env.example) contains no real credentials. The backend verifies both the CA and server hostname. Refresh the CA when Aiven rotates it; do not disable certificate verification to suppress errors. Keep automated integration tests on a separate local test account rather than the deployed Aiven database.

## 2. Verify the connection and initialize the fresh database

Run from repository root:

```powershell
npm --prefix server run db:check
```

This performs read-only queries, works before tables exist and reports MySQL version/TLS status. Aiven must show `TLS: enabled`. It does not seed or migrate data and does not print credentials.

Once it succeeds, and after confirming defaultdb has no existing application data:

```powershell
npm run db:migrate
```

The runner applies all current schema, access, planning, notification and mobile push migrations to DB_NAME. It strips the old CREATE DATABASE/USE clauses. Do not manually replay the historical Stage 3/4 scripts. MySQL DDL commits implicitly; stop and inspect any migration failure before retrying against a populated database.

Temporarily set SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME and a strong SUPER_ADMIN_PASSWORD privately in server/.env, then run:

```powershell
npm --prefix server run bootstrap:admin
```

Remove the three bootstrap variables afterwards. Do not run the demo seed on this deployed application database. You can now start the local API and verify login using the Aiven database before deploying Express.

## 3. Create the Render Web Service

Push the prepared commits to GitHub. In Render choose New > Web Service, connect this repository and select main. Use the native Node runtime and these settings:

| Setting | Value |
| --- | --- |
| Root Directory | Leave empty (repository root) |
| Build Command | `npm ci && npm ci --omit=dev --prefix server` |
| Start Command | `npm --prefix server start` |
| Health Check Path | `/api/ready` |
| NODE_VERSION | `24` |

Keep the repository root available: Express imports `../shared` and migrations read `database/`. Render supplies PORT; the server already honors it and listens on external interfaces. Install only root/server dependencies for this API service.

In Environment, set the Aiven DB values again. Set DB_SSL=true and **DB_SSL_CA=/etc/secrets/aiven-ca.pem**. Under Secret Files, add filename `aiven-ca.pem` and paste the CA certificate's entire contents. The Windows path is only for local setup and cannot work on Render.

Also configure:

```dotenv
NODE_ENV=production
JWT_SECRET=<a strong random secret, at least 32 bytes>
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://<your actual deployed frontend hostname>
APP_TIMEZONE=Asia/Kolkata
REMINDER_CRON=0 8 * * *
SCHEDULER_ENABLED=true
PUSH_ENABLED=false
```

Preserve an existing strong JWT_SECRET if you want compatible tokens across local/cloud APIs. Otherwise generate one locally and enter it privately in Render. FRONTEND_URL must be an actual exact HTTPS origin with no trailing slash; the application rejects a wildcard. If your frontend is not deployed yet, complete its hosting and configure that URL before browser login testing. See server/.env.example for optional SMTP settings; leave SMTP_HOST empty until email is configured.

Keep PUSH_ENABLED=false until the Firebase/EAS setup in [MOBILE_PUSH.md](MOBILE_PUSH.md) is completed. Restrict Aiven network access to the backend's documented outbound addresses if you configure an allowlist. Use a small pool initially and check the service's connection limit. Prefer separate migration and restricted runtime users according to your Aiven service permissions.

Deploy, then open `https://<your-api>.onrender.com/api/health` and `/api/ready`. Both should return success. The root URL returns an API message, not the Vite website. Test login with the bootstrapped account. Migrations were run locally against Aiven already, so the start command does not need to seed or migrate on every launch.

## 4. Point web/mobile to the API

For the chosen Vercel frontend, follow [Vercel setup](VERCEL.md). Create it from the repository root, use its stable production domain for FRONTEND_URL, and set VITE_API_URL after the Render API URL is available.

Set these public variables to the Render **API** URL, including /api:

```dotenv
# Frontend hosting environment, before its Vite build
VITE_API_URL=https://<your-api>.onrender.com/api
# Mobile environment, then restart Metro or rebuild the distributed app
EXPO_PUBLIC_API_URL=https://<your-api>.onrender.com/api
```

Changing a bundle's API URL requires rebuilding it. The mobile app keeps its existing accounts, JWT login and RBAC. Its localhost/LAN networking issue is independent of Aiven; a working deployed HTTPS API eliminates the need for phone-to-PC API access.

## Scheduling and free-service limits

Render Free web services spin down after 15 minutes without incoming traffic. A sleeping service does not execute the in-process 08:00 reminder job; choose an always-running backend or a separately scheduled job for reliable due-tomorrow reminders. Cold starts can also exceed the mobile client's 15-second request timeout: verify/warm `/api/ready` before a demo, or use hosting that stays running. Do not treat successful push mocks as proof that a sleeping scheduler will deliver.

## Troubleshooting

- ENOTFOUND: verify the service DNS hostname and Running status.
- ETIMEDOUT: verify the exact Aiven port, network allowlist and outbound access.
- ER_ACCESS_DENIED_ERROR: check username/password privately and database permissions.
- ER_BAD_DB_ERROR: use the exact database name from Aiven (defaultdb for this setup).
- Certificate errors: check the current project CA, its path on the backend host and the service DNS hostname.
- Missing table/column on API startup: run the full migration against the intended DB_NAME.
- Render cannot find shared modules: leave Root Directory empty and install root dependencies.
- Browser CORS rejection: FRONTEND_URL must match the deployed frontend origin exactly.

Sources: [Aiven MySQL connection fields](https://aiven.io/docs/products/mysql/howto/connect-from-mysql-workbench), [Aiven TLS certificates](https://aiven.io/docs/platform/concepts/tls-ssl-certificates), [Render Express deployment](https://render.com/docs/deploy-node-express-app), [Render secret files](https://render.com/docs/configure-environment-variables), [Render Node version](https://render.com/docs/node-version), [Render free service limits](https://render.com/docs/free).

This guide and local connectivity tooling are prepared in the repository. Real Aiven connectivity, remote migrations and Render deployment require your privately configured service values; they are not claimed as completed until those checks run against your service.
