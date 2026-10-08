# Project Management System

## Overview

A React/Vite, Express and MySQL workspace for projects, assigned tasks, team management, reporting and personal planning. Stage 7 adds automated testing, security hardening and reproducible release preparation without changing the product scope.

## Features

- JWT authentication, bcrypt password hashing and eight roles with editable policies/individual permissions.
- Project/task CRUD, membership, eligible assignment, status/priority changes, search/filter/sort.
- Scoped dashboard and analytics, account administration and searchable audit history.
- In-app/email notifications, preferences, daily reminders and personal reminders/events.
- Responsive pages, skeleton loaders, keyboard-accessible confirmations and Gmail compose links.

## Tech Stack

React 19, Vite 8, Recharts, Express 5, Node.js 24, MySQL 8.0+, mysql2, bcrypt, JWT, Zod, Helmet. Tests use the existing **Node test runner** with native HTTP requests and c8 coverage; browser checks use Playwright Chromium.

## Roles

| Key | Responsibility |
| --- | --- |
| super_admin | Platform owner; protected permissions and administrator policy control |
| admin | Workspace administration within protected account boundaries |
| portfolio_manager | Cross-project oversight and reporting |
| project_manager | Project delivery and staffing |
| project_coordinator | Project/task coordination |
| team_lead | Team task delivery |
| member | Contributor; status updates for own assignments |
| viewer | Read-only observer |

Permissions can change; role names alone do not determine authorization. See the [security and authorization matrix](docs/SECURITY.md).

## Project Structure

```text
client/                    React UI, Playwright tests and production build
server/
  controllers/ services/   API and domain logic
  middleware/ config/      Auth, RBAC, validation and environment/security setup
  tests/unit/              Isolated validation, JWT, access and date logic
  tests/integration/       API, migration, audit and notification flows
  tests/helpers/           Disposable fixtures and database safeguards
  scripts/                 Migrations, test runner, safe bootstrap and demo seed
shared/                    Constants, access catalog and Zod validation
database/                  Base schema and documented migration sequence
deployment/                Host environment example and HTTPS reverse proxy configuration
docs/                      API/OpenAPI/Postman, testing, deployment and checklist
```

## Prerequisites

- Node.js **24** and npm (use `.nvmrc`).
- MySQL **8.0+**; CI uses native MySQL 8.0 on Ubuntu 24.04.
- A database account allowed to create tables for migrations.
- Tests need a separate account/database namespace with CREATE/DROP privileges restricted to test databases.

## Installation

Clone this repository, then from its root:

```powershell
npm ci
npm ci --prefix server
npm ci --prefix client
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

On macOS/Linux use `cp` in place of `Copy-Item`. Do not copy over an existing configured environment file.

## Environment Variables

Configure `server/.env`. `server/.env.example` lists every setting. The root `.env` is an optional fallback; shell/deployment variables take precedence. Generate a random JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Set DB_HOST/PORT/USER/PASSWORD/NAME, JWT_SECRET, FRONTEND_URL and APP_TIMEZONE. Production requires a non-root DB user, nonempty DB password, a strong secret, an exact HTTPS frontend origin and a valid token lifetime. Never commit configured env files.

`client/.env` uses `VITE_API_URL=/api`. This is public build-time configuration, never a place for secrets. Vite proxies /api locally; the production proxy sends /api to Express. An external API origin can be configured before building if required.

## Database Setup

Create your configured database using your MySQL administration tool:

```sql
CREATE DATABASE project_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then:

```powershell
npm run db:migrate
```

The migration command uses **DB_NAME**, strips legacy hardcoded database selection, creates missing tables, and applies idempotent access/planning/release migrations. It does not drop tables or seed accounts. Back up existing deployments before schema changes. [Migration guide](database/README.md) covers historical Stage 3/4 files. [DATABASE.md](DATABASE.md) documents all tables and the ER diagram.

## Backend Setup

`npm --prefix server start` validates configuration and database/schema connectivity before accepting traffic. It uses a bounded connection pool, UTC database sessions, graceful SIGTERM/SIGINT shutdown and configurable scheduler. `npm --prefix server run dev` uses Node's built-in watcher.

To bootstrap the first platform owner, set SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME and SUPER_ADMIN_PASSWORD locally, then run:

```powershell
npm --prefix server run bootstrap:admin
```

The script refuses to overwrite/elevate existing accounts or create another owner once a Super Admin exists. Remove bootstrap credentials after use. Administrators can then create operational accounts through the UI.

## Frontend Setup

`npm --prefix client run dev` serves the UI at http://localhost:5173. For a static release:

```powershell
npm --prefix client run build
```

Publish `client/dist` with SPA fallback and an /api reverse proxy. `vite preview` is a local build check, not a production web server.

## Running Locally

Run in separate terminals:

```powershell
npm run dev:server
npm run dev:client
```

Check http://localhost:5000/api/health for process liveness and /api/ready for database readiness. Login with your bootstrapped account or optional demo accounts.

## Testing

```powershell
npm run test:unit
npm run test:integration
npm run test:coverage
npx --prefix client playwright install chromium
npm --prefix client test
npm run check
```

`npm test` runs backend and browser tests. Integration tests generate/drop only isolated DB_NAME_TEST databases. Direct destructive test runs require NODE_ENV=test; database safety checks refuse development/production names. Emails are mocked; the email transport rejects real SMTP in test mode. [Testing guide](docs/TESTING.md) explains privileges, coverage and browser fixtures.

## API Documentation

[API reference](docs/API.md), [OpenAPI JSON](docs/api/openapi.json) and [Postman collection](docs/api/Project-Management-System.postman_collection.json) cover all routes. Postman variables contain no real credentials. Use a demo database for mutation examples.

## Notification Setup

SMTP_HOST empty disables outbound email. Configure SMTP_HOST/PORT/USER/PASS/FROM to enable it. Certificates are verified; port 465 uses implicit TLS, production other ports require STARTTLS. Personal reminders remain in-app notifications.

APP_TIMEZONE controls the daily deadline schedule; REMINDER_CRON defaults to 08:00. SCHEDULER_ENABLED=false disables jobs. Use one active scheduler per deployment. Daily web deliveries are transactional and database-deduplicated; email attempts have a daily claim to prevent duplicates. Failed/uncertain email attempts are not automatically retried that day. The [API reference](docs/API.md) documents personal reminders and calendar behavior.

## Deployment

[Deployment guide](docs/DEPLOYMENT.md) covers host/static deployment, HTTPS, migration order, least-privilege MySQL, backups, rollback, smoke tests and proxy configuration. Files are prepared; no live deployment is performed by this stage.

## Security Notes

See [security review](docs/SECURITY.md) for route-by-route authorization, SQL/validation review, CORS, logging and known limits. JWT logout is stateless; copied tokens expire naturally or become unusable after account deactivation. Browser tokens remain in localStorage; HTTPS and frontend CSP reduce exposure, but XSS prevention still matters.

## Demo Accounts

Demo data is optional and **development-only**. Use a separate database whose name ends in `_demo`, set NODE_ENV=development and ALLOW_DEMO_SEED=true, migrate it, then run:

```powershell
npm --prefix server run seed:demo
```

The script creates all eight `<role>@pms.demo.invalid` accounts, a sample project and task. It generates a strong shared demo password and prints it once, or uses DEMO_PASSWORD you provide. It refuses existing demo accounts and production/test mode. No credentials are embedded in production code.

## Future Mobile Support

The REST API and shared schemas can support another client. No mobile application or additional major product features are included in Stage 7.

## Submission

Follow [final checklist](docs/SUBMISSION_CHECKLIST.md). Operational setup and role behavior in this README/API documentation supersede historical examples.

## License

Package metadata declares ISC.
