# Testing and verification

## Commands

From the repository root:
```powershell
npm run test:unit
npm run test:integration
npm run test:coverage
npx --prefix client playwright install chromium
npm --prefix client test
npm run check
```

Backend tests continue using node:test and native fetch against Express on an ephemeral local port. Jest/Supertest were not added because the existing framework already exercises complete HTTP flows.

## Structure

- server/tests/unit: validation, shared schemas, password hashing, token expiry/algorithms, permission helpers, environment safety, errors/startup, date logic, daily delivery keys and email transport safety.
- server/tests/integration: auth, access, account management, team, projects/tasks, dashboard/reports, audit side effects, notifications/jobs, personal reminders/events/colours and migration preservation.
- server/tests/helpers: createUser, loginUser, tokenFor, createProject, createTask, role accounts, API request helper, email mocks and lifecycle guards.
- client/tests: Playwright browser checks with deterministic API fixtures. These are UI/responsive/error-handling tests; backend integration tests cover real SQL separately.

## Test database safety

DB_NAME_TEST defaults to project_management_test. Setup requires NODE_ENV=test, a prefix ending in _test, and a name distinct from application DB_NAME. Each test file receives a generated `<prefix>_<pid>_<timestamp>` database. Guards run before CREATE and again before DROP. No tests truncate/reset the configured development database.

The test runner sets NODE_ENV=test before spawning tests. Direct execution without that setting refuses destructive fixtures. Fixtures migrate twice, seed all eight roles, mock every email notification function, bind Express to 127.0.0.1 and drop only their own created database on teardown. An interrupted process can leave an isolated test database; inspect and remove it manually, never with a broad wildcard drop.

Use a separate MySQL test account. Example for a local/CI account created by your DBA:
```sql
CREATE USER 'pms_test'@'localhost' IDENTIFIED BY '<independent-test-password>';
GRANT ALL PRIVILEGES ON `project_management_test%`.* TO 'pms_test'@'localhost';
```
In MySQL database privilege patterns, _ and % are wildcards. Constrain the account to the local test host and dedicated test namespace, and do not grant global administrative privileges. Configure this account when running tests; development runtime credentials do not need CREATE/DROP privileges.

## Coverage

c8 measures controllers/services/middleware/validation/access/notification logic, including unloaded files, and writes server/coverage/index.html and lcov.info. The text report prints per-file line/branch/function coverage. SMTP is mocked, so real email/network paths and the scheduler wrapper have lower coverage; this is intentional. The suite tests effects and failure modes rather than asserting an artificial 100% threshold.

## Browser verification

Playwright starts a separate Vite server on port 5174 with /api configured, intercepts API requests, and runs Chromium at 1440x1000, 820x1180 and 390x844. It visits Login, Register, Dashboard, Projects/Details, Tasks/Details, Calendar, Analytics, Team, Admin Users, Audit, Notifications and Settings.

Checks include no page errors/document overflow, consistent page width, mobile sidebar controls, real validation feedback, calendar labels below date numbers, full-cell selection, confirmation focus/Escape/cancellation, one deletion after confirmation, retry UI and expired-session navigation. Page screenshots, traces and HTML reports are written to ignored client/test-results and client/playwright-report. Browser fixtures are illustrative and never contact production.

## Email tests

Assignment and reminder functions are mocked before the server/jobs run. Tests verify recipients, notification types, channel preferences, failures and overlapping daily workers. The real transport throws under NODE_ENV=test as a second safety barrier. Manual test:email/test:reminders scripts are operational tools that can send mail; they are not part of automated npm test.

## CI

.github/workflows/ci.yml starts the native MySQL service on Ubuntu 24.04 and creates a dedicated account restricted to the test database namespace, Node 24, coverage, lint/build, Chromium checks and dependency audits. Quality reports are uploaded even on failure. CI secrets shown in the workflow are disposable service credentials, never deployment credentials.

The workflow uses the preinstalled service and disposable runner root credentials documented in the [GitHub Ubuntu 24.04 runner image](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md#mysql). Application tests run as pms_test rather than root.

## MySQL binary logging and rollback tests

CI uses a schema-scoped test account on the host MySQL service. The administrative rollback test injects an invalid actor ID into the actual transactional audit INSERT, causing a real foreign-key rejection after the profile UPDATE. It checks all profile fields remain unchanged, no audit row commits, a safe 500 is returned, and a subsequent valid update/audit succeeds. Only that audit query is intercepted; authentication, authorization, SQL UPDATE, transaction/rollback and database constraints remain real.

No CREATE TRIGGER, SUPER grant or log_bin_trust_function_creators change is required. This avoids MySQL error ER_BINLOG_CREATE_ROUTINE_NEED_SUPER on runners with binary logging enabled while keeping the audit atomicity assertion. Historical failed workflow runs must be followed by a new run of the corrected commit; rerunning an old commit retains its old test.
