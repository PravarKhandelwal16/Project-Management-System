const { pool } = require('../config/db');
const { NOTIFICATION_TYPE, NOTIFICATION_CHANNEL, NOTIFICATION_STATUS } = require('../../shared/constants/notificationTypes');
const emailService = require('./emailService');

/**
 * Ensures user has notification preferences record
 */
const ensurePreferences = async (userId) => {
  const [rows] = await pool.query('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
  if (rows.length === 0) {
    await pool.query('INSERT IGNORE INTO notification_preferences (user_id) VALUES (?)', [userId]);
    const [newRows] = await pool.query('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
    return newRows[0];
  }
  return rows[0];
};

const getPreferences = async (userId) => {
  return ensurePreferences(userId);
};

const updatePreferences = async (userId, data) => {
  await ensurePreferences(userId);
  const updates = [];
  const params = [];
  const allowed=['email_task_assigned','email_due_tomorrow','email_overdue','web_task_assigned','web_due_tomorrow','web_overdue','browser_task_assigned','browser_due_tomorrow','push_due_tomorrow'];
  for (const [key, value] of Object.entries(data)) {
    if(!allowed.includes(key)||typeof value!=='boolean')throw Object.assign(new Error('Invalid notification preference.'),{statusCode:400});
    updates.push(`${key} = ?`);
    params.push(value);
  }
  
  if (updates.length > 0) {
    params.push(userId);
    await pool.query(
      `UPDATE notification_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
      params
    );
  }
};

/**
 * Creates an in-app web notification
 */
const createWebNotification = async (userId, type, title, message, resourceType, resourceId) => {
  const prefs = await ensurePreferences(userId);
  
  // Check preference before creating web notification
  const prefMap = {
    [NOTIFICATION_TYPE.TASK_ASSIGNED]: 'web_task_assigned',
    [NOTIFICATION_TYPE.TASK_REASSIGNED]: 'web_task_assigned',
    [NOTIFICATION_TYPE.TASK_DUE_TOMORROW]: 'web_due_tomorrow',
    [NOTIFICATION_TYPE.TASK_OVERDUE]: 'web_overdue'
  };
  
  const prefKey = prefMap[type];
  if (prefKey && prefs[prefKey] === 0) {
    return null; // User disabled this web notification
  }

  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, resource_type, resource_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, message, resourceType, resourceId]
  );
  return result.insertId;
};

/**
 * Logs a notification (used for Emails and Scheduled jobs to prevent dupes)
 */
const logNotification = async (userId, taskId, type, channel, status, errorMsg = null) => {
  await pool.query(
    `INSERT INTO notification_logs (user_id, task_id, notification_type, channel, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, taskId, type, channel, status, errorMsg]
  );
};

/**
 * Sends a task assigned notification (Web + Email)
 */
const notifyTaskAssigned = async (task, project, user, isReassigned = false) => {
  const type = isReassigned ? NOTIFICATION_TYPE.TASK_REASSIGNED : NOTIFICATION_TYPE.TASK_ASSIGNED;
  const title = isReassigned ? 'Task Reassigned' : 'New Task Assigned';
  const message = `You were assigned to task "${task.name}" in project "${project.name}".`;

  // 1. Web Notification
  await createWebNotification(user.id, type, title, message, 'TASK', task.id);

  // 2. Email Notification
  const prefs = await ensurePreferences(user.id);
  if (prefs.email_task_assigned) {
    try {
      const result=await emailService.sendTaskAssignedEmail(user, task, project);
      await logNotification(user.id, task.id, type, NOTIFICATION_CHANNEL.EMAIL, result.skipped?'SKIPPED':NOTIFICATION_STATUS.SENT);
    } catch (err) {
      await logNotification(user.id, task.id, type, NOTIFICATION_CHANNEL.EMAIL, NOTIFICATION_STATUS.FAILED, require('../utils/logger').errorCode(err));
    }
  }
};

/**
 * Retrieves paginated unread notifications for a user
 */
const getUserNotifications = async (userId, limit = 50, offset = 0) => {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, limit, offset]
  );
  return rows;
};

const getUnreadCount = async (userId) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
  return rows[0].count;
};

const markAsRead = async (userId, notificationId) => {
  const [result] = await pool.query(
    'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  return result.affectedRows > 0;
};

const markAllAsRead = async (userId) => {
  await pool.query(
    'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
};

module.exports = {
  getPreferences,
  updatePreferences,
  createWebNotification,
  logNotification,
  notifyTaskAssigned,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  ensurePreferences
};
