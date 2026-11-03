-- Jalankan satu kali setelah nusa_karsa.sql dan migration_separate_admin_pusat.sql.
-- Akun pusat disimpan di admin_pusat; akun cabang disimpan di nusa_karsa.
CREATE DATABASE IF NOT EXISTS admin_pusat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO admin_pusat.users (name, username, email, password_hash, role)
VALUES ('Admin Pusat', 'admin', 'admin@nusakarsa.com', '$2y$12$DyO4yAkDJwdTz2nCfROKeOg6pGHrs86/MMnjBNwtfSBWmlXcQDnWu', 'admin_pusat')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO nusa_karsa.users (name, username, email, password_hash, role, branch_id)
SELECT 'Admin Cabang Palembang', 'admin_palembang', 'admin.palembang@nusakarsa.com', '$2y$12$S6ptqaZqA0FLAFL8TvRn/ubuHgvZeyI5qMCASy/8XofENPT.GSq1W', 'admin_cabang', id
FROM nusa_karsa.branches WHERE name = 'Palembang'
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO nusa_karsa.users (name, username, email, password_hash, role, branch_id)
SELECT 'Admin Cabang Bali', 'admin_bali', 'admin.bali@nusakarsa.com', '$2y$12$UXhS5R2Jhh40uAPxczoALuhgbJuOCIfd8jRu0vKuXgpFoxnocGzVa', 'admin_cabang', id
FROM nusa_karsa.branches WHERE name = 'Bali'
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO nusa_karsa.users (name, username, email, password_hash, role, branch_id)
SELECT 'Admin Cabang Bandung', 'admin_bandung', 'admin.bandung@nusakarsa.com', '$2y$12$kwF8CSLzH/Q/c3uhEdL7zOCWLatfn3KGCI0/Zt2nvT6qLWnUslwLu', 'admin_cabang', id
FROM nusa_karsa.branches WHERE name = 'Bandung'
ON DUPLICATE KEY UPDATE id = id;

-- Verifikasi akun seed dan cabang tujuan tanpa menampilkan hash password.
SELECT 'admin' AS username, 'Pusat' AS cabang,
       IF(EXISTS (SELECT 1 FROM admin_pusat.users WHERE username = 'admin' AND role = 'admin_pusat'), 'TERSIMPAN', 'BELUM TERSIMPAN') AS status
UNION ALL
SELECT 'admin_palembang', 'Palembang',
       IF(EXISTS (SELECT 1 FROM nusa_karsa.users u JOIN nusa_karsa.branches b ON b.id = u.branch_id WHERE u.username = 'admin_palembang' AND u.role = 'admin_cabang' AND b.name = 'Palembang'), 'TERSIMPAN', 'CABANG/AKUN BELUM TERSIMPAN')
UNION ALL
SELECT 'admin_bali', 'Bali',
       IF(EXISTS (SELECT 1 FROM nusa_karsa.users u JOIN nusa_karsa.branches b ON b.id = u.branch_id WHERE u.username = 'admin_bali' AND u.role = 'admin_cabang' AND b.name = 'Bali'), 'TERSIMPAN', 'CABANG/AKUN BELUM TERSIMPAN')
UNION ALL
SELECT 'admin_bandung', 'Bandung',
       IF(EXISTS (SELECT 1 FROM nusa_karsa.users u JOIN nusa_karsa.branches b ON b.id = u.branch_id WHERE u.username = 'admin_bandung' AND u.role = 'admin_cabang' AND b.name = 'Bandung'), 'TERSIMPAN', 'CABANG/AKUN BELUM TERSIMPAN');
