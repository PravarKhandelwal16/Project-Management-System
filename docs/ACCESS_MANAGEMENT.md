# Roles, permissions and management

## Responsibilities

| Role | Default responsibility | Project scope |
| --- | --- | --- |
| Super Admin | Platform ownership, administrator management and all permissions | Entire workspace |
| Workspace Administrator | User accounts, role policies, audits and workspace operations | Entire workspace |
| Portfolio Manager | Cross-project delivery, staffing and reporting | Entire workspace |
| Project Manager | Project planning, delivery, staffing and task management | Owned or joined projects |
| Project Coordinator | Schedule maintenance, task coordination and team records | Owned or joined projects |
| Team Lead | Task execution, allocation and team membership | Owned or joined projects |
| Team Member | View project work and update assigned task status | Owned or joined projects |
| Read-only Observer | Review project work and reporting | Owned or joined projects |

Role identifiers for existing accounts remain unchanged: `super_admin`, `admin`, `project_manager` and `member`. Additional identifiers are `portfolio_manager`, `project_coordinator`, `team_lead` and `viewer`. Existing accounts retain their role.

## Manage access

Open **User Management ? Roles & permissions** to edit the policy for a role. Policies are stored in MySQL; the shared catalog in `shared/access.json` defines supported permission keys, descriptions and initial defaults. Policies affect all users of that role on their next authenticated request. The frontend refreshes current user permissions on focus and every 30 seconds.

Open **User directory ? Permissions** to set individual Allow/Deny overrides. ?Role: allowed/denied? shows the current inherited policy. Restore role defaults clears overrides. Overrides take precedence over the policy. Changing a user's role clears overrides from their previous role.

A permission grants an action within accessible projects. The separate **Access every project in the workspace** permission expands project scope. Project ownership or membership does not bypass action permissions. Project lists, task lists, search, dashboards, teams and direct resource access use the same scope.

Administrative permissions remain reserved for administrator roles. Administrators cannot alter their own account, another administrator or a Super Admin. Only Super Admin can manage other administrators and edit the administrator role policy. Super Admin permissions are fixed to preserve platform recovery. Concurrent policy edits use version checks; reload the policy after a conflict.

The user directory supports account creation, profile updates, department and job title, role assignment, activation/deactivation, search and pagination. Passwords are hashed and never returned or recorded in audit entries. Deactivation applies to existing sessions on the next API request.

## Project teams

Open **Team** and choose an accessible project. The roster includes its owner, account status, management role, department and task workload. Workload counts are visible only with task viewing permission.

Team managers can search active workspace accounts and add members without accessing administrative account APIs. Candidate search returns up to 50 matches, excluding the owner and existing members. Refine the search when necessary.

The owner cannot be removed. Members with unfinished assigned work cannot be removed until it is reassigned or completed. Membership changes do not change a person's workspace job role. Team managers cannot change account permissions through the team page.

## Audit history

Audit history supports actor, action, resource, text and inclusive date-range filters, stable chronological ordering, pagination, expandable changes and CSV export of the displayed page. New events include actor name/email snapshots, IP address and a request ID. User, role and profile changes include before/after details. Failed sign-ins and authenticated permission denials are recorded. Sensitive password, secret and token fields are redacted.

Administrative writes and membership changes commit together with their audit events. Other existing project/task workflows retain their non-blocking audit service; an audit write failure in those workflows is logged by the server. Existing historical records remain available and may have less context. There are no audit update or delete APIs.

## Installation and migration

For an existing installation with Stage 4 task fields and Stage 6 notifications already installed:

```powershell
npm --prefix server run migrate:access
```

The migration uses the configured MySQL database, converts the role column to support the expanded catalog, adds profile/permission fields, creates role policies and adds audit context fields. It preserves existing users, memberships and audit history. It is safe to rerun and does not overwrite edited policies.

For a fresh installation, apply `database/schema.sql`, then:

```powershell
node server/scripts/runMigrationStage6.js
npm --prefix server run migrate:access
```

Restart the backend if it is not running with nodemon. Old Stage 3 role migrations are historical and must not be rerun after applying the access migration.

## Verification

```powershell
npm --prefix server test
npm --prefix client run build
npm --prefix client run lint
```

Backend tests create a uniquely named `pms_access_test_*` database and remove it afterwards. The configured MySQL account needs permission to create and drop that test database. Tests never modify the configured application database or send email. They cover role restrictions, direct resource scope, task permissions, immediate revocation, policy conflicts, user lifecycle, audit snapshots and membership rules.
