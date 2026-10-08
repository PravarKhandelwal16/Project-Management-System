# Final submission checklist

Repository quality checks are documented in [Stage 7 review](STAGE7_REVIEW.md). Items below marked pending require the actual submission/deployment environment.

## Implemented

- [x] Unit and integration test directories, reusable fixtures, coverage scripts.
- [x] Separate guarded disposable MySQL test databases; email mocks/test SMTP barrier.
- [x] Authentication/JWT/hash, eight-role access/escalation, project/task flows and reporting tests.
- [x] Audit privacy/transaction rollback and notification/preferences/concurrency tests.
- [x] Helmet, configured CORS, auth rate limits, bounded/strict validation and safe errors/logs.
- [x] Fail-fast environment/database/schema startup and graceful shutdown.
- [x] Frontend environment API URL, production build and page loading chunks.
- [x] Responsive/browser checks, labels, confirmation keyboard controls and error/retry states.
- [x] Safe migration sequence, indexes and daily notification uniqueness.
- [x] Optional guarded demo data and safe first-owner bootstrap.
- [x] README/setup, API/OpenAPI/Postman, DATABASE/ER, security, testing and deployment guides.
- [x] Host environment/HTTPS proxy configuration and CI workflow prepared.

## Before handing in

- [ ] Run the documented checks on the submission revision; include the review/coverage report if required.
- [ ] Confirm no .env credentials, JWTs, generated passwords, node_modules, coverage/test artifacts or real user data are in the submission archive.
- [ ] Import the Postman collection; fill local/demo variables, login and exercise relevant requests.
- [ ] Provide evaluator demo account emails and generated password through an appropriate private channel. Use only the dedicated development demo database.
- [ ] Check README instructions from a clean clone; record Node/MySQL versions and screenshots if required.
- [ ] Supply repository/archive and applicable package license information.

## Before production

- [ ] Choose target/domain, secret configuration, certificate and SMTP provider; use independent credentials.
- [ ] Start the configured Node service and static frontend host in staging.
- [ ] Apply migrations to a restored staging database, then use a dedicated least-privilege runtime account.
- [ ] Bootstrap the first Super Admin once and remove bootstrap credentials; never seed demo data into production.
- [ ] Verify HTTPS/CSP/CORS, private service ports and real proxy IP/rate-limit behavior.
- [ ] Run deployment smoke checks with staging-only data and sandbox SMTP.
- [ ] Rehearse backups/restores, rollback and job/error monitoring.
- [ ] Confirm one active scheduler and define audit/notification retention.
- [ ] Complete actual release-specific approvals and operational checks.

No remote deployment or publication is performed by Stage 7.

## Stage 8 mobile submission

- [ ] Follow mobile/README.md with the existing backend/account/database.
- [ ] Verify mobile typecheck, Jest suite, Expo Doctor and Android export with HTTPS environment.
- [ ] Verify backend mobile integration and existing browser regression checks.
- [ ] Run the native role/network/persistence checklist in docs/MOBILE_TESTING.md on your emulator/device.
- [ ] Record the sixteen-step same-account/web-mobile synchronization demo.
- [ ] Review upstream mobile tooling dependency advisories before release.
- [ ] Link your own Expo project, configure the real HTTPS API and produce/install a signed internal APK.
- [ ] Share the EAS internal-distribution link with intended testers; publishing to Play Store is optional.
- [ ] Include docs/STAGE8_REVIEW.md file/package inventory and validation limits in submission.
