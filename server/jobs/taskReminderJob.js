const { pool } = require('../config/db');
const { NOTIFICATION_TYPE, NOTIFICATION_CHANNEL, NOTIFICATION_STATUS } = require('../../shared/constants/notificationTypes');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

const runReminders = async () => {
  console.log('Running task reminder job...');
  let processed = 0;

  try {
    // Find tasks due tomorrow that are NOT completed
    // Using simple date math (tomorrow = CURDATE() + INTERVAL 1 DAY)
    const [tasks] = await pool.query(`
      SELECT t.*, p.name as project_name, u.email, u.full_name, u.id as user_id 
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.user_id = u.id
      WHERE t.status != 'Completed'
      AND DATE(t.due_date) = CURDATE() + INTERVAL 1 DAY
      AND t.user_id IS NOT NULL
    `);

    for (const task of tasks) {
      const prefs = await notificationService.ensurePreferences(task.user_id);
      const user = { id: task.user_id, email: task.email, full_name: task.full_name };
      const project = { id: task.project_id, name: task.project_name };
      
      // 1. Check Web Notification
      if (prefs.web_due_tomorrow) {
        const [existingWeb] = await pool.query(
          `SELECT id FROM notification_logs 
           WHERE user_id = ? AND task_id = ? AND notification_type = ? AND channel = ? AND DATE(sent_at) = CURDATE()`,
          [user.id, task.id, NOTIFICATION_TYPE.TASK_DUE_TOMORROW, NOTIFICATION_CHANNEL.WEB]
        );

        if (existingWeb.length === 0) {
          await notificationService.createWebNotification(
            user.id,
            NOTIFICATION_TYPE.TASK_DUE_TOMORROW,
            'Task Due Tomorrow',
            `Your task "${task.name}" in project "${project.name}" is due tomorrow.`,
            'TASK',
            task.id
          );
          await notificationService.logNotification(user.id, task.id, NOTIFICATION_TYPE.TASK_DUE_TOMORROW, NOTIFICATION_CHANNEL.WEB, NOTIFICATION_STATUS.SENT);
          processed++;
        }
      }

      // 2. Check Email Notification
      if (prefs.email_due_tomorrow) {
        const [existingEmail] = await pool.query(
          `SELECT id FROM notification_logs 
           WHERE user_id = ? AND task_id = ? AND notification_type = ? AND channel = ? AND DATE(sent_at) = CURDATE()`,
          [user.id, task.id, NOTIFICATION_TYPE.TASK_DUE_TOMORROW, NOTIFICATION_CHANNEL.EMAIL]
        );

        if (existingEmail.length === 0) {
          try {
            await emailService.sendTaskReminderEmail(user, task, project);
            await notificationService.logNotification(user.id, task.id, NOTIFICATION_TYPE.TASK_DUE_TOMORROW, NOTIFICATION_CHANNEL.EMAIL, NOTIFICATION_STATUS.SENT);
            processed++;
          } catch (err) {
            await notificationService.logNotification(user.id, task.id, NOTIFICATION_TYPE.TASK_DUE_TOMORROW, NOTIFICATION_CHANNEL.EMAIL, NOTIFICATION_STATUS.FAILED, err.message);
          }
        }
      }
    }

    // Overdue tasks (due_date < CURDATE())
    const [overdueTasks] = await pool.query(`
      SELECT t.*, p.name as project_name, u.email, u.full_name, u.id as user_id 
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.user_id = u.id
      WHERE t.status != 'Completed'
      AND DATE(t.due_date) < CURDATE()
      AND t.user_id IS NOT NULL
    `);

    for (const task of overdueTasks) {
      const prefs = await notificationService.ensurePreferences(task.user_id);
      const user = { id: task.user_id, email: task.email, full_name: task.full_name };
      const project = { id: task.project_id, name: task.project_name };
      
      // Web Overdue
      if (prefs.web_overdue) {
        const [existingOverdue] = await pool.query(
          `SELECT id FROM notification_logs 
           WHERE user_id = ? AND task_id = ? AND notification_type = ? AND channel = ? AND DATE(sent_at) = CURDATE()`,
          [user.id, task.id, NOTIFICATION_TYPE.TASK_OVERDUE, NOTIFICATION_CHANNEL.WEB]
        );

        if (existingOverdue.length === 0) {
          await notificationService.createWebNotification(
            user.id,
            NOTIFICATION_TYPE.TASK_OVERDUE,
            'Task Overdue',
            `Your task "${task.name}" in project "${project.name}" is overdue.`,
            'TASK',
            task.id
          );
          await notificationService.logNotification(user.id, task.id, NOTIFICATION_TYPE.TASK_OVERDUE, NOTIFICATION_CHANNEL.WEB, NOTIFICATION_STATUS.SENT);
          processed++;
        }
      }
    }

    console.log(`Task reminder job completed. Processed ${processed} notifications.`);
    return processed;
  } catch (error) {
    console.error('Error running task reminder job:', error);
  }
};

module.exports = {
  runReminders
};
