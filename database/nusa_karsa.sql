CREATE DATABASE IF NOT EXISTS nusa_karsa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nusa_karsa;

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin_cabang', 'pelanggan') NOT NULL DEFAULT 'admin_cabang',
    branch_id INT UNSIGNED NULL,
    customer_id INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE branches (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE users
    ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id);

CREATE TABLE customers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    branch_id INT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    address TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customers_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB;

ALTER TABLE users
    ADD CONSTRAINT fk_users_customer FOREIGN KEY (customer_id) REFERENCES customers(id);

CREATE TABLE events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    branch_id INT UNSIGNED NOT NULL,
    customer_id INT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    event_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_events_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT fk_events_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

CREATE TABLE receivables (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    branch_id INT UNSIGNED NOT NULL,
    customer_id INT UNSIGNED NOT NULL,
    event_id INT UNSIGNED NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    balance DECIMAL(15,2) NOT NULL,
    status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_receivables_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT fk_receivables_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_receivables_event FOREIGN KEY (event_id) REFERENCES events(id),
    CONSTRAINT chk_receivable_amount CHECK (total_amount >= 0 AND balance >= 0 AND balance <= total_amount)
) ENGINE=InnoDB;

CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receivable_id INT UNSIGNED NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method ENUM('QRIS', 'BRI', 'BCA', 'SEABANK', 'PAYPAL') NOT NULL,
    payment_token VARCHAR(24) NOT NULL UNIQUE,
    note VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_receivable FOREIGN KEY (receivable_id) REFERENCES receivables(id),
    CONSTRAINT chk_payment_amount CHECK (amount > 0)
) ENGINE=InnoDB;

INSERT INTO users (name, username, email, password_hash, role) VALUES
('Admin Pusat', 'admin', 'admin@nusakarsa.com', '$2y$12$WuXuRpKaJRWUJdJOBRGxS.Y3JRLetPhldRr0941saxa46qh1Al8au', 'super_admin');
INSERT INTO branches (name, city) VALUES ('Palembang', 'Palembang'), ('Bali', 'Denpasar'), ('Bandung', 'Bandung');
INSERT INTO customers (branch_id, name) VALUES (1, 'PT. Maju Bersama'), (2, 'CV. Kreatif Abadi'), (3, 'PT. Sukses Jaya'), (1, 'Universitas Maju'), (2, 'PT. Cipta Solusi');
INSERT INTO events (branch_id, customer_id, name, event_date) VALUES (1, 1, 'Seminar Nasional', '2026-08-25'), (2, 2, 'Corporate Gathering', '2026-08-24'), (3, 3, 'Product Launching', '2026-08-23'), (1, 4, 'Wisuda', '2026-08-22'), (2, 5, 'Annual Meeting', '2026-08-21');
INSERT INTO receivables (branch_id, customer_id, event_id, invoice_date, due_date, total_amount, balance, status) VALUES (1, 1, 1, '2026-08-25', '2026-09-01', 7500000, 7500000, 'unpaid'), (2, 2, 2, '2026-08-24', '2026-08-29', 5250000, 2750000, 'partial'), (3, 3, 3, '2026-08-23', '2026-09-02', 6000000, 6000000, 'unpaid'), (1, 4, 4, '2026-08-22', '2026-08-28', 4500000, 1200000, 'partial'), (2, 5, 5, '2026-08-21', '2026-08-20', 3750000, 0, 'paid');

-- Rekonsiliasi saldo awal untuk tagihan contoh yang sudah dibayar sebagian/lunas.
-- Nilai pembayaran selalu sama dengan total_amount - balance pada receivables.
INSERT INTO payments (receivable_id, payment_date, amount, payment_method, payment_token, note) VALUES
(2, '2026-08-24', 2500000, 'QRIS', 'NK-SEED-0002', 'Rekonsiliasi saldo awal data demo'),
(4, '2026-08-22', 3300000, 'QRIS', 'NK-SEED-0004', 'Rekonsiliasi saldo awal data demo'),
(5, '2026-08-21', 3750000, 'QRIS', 'NK-SEED-0005', 'Rekonsiliasi saldo awal data demo');
