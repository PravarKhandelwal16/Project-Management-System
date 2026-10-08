const { pool } = require('../config/db');

async function run() {
  const conn = await pool.getConnection();
  try {
    console.log('[Migration] Applying Stage 4 Tasks Migration...');

    const [cols] = await conn.query("SHOW COLUMNS FROM tasks LIKE 'created_by'");
    if (cols.length === 0) {
      await conn.query("ALTER TABLE tasks ADD COLUMN created_by INT NULL AFTER user_id");
      await conn.query("UPDATE tasks SET created_by = user_id WHERE created_by IS NULL");
      // Fallback if user_id is null in any existing tasks
      const [u] = await conn.query("SELECT id FROM users LIMIT 1");
      if (u.length > 0) {
        await conn.query("UPDATE tasks SET created_by = ? WHERE created_by IS NULL", [u[0].id]);
      }
      await conn.query("ALTER TABLE tasks MODIFY COLUMN created_by INT NOT NULL");
      await conn.query("ALTER TABLE tasks ADD CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE");
      await conn.query("ALTER TABLE tasks ADD INDEX idx_tasks_created_by (created_by)");
      console.log('✓ Added created_by column and foreign key to tasks');
    } else {
      console.log('✓ created_by column already exists');
    }

    // Allow user_id to be nullable so tasks can be created without immediate assignee
    await conn.query("ALTER TABLE tasks MODIFY COLUMN user_id INT NULL");
    console.log('✓ Made user_id (assignee) nullable in tasks');

    console.log('[Migration] Stage 4 Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

run();
