# Stage 8 mobile verification and demonstration

## Automated checks

- `npm --prefix mobile test`: API URL/transport/error handling, SecureStore session restore/login/logout/expiry/offline retry, all eight role policies and effective overrides, shared input rules, accessible/disabled controls and retry/empty states.
- `npm --prefix mobile run test:coverage`: meaningful API/session/permission coverage; generated output is ignored and uploaded by CI.
- `npm --prefix server run test:integration`: guarded disposable MySQL databases, mocked email, real Express requests. `tests/integration/mobile.test.js` uses the actual mobile transport for both directions of web/mobile CRUD, all roles, scoped pages, invalid filters, unauthorized resources, notifications and expiry.
- `npm --prefix mobile run typecheck`, `npx expo-doctor` from mobile, `npm run build:mobile` with an HTTPS URL and `npm --prefix client run build`.
- Root `npm test` runs backend, existing browser and mobile tests. CI installs mobile, runs typecheck/tests/coverage and exports Android with a placeholder HTTPS origin; no external API is called during these build/unit checks.

## Safe interactive Android preview

This optional **test-only** harness runs the existing Express application against a disposable database whose name must pass the Stage 7 safety guard. It is not a mobile backend implementation and is not a second deployed database. Development/production data are not seeded or wiped. The preview uses existing test fixture users, projects and email mocks.

1. Configure the existing server's local MySQL/test privileges as in TESTING.md.
2. At repository root run `npm run test:mobile-preview` in a terminal. It forces NODE_ENV=test, creates the guarded schema and writes ignored `mobile/.expo/test-api.json` with the selected API port and fixture IDs.
3. Set mobile/.env to the displayed API URL, substituting `10.0.2.2` for `127.0.0.1` on the standard Android emulator. Restart Metro after changing it.
4. Run SDK 57 Expo Go or your development build. Test-only fixture accounts are `<role>@isolated.test`, with password `Testing123!` (all eight role keys; never production/demo deployment credentials).
5. For a web client using these same fixtures, temporarily point its ignored VITE_API_URL at that exact test API and start Vite. Restore its normal environment afterward.
6. Stop the preview with Ctrl+C, or create `mobile/.expo/stop-preview` in another terminal. The test runner closes HTTP/pool connections and drops only its own guarded database. A one-hour timeout ends the preview and cleans up. Restore mobile/.env to your normal API afterward; test accounts/ports do not persist.

Do not run normal demo seed scripts against this test database. For a longer user demo, use the existing development-only `_demo` database/seed documented at root, shared by both clients.

## Native checklist

Run on common phone widths and with an open keyboard. Also run on a physical phone and signed APK before distributing a release. JavaScript tests mock native modules; native checks complement them.

| Area | Verify |
| --- | --- |
| Authentication | Register, wrong credentials, same web account login, logout online/offline, force-stop/reopen persistence, invalid/expired token clears to Login |
| Roles | Super Admin, Admin, Project Manager and Member; additional coordinator/lead/portfolio/viewer policies; live grants removed on web become denied on native refresh |
| Dashboard | Scoped counts, visible active projects/deadlines, notification badge and pull refresh |
| Projects | Search debounce, each status/sort, page loading, detail summary, permitted create/edit/delete, inaccessible project 403 |
| Tasks | Search and every filter, apply/clear/count, pagination, create/edit/assign/status/priority/complete, native date picker, member own status only, delete confirmation/cancel |
| Sync | Web creates task -> native refresh finds it; native updates task -> web refresh sees status/name/assignment |
| Notifications | Assignment inbox/badge, mark read/all read, task/project opening, inaccessible/deleted resource error, email and inbox preferences |
| Team | Project chooser, roster/workload, candidate search/add, protected owner, remove blocked by open work, mail app unavailable message |
| Admin | Search/paged users/details, role change with self/protected boundaries, role policy versions/grants, audit search/pages/details |
| Network | API unavailable/timeout/no internet, safe 400/401/403/404/409/500, Retry, no blank page or automatic mutation replay |
| Android UI | Back closes dialogs/keyboard/details, bottom tabs work, labels/48dp targets, no overflow, skeletons and dark colors |
| Release | HTTPS URL embedded correctly, no backend secrets in bundle, signed APK installs and runs without Metro |

## Sixteen-step recording/demo sequence

1. Start the existing shared backend/database and web client; start Expo Go/development build.
2. Show the same ProjectMaster identity and native dark theme.
3. Log in on web and mobile using the same Project Manager account.
4. Show the scoped dashboard and pull to refresh.
5. Open Projects; demonstrate search, status and sorting.
6. Open a project; show owner, members, dates and task completion.
7. Create a task on the web and assign a project member.
8. Open native Tasks and pull to refresh; show that exact task.
9. Apply a project/priority filter and clear it.
10. Open the task on mobile; edit its description/priority and save.
11. Mark it completed on mobile, then refresh web and show the same completed task.
12. Sign in as the Member; show own-assignment status access and absence of manager/admin actions.
13. Open Notifications; show unread count, mark read and open a related task.
14. Show Settings email/in-app preferences and explain that browser preferences apply to web only.
15. Sign in as Admin/Super Admin; show user-role boundaries, role policies and audit activity.
16. Briefly demonstrate a network error/retry and deletion cancel; show APK profile/share-link instructions and sign out.

Use disposable demo/test data and avoid displaying real credentials, tokens or personal data in recordings. No real SMTP is sent by automated tests or the isolated preview.
