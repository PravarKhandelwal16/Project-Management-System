# Database setup and migration order

The canonical fresh-install path is `npm --prefix server run db:migrate`. Create DB_NAME first with utf8mb4; the migration command never creates or drops the database.

| Order | Source | Purpose |
| --- | --- | --- |
| 1 | schema.sql | Current base users/projects/members/tasks/audit tables |
| 2 | migration_stage6.sql | Notifications, preferences and delivery logs |
| 3 | server/scripts/migrateAccess.js | Operational roles, policy versions, profiles, audit snapshots |
| 4 | server/scripts/migratePlanning.js | Personal reminders/events/colours |
| 5 | server/scripts/migrateRelease.js | Daily unique delivery keys and useful composite indexes |

The runner removes legacy CREATE DATABASE/USE clauses so setup applies to the configured DB_NAME. All current migrations can rerun; tests check preservation of existing data. MySQL DDL commits implicitly, so a migration is not an all-or-nothing transaction.

Historical migration_stage3.sql and migration_stage4.sql describe older installations. Do not replay them on a current schema: they contain changes already represented in schema.sql. For pre-Stage-4 deployments, inspect missing task creator/membership columns and back up before applying the historical upgrade. The existing user's Stage-6 installation uses the current migrations directly.

The release migration adds nullable delivery_key to existing logs. Historical rows remain unchanged; new scheduled deliveries use unique keys. Notifications gain owner/read/date indexes, and tasks gain project/status/due indexes.

Use separate migration credentials with DDL privileges and runtime credentials with SELECT/INSERT/UPDATE/DELETE only. Keep MySQL on a private network. Check a restorable backup before migrating existing production data.

Schema and relationships: [DATABASE.md](../DATABASE.md).
