const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');

async function run() {
  const connection = await pool.getConnection();
  try {
    console.log('[Migration] Applying Stage 3 Database Migration...');

    // 1. Check & add is_active column
    const [cols] = await connection.query("SHOW COLUMNS FROM users LIKE 'is_active'");
    if (cols.length === 0) {
      await connection.query("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER role");
      await connection.query("ALTER TABLE users ADD INDEX idx_users_is_active (is_active)");
      console.log('✓ Added `is_active` column and index to `users`');
    } else {
      console.log('✓ `is_active` column already present');
    }

    // 2. Expand role ENUM to allow smooth data migration
    await connection.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'super_admin', 'project_manager', 'member') NOT NULL DEFAULT 'member'"
    );

    // 3. Migrate any existing 'user' roles to 'member'
    const [updateResult] = await connection.query("UPDATE users SET role = 'member' WHERE role = 'user'");
    console.log(`✓ Migrated ${updateResult.affectedRows} user(s) to 'member' role`);

    // 4. Tighten role ENUM to the four final roles
    await connection.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'project_manager', 'member') NOT NULL DEFAULT 'member'"
    );
    console.log("✓ Updated `users.role` ENUM to ('super_admin', 'admin', 'project_manager', 'member') with default 'member'");

    // 5. Create project_members table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        added_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_project_members_project FOREIGN KEY (project_id)
            REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_project_members_user FOREIGN KEY (user_id)
            REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_project_members_added_by FOREIGN KEY (added_by)
            REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_project_user (project_id, user_id),
        INDEX idx_pm_project_id (project_id),
        INDEX idx_pm_user_id (user_id),
        INDEX idx_pm_added_by (added_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Verified/Created `project_members` table');

    console.log('[Migration] Stage 3 Migration completed successfully!');
  } catch (error) {
    console.error('[Migration Error]:', error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

run();
