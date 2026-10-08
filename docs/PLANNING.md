# Workspace planning

## Pages and workflows

- **Dashboard** shows active projects, personal open work, deadlines, project completion, daily activity and your next reminders. New project, task and reminder actions use working forms.
- **Projects** provides card/list views, owner and status filters, target dates, task completion and overdue counts. Create/edit/delete actions follow the permission policy. Project details include a task preview with creation and links to the full task list.
- **Tasks** supports list and board views, search, project/status/priority/assignment/deadline filters, sorting and pagination. Task creation includes project, description, due date, priority and eligible assignees. Assigned contributors can update status; full editing and reassignment require the corresponding permissions.
- **Task details** brings together the description, ownership, status, deadline and your personal reminders.
- **Analytics** provides project scope, 7/30/90 day activity ranges, status/priority breakdowns, project health, workload distribution and a project-health CSV export. Health/workload totals represent current state; the selected period applies to creation/completion trends.
- **Calendar** provides month and agenda views of dated tasks, personal reminders and personal events. The whole date cell selects a day; individual items open their task or editing form. Select a date to see its agenda or create a task with that due date. Add a reminder on a selected date, or attach one from Tasks/Task details. Tasks without a due date remain available through a link to the task list.

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

This creates the reminders, calendar_events and calendar_colours tables without changing existing projects/tasks. It is safe to rerun. The migration is applied to the local development database in this workspace. Run it on other databases before starting this version.

For a fresh installation, apply `database/schema.sql`, the Stage 6 notification migration, `npm --prefix server run migrate:access` and finally the planning migration. MySQL 8.0+ is required for the worker locking.

## API additions

```text
GET    /api/calendar/events
POST   /api/calendar/events
PUT    /api/calendar/events/:id
DELETE /api/calendar/events/:id
GET    /api/calendar/colours
PUT    /api/calendar/colours
DELETE /api/calendar/colours
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

## Calendar appearance and personal events

Events belong to the authenticated account. Administrators cannot read or change another person's events through these APIs; audit entries omit private titles and notes. An event payload contains `title`, optional `notes`, `event_date` (`YYYY-MM-DD`), and optional `start_time` / `end_time` (`HH:mm`). Events with no start time are all-day events. Timed events use the calendar's local wall-clock date/time and last one day. Events do not send notifications; use a reminder for that.

Tasks, reminders and events appear beneath their dates. The first three items are visible in each cell; the **more** button selects the date and exposes its full agenda. Adding an item moves to its date. Undated tasks do not appear on the month grid.

The **Colours** button edits the five category colours and individual items on the selected day. Colour choices persist per account in the database and apply across devices. Item choices override category colours. **Reset colours** clears both. The colour API accepts `{ "key": "task", "colour": "#2563eb" }` or an item key such as `task:12`, `reminder:7` or `event:3`. Item labels remain visible so colour is not the only indication of type.

## Shared presentation

All authenticated pages use the same responsive 1440px content limit and gutters. The logo and favicon share the ProjectMaster project/checkmark design. Page arrivals, cards and dialogs animate; reduced-motion settings disable motion. Loading views use accessible skeletons. Enabled buttons and links have hover/focus feedback.

Team and project member lists offer an **Email** link. It opens a Gmail compose tab with the recipient filled in; it does not send a message.

The integration suite also validates event ownership, date/time validation, private audit details, saved category/item colours and independent per-account resets.

Destructive actions use an app-styled confirmation dialog rather than `window.confirm`. It names the affected item and consequence, starts focus on Cancel, supports Escape and keyboard navigation, and prevents background interaction. Project/task/reminder/event deletion, member removal, account status changes and calendar-colour resets all use this shared confirmation flow. Cancelling does not send the mutation request.
