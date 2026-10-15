-- Jalankan setelah migrasi tabel riwayat pembayaran selesai.
-- Transaksi demo mengurangi saldo operasional yang ditampilkan, tetapi ditandai agar tidak dianggap uang terverifikasi.
SET @has_demo_record_type = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'nusa_karsa' AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'record_type'
);
SET @demo_record_type_sql = IF(
    @has_demo_record_type = 0,
    'ALTER TABLE nusa_karsa.payments ADD COLUMN record_type ENUM(''payment'', ''demo_simulation'') NOT NULL DEFAULT ''payment'' AFTER note',
    'SELECT 1'
);
PREPARE add_demo_record_type FROM @demo_record_type_sql;
EXECUTE add_demo_record_type;
DEALLOCATE PREPARE add_demo_record_type;

ALTER TABLE nusa_karsa.palembang_payments
    MODIFY COLUMN record_type ENUM('payment', 'historical_balance', 'demo_simulation') NOT NULL DEFAULT 'payment';

ALTER TABLE events_bali.event_payments
    MODIFY COLUMN record_type ENUM('payment', 'historical_balance', 'demo_simulation') NOT NULL DEFAULT 'payment';

ALTER TABLE events_bandung.event_payments
    MODIFY COLUMN record_type ENUM('payment', 'historical_balance', 'demo_simulation') NOT NULL DEFAULT 'payment';
