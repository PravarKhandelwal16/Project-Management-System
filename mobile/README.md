# ProjectMaster Mobile - Stage 8

An Android-first Expo/React Native client for the existing Project Management System. Web and mobile use **the same account, Express REST API, MySQL database, project memberships, effective permissions and notification inbox**. Mobile never connects directly to MySQL. No additional production backend or database is required.

## Prerequisites

- Node.js 24 and npm; install the root/shared dependency with `npm ci` at repository root.
- Existing backend configured, migrated and running (see [root setup](../README.md)).
- Expo Go compatible with Expo SDK 57, or the development build described below.
- Android emulator/SDK or a physical Android phone. iOS source is portable, but iOS is not verified in this stage.

## Install and run

From repository root:

```powershell
npm ci
npm ci --prefix mobile
Copy-Item mobile/.env.example mobile/.env
npm run dev:server
# In a second terminal:
npm run dev:mobile
```

The mobile package has its own lockfile, matching the existing client/server installation model. Metro watches `../shared` and resolves dependencies from mobile/root; shared constants, role labels and Zod schemas are imported rather than copied. All runtime business decisions remain in Express.

The only mobile environment setting is `EXPO_PUBLIC_API_URL`, including `/api`. It is public and is embedded in the bundle. Never add JWT_SECRET, DB_PASSWORD or SMTP credentials to an Expo environment. `.env` is ignored. After changing the URL, reload the app; if the old address persists, restart Metro with `--clear`.

### Android emulator

Set:

```dotenv
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
```

`10.0.2.2` reaches the development computer from the standard Android emulator. Use the backend's configured port. Start an AVD in Android Studio, then `npm run android:mobile`. The command explicitly opens Expo Go rather than assuming a development build is installed.

If Metro binds only to IPv6 on Windows, an IPv4 emulator cannot reach it. Start Metro with a LAN listener and an emulator host override:

```powershell
cd mobile
$env:REACT_NATIVE_PACKAGER_HOSTNAME="10.0.2.2"
npx expo start --go --android --lan
```

Alternatively use `adb reverse tcp:8081 tcp:8081` and a Metro server listening on IPv4, then open `exp://127.0.0.1:8081` inside the emulator. This reverses Metro only; the API address still needs its own reachable host/port.

### Physical Android phone

Connect the phone and computer to the same trusted network. Find the computer's LAN IPv4 address (`ipconfig` on Windows), e.g. `192.168.1.40`, and set:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.40:5000/api
```

Make sure Express is reachable on that interface and your local firewall permits development access to API/Metro ports. Run `npm run dev:mobile` and scan Metro's QR code with Expo Go. `localhost` on a phone means the phone itself. A Metro tunnel changes Metro access only, not the backend API. A deployed HTTPS backend avoids the local API network requirement.

Use the same login credentials you use on the web. Registration creates the existing Team Member role, then logs in through the same login endpoint. Admins add members to projects using existing team management. Use the safe demo seeder documented at root for demo accounts; no credentials are embedded in the application.

## Screens and behavior

Bottom tabs: **Dashboard, Projects, Tasks, Notifications, More**. Stack screens contain project/task details and forms, Analytics, Team, Settings and permitted Admin Users, User Details, Roles and Audit Logs.

- Dashboard: greeting, role, unread bell, six scoped metrics, active projects, upcoming/overdue tasks and seven-day recorded task activity.
- Projects: debounced search, status filter, sorting, 20-row pages; detail summary, dates, owner/members and paginated project tasks; permitted CRUD/member management.
- Tasks: CRUD, native due-date picker, eligible owner/member assignment, status/priority actions, project navigation and confirmation before deletion. Filters support status, priority, project, assignee, due date and overdue; apply/clear and active count. Team Members initially see their assignments and can clear that filter to view permitted project tasks.
- Notifications: shared inbox, unread badge, mark read/all read and related task/project navigation. Personal reminder notifications remain readable without inventing a native reminder editor.
- Analytics: scoped status/priority/project distributions, completion and weekly activity. Period selection applies to recorded activity, while current status counts remain current totals.
- Team: project selection, roster, assigned/completed/open workload, email compose via the device mail app, candidate search and guarded add/remove membership.
- More: account and permission-aware tools. Basic native admin supports user search/pagination/details/role changes, versioned role policies and searchable paginated audit details. Advanced profile/individual overrides remain available in the existing web app.
- Settings: existing email, shared in-app and web-browser preferences. Browser switches are explicitly web-only. Native push delivery is not configured; no push permission is requested.

All eight existing roles are supported: super_admin, admin, portfolio_manager, project_manager, project_coordinator, team_lead, member and viewer. UI actions use `/auth/me` effective permissions; admin screens also require admin/super_admin. Members can change status only on their own assignments. Express still checks resource scope and protected grants for every request.

The requested dark palette keeps ProjectMaster's blue mark, Plus Jakarta Sans font, Lucide icons, rounded cards and status badges. Native icons are raster exports of the existing SVG, not a new identity. Forms use scroll/keyboard support; touch actions are at least 48dp and icon buttons have accessible labels.

## Session, refresh and errors

JWT is stored only in **expo-secure-store** with device-only unlocked keychain accessibility. Cold launch verifies `/auth/me` before showing the workspace. Offline restoration preserves the token and shows Retry. A private 401 clears the token/session and shows **Your session has expired. Please log in again.** Public login errors remain credential errors. Logout clears local access even if the backend cannot be reached; existing backend logout remains a stateless acknowledgement.

Lists refresh on focus, foreground and pull-to-refresh. Successful mutations return to a refreshed detail/list. The inbox badge refreshes every 30 seconds while active. List requests use server pagination and search debounce; stale responses are discarded. No mutation queues, automatic mutation retries or persistent offline data cache are implemented. A network/timeout/400/403/404/409/500 error produces a readable state instead of a blank screen. Never rely on hidden buttons for server authorization.

## Tests and bundle

```powershell
npm --prefix mobile run typecheck
npm --prefix mobile test
npm --prefix mobile run test:coverage
cd mobile
npx expo-doctor
cd ..
npm --prefix server run test:integration
npm --prefix client run build
# A release bundle should use your deployed HTTPS URL:
$env:EXPO_PUBLIC_API_URL="https://your-api.example/api"
npm run build:mobile
```

`npm run check:mobile` runs typecheck, mobile tests and Android export. The export is JavaScript/Hermes output in ignored `mobile/dist`, **not an APK**. The native suite mocks SecureStore and HTTP; the backend mobile integration suite imports the real mobile API client and uses a guarded disposable MySQL test database, with email mocked. See [mobile verification](../docs/MOBILE_TESTING.md) for the native checklist and reproducible isolated preview.

## Development build

For a standalone development client instead of Expo Go:

```powershell
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build:configure
# Configure the public API URL in the development EAS environment.
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_API_URL --value https://your-api.example/api --visibility plaintext
npx eas-cli@latest build --platform android --profile development
```

Install the resulting APK from the EAS build page, then run `npm run start:dev-client` and open its QR/link. Development may use a reachable local HTTP API; HTTPS is preferred. For a local native build with Android SDK/JDK configured, `npx expo run:android` generates ignored `android/` and installs a development build. This changes only local build artifacts.

`build:configure` links your Expo account/project and must retain the supplied profiles and config. If EAS adds `extra.eas.projectId` to app.json, app.config preserves it through the config spread. No account IDs or signing keys are committed here.

## Installable APK and share link

Configure a publicly reachable **HTTPS** API using the existing deployment. Set the public URL in EAS preview, then:

```powershell
cd mobile
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://your-api.example/api --visibility plaintext
npx eas-cli@latest build --platform android --profile preview
```

`preview` uses internal distribution and `android.buildType=apk`; production uses an app bundle for future store delivery. Preview/production config refuses HTTP/missing API URLs and disables Android cleartext traffic. Download/install the APK from the resulting EAS build URL. Share that internal-distribution URL/QR with permitted testers; they can download the APK and allow installation from that trusted source. Keep internal build access limited to intended testers in EAS settings. For source-based live development, share Metro's QR only with a matching Expo Go client and reachable Metro/API.

The repository prepares these profiles and instructions. It does not create an EAS account, remotely build/sign an APK, publish updates or upload to Play Store. Installed preview APKs use their embedded bundle and the same backend; Metro is not required.

Sources: [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/), [APK builds](https://docs.expo.dev/build-reference/apk/), [internal distribution](https://docs.expo.dev/build/internal-distribution/), [React Navigation 7](https://reactnavigation.org/docs/7.x/getting-started/).

## Known limits and dependency review

See [Stage 8 review](../docs/STAGE8_REVIEW.md) for verification evidence, all packages/files and remaining upstream tooling advisories. Physical Android, iOS and signed APK validation remain deployment-specific checks. No new product stages are included. The Expo template MIT notice is preserved in LICENSE; repository package metadata otherwise declares ISC.
