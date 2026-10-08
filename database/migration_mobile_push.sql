-- Additive, safe to rerun. Run with migratePush.js to also add the preference.
CREATE TABLE IF NOT EXISTS mobile_push_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    expo_token VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    platform VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_push_owner_expiry (user_id, expires_at)
);
CREATE TABLE IF NOT EXISTS mobile_push_receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_id INT NOT NULL UNIQUE,
    device_id INT NULL,
    ticket_id VARCHAR(100) CHARACTER SET ascii NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_at TIMESTAMP NULL,
    FOREIGN KEY (log_id) REFERENCES notification_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES mobile_push_devices(id) ON DELETE SET NULL,
    INDEX idx_push_pending_receipts (checked_at, created_at)
);
