-- ========================================================
-- Project Management System - Initial Database Schema
-- Database: MySQL 8.0+
-- ========================================================

CREATE DATABASE IF NOT EXISTS project_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE project_management;

-- --------------------------------------------------------
-- 1. Table: users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table: projects
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('Not Started', 'In Progress', 'Completed') NOT NULL DEFAULT 'Not Started',
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_projects_user_id (user_id),
    INDEX idx_projects_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table: tasks
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
    status ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
    due_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) 
        REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tasks_project_id (project_id),
    INDEX idx_tasks_user_id (user_id),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_priority (priority),
    INDEX idx_tasks_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table: audit_logs
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INT NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_resource (resource_type, resource_id),
    INDEX idx_audit_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
