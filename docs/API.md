# API Documentation & Reference

Base path: `/api`. Send requests as JSON with `Content-Type: application/json`. Protected endpoints require an `Authorization: Bearer <token>` header containing a valid JSON Web Token. Public registration creates an account with the default role `member`; client-supplied role values during public registration are strictly rejected.

- [OpenAPI 3.0 specification](api/openapi.json)
- [Postman collection](api/Project-Management-System.postman_collection.json)

The OpenAPI and Postman files document all **58 REST operations**. They are maintained as static files so that production deployments do not expose an unauthenticated interactive Swagger console. Regenerate both artifacts at any time using:

```powershell
npm --prefix server run docs:generate
```

---

## 1. Response Envelopes & Conventions

All endpoints return JSON wrapped in standard envelope objects. Cache headers on dynamic responses are set to `Cache-Control: no-store`.

### 1.1 Success Envelopes

- **User Registration (HTTP 201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully"
  }
  ```

- **Authentication Login (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "<JWT_STRING>",
    "user": {
      "id": 1,
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "role": "member",
      "is_active": true,
      "permissions": ["projects.view", "tasks.view", "tasks.status_assigned"]
    }
  }
  ```
  *(Password hashes are never returned under any circumstances).*

- **Current User Session / Me (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "role": "member",
      "department": "Engineering",
      "job_title": "Full Stack Developer",
      "is_active": true,
      "permissions": ["projects.view", "tasks.view"]
    }
  }
  ```

- **Single Resource Creation / Retrieval / Mutation (HTTP 200 / 201)**:
  ```json
  {
    "success": true,
    "message": "Project created successfully",
    "data": {
      "id": 12,
      "name": "Q4 Release Pipeline",
      "description": "Production rollout checklist",
      "status": "In Progress",
      "start_date": "2028-10-01",
      "end_date": "2028-12-31",
      "user_id": 1,
      "created_at": "2028-10-01T10:00:00.000Z",
      "updated_at": "2028-10-01T10:00:00.000Z"
    }
  }
  ```

- **Standard Unpaginated Collections (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "count": 3,
    "data": [
      { "id": 1, "name": "Project Alpha" },
      { "id": 2, "name": "Project Beta" }
    ]
  }
  ```

- **Mobile-Ready Paginated Collections (HTTP 200 OK)**:
  *(Activated when `page` or `limit` query parameters are supplied to `/projects`, `/tasks`, or `/projects/:id/tasks`)*:
  ```json
  {
    "success": true,
    "count": 20,
    "data": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "has_more": true
    }
  }
  ```

- **Admin Paginated Lists (HTTP 200 OK)**:
  *(Used by `/admin/users` and `/admin/audit-logs`)*:
  ```json
  {
    "success": true,
    "data": [ ... ],
    "total": 42,
    "page": 1,
    "limit": 25,
    "actions": [ "USER_LOGIN", "PROJECT_CREATED" ]
  }
  ```

- **Action Acknowledgement (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "message": "Push device registered."
  }
  ```

### 1.2 Error Envelope

All error responses return a JSON envelope with `success: false` and a human-readable `message`. Validation errors may include an `errors` array with field-level details:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "path": ["email"],
      "message": "Invalid email address format"
    }
  ]
}
```

Internal server errors return a generic, safe error message (`"Internal server error"`). Stack traces, raw database queries, and filesystem paths are never leaked to clients.

---

## 2. HTTP Status Codes & Error Handling

| Status Code | Meaning | Typical Occurrences |
| --- | --- | --- |
| **200 OK** | Success | Successful GET, PUT, PATCH, DELETE, and login responses |
| **201 Created** | Created | Successful POST creation for users, projects, tasks, reminders, events |
| **400 Bad Request** | Validation Error | Invalid types, malformed JSON, out-of-range dates, disallowed sorting/filtering, extra body fields |
| **401 Unauthorized** | Authentication Required | Missing, malformed, or expired Bearer JWT token |
| **403 Forbidden** | Access Denied | Inactive account, insufficient RBAC permissions, accessing out-of-scope projects, unapproved CORS origin |
| **404 Not Found** | Resource Missing | Nonexistent project, task, user, reminder, calendar event, or inaccessible personal item |
| **409 Conflict** | Conflict | Duplicate email address, existing project membership, removing member with open tasks, last Super Admin protection, optimistic lock failure |
| **413 Payload Too Large** | Request Over Limit | Request body exceeds the strict 64 KiB payload limit |
| **429 Too Many Requests** | Rate Limited | Exceeded 50 auth requests per 15 minutes or 30 push device registrations per minute |
| **500 Internal Error** | Server Error | Unhandled server exception (safely logged without client leakage) |
| **503 Service Unavailable** | Dependency Unavailable | Database connectivity failure on `/api/ready` or `PUSH_ENABLED=false` when calling push device endpoints |

---

## 3. Authentication & Authorization Lifecycle

### 3.1 Token Verification & Session Handling
- Tokens are signed with HMAC-SHA256 using `JWT_SECRET`.
- The JWT payload contains only the user ID subject (`sub`), token ID (`jti`), and standard timestamps (`iat`, `exp`).
- User role, account status (`is_active`), and dynamic permission overrides are verified fresh against the database on **every single request**. Deactivating an account revokes access immediately without needing token revocation lists.
- Client logout is stateless: clients discard the stored JWT. Tokens expire automatically based on `JWT_EXPIRES_IN` (recommended: 8h to 24h).

### 3.2 Role-Based Access Control (RBAC)
The system defines 8 default roles with hierarchical responsibility:
1. `super_admin`: Platform owner with full administrative access; protected against self-demotion and deactivation if last active owner.
2. `admin`: Workspace administrator within protected account boundaries.
3. `portfolio_manager`: Cross-project oversight and organization-wide analytics.
4. `project_manager`: Full management of owned and assigned projects, task assignments, and staffing.
5. `project_coordinator`: Operational project planning and task tracking.
6. `team_lead`: Team delivery and assignment management.
7. `member`: Contributor role; can view assigned projects and update own task statuses.
8. `viewer`: Read-only observer across assigned projects.

### 3.3 Resource-Level Scoping
Access to projects, tasks, and project rosters enforces ownership and membership checks:
- A user can access a project if they are the **owner** (`user_id = req.user.id`), an active **project member** in `project_members`, or hold the administrative `projects.view_all` permission.
- Personal reminders, calendar events, and custom calendar colours are strictly owned by the authenticated user and isolated even from administrators.

### 3.4 Rate Limiting
- **Authentication Routes (`/auth/login`, `/auth/register`)**: 50 requests per 15 minutes per client IP.
- **Push Device Registration (`/notifications/push-devices`)**: 30 requests per minute per authenticated user.

---

## 4. Validation Rules & Field Constraints

- **Names**:
  - Full Name: 2 to 100 characters, trimmed.
  - Project Name: 2 to 255 characters, trimmed.
  - Task / Reminder / Event Title: 1 to 255 characters, trimmed.
- **Descriptions & Notes**: Optional strings, up to 5,000 characters.
- **Email**: Normalized RFC-compliant email, trimmed and lowercased, max 255 characters.
- **Password**: Minimum 8 characters, must contain at least one letter and one number, capped at **72 UTF-8 bytes** (bcrypt algorithmic limit).
- **Project Statuses**: `'Not Started'`, `'In Progress'`, `'Completed'`.
- **Task Statuses**: `'Pending'`, `'In Progress'`, `'Completed'`.
- **Task Priorities**: `'Low'`, `'Medium'`, `'High'`.
- **Dates**: Strict Gregorian dates formatted as `YYYY-MM-DD`. Rolled-over dates (e.g. `2028-02-31`) are rejected. Project `end_date` must not precede `start_date`.
- **Reminder Timestamps**: ISO-8601 timestamp with explicit timezone offset or UTC (`YYYY-MM-DDTHH:mm:ssZ` or `...+-HH:mm`). Must represent an instant in the **future**.
- **Calendar Event Times**: Wall-clock 24-hour time formatted as `HH:mm`. If provided, `end_time` must be chronologically after `start_time` on the same date. All-day events pass `null` for both times.
- **Colours**: 6-character hex color codes (`#RRGGBB`).
  - Allowed colour keys: Category keys (`task`, `reminder`, `event`, `completed`, `overdue`) or item-specific keys (`task:<id>`, `reminder:<id>`, `event:<id>`).
- **Push Device Tokens**: Format matching `^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$`. Platforms: `'android'` or `'ios'`.

---

## 5. Query Parameters & Filtering Reference

| Route | Parameter | Type / Constraints | Description / Defaults |
| --- | --- | --- | --- |
| `GET /api/projects` | `search` | String (max 255) | Case-insensitive substring match on project name and description. |
| | `status` | Enum | Filter by `'Not Started'`, `'In Progress'`, `'Completed'`. |
| | `sortBy` | Enum | `'name'`, `'status'`, `'start_date'`, `'end_date'`, `'created_at'`. |
| | `sortOrder` | Enum | `'ASC'`, `'DESC'`. Default is `'DESC'` by `created_at`. |
| | `page` | Integer (1–10,000) | Activates pagination envelope with `limit` (default 20). |
| | `limit` | Integer (1–100) | Page size limit (default 20, max 100). |
| `GET /api/tasks`<br>`GET /api/projects/:id/tasks` | `search` | String (max 255) | Case-insensitive match on task name and description. |
| | `status` | Enum | Filter by `'Pending'`, `'In Progress'`, `'Completed'`. |
| | `priority` | Enum | Filter by `'Low'`, `'Medium'`, `'High'`. |
| | `project_id` | Integer (>= 1) | Scope to specific project (on global `/api/tasks` route). |
| | `assigned_to` | Integer (>= 1) | Filter by assigned user ID. |
| | `sortBy` | Enum | `'name'`, `'due_date'`, `'priority'`, `'status'`, `'created_at'`, `'updated_at'`. |
| | `order` | Enum | `'ASC'`, `'DESC'`. Default is `'DESC'` by `created_at`. |
| | `due_date` | Date (`YYYY-MM-DD`) | Filter tasks due exactly on specified date. |
| | `overdue` | Boolean (`'true'`/`'false'`) | Incomplete tasks due before today in timezone `tz`. |
| | `tz` | String (IANA Timezone) | Timezone for deadline checks (default `APP_TIMEZONE` or `Asia/Kolkata`). |
| | `page` | Integer (1–10,000) | Activates paginated envelope with `limit`. |
| | `limit` | Integer (1–100) | Page size limit (default 20, max 100). |
| `GET /api/dashboard` | `tz` | String (IANA Timezone) | Local date calculation for summary counts. Default `Asia/Kolkata`. |
| `GET /api/analytics` | `days` | Enum: `7`, `30`, `90` | Rolling activity window. Default is `30`. |
| | `project_id` | Integer (>= 1) | Optional accessible project filter. |
| | `tz` | String (IANA Timezone) | Local date bucketing for daily activity chart. |
| `GET /api/search` | `q` | String (max 255) | Global search across accessible projects, tasks, and users (max 5 each). |
| `GET /api/team/projects/:id/candidates` | `search` | String (max 255) | Search active users eligible for project membership (capped at 50). |
| `GET /api/notifications` | `limit` | Integer (1–100) | Pagination limit. Default is 50. |
| | `offset` | Integer (0–1,000,000) | Pagination offset. Default is 0. |
| `GET /api/reminders` | `task_id` | Integer (>= 1) | Filter personal reminders linked to a specific task. |
| | `status` | Enum | Filter by `'scheduled'`, `'sent'`, `'dismissed'`. |
| `GET /api/admin/users` | `search` | String (max 255) | Substring match on user full name or email address. |
| | `role` | Enum | Filter by exact role key. |
| | `is_active` | Boolean | Filter active (`'true'`, `'1'`) or deactivated (`'false'`, `'0'`) accounts. |
| | `page` | Integer (1–1,000,000) | Page number (default 1). |
| | `limit` | Integer (1–100) | Page size (default 25, capped at 100). |
| `GET /api/admin/audit-logs` | `search` | String (max 255) | Substring match on actor name, email, action, details, or resource ID. |
| | `action` | String | Filter by exact audit action key. |
| | `resource_type` | String | Filter by resource type (e.g., `'PROJECT'`, `'TASK'`, `'USER'`). |
| | `user_id` | Integer (>= 1) | Filter audit entries performed by user ID. |
| | `from` | Date (`YYYY-MM-DD`) | Inclusive start date filter. |
| | `to` | Date (`YYYY-MM-DD`) | Inclusive end date filter. |
| | `page` | Integer (1–1,000,000) | Page number (default 1). |
| | `limit` | Integer (1–100) | Page size (default 25, capped at 100). |

---

## 6. Complete Endpoints Reference (58 Operations)

### 6.1 Operations & Health (2 Endpoints)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `GET /api/health` | Process liveness | None | Public | Confirms Express server process is running and responsive. |
| `GET /api/ready` | Database readiness | None | Public | Verifies active database connection pool readiness via `SELECT 1`. |

#### `GET /api/health`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "API is running"
  }
  ```

#### `GET /api/ready`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "API and database are ready"
  }
  ```
- **Response (503 Service Unavailable)**:
  ```json
  {
    "success": false,
    "message": "Service temporarily unavailable"
  }
  ```

---

### 6.2 Authentication & Session (4 Endpoints)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `POST /api/auth/register` | Register Team Member | None | Public | Creates a new user account with default role `member`. |
| `POST /api/auth/login` | Authenticate User | None | Public | Verifies credentials, returns Bearer JWT and user profile. |
| `POST /api/auth/logout` | Client Logout | `authenticated` | Bearer | Acknowledges client-side token discard and logs audit entry. |
| `GET /api/auth/me` | Current User Profile | `authenticated` | Bearer | Returns the authenticated user's profile and effective permissions. |

#### `POST /api/auth/register`
- **Request Body**:
  ```json
  {
    "full_name": "Jane Developer",
    "email": "jane@example.com",
    "password": "StrongPassword123"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully"
  }
  ```

#### `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "StrongPassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 5,
      "full_name": "Jane Developer",
      "email": "jane@example.com",
      "role": "member",
      "is_active": true,
      "permissions": ["projects.view", "tasks.view", "tasks.status_assigned"]
    }
  }
  ```

#### `POST /api/auth/logout`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logout successful"
  }
  ```

#### `GET /api/auth/me`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": 5,
      "full_name": "Jane Developer",
      "email": "jane@example.com",
      "role": "member",
      "department": "Core Product",
      "job_title": "Backend Engineer",
      "is_active": true,
      "permissions": ["projects.view", "tasks.view", "tasks.status_assigned"]
    }
  }
  ```

---

### 6.3 Projects Management (5 Endpoints)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `GET /api/projects` | Scoped project list | `projects.view` | Bearer | Returns accessible projects (filtered, sorted, optionally paginated). |
| `POST /api/projects` | Create owned project | `projects.view`, `projects.create` | Bearer | Creates a new project owned by current user. |
| `GET /api/projects/{id}` | Project details & members | `projects.view` | Bearer | Returns project info, members, and task summary metrics. |
| `PUT /api/projects/{id}` | Edit scoped project | `projects.view`, `projects.edit` | Bearer | Updates project fields (partial or full). |
| `DELETE /api/projects/{id}` | Delete project | `projects.view`, `projects.delete` | Bearer | Deletes project and cascades deletion to tasks & memberships. |

#### `POST /api/projects`
- **Request Body**:
  ```json
  {
    "name": "Mobile Client v2",
    "description": "Cross-platform mobile client implementation",
    "status": "Not Started",
    "start_date": "2028-11-01",
    "end_date": "2028-12-31"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Project created successfully",
    "data": {
      "id": 14,
      "name": "Mobile Client v2",
      "description": "Cross-platform mobile client implementation",
      "status": "Not Started",
      "start_date": "2028-11-01",
      "end_date": "2028-12-31",
      "user_id": 5,
      "created_at": "2028-10-09T00:00:00.000Z",
      "updated_at": "2028-10-09T00:00:00.000Z"
    }
  }
  ```

#### `GET /api/projects/{id}`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 14,
      "name": "Mobile Client v2",
      "description": "Cross-platform mobile client implementation",
      "status": "In Progress",
      "start_date": "2028-11-01",
      "end_date": "2028-12-31",
      "user_id": 5,
      "owner_name": "Jane Developer",
      "total_tasks": 8,
      "completed_tasks": 3,
      "progress": 38,
      "members": [
        {
          "id": 22,
          "project_id": 14,
          "user_id": 8,
          "full_name": "Alice Smith",
          "email": "alice@example.com",
          "role": "member",
          "created_at": "2028-10-09T01:00:00.000Z"
        }
      ]
    }
  }
  ```

#### `PUT /api/projects/{id}`
- **Request Body**:
  ```json
  {
    "name": "Mobile Client v2 (Production)",
    "status": "In Progress"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Project updated successfully",
    "data": {
      "id": 14,
      "name": "Mobile Client v2 (Production)",
      "status": "In Progress"
    }
  }
  ```

#### `DELETE /api/projects/{id}`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Project deleted successfully"
  }
  ```

---

### 6.4 Project Team Management (5 Endpoints)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `GET /api/projects/{id}/members` | Project members | `projects.view` | Bearer | Lists all members assigned to project. |
| `POST /api/projects/{id}/members` | Add member | `projects.view`, `team.manage` | Bearer | Assigns an active user as member to the project. |
| `DELETE /api/projects/{id}/members/{userId}` | Remove member | `projects.view`, `team.manage` | Bearer | Removes member (blocked if member has open tasks). |
| `GET /api/team/projects/{id}` | Team roster & workload | `projects.view`, `team.view` | Bearer | Returns members, task workload counts, and overdue tallies. |
| `GET /api/team/projects/{id}/candidates` | Eligible candidate users | `projects.view`, `team.view`, `team.manage` | Bearer | Returns active users not yet in project (max 50). |

#### `POST /api/projects/{id}/members`
- **Request Body**:
  ```json
  {
    "user_id": 8
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Member added to project successfully",
    "data": [
      {
        "id": 22,
        "project_id": 14,
        "user_id": 8,
        "full_name": "Alice Smith",
        "email": "alice@example.com",
        "role": "member"
      }
    ]
  }
  ```

#### `GET /api/team/projects/{id}`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "project": { "id": 14, "name": "Mobile Client v2", "user_id": 5 },
    "can_manage": true,
    "data": [
      {
        "user_id": 5,
        "full_name": "Jane Developer",
        "email": "jane@example.com",
        "role": "project_manager",
        "is_owner": 1,
        "assigned_tasks": 2,
        "open_tasks": 1,
        "overdue_tasks": 0
      },
      {
        "user_id": 8,
        "full_name": "Alice Smith",
        "email": "alice@example.com",
        "role": "member",
        "is_owner": 0,
        "assigned_tasks": 4,
        "open_tasks": 3,
        "overdue_tasks": 1
      }
    ]
  }
  ```

---

### 6.5 Tasks Management (9 Endpoints)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `GET /api/projects/{id}/tasks` | Scoped project tasks | `projects.view`, `tasks.view` | Bearer | Lists tasks for a specific project with filters & pagination. |
| `GET /api/tasks` | Global scoped tasks | `tasks.view` | Bearer | Lists all accessible tasks across accessible projects. |
| `POST /api/tasks` | Create task | `projects.view`, `tasks.view`, `tasks.create` | Bearer | Creates task in project. Requires `tasks.assign` to set assignee. |
| `GET /api/tasks/{id}` | Task details | `projects.view`, `tasks.view` | Bearer | Returns task details, project name, creator, and assignee. |
| `PUT /api/tasks/{id}` | Edit task | `projects.view`, `tasks.view`, `tasks.edit` | Bearer | Updates task fields. Assignee/status need respective permissions. |
| `PATCH /api/tasks/{id}/assign` | Assign / unassign task | `projects.view`, `tasks.view`, `tasks.assign` | Bearer | Updates assignee (`user_id` or `null` to unassign). Idempotent. |
| `PATCH /api/tasks/{id}/status` | Update task status | `projects.view`, `tasks.view` | Bearer | Changes status. Permitted if user has `tasks.status_assigned` and is assignee. |
| `PATCH /api/tasks/{id}/priority` | Update task priority | `projects.view`, `tasks.view`, `tasks.edit` | Bearer | Changes task priority (`Low`, `Medium`, `High`). |
| `DELETE /api/tasks/{id}` | Delete task | `projects.view`, `tasks.view`, `tasks.delete` | Bearer | Deletes task and dispatches notifications if required. |

#### `POST /api/tasks`
- **Request Body**:
  ```json
  {
    "project_id": 14,
    "name": "Implement Push Notifications",
    "description": "Integrate Expo push tokens and server scheduler",
    "status": "Pending",
    "priority": "High",
    "due_date": "2028-11-15",
    "assigned_to": 8
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Task created successfully",
    "data": {
      "id": 105,
      "project_id": 14,
      "name": "Implement Push Notifications",
      "description": "Integrate Expo push tokens and server scheduler",
      "status": "Pending",
      "priority": "High",
      "due_date": "2028-11-15",
      "assigned_to": 8,
      "created_by": 5,
      "created_at": "2028-10-09T02:00:00.000Z"
    }
  }
  ```

#### `PATCH /api/tasks/{id}/status`
- **Request Body**:
  ```json
  {
    "status": "In Progress"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Task status updated to In Progress",
    "data": {
      "id": 105,
      "status": "In Progress"
    }
  }
  ```

#### `PATCH /api/tasks/{id}/assign`
- **Request Body**:
  ```json
  {
    "assigned_to": 8
  }
  ```
  *(To unassign, pass `"assigned_to": null`)*.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Task assigned successfully",
    "data": {
      "id": 105,
      "assigned_to": 8
    }
  }
  ```

---

### 6.6 Reports & Analytics (2 Endpoints)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `GET /api/dashboard` | Scoped dashboard summary | `authenticated` | Bearer | Returns KPI cards, project summary, upcoming tasks, and scheduled reminders. |
| `GET /api/analytics` | Scoped analytics report | `projects.view`, `tasks.view`, `analytics.view` | Bearer | Returns breakdown charts, velocity, and completion statistics. |

#### `GET /api/dashboard`
- **Query Parameters**: `tz` (e.g. `Asia/Kolkata`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "summary": {
        "totalProjects": 4,
        "completedProjects": 1,
        "totalTasks": 28,
        "completedTasks": 14,
        "pendingTasks": 8,
        "inProgressTasks": 6,
        "overdueTasks": 2,
        "dueSoonTasks": 4
      },
      "projects": [ ... ],
      "tasks": [ ... ],
      "reminders": [
        {
          "id": 4,
          "title": "Review release checklist",
          "task_id": 105,
          "remind_at": "2028-11-14T09:00:00Z"
        }
      ]
    }
  }
  ```

#### `GET /api/analytics`
- **Query Parameters**: `days` (`7`, `30`, `90`), `project_id` (optional), `tz`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "summary": { ... },
      "taskActivity": [
        { "date": "2028-10-01", "created": 3, "completed": 2 },
        { "date": "2028-10-02", "created": 1, "completed": 4 }
      ],
      "workload": [
        { "user_id": 8, "name": "Alice Smith", "tasks": 5, "completed": 2 }
      ],
      "projects": [ ... ]
    }
  }
  ```

---

### 6.7 Global Search (1 Endpoint)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `GET /api/search` | Unified global search | `authenticated` | Bearer | Searches accessible projects, tasks, and users. Max 5 results per entity. |

#### `GET /api/search`
- **Query Parameters**: `q=release`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "projects": [
        { "id": 14, "name": "Mobile Client v2", "status": "In Progress", "type": "project" }
      ],
      "tasks": [
        { "id": 105, "name": "Review release checklist", "status": "Pending", "project_name": "Mobile Client v2", "type": "task" }
      ],
      "users": [
        { "id": 8, "name": "Alice Smith", "role": "member", "type": "user" }
      ]
    }
  }
  ```

---

### 6.8 Notifications & Mobile Push (8 Endpoints)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `GET /api/notifications` | Own notification feed | `authenticated` | Bearer | Returns paginated in-app notifications for current user. |
| `GET /api/notifications/unread-count` | Unread notifications count | `authenticated` | Bearer | Returns tally of unread in-app notifications. |
| `PATCH /api/notifications/{id}/read` | Mark notification read | `authenticated` | Bearer | Marks a specific owned notification as read. |
| `PATCH /api/notifications/read-all` | Mark all notifications read | `authenticated` | Bearer | Marks all owned notifications as read in bulk. |
| `GET /api/notifications/preferences` | Get notification settings | `authenticated` | Bearer | Retrieves user's email, in-app, browser, and push preferences. |
| `PUT /api/notifications/preferences` | Update settings | `authenticated` | Bearer | Updates boolean delivery preferences. Unknown keys rejected with 400. |
| `POST /api/notifications/push-devices` | Register mobile push device | `authenticated` | Bearer | Registers or renews Expo push token (30-day validity, rate limit 30/min). |
| `DELETE /api/notifications/push-devices` | Remove push device | `authenticated` | Bearer | Idempotently deletes registration for specified push token. |

#### `GET /api/notifications/unread-count`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "count": 3
    }
  }
  ```

#### `PUT /api/notifications/preferences`
- **Request Body**:
  ```json
  {
    "email_task_assigned": true,
    "email_due_tomorrow": true,
    "email_overdue": true,
    "web_task_assigned": true,
    "web_due_tomorrow": true,
    "web_overdue": true,
    "browser_task_assigned": false,
    "browser_due_tomorrow": false,
    "push_due_tomorrow": true
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Preferences updated successfully"
  }
  ```

#### `POST /api/notifications/push-devices`
- **Request Body**:
  ```json
  {
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "android"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Push device registered."
  }
  ```

#### `DELETE /api/notifications/push-devices`
- **Request Body**:
  ```json
  {
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Push device removed."
  }
  ```

---

### 6.9 Calendar, Reminders & Themes (11 Endpoints)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `GET /api/reminders` | Personal reminders | `authenticated` | Bearer | Lists user's scheduled personal reminders (optional `task_id`, `status`). |
| `POST /api/reminders` | Create reminder | `authenticated` | Bearer | Schedules future reminder (optional attachment to accessible task). |
| `PUT /api/reminders/{id}` | Edit / dismiss reminder | `authenticated` | Bearer | Reschedules reminder or dismisses it via `{"status":"dismissed"}`. |
| `DELETE /api/reminders/{id}` | Delete reminder | `authenticated` | Bearer | Deletes personal reminder. |
| `GET /api/calendar/events` | Calendar events | `authenticated` | Bearer | Lists personal calendar events ordered by date and time. |
| `POST /api/calendar/events` | Create calendar event | `authenticated` | Bearer | Creates personal event (all-day or timed with `HH:mm`). |
| `PUT /api/calendar/events/{id}` | Edit calendar event | `authenticated` | Bearer | Updates personal calendar event details. |
| `DELETE /api/calendar/events/{id}` | Delete calendar event | `authenticated` | Bearer | Deletes personal calendar event. |
| `GET /api/calendar/colours` | Custom calendar colours | `authenticated` | Bearer | Returns user's category and item hex color mappings. |
| `PUT /api/calendar/colours` | Save custom colour | `authenticated` | Bearer | Upserts hex color for key (`task`, `event`, or `task:<id>`). |
| `DELETE /api/calendar/colours` | Reset colours | `authenticated` | Bearer | Clears all custom calendar colours for the user. |

#### `POST /api/reminders`
- **Request Body**:
  ```json
  {
    "title": "Review final pull request",
    "notes": "Verify CI passes and migrations run smoothly",
    "remind_at": "2030-01-01T09:00:00Z",
    "task_id": 105
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 19,
      "user_id": 5,
      "task_id": 105,
      "title": "Review final pull request",
      "notes": "Verify CI passes and migrations run smoothly",
      "status": "scheduled",
      "remind_at": "2030-01-01T09:00:00Z",
      "sent_at": null,
      "created_at": "2028-10-09T03:00:00.000Z"
    }
  }
  ```

#### `PUT /api/reminders/{id}` (Dismiss)
- **Request Body**:
  ```json
  {
    "status": "dismissed"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 19,
      "status": "dismissed"
    }
  }
  ```

#### `POST /api/calendar/events`
- **Request Body**:
  ```json
  {
    "title": "Sprint Planning",
    "event_date": "2028-11-02",
    "start_time": "10:00",
    "end_time": "11:30",
    "notes": "Bi-weekly sprint planning session"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 31,
      "title": "Sprint Planning",
      "notes": "Bi-weekly sprint planning session",
      "event_date": "2028-11-02",
      "start_time": "10:00",
      "end_time": "11:30"
    }
  }
  ```

#### `PUT /api/calendar/colours`
- **Request Body**:
  ```json
  {
    "key": "task",
    "colour": "#2563eb"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```

---

### 6.10 System Administration & Policies (10 Endpoints)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `GET /api/admin/users` | Directory of user accounts | `users.view` | Bearer | Returns paginated list of accounts with roles and active status. |
| `POST /api/admin/users` | Create user account | `users.create` | Bearer | Creates new account. Privileged roles require `users.roles`. |
| `GET /api/admin/users/{id}` | User account details | `users.view` | Bearer | Returns user details, role, and effective permissions. |
| `PUT /api/admin/users/{id}` | Update user profile | `users.edit` | Bearer | Updates account name, email, department, job title. Protected levels enforced. |
| `PATCH /api/admin/users/{id}/role` | Change user role | `users.roles` | Bearer | Reassigns role. Clears overrides. Protects last active Super Admin. |
| `PATCH /api/admin/users/{id}/status` | Activate / deactivate user | `users.status` | Bearer | Toggles `is_active`. Protects last active Super Admin. |
| `PUT /api/admin/users/{id}/permissions` | Set permission overrides | `users.roles` | Bearer | Overrides individual permissions (booleans, or `null` to reset). |
| `GET /api/admin/roles` | Role policies & catalog | `users.view` | Bearer | Returns role permission policies, version tokens, and full permission list. |
| `PUT /api/admin/roles/{role}` | Update role policy | `roles.manage` | Bearer | Updates role permission list using optimistic concurrency (`version`). |
| `GET /api/admin/stats` | System user statistics | `users.view` | Bearer | Returns aggregate user counts (total, active, inactive) and role distribution. |

#### `POST /api/admin/users`
- **Request Body**:
  ```json
  {
    "full_name": "Marcus Aurelius",
    "email": "marcus@example.com",
    "password": "TempPassword123",
    "role": "project_manager",
    "department": "Operations",
    "job_title": "Senior PM"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 9,
      "full_name": "Marcus Aurelius",
      "email": "marcus@example.com",
      "role": "project_manager",
      "department": "Operations",
      "job_title": "Senior PM",
      "is_active": 1,
      "created_at": "2028-10-09T03:30:00.000Z"
    }
  }
  ```

#### `PATCH /api/admin/users/{id}/role`
- **Request Body**:
  ```json
  {
    "role": "team_lead"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 9,
      "role": "team_lead"
    }
  }
  ```

#### `PUT /api/admin/users/{id}/permissions`
- **Request Body**:
  ```json
  {
    "overrides": {
      "tasks.delete": true,
      "tasks.create": true
    }
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 9,
      "role": "team_lead",
      "permissions": [ ... ],
      "permission_overrides": { "tasks.delete": true, "tasks.create": true }
    }
  }
  ```

#### `PUT /api/admin/roles/{role}`
- **Request Body**:
  ```json
  {
    "permissions": [
      "projects.view",
      "projects.create",
      "tasks.view",
      "tasks.create",
      "tasks.edit",
      "tasks.assign"
    ],
    "version": 1
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "role_key": "team_lead",
        "role_name": "Team Lead",
        "permissions": [ "projects.view", "projects.create", "tasks.view", "tasks.create", "tasks.edit", "tasks.assign" ],
        "version": 2
      }
    ]
  }
  ```

#### `GET /api/admin/stats`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "users": {
        "total_users": 15,
        "active_users": 14,
        "inactive_users": 1
      },
      "roles": [
        { "role": "super_admin", "count": 1 },
        { "role": "admin", "count": 2 },
        { "role": "project_manager", "count": 3 },
        { "role": "member", "count": 9 }
      ]
    }
  }
  ```

---

### 6.11 Audit Trail (1 Endpoint)

| Method & Path | Summary | Permission | Auth | Description |
| --- | --- | --- | --- | --- |
| `GET /api/admin/audit-logs` | Administrative audit history | `audit.view` | Bearer | Immutable audit trail with date ranges, actor info, and change details. |

#### `GET /api/admin/audit-logs`
- **Query Parameters**: `action=USER_LOGIN`, `from=2028-10-01`, `to=2028-10-09`, `page=1`, `limit=25`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 142,
        "user_id": 5,
        "actor_name": "Jane Developer",
        "actor_email": "jane@example.com",
        "action": "USER_LOGIN",
        "resource_type": "USER",
        "resource_id": 5,
        "details": {
          "email": "jane@example.com",
          "ip": "127.0.0.1"
        },
        "created_at": "2028-10-09T04:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 25,
    "actions": [
      "PROJECT_CREATED",
      "PROJECT_DELETED",
      "PROJECT_MEMBER_ADDED",
      "PROJECT_UPDATED",
      "ROLE_PERMISSIONS_UPDATED",
      "TASK_ASSIGNED",
      "TASK_CREATED",
      "TASK_STATUS_CHANGED",
      "USER_CREATED",
      "USER_LOGIN",
      "USER_LOGIN_FAILED",
      "USER_LOGOUT",
      "USER_PERMISSIONS_UPDATED",
      "USER_ROLE_UPDATED",
      "USER_STATUS_UPDATED"
    ]
  }
  ```

---

## 7. Mobile Client Integration

Native mobile clients (React Native / Expo) communicate directly with the same Express REST API using standard HTTPS requests:

1. **Shared Authentication**: Native clients store Bearer tokens in device hardware keystores (`Expo SecureStore`), attaching `Authorization: Bearer <token>` to requests. No separate mobile backend or shadow database is maintained.
2. **Dual-Mode Pagination**:
   - Calling `GET /api/projects` or `GET /api/tasks` without pagination parameters returns the standard flat array with `count`.
   - Supplying `page` (1–10,000) or `limit` (1–100, default 20) switches the response to the mobile-optimized pagination envelope:
     ```json
     {
       "success": true,
       "count": 20,
       "data": [ ... ],
       "pagination": { "page": 1, "limit": 20, "has_more": true }
     }
     ```
   - Ordering ties on sorted columns are deterministically resolved by secondary ID sorting to prevent duplicated or missing rows across mobile scroll pages.
3. **Deadline and Overdue Filtering**:
   - `due_date=YYYY-MM-DD`: Exact calendar match.
   - `overdue=true`: Matches incomplete tasks (`status != 'Completed'`) whose due date is earlier than today in timezone `tz`.
   - `tz`: IANA timezone string (e.g. `America/New_York`, `Asia/Kolkata`).
4. **Push Notification Lifecycle**:
   - When the user signs in on a device and enables notifications, the mobile client requests an Expo push token (`ExponentPushToken[...]`) and registers it via `POST /api/notifications/push-devices`.
   - Device registrations expire after 30 days and are automatically renewed upon app launch.
   - Signing into another account rebinds the token to that user. Logging out or opting out invokes `DELETE /api/notifications/push-devices`.
   - The daily background task scheduler scans for assigned, incomplete tasks due tomorrow in `APP_TIMEZONE` and delivers push notifications to registered devices.

---

## 8. Postman Collection & Workflow

The repository includes a ready-to-run Postman collection at [`docs/api/Project-Management-System.postman_collection.json`](api/Project-Management-System.postman_collection.json).

### Collection Variables
The collection is preconfigured with the following collection variables:
- `baseUrl`: Base API URL (default: `http://localhost:5000/api`)
- `token`: Bearer token (automatically populated by the `POST /auth/login` test script)
- `email`: User email for login/registration
- `password`: User password
- `newEmail`: Target email address for user creation tests
- `projectId`: Tracked project ID (automatically captured on `POST /projects`)
- `taskId`: Tracked task ID (automatically captured on `POST /tasks`)
- `userId`: Target user ID for membership and admin mutations
- `notificationId`: Target notification ID
- `reminderId`: Tracked reminder ID (automatically captured on `POST /reminders`)
- `eventId`: Tracked event ID (automatically captured on `POST /calendar/events`)
- `role`: Role key for policy inspections (default: `member`)

### Automated Token Chaining
When you execute `POST /auth/login` in Postman, an embedded test script automatically updates the `token` collection variable:
```javascript
if (pm.response.code === 200) {
  pm.collectionVariables.set('token', pm.response.json().token);
}
```
Subsequent requests in the collection automatically inject the bearer token via `{{token}}`. Creation requests similarly save returned IDs into collection variables for easy testing of subsequent GET, PUT, PATCH, and DELETE operations.
