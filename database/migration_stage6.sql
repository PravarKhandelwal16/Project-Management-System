-- Stage 6: Notifications & Preferences Migration

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    email_task_assigned BOOLEAN DEFAULT TRUE,
    email_due_tomorrow BOOLEAN DEFAULT TRUE,
    email_overdue BOOLEAN DEFAULT TRUE,
    web_task_assigned BOOLEAN DEFAULT TRUE,
    web_due_tomorrow BOOLEAN DEFAULT TRUE,
    web_overdue BOOLEAN DEFAULT TRUE,
    browser_task_assigned BOOLEAN DEFAULT FALSE,
    browser_due_tomorrow BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications Table (Web)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g. TASK_ASSIGNED, TASK_DUE_TOMORROW
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    resource_type VARCHAR(50) DEFAULT NULL, -- e.g. TASK, PROJECT
    resource_id INT DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CREATE INDEX idx_notifications_user_id_is_read ON notifications(user_id, is_read);
-- CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Notification Logs (Email & Scheduled jobs)
CREATE TABLE IF NOT EXISTS notification_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT DEFAULT NULL,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL, -- EMAIL, WEB, BROWSER
    status VARCHAR(20) NOT NULL, -- SENT, FAILED
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    -- Prevent sending the exact same daily reminder (due tomorrow, overdue) multiple times via unique index if needed
    -- Using a composite index for lookups
    INDEX idx_notif_log_lookup (user_id, task_id, notification_type, channel, sent_at)
);
