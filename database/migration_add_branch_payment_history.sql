-- Tambahkan satu kali setelah events_bali dan events_bandung siap.
-- Catatan transaksi menyimpan snapshot agar riwayat tetap terbaca jika event dihapus.
CREATE TABLE IF NOT EXISTS events_bali.event_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(20) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NULL,
    payment_date DATE NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Manual',
    payment_token VARCHAR(40) NOT NULL UNIQUE,
    note VARCHAR(255) NULL,
    record_type ENUM('payment', 'historical_balance') NOT NULL DEFAULT 'payment',
    historical_event_id VARCHAR(20) NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_bali_event_payment_amount CHECK (amount > 0),
    INDEX idx_bali_event_payments_date (payment_date, id),
    INDEX idx_bali_event_payments_event (event_id, id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS events_bandung.event_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(20) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NULL,
    payment_date DATE NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Manual',
    payment_token VARCHAR(40) NOT NULL UNIQUE,
    note VARCHAR(255) NULL,
    record_type ENUM('payment', 'historical_balance') NOT NULL DEFAULT 'payment',
    historical_event_id VARCHAR(20) NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_bandung_event_payment_amount CHECK (amount > 0),
    INDEX idx_bandung_event_payments_date (payment_date, id),
    INDEX idx_bandung_event_payments_event (event_id, id)
) ENGINE=InnoDB;

-- Saldo lama diketahui, tetapi rincian cicilan dan tanggal tiap transaksi tidak tersedia.
INSERT INTO events_bali.event_payments
    (event_id, event_name, customer_name, payment_date, amount, payment_method, payment_token, note, record_type, historical_event_id)
SELECT e.id, e.nama_event, e.pelanggan, NULL, e.total_dibayar, 'Saldo historis',
       CONCAT('HIST-BALI-', e.id), 'Saldo akumulasi lama; tanggal dan rincian transaksi tidak tersedia.', 'historical_balance', e.id
FROM events_bali.events e
LEFT JOIN (SELECT event_id, SUM(amount) AS logged_amount FROM events_bali.event_payments WHERE record_type = 'payment' GROUP BY event_id) p ON p.event_id = e.id
WHERE e.total_dibayar > COALESCE(p.logged_amount, 0)
  AND NOT EXISTS (SELECT 1 FROM events_bali.event_payments h WHERE h.historical_event_id = e.id);

INSERT INTO events_bandung.event_payments
    (event_id, event_name, customer_name, payment_date, amount, payment_method, payment_token, note, record_type, historical_event_id)
SELECT e.id, e.nama_event, e.pelanggan, NULL, e.total_dibayar, 'Saldo historis',
       CONCAT('HIST-BDG-', e.id), 'Saldo akumulasi lama; tanggal dan rincian transaksi tidak tersedia.', 'historical_balance', e.id
FROM events_bandung.events e
LEFT JOIN (SELECT event_id, SUM(amount) AS logged_amount FROM events_bandung.event_payments WHERE record_type = 'payment' GROUP BY event_id) p ON p.event_id = e.id
WHERE e.total_dibayar > COALESCE(p.logged_amount, 0)
  AND NOT EXISTS (SELECT 1 FROM events_bandung.event_payments h WHERE h.historical_event_id = e.id);

-- Palembang sudah mempunyai tabel transaksi, tetapi saldo seed lamanya belum dirinci.
ALTER TABLE nusa_karsa.palembang_payments
    MODIFY payment_date DATE NULL,
    MODIFY payment_method ENUM('QRIS', 'BRI', 'BCA', 'SEABANK', 'PAYPAL', 'HISTORIS') NOT NULL,
    ADD COLUMN record_type ENUM('payment', 'historical_balance') NOT NULL DEFAULT 'payment' AFTER note,
    ADD COLUMN historical_event_id VARCHAR(20) NULL UNIQUE AFTER record_type;

INSERT INTO nusa_karsa.palembang_payments
    (event_id, payment_date, amount, payment_method, payment_token, note, record_type, historical_event_id)
SELECT e.id, NULL, e.total_dibayar, 'HISTORIS', CONCAT('HIST-P-', e.id),
       'Saldo akumulasi lama; tanggal dan rincian transaksi tidak tersedia.', 'historical_balance', e.id
FROM nusa_karsa.palembang_events e
LEFT JOIN (SELECT event_id, SUM(amount) AS logged_amount FROM nusa_karsa.palembang_payments WHERE record_type = 'payment' GROUP BY event_id) p ON p.event_id = e.id
WHERE e.total_dibayar > COALESCE(p.logged_amount, 0)
  AND NOT EXISTS (SELECT 1 FROM nusa_karsa.palembang_payments h WHERE h.historical_event_id = e.id);
