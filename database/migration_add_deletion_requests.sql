-- Jalankan satu kali setelah migration_add_palembang_events.sql dan
-- migration_add_branch_payment_history.sql.
USE nusa_karsa;

CREATE TABLE IF NOT EXISTS deletion_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    branch_key ENUM('palembang', 'bali', 'bandung') NOT NULL,
    event_id VARCHAR(20) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    requested_by INT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    review_note VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_deletion_requests_status (status, created_at),
    INDEX idx_deletion_requests_branch (branch_id, created_at)
) ENGINE=InnoDB;

-- Simpan snapshot agar pembayaran tetap dapat dibaca setelah event Palembang dihapus.
ALTER TABLE palembang_payments
    ADD COLUMN event_name VARCHAR(255) NULL AFTER event_id,
    ADD COLUMN customer_name VARCHAR(255) NULL AFTER event_name;

UPDATE palembang_payments p
JOIN palembang_events e ON e.id = p.event_id
SET p.event_name = e.nama_event, p.customer_name = e.pelanggan;

ALTER TABLE palembang_payments
    DROP FOREIGN KEY fk_palembang_payment_event,
    MODIFY event_name VARCHAR(255) NOT NULL,
    MODIFY customer_name VARCHAR(255) NULL;
