const { pool } = require('../config/db');
const catalog = require('../../shared/access.json');
async function migrate() {
  const connection = await pool.getConnection();
  try {
    await connection.query("ALTER TABLE users MODIFY role VARCHAR(40) NOT NULL DEFAULT 'member'");
    await connection.query("UPDATE users SET role = 'member' WHERE role = 'user'");
    const addColumn = async (table, column, definition) => {
      const [rows] = await connection.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [table, column]);
      if (!rows.length) await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    };
    await addColumn('users', 'department', 'VARCHAR(100) NULL');
    await addColumn('users', 'job_title', 'VARCHAR(100) NULL');
    await addColumn('users', 'permission_overrides', 'JSON NULL');
    await connection.query(`CREATE TABLE IF NOT EXISTS role_permissions (
      role_key VARCHAR(40) PRIMARY KEY, permissions JSON NOT NULL, version INT NOT NULL DEFAULT 1,
      updated_by INT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`);
    for (const role of catalog.roles) await connection.execute('INSERT IGNORE INTO role_permissions (role_key, permissions) VALUES (?, ?)', [role.key, JSON.stringify(role.permissions)]);
    await addColumn('audit_logs', 'actor_name', 'VARCHAR(100) NULL');
    await addColumn('audit_logs', 'actor_email', 'VARCHAR(255) NULL');
    await addColumn('audit_logs', 'ip_address', 'VARCHAR(100) NULL');
    await addColumn('audit_logs', 'request_id', 'VARCHAR(36) NULL');
    await connection.query(`UPDATE audit_logs a JOIN users u ON a.user_id = u.id
      SET a.actor_name = COALESCE(a.actor_name, u.full_name), a.actor_email = COALESCE(a.actor_email, u.email)
      WHERE a.actor_name IS NULL`);
    console.log('Access management migration completed (safe to rerun).');
  } finally { connection.release(); }
}
if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate };
