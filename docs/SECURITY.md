# Security and authorization review

This review covers the current Express routes, mysql2 queries, access service, validation, notification jobs and React API client. It is a development security review supported by automated tests, not an independent penetration test.

## Authentication and passwords

Registration always creates a member and rejects role/security fields. Emails normalize to lowercase and have a database UNIQUE constraint; duplicate registration returns 409, including concurrent insert conflicts. Passwords require at least eight characters, a letter and number, and at most 72 UTF-8 bytes so bcrypt never silently truncates input. Existing hashing remains bcrypt (registration cost 10; administrator/bootstrap/demo cost 12).

JWT_SECRET has no fallback. Production startup requires at least 32 bytes and rejects known placeholder secrets; provision a random secret. Issued HS256 tokens contain only id, iat and exp. Verification accepts only HS256, positive integer identities and tokens with expiration; invalid/expired tokens return 401. Every protected request reloads the active user and effective permissions from MySQL, so role/policy changes and deactivation take effect immediately.

Password hashes are retrieved only for credential verification and excluded from public account queries/responses. Account administration has no password-reset feature. Logout acknowledges client token removal; it does not revoke a copied JWT. Use short expiry and account deactivation for compromised accounts.

## Authorization model

All protected routers authenticate first. Permission checks are server-side, independent of hidden UI buttons. Resource scope is ownership or project membership unless projects.view_all is granted. A scoped project editor may edit projects within that scope; being a Project Manager does not confer access to unrelated work.

Task detail/edit/assignment/status/deletion requires projects.view, tasks.view and project scope. Ordinary members with tasks.status_assigned can change only their own assigned task status. Generic task edits also check status/assignment permissions when those fields change. Assignees must be active eligible owners/members with task access.

Administrative routes additionally require the fixed admin/super_admin role gate. Non-admin roles cannot acquire administrative permissions even through policy/override manipulation. Admin cannot edit themselves, protected admins, or assign admin/super_admin. Super Admin cannot edit their own account through these endpoints; the last active owner cannot be deactivated/demoted, including concurrent requests. Super Admin policy is protected; only Super Admin can change admin policy. Policy versioning rejects stale updates (409). Changing roles resets old overrides.

The endpoint matrix below lists every route. Resource scope/personal ownership and account boundaries apply in addition to listed permissions. Default role permissions are in shared/access.json; editable policies mean this matrix should be read as permission rules rather than permanent role grants.

## Authorization matrix

| Endpoint | Authentication/permission | Additional scope |
| --- | --- | --- |
| `GET /api/health` | Public | Public; auth writes are rate limited |
| `GET /api/ready` | Public | Public; auth writes are rate limited |
| `POST /api/auth/register` | Public | Public; auth writes are rate limited |
| `POST /api/auth/login` | Public | Public; auth writes are rate limited |
| `POST /api/auth/logout` | `authenticated` | Active account |
| `GET /api/auth/me` | `authenticated` | Active account |
| `GET /api/projects` | `projects.view` | Project ownership/membership or projects.view_all |
| `POST /api/projects` | `projects.view`, `projects.create` | Creates project owned by current account |
| `GET /api/projects/{id}` | `projects.view` | Project ownership/membership or projects.view_all |
| `PUT /api/projects/{id}` | `projects.view`, `projects.edit` | Project ownership/membership or projects.view_all |
| `DELETE /api/projects/{id}` | `projects.view`, `projects.delete` | Project ownership/membership or projects.view_all |
| `GET /api/projects/{id}/members` | `projects.view` | Project ownership/membership or projects.view_all |
| `POST /api/projects/{id}/members` | `projects.view`, `team.manage` | Project ownership/membership or projects.view_all |
| `DELETE /api/projects/{id}/members/{userId}` | `projects.view`, `team.manage` | Project ownership/membership or projects.view_all |
| `GET /api/projects/{id}/tasks` | `projects.view`, `tasks.view` | Project ownership/membership or projects.view_all |
| `GET /api/tasks` | `tasks.view` | Project ownership/membership or projects.view_all |
| `POST /api/tasks` | `projects.view`, `tasks.view`, `tasks.create` | Project ownership/membership or projects.view_all |
| `GET /api/tasks/{id}` | `projects.view`, `tasks.view` | Project ownership/membership or projects.view_all |
| `PUT /api/tasks/{id}` | `projects.view`, `tasks.view`, `tasks.edit` | Project ownership/membership or projects.view_all |
| `PATCH /api/tasks/{id}/assign` | `projects.view`, `tasks.view`, `tasks.assign` | Project ownership/membership or projects.view_all |
| `PATCH /api/tasks/{id}/status` | `projects.view`, `tasks.view` | Project ownership/membership or projects.view_all; tasks.status OR tasks.status_assigned on own assignment |
| `PATCH /api/tasks/{id}/priority` | `projects.view`, `tasks.view`, `tasks.edit` | Project ownership/membership or projects.view_all |
| `DELETE /api/tasks/{id}` | `projects.view`, `tasks.view`, `tasks.delete` | Project ownership/membership or projects.view_all |
| `GET /api/dashboard` | `authenticated` | Results scoped to project access/effective permissions |
| `GET /api/analytics` | `projects.view`, `tasks.view`, `analytics.view` | Results scoped to project access/effective permissions |
| `GET /api/search` | `authenticated` | Results scoped to project access/effective permissions |
| `GET /api/team/projects/{id}` | `projects.view`, `team.view` | Project ownership/membership or projects.view_all |
| `GET /api/team/projects/{id}/candidates` | `projects.view`, `team.view`, `team.manage` | Project ownership/membership or projects.view_all |
| `GET /api/notifications` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `GET /api/notifications/unread-count` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `PATCH /api/notifications/{id}/read` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `PATCH /api/notifications/read-all` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `GET /api/notifications/preferences` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `PUT /api/notifications/preferences` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `GET /api/reminders` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `POST /api/reminders` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `PUT /api/reminders/{id}` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `DELETE /api/reminders/{id}` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `GET /api/calendar/events` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `POST /api/calendar/events` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `PUT /api/calendar/events/{id}` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `DELETE /api/calendar/events/{id}` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `GET /api/calendar/colours` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `PUT /api/calendar/colours` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `DELETE /api/calendar/colours` | `authenticated` | Own account records only; attached reminder task must be accessible |
| `GET /api/admin/users` | `users.view` | admin/super_admin; protected account/policy boundaries for mutations |
| `POST /api/admin/users` | `users.create` | admin/super_admin; protected account/policy boundaries for mutations |
| `GET /api/admin/users/{id}` | `users.view` | admin/super_admin; protected account/policy boundaries for mutations |
| `PUT /api/admin/users/{id}` | `users.edit` | admin/super_admin; protected account/policy boundaries for mutations |
| `PATCH /api/admin/users/{id}/role` | `users.roles` | admin/super_admin; protected account/policy boundaries for mutations |
| `PATCH /api/admin/users/{id}/status` | `users.status` | admin/super_admin; protected account/policy boundaries for mutations |
| `PUT /api/admin/users/{id}/permissions` | `users.roles` | admin/super_admin; protected account/policy boundaries for mutations |
| `GET /api/admin/roles` | `users.view` | admin/super_admin; protected account/policy boundaries for mutations |
| `PUT /api/admin/roles/{role}` | `roles.manage` | admin/super_admin; protected account/policy boundaries for mutations |
| `GET /api/admin/stats` | `users.view` | admin/super_admin; protected account/policy boundaries for mutations |
| `GET /api/admin/audit-logs` | `audit.view` | admin/super_admin; protected account/policy boundaries for mutations |

## SQL and validation

Models/controllers/jobs/migrations were reviewed. Request values use mysql2 placeholders. Dynamic SQL consists of fixed predicates, trusted aliases, placeholder lists, or whitelisted sort fields/directions. Preference column names come from a fixed allowlist; arbitrary preference keys are rejected. Search strings stay parameters, including SQL-looking input.

Backend validation covers names, emails/passwords, dates/calendar times, project/task enums, description length, assignee IDs, role/policy changes and boolean preferences. Mutation bodies reject unknown fields on auth, CRUD, membership, admin, reminders/events/colours and preferences. JSON bodies are capped at 64 KiB; arrays/malformed JSON and repeated/object query values return safe 400 responses. Searches are bounded to 255 characters. List pagination is bounded; invalid enum/role/account-status filters are rejected.

Frontend Zod checks support feedback but never replace backend authorization/validation. Calendar/reminder records are personal: SQL reads/mutations include user_id. Reminder task attachments recheck task scope, and jobs skip completed/inaccessible tasks.

## HTTP, CORS and rate limits

Helmet supplies default security headers and Express identification is disabled. Production CORS permits only FRONTEND_URL, an exact HTTPS origin. Requests without Origin remain supported for CLI/mobile clients and still require authentication. CORS is not an authorization boundary.

Login and registration share a 50-request/IP/15-minute limiter with 429 JSON responses. The store is process-local. Run a single API instance for this deployment; a multi-instance rollout needs a shared store and edge limits. TRUST_PROXY accepts explicit IPs/subnets, never true or hop counts. Configure only the actual proxy path and overwrite forwarding headers at the trusted edge.

The prepared Nginx configuration serves SPA fallback, caches hashed assets, applies frontend CSP and proxies /api. It trusts the configured host edge only for X-Real-IP. CSP permits Google Fonts and inline styles used by React/charts; scripts require same origin. The sample proxy assumes /api on the same origin. External API builds require a matching CSP connect-src. HTTPS/HSTS belong on the public edge.

See the [Express security guidance](https://expressjs.com/en/advanced/best-practice-security.html) and [proxy trust guidance](https://expressjs.com/en/guide/behind-proxies.html) for the deployment assumptions behind these controls.

## Errors, audit and logs

Centralized errors never return SQL, stack traces or filesystem details. Unexpected errors return { "success": false, "message": "Internal server error" }. Structured server logs record safe event/method/path/status/error codes; handlers/jobs do not log raw request bodies, credentials, JWTs or SMTP errors containing transport details.

Audit snapshots recursively redact password/hash/token/authorization/secret/SMTP-password keys. Tests assert that auth and CRUD/role/assignment actions create entries without credentials. Personal reminder/event notes and titles are omitted from shared audit history. Administrative, membership and personal planning changes write audit entries within their transactions. Project/task CRUD and authentication/access-denied audit writes remain best effort; failed audit writes log a safe error code. These CRUD writes can succeed even if their audit entry fails.

Audit entries contain account identity and business metadata, so administrators must restrict exports and define retention/backup access. They are application history, not tamper-proof forensic storage.

## Notifications and email

Automated tests mock email and test-mode real transport refuses SMTP. Templates escape dynamic text; SMTP verifies certificates, uses implicit TLS on 465 or requires STARTTLS in production. Empty SMTP_HOST disables sending.

Assignment PATCH retries use an atomic conditional update so concurrent identical assignments notify once. Daily delivery keys prevent duplicate web/email attempts per local day, task, user, type and channel. Web delivery and claim completion are transactional. Email attempts are claimed before transport: failure/crash does not crash jobs/requests, but failed or uncertain attempts are not automatically retried that day. Operators should inspect FAILED/PROCESSING notification_logs before any deliberate resend.

## Deployment boundaries and remaining limits

- Browser JWTs remain in localStorage; an XSS vulnerability could expose them. Do not insert untrusted HTML or weaken CSP. A cookie/session migration is outside this stage.
- Public registration remains the existing product behavior; invitation-only enrollment is not introduced.
- There is no JWT revocation store, MFA, external secret manager, distributed limiter or centralized audit retention system.
- Use one active scheduler; personal reminders also use transactional deduplication.
- Runtime MySQL needs SELECT/INSERT/UPDATE/DELETE only after migrations; use a separate migration account and private network/TLS for managed remote databases.
- No configured env file, generated demo password, production credential or populated test database belongs in a submission.
