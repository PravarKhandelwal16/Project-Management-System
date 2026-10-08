# Stage 7 verification record

Verified locally on 2026-10-08 with Node 24.17.0, MySQL 8.0.45 and Chromium through Playwright. The prepared CI/container target uses MySQL 8.4; that target has not been executed locally.

## Results

| Check | Result |
| --- | --- |
| npm --prefix server run test:coverage | 45 passed; 0 failed/skipped |
| Backend selected-code coverage | 86.53% statements/lines, 80.01% branches, 92.75% functions |
| npm --prefix client test | 15 passed across desktop, tablet and mobile |
| npm run check | Lint exits successfully; production build passes |
| Dependency audits (root, server and client) | 0 reported vulnerabilities at verification time |
| Full database migrations on disposable test databases | Fresh setup and repeat runs preserve seeded records |
| Real backend entry-point smoke test, scheduler disabled | /api/health 200, /api/ready 200, unauthenticated /api/projects 401 |
| OpenAPI/Postman coverage | All 56 registered REST operations match documentation |
| Documentation links / Compose and CI YAML | Checked/parsed |
| git diff --check | Pass (Windows line-ending notices only) |

The browser suite covers all major pages at 1440x1000, 820x1180 and 390x844. It checks page widths/overflow/errors, the mobile sidebar, auth form validation, calendar whitespace selection and item placement, keyboard confirmation/cancellation, 401 navigation and friendly 403/404/500/network retry states. Screenshots were inspected for the dashboard and mobile calendar; visual checks do not constitute a full accessibility certification.

Backend tests use isolated generated test databases and mock mail delivery. Cases cover all eight implemented roles, unrelated project/task denial, escalation protection, CRUD/query validation, report totals/scope, audit events/privacy/transaction rollback, preferences, idempotent concurrent assignments and daily/personal reminder deduplication. Tests prove refusal of unsafe database names/environments and unsafe demo/bootstrap operations.

## Artifacts

- server/coverage/index.html and lcov.info contain local coverage details.
- client/playwright-report and client/test-results contain browser reports/screenshots/traces.
- docs/api/openapi.json and Project-Management-System.postman_collection.json are submission artifacts.
- DATABASE.md includes the schema/ER diagram; docs/SECURITY.md includes all route permissions/scope.
- docs/DEPLOYMENT.md and SUBMISSION_CHECKLIST.md describe release-specific actions.

Generated coverage/browser artifacts are ignored by Git; rerun documented commands to regenerate them.

## Remaining deployment verification

Docker is unavailable on this workstation. Dockerfiles, Compose and Nginx configuration are prepared, with YAML parsed, but container builds/boot, proxy trust/client-IP behavior, HTTPS certificate/domain, live host configuration and actual CI execution remain staging checks.

No real emails were sent by automated tests. Verify SMTP with a sandbox recipient/account on the deployment target. A clean-clone evaluator walkthrough and imported Postman execution remain submission checks.

Lint retains six advisory warnings: existing state-setting effects in HomePage, AppLayout, ProjectDetails, NotificationDropdown and Notifications, plus AuthContext Fast Refresh exports. There are no lint errors or production bundle-size warnings.

JWT logout remains stateless and browser tokens remain in localStorage. Auth rate limiting uses a single-process store. Daily email delivery is an at-most-once attempt per key/day; failed or uncertain attempts do not automatically retry that day. Operate one active scheduler. See SECURITY.md for these boundaries and DEPLOYMENT.md for operational requirements.

No major product feature or application redesign was added. No remote deployment was performed.
