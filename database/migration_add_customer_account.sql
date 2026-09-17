-- Jalankan sekali pada database lama sebelum fitur akun pelanggan digunakan.
ALTER TABLE users
    MODIFY role ENUM('super_admin', 'admin_cabang', 'pelanggan') NOT NULL DEFAULT 'admin_cabang',
    ADD COLUMN customer_id INT UNSIGNED NULL AFTER branch_id,
    ADD CONSTRAINT fk_users_customer FOREIGN KEY (customer_id) REFERENCES customers(id);
