const { pool } = require('../config/db');
const { resolveAccess, projectScope, hasPermission } = require('../services/accessService');
const { createAuditLog } = require('../models/auditModel');
async function dispatchPersonalReminders() {
  const connection = await pool.getConnection(); let delivered = 0;
  try {
    // Avoid gap locks when multiple scheduler workers claim different due reminders.
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const [reminders] = await connection.query(`SELECT r.* FROM reminders r
      WHERE r.status = 'scheduled' AND r.remind_at <= UTC_TIMESTAMP()
        AND EXISTS (SELECT 1 FROM users u WHERE u.id = r.user_id AND u.is_active = 1)
      ORDER BY r.remind_at, r.id LIMIT 100 FOR UPDATE SKIP LOCKED`);
    for (const reminder of reminders) {
      if (reminder.task_id) {
        const [users] = await connection.execute('SELECT id,role,permission_overrides FROM users WHERE id = ?',[reminder.user_id]);
        const user = await resolveAccess(users[0]);
        const scope = projectScope(user);
        const [tasks] = await connection.execute(`SELECT t.id,t.status FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ? AND ${scope.sql}`,[reminder.task_id,...scope.params]);
        if (!hasPermission(user,'tasks.view') || !tasks.length || tasks[0].status === 'Completed') {
          await connection.execute("UPDATE reminders SET status = 'dismissed' WHERE id = ?",[reminder.id]);
          await createAuditLog({action:'REMINDER_AUTO_DISMISSED',resourceType:'REMINDER',resourceId:reminder.id,details:{recipientId:reminder.user_id,reason:'Linked task completed or no longer accessible'}},connection);
          continue;
        }
      }
      await connection.execute(`INSERT INTO notifications (user_id,type,title,message,resource_type,resource_id)
        VALUES (?,'PERSONAL_REMINDER',?,?,?,?)`,[reminder.user_id,reminder.title,reminder.notes || 'Your scheduled reminder is due.',reminder.task_id ? 'TASK' : 'REMINDER',reminder.task_id || reminder.id]);
      await connection.execute("UPDATE reminders SET status = 'sent',sent_at = UTC_TIMESTAMP() WHERE id = ?",[reminder.id]);
      await createAuditLog({action:'REMINDER_SENT',resourceType:'REMINDER',resourceId:reminder.id,details:{recipientId:reminder.user_id}},connection);
      delivered++;
    }
    await connection.commit(); return delivered;
  } catch(error) { await connection.rollback(); throw error; } finally { connection.release(); }
}
module.exports = { dispatchPersonalReminders };
