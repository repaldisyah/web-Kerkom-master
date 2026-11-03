-- Pindahkan akun admin pusat dari nusa_karsa.users ke database khusus.
-- Username, email, password hash, ID, dan tanggal pembuatan dipertahankan.
CREATE DATABASE IF NOT EXISTS admin_pusat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_pusat.users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin_pusat') NOT NULL DEFAULT 'admin_pusat',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

START TRANSACTION;
INSERT INTO admin_pusat.users (id, name, username, email, password_hash, role, created_at)
SELECT id, name, username, email, password_hash, 'admin_pusat', created_at
FROM nusa_karsa.users
WHERE username = 'admin' AND role = 'super_admin'
ON DUPLICATE KEY UPDATE
    id = id;

DELETE FROM nusa_karsa.users
WHERE username = 'admin' AND role = 'super_admin'
  AND EXISTS (SELECT 1 FROM admin_pusat.users a WHERE a.username = nusa_karsa.users.username AND a.email = nusa_karsa.users.email);
COMMIT;