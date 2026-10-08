const { pool } = require('../config/db');
async function migratePlanning() {
  await pool.query(`CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, task_id INT NULL,
    title VARCHAR(255) NOT NULL, notes TEXT NULL, remind_at DATETIME NOT NULL,
    status ENUM('scheduled','sent','dismissed') NOT NULL DEFAULT 'scheduled',
    sent_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    INDEX idx_reminders_due (status, remind_at), INDEX idx_reminders_user (user_id, remind_at)
  ) ENGINE=InnoDB`);
  console.log('Planning migration completed (safe to rerun).');
}
if (require.main === module) migratePlanning().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migratePlanning };
