-- Jalankan satu kali setelah nusa_karsa.sql dan migration_separate_admin_pusat.sql.
-- Akun pusat disimpan di admin_pusat; akun cabang disimpan di nusa_karsa.
CREATE DATABASE IF NOT EXISTS admin_pusat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO admin_pusat.users (name, username, email, password_hash, role)
VALUES ('Admin Pusat', 'admin', 'admin@nusakarsa.com', '$2y$12$WGz.P2X2zUrglHrcb6YVeO1ZI5Jgdm1Cwg/3u8mm7pUNTLrD/mTCy', 'admin_pusat')
ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), password_hash = VALUES(password_hash), role = VALUES(role);

INSERT INTO nusa_karsa.users (name, username, email, password_hash, role, branch_id)
SELECT 'Admin Cabang Palembang', 'admin_palembang', 'admin.palembang@nusakarsa.com', '$2y$12$.wP/cpS4.PJwUg.1H0RmXe0ZfbjTtKjTqVV1mH62mjCAezezhkEca', 'admin_cabang', id
FROM nusa_karsa.branches WHERE name = 'Palembang'
ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), password_hash = VALUES(password_hash), role = VALUES(role), branch_id = VALUES(branch_id);

INSERT INTO nusa_karsa.users (name, username, email, password_hash, role, branch_id)
SELECT 'Admin Cabang Bali', 'admin_bali', 'admin.bali@nusakarsa.com', '$2y$12$6H5f8xy7HQOcy/dbSyW6veZ8Blqlwzn4r3AtkHiLEcLTZ6TVFY24S', 'admin_cabang', id
FROM nusa_karsa.branches WHERE name = 'Bali'
ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), password_hash = VALUES(password_hash), role = VALUES(role), branch_id = VALUES(branch_id);

INSERT INTO nusa_karsa.users (name, username, email, password_hash, role, branch_id)
SELECT 'Admin Cabang Bandung', 'admin_bandung', 'admin.bandung@nusakarsa.com', '$2y$12$HYlDp.40qHLoERFUoGS04./CPV5EhWJ7Wp1SwQz2CzNrF0UM.RNOC', 'admin_cabang', id
FROM nusa_karsa.branches WHERE name = 'Bandung'
ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), password_hash = VALUES(password_hash), role = VALUES(role), branch_id = VALUES(branch_id);
