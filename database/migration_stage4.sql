-- ========================================================
-- Stage 4 Database Migration: Tasks Table Enhancements
-- Database: MySQL 8.0+
-- ========================================================

USE project_management;

-- 1. Check & Add created_by column to tasks table
SET @col_created_by_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tasks' 
      AND COLUMN_NAME = 'created_by'
);

SET @sql_add_created_by = IF(
    @col_created_by_exists = 0,
    'ALTER TABLE tasks ADD COLUMN created_by INT NOT NULL AFTER user_id, ADD CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE, ADD INDEX idx_tasks_created_by (created_by)',
    'SELECT "Column created_by already exists"'
);
PREPARE stmt_created_by FROM @sql_add_created_by;
EXECUTE stmt_created_by;
DEALLOCATE PREPARE stmt_created_by;

-- 2. Ensure user_id (assignee) is nullable so unassigned tasks can exist if needed
ALTER TABLE tasks MODIFY COLUMN user_id INT NULL;
