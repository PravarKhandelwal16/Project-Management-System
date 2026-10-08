# Workspace planning

## Pages and workflows

- **Dashboard** shows active projects, personal open work, deadlines, project completion, daily activity and your next reminders. New project, task and reminder actions use working forms.
- **Projects** provides card/list views, owner and status filters, target dates, task completion and overdue counts. Create/edit/delete actions follow the permission policy. Project details include a task preview with creation and links to the full task list.
- **Tasks** supports list and board views, search, project/status/priority/assignment/deadline filters, sorting and pagination. Task creation includes project, description, due date, priority and eligible assignees. Assigned contributors can update status; full editing and reassignment require the corresponding permissions.
- **Task details** brings together the description, ownership, status, deadline and your personal reminders.
- **Analytics** provides project scope, 7/30/90 day activity ranges, status/priority breakdowns, project health, workload distribution and a project-health CSV export. Health/workload totals represent current state; the selected period applies to creation/completion trends.
- **Calendar** provides month and agenda views of dated tasks and personal reminders. Select a date to see its agenda or create a task with that due date. Add a reminder on a selected date, or attach one from Tasks/Task details. Tasks without a due date remain available through a link to the task list.

Existing role and project-scope restrictions apply throughout. Members can set personal reminders even when they cannot create project tasks. People with task viewing removed can still use Calendar for their personal reminders. Analytics requires reporting, project viewing and task viewing access.

## Reminders

Reminders belong to the authenticated account, including administrator-created reminders. Other accounts cannot list, edit or delete them through reminder APIs. Titles and notes are omitted from administrative audit details; scheduling metadata and delivery outcomes are recorded.

Personal reminders can be standalone or attached to an accessible task. They support editing, dismissal, rescheduling and deletion. Calendar can optionally display sent/dismissed history.

The browser converts the chosen local time into an explicit UTC instant. The database stores UTC and the calendar displays the reminder in the viewer's local time zone. Activity trends are also grouped in the viewer's time zone without requiring MySQL named-zone tables.

The running backend checks due reminders every minute and once at startup. It creates an in-app notification in the notification bell/page and marks the reminder sent in the same transaction. Concurrent workers lock distinct due reminders to prevent duplicate notifications. Delivery and dismissal audit events commit with the notification change. The notification dropdown refreshes every 60 seconds, so alerts may take up to roughly two minutes to appear.

Task-linked reminders are dismissed at delivery if the task is completed or no longer accessible. Inactive accounts are skipped until reactivated. When the backend is offline, delivery resumes after startup. Deleting a linked task preserves the reminder as a standalone personal reminder. Personal reminders currently use the in-app channel; the existing automatic task due/overdue email reminders are separate.

## Migration

For an existing installation with access management and notifications installed:

```powershell
npm --prefix server run migrate:planning
```

This creates the reminders table without changing existing projects/tasks. It is safe to rerun. The migration is applied to the local development database in this workspace. Run it on other databases before starting this version.

For a fresh installation, apply `database/schema.sql`, the Stage 6 notification migration, `npm --prefix server run migrate:access` and finally the planning migration. MySQL 8.0+ is required for the worker locking.

## API additions

```text
GET    /api/analytics?project_id=&days=30&tz=Asia/Kolkata
GET    /api/reminders?task_id=&status=scheduled
POST   /api/reminders
PUT    /api/reminders/:id
DELETE /api/reminders/:id
```

A reminder payload contains `title`, optional `notes`, optional `task_id`, and `remind_at` as an ISO timestamp with a time-zone suffix. `PUT` accepts a complete reminder payload to edit/reschedule, or `{ "status": "dismissed" }` to dismiss.

## Verification

```powershell
npm --prefix server test
npm --prefix client run build
npm --prefix client run lint
```

The integration suite runs in an isolated temporary database. It covers reporting scope, hidden task totals, time-zone boundaries, reminder privacy/validation, concurrent delivery, inactive-account delivery, completed-task dismissal and access revocation, alongside existing account/role/membership coverage.
