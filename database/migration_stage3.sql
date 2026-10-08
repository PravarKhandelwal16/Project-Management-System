-- ========================================================
-- Stage 3 Database Migration: RBAC & Project Management
-- Database: MySQL 8.0+
-- ========================================================

USE project_management;

-- 1. Add is_active column to users table if not exists
-- Allows soft-suspension / account deactivation
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'is_active'
);

SET @sql_add_active = IF(
    @col_exists = 0,
    'ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER role, ADD INDEX idx_users_is_active (is_active)',
    'SELECT "Column is_active already exists"'
);
PREPARE stmt_active FROM @sql_add_active;
EXECUTE stmt_active;
DEALLOCATE PREPARE stmt_active;

-- 2. Temporarily permit old and new role values
ALTER TABLE users 
MODIFY COLUMN role ENUM('user', 'admin', 'super_admin', 'project_manager', 'member') NOT NULL DEFAULT 'member';

-- 3. Safely migrate existing users with 'user' role to 'member' (preserve existing admin accounts)
UPDATE users 
SET role = 'member' 
WHERE role = 'user';

-- 4. Restrict role enum to the 4 RBAC roles
ALTER TABLE users 
MODIFY COLUMN role ENUM('super_admin', 'admin', 'project_manager', 'member') NOT NULL DEFAULT 'member';

-- 5. Create project_members table for project team management
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
