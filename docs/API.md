# API reference

Base path: `/api`. Send JSON with `Content-Type: application/json`. Protected requests use `Authorization: Bearer <token>`. Public registration always creates `member`; a role field is rejected.

[OpenAPI 3.0 specification](api/openapi.json) and [Postman collection](api/Project-Management-System.postman_collection.json) include all 56 operations. They are static files, so documentation does not expose an unauthenticated production admin console. Regenerate with `npm --prefix server run docs:generate`.

## Response envelopes

- Register: HTTP 201 `{"success":true,"message":"User registered successfully"}`.
- Login: HTTP 200 `{"success":true,"token":"<JWT>","user":{"id":1,"full_name":"Person","email":"person@example.invalid","role":"member","permissions":["projects.view","tasks.view"]}}`. Password hashes are never returned.
- Me: `{"success":true,"user":{...}}`.
- Lists: `{"success":true,"data":[...]}`; project/task lists also return `count`.
- Resource creation/update: `{"success":true,"data":{"id":1,...}}`.
- Dashboard/analytics: `{"success":true,"data":{"summary":{...},"projects":[...],"tasks":[...],"taskActivity":[...],"workload":[...]}}`.
- Admin users/audit: `{"success":true,"data":[...],"total":12,"page":1,"limit":25}`. Audit responses also include `actions`.
- Reminder/event/colour list: `{"success":true,"data":[...]}`; colours return a map such as `{"task":"#2563eb","event:3":"#d97706"}`.
- Errors: `{"success":false,"message":"Internal server error"}`. Validation can include an `errors` array of field paths/messages. No stack traces or SQL are returned.

## Errors and authorization

| Status | Meaning |
| --- | --- |
| 400 | Invalid enum, type, date, ID, pagination, body or unexpected request field |
| 401 | Missing, invalid or expired JWT |
| 403 | Inactive account, denied permission/project scope, protected account level, forbidden CORS origin |
| 404 | Missing resource; other users' personal items/notifications also return 404 |
| 409 | Duplicate email/membership, open tasks preventing removal, protected final Super Admin, policy version conflict |
| 413 | Body exceeds 64 KiB |
| 429 | Combined login/register limit: 50 requests per IP per 15 minutes |
| 500 | Internal error with safe message |
| 503 | Readiness database check failed |

Roles are policy defaults; administrators can change policies/overrides. Check effective permissions and project scope rather than assuming a fixed role list. All admin routes require both `admin`/`super_admin` and the specified permission. [Authorization matrix](SECURITY.md#authorization-matrix) explains the boundaries.

JWTs contain only the account ID and standard timestamps. Database roles/status are checked on every request. Logout is stateless: the web client removes its token; a copied token remains valid until expiration or account deactivation. Use short production lifetimes.

## Validation rules

Names: full name 2-100 characters, project name 2-255, task/event/reminder name 1-255. Description/notes: at most 5000 characters. Email: valid normalized address, max 255. Password: minimum 8 characters with a letter and number, maximum **72 UTF-8 bytes** (bcrypt limit). Strings are trimmed where appropriate.

Project statuses: `Not Started`, `In Progress`, `Completed`. Task statuses: `Pending`, `In Progress`, `Completed`. Priorities: `Low`, `Medium`, `High`. Dates must be actual `YYYY-MM-DD` dates (not rolled-over dates); project end must not precede start. Optional dates can be null/empty to clear them. IDs are positive safe integers; `assigned_to:null` unassigns. Assignees must be active project owners/members.

PUT project/task requests can be partial. Unspecified fields retain existing values. Task status/assignment fields additionally require their respective permissions. Task create payload uses **name**, not title. Repeating assignment PATCH with the same assignee returns 200 without another notification, including concurrent identical requests. Notification preferences are strictly booleans; unknown keys are rejected.

Reminder `remind_at` requires an ISO timestamp with timezone, in the future. To edit/reschedule, send `title`, optional `notes`/`task_id`, and `remind_at`; to dismiss send only `{"status":"dismissed"}`. Events require title/date; null times mean all day. Timed events use local wall-clock `HH:mm`, end after start on the same date. Colours use hex `#RRGGBB`; keys are categories `task/reminder/event/completed/overdue` or `task:ID/reminder:ID/event:ID`.

## Query parameters

| Route | Parameters and limits |
| --- | --- |
| Projects | `search` (max 255), `status`, `sortBy=name/status/start_date/end_date/created_at`, `sortOrder=ASC/DESC`; default created_at descending |
| Tasks/project tasks | `search`, `status`, `priority`, `project_id`, `assigned_to`, `sortBy=name/due_date/priority/status/created_at/updated_at`, `order=ASC/DESC`; default created_at descending. Lists are currently unpaginated. |
| Dashboard | `tz` IANA timezone; default Asia/Kolkata |
| Analytics | `days=7/30/90` (default 30), optional accessible `project_id`, `tz`. Range affects activity, totals show current state. |
| Search | `q`; up to five results of each permitted type |
| Team candidates | `search`; up to 50 active eligible accounts |
| Notifications | `limit=1..100` (default 50), `offset=0..1000000` |
| Reminders | optional `task_id`, `status=scheduled/sent/dismissed` |
| Admin users | `search`, exact `role`, `is_active=true/false/1/0`, `page` (1..1000000), `limit` (default 25; capped 100) |
| Audit | `search/action/resource_type/user_id/from/to/page/limit`; inclusive valid date range; default newest first |

Repeated/object query values are rejected. Sorting uses column allowlists and parameters are bound in SQL.

## Endpoints and example request bodies

Replace Postman variables with your own values. Most creation dates in examples are illustrative; reminders must always use a future instant. Do not run destructive examples against production data.

### Operations

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `GET /api/health` | Process liveness | Public |
| `GET /api/ready` | Database readiness | Public |

### Auth

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `POST /api/auth/register` | Register a Team Member | Public |
| `POST /api/auth/login` | Login; save returned token | Public |
| `POST /api/auth/logout` | Acknowledge client logout | `authenticated` |
| `GET /api/auth/me` | Current user and effective permissions | `authenticated` |

`POST /api/auth/register`

```json
{
  "full_name": "Test Person",
  "email": "{{email}}",
  "password": "{{password}}"
}
```

`POST /api/auth/login`

```json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```

### Projects

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `GET /api/projects` | Scoped project list | `projects.view` |
| `POST /api/projects` | Create owned project | `projects.view`, `projects.create` |
| `GET /api/projects/{id}` | Project details and members | `projects.view` |
| `PUT /api/projects/{id}` | Edit scoped project | `projects.view`, `projects.edit` |
| `DELETE /api/projects/{id}` | Delete project and its tasks | `projects.view`, `projects.delete` |

`POST /api/projects`

```json
{
  "name": "Release project",
  "description": "Quality review",
  "status": "Not Started",
  "start_date": "2028-01-01",
  "end_date": "2028-12-31"
}
```

`PUT /api/projects/{id}`

```json
{
  "name": "Updated release project",
  "status": "In Progress"
}
```

### Team

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `GET /api/projects/{id}/members` | Project members | `projects.view` |
| `POST /api/projects/{id}/members` | Add active member | `projects.view`, `team.manage` |
| `DELETE /api/projects/{id}/members/{userId}` | Remove member without open tasks | `projects.view`, `team.manage` |
| `GET /api/team/projects/{id}` | Scoped roster and workload | `projects.view`, `team.view` |
| `GET /api/team/projects/{id}/candidates` | Eligible active accounts, max 50 | `projects.view`, `team.view`, `team.manage` |

`POST /api/projects/{id}/members`

```json
{
  "user_id": "{{userId}}"
}
```

### Tasks

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `GET /api/projects/{id}/tasks` | Scoped project tasks | `projects.view`, `tasks.view` |
| `GET /api/tasks` | Scoped tasks | `tasks.view` |
| `POST /api/tasks` | Create task; assignment needs tasks.assign | `projects.view`, `tasks.view`, `tasks.create` |
| `GET /api/tasks/{id}` | Task details | `projects.view`, `tasks.view` |
| `PUT /api/tasks/{id}` | Edit task; status/assignee also require their permissions | `projects.view`, `tasks.view`, `tasks.edit` |
| `PATCH /api/tasks/{id}/assign` | Assign, reassign or unassign | `projects.view`, `tasks.view`, `tasks.assign` |
| `PATCH /api/tasks/{id}/status` | Change status; tasks.status_assigned also permits own assignments | `projects.view`, `tasks.view` |
| `PATCH /api/tasks/{id}/priority` | Change priority | `projects.view`, `tasks.view`, `tasks.edit` |
| `DELETE /api/tasks/{id}` | Delete task | `projects.view`, `tasks.view`, `tasks.delete` |

`POST /api/tasks`

```json
{
  "project_id": "{{projectId}}",
  "name": "Review quality checklist",
  "description": "Check tests",
  "status": "Pending",
  "priority": "High",
  "due_date": "2028-12-01",
  "assigned_to": null
}
```

`PUT /api/tasks/{id}`

```json
{
  "name": "Updated quality checklist",
  "priority": "Medium"
}
```

`PATCH /api/tasks/{id}/assign`

```json
{
  "assigned_to": "{{userId}}"
}
```

`PATCH /api/tasks/{id}/status`

```json
{
  "status": "Completed"
}
```

`PATCH /api/tasks/{id}/priority`

```json
{
  "priority": "High"
}
```

### Reports

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `GET /api/dashboard` | Scoped dashboard and personal reminders | `authenticated` |
| `GET /api/analytics` | Scoped reporting | `projects.view`, `tasks.view`, `analytics.view` |

### Search

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `GET /api/search` | Global search; result types follow permissions | `authenticated` |

### Notifications

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `GET /api/notifications` | Own notifications | `authenticated` |
| `GET /api/notifications/unread-count` | Own unread count | `authenticated` |
| `PATCH /api/notifications/{id}/read` | Mark owned notification read | `authenticated` |
| `PATCH /api/notifications/read-all` | Mark all own notifications read | `authenticated` |
| `GET /api/notifications/preferences` | Get own preferences | `authenticated` |
| `PUT /api/notifications/preferences` | Update boolean preferences | `authenticated` |

`PUT /api/notifications/preferences`

```json
{
  "email_task_assigned": true,
  "email_due_tomorrow": true,
  "email_overdue": true,
  "web_task_assigned": true,
  "web_due_tomorrow": true,
  "web_overdue": true,
  "browser_task_assigned": false,
  "browser_due_tomorrow": false
}
```

### Calendar

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `GET /api/reminders` | Own personal reminders | `authenticated` |
| `POST /api/reminders` | Create future personal reminder | `authenticated` |
| `PUT /api/reminders/{id}` | Edit/reschedule or dismiss reminder | `authenticated` |
| `DELETE /api/reminders/{id}` | Delete owned reminder | `authenticated` |
| `GET /api/calendar/events` | Own events | `authenticated` |
| `POST /api/calendar/events` | Create personal event | `authenticated` |
| `PUT /api/calendar/events/{id}` | Edit personal event | `authenticated` |
| `DELETE /api/calendar/events/{id}` | Delete owned event | `authenticated` |
| `GET /api/calendar/colours` | Own colour choices | `authenticated` |
| `PUT /api/calendar/colours` | Save category/item colour | `authenticated` |
| `DELETE /api/calendar/colours` | Reset own colours | `authenticated` |

`POST /api/reminders`

```json
{
  "title": "Review release",
  "notes": "Personal",
  "remind_at": "2030-01-01T09:00:00Z",
  "task_id": null
}
```

`PUT /api/reminders/{id}`

```json
{
  "status": "dismissed"
}
```

`POST /api/calendar/events`

```json
{
  "title": "Release review",
  "event_date": "2028-12-01",
  "start_time": "09:00",
  "end_time": "10:00",
  "notes": "Personal calendar entry"
}
```

`PUT /api/calendar/events/{id}`

```json
{
  "title": "Release review",
  "event_date": "2028-12-01",
  "start_time": null,
  "end_time": null,
  "notes": "All day"
}
```

`PUT /api/calendar/colours`

```json
{
  "key": "task",
  "colour": "#2563eb"
}
```

### Admin

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `GET /api/admin/users` | Admin-only account directory | `users.view` |
| `POST /api/admin/users` | Create account; privileged roles need users.roles | `users.create` |
| `GET /api/admin/users/{id}` | Account details | `users.view` |
| `PUT /api/admin/users/{id}` | Edit protected-level account profile | `users.edit` |
| `PATCH /api/admin/users/{id}/role` | Change role; protected admin boundaries | `users.roles` |
| `PATCH /api/admin/users/{id}/status` | Activate/deactivate; preserve active Super Admin | `users.status` |
| `PUT /api/admin/users/{id}/permissions` | Set boolean overrides or null | `users.roles` |
| `GET /api/admin/roles` | Policies and permission catalog | `users.view` |
| `PUT /api/admin/roles/{role}` | Update policy with optimistic version | `roles.manage` |
| `GET /api/admin/stats` | User/role statistics | `users.view` |

`POST /api/admin/users`

```json
{
  "full_name": "New Member",
  "email": "{{newEmail}}",
  "password": "{{password}}",
  "role": "member",
  "department": "Delivery",
  "job_title": "Contributor"
}
```

`PUT /api/admin/users/{id}`

```json
{
  "full_name": "Updated Member",
  "email": "{{newEmail}}",
  "department": "Delivery",
  "job_title": "Contributor"
}
```

`PATCH /api/admin/users/{id}/role`

```json
{
  "role": "member"
}
```

`PATCH /api/admin/users/{id}/status`

```json
{
  "is_active": false
}
```

`PUT /api/admin/users/{id}/permissions`

```json
{
  "overrides": {
    "tasks.create": false
  }
}
```

`PUT /api/admin/roles/{role}`

```json
{
  "permissions": [
    "projects.view",
    "tasks.view"
  ],
  "version": 1
}
```

### Audit

| Method and path | Behavior | Permission |
| --- | --- | --- |
| `GET /api/admin/audit-logs` | Admin audit history | `audit.view` |

## Postman workflow

Import the collection. Set `baseUrl`, `email`, `password`, and `newEmail` locally. Login stores `token` in collection variables; creation requests store project/task/reminder/event IDs. Set `userId` to an eligible account and `role` to the policy key you want to inspect. Use a demo/test database and an appropriate role. The collection contains admin and deletion requests; run them individually and inspect consequences.

## Notes

Personal reminders/events/colours are owned by the authenticated account even for administrators. Report/search data follows project scope; removing task viewing hides task metrics. Role overrides cannot grant administrative actions to non-admin roles. Last active Super Admin and self-modification protections apply. Role policy updates require the current `version`, obtainable from GET /admin/roles.

## Mobile-compatible pagination and deadline filters

`GET /api/projects`, `GET /api/tasks`, and `GET /api/projects/:id/tasks` accept optional `page` (1-10000) and `limit` (1-100, default 20). Supplying either activates database pagination. Without both, the legacy unpaged response remains compatible with the web client. Ties in the selected sort field are ordered by ID to keep pages deterministic.

```json
{"success":true,"count":20,"data":[],"pagination":{"page":1,"limit":20,"has_more":true}}
```

`count` is the number returned on this page. `has_more` uses one extra row, without loading the entire list or exposing totals from unrelated projects. The example shows envelope fields; real `data` contains the returned records.

Task list routes also accept `due_date=YYYY-MM-DD` and `overdue=true|false`. Overdue means an incomplete task due before today in `tz` (an IANA zone; default `APP_TIMEZONE` or `Asia/Kolkata`). Combined filters use AND. Invalid dates, zones and pagination return 400. The project-specific task route continues to enforce direct project access. `GET /api/projects/:id` includes `total_tasks`, `completed_tasks` and `progress`; these are null if effective `tasks.view` is absent.

Native clients use the same Bearer token and REST routes as the web client. They do not require a separate CORS origin or a separate backend/database.

## Mobile due-tomorrow push

Authenticated `POST /api/notifications/push-devices` accepts `{ "token": "ExpoPushToken[device]", "platform": "android" }` (or ios), returns 200 `{success:true,message:"Push device registered."}` and renews a 30-day device registration. Tokens are bound to the current user, never a supplied user ID; signing in on another account rebinds that installation. Strict validation rejects unknown fields/tokens/platforms with 400. Registration is rate limited to 30 requests/minute and returns 503 if PUSH_ENABLED is false.

Authenticated `DELETE /api/notifications/push-devices` accepts `{ "token": "ExpoPushToken[device]" }`, returns 200 and removes only the current user's matching device. It is idempotent and does not disclose another user's registrations. No token-list endpoint is exposed.

`GET /api/notifications/preferences` includes boolean `push_due_tomorrow` (default false). `PUT` accepts that optional boolean alongside existing preferences. Mobile push is independent of email/inbox/browser settings. The daily reminder job sends only incomplete, assigned, accessible tasks due tomorrow in APP_TIMEZONE. See [push setup and tests](MOBILE_PUSH.md).
