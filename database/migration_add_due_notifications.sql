USE nusa_karsa;

CREATE TABLE IF NOT EXISTS due_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    source_type VARCHAR(24) NOT NULL,
    source_id VARCHAR(80) NOT NULL,
    reminder_key VARCHAR(32) NOT NULL,
    due_date DATE NOT NULL,
    recipient_user_id INT UNSIGNED NOT NULL,
    recipient_role VARCHAR(24) NOT NULL,
    title VARCHAR(180) NOT NULL,
    message VARCHAR(700) NOT NULL,
    target_url VARCHAR(255) NOT NULL DEFAULT '../Html/piutang.html',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    UNIQUE KEY uq_due_notification_once (source_type, source_id, reminder_key, recipient_role, recipient_user_id),
    INDEX idx_due_notification_inbox (recipient_role, recipient_user_id, read_at, created_at)
) ENGINE=InnoDB;
