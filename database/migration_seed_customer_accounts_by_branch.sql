-- Seed 9 akun pelanggan demo yang dipetakan ke pelanggan event aktif per cabang.
-- Jalankan setelah nusa_karsa.sql dan migration_add_customer_account.sql.
-- Kredensial hanya untuk demo lokal; ganti sebelum penggunaan nyata/produksi.
-- Pengulangan skrip tidak menggandakan data berdasarkan email/username.

START TRANSACTION;

CREATE TEMPORARY TABLE seed_customer_accounts (
    branch_name VARCHAR(100) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address VARCHAR(255) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    account_email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL
) ENGINE=MEMORY;

INSERT INTO seed_customer_accounts
(branch_name, customer_name, customer_email, phone, address, contact_name, username, account_email, password_hash)
VALUES
('Palembang', 'Sponsor D', 'siger.event@example.com', '0711-555-0101', 'Jl. Merdeka No. 18, Palembang', 'Rani Puspita', 'rani.siger', 'rani.siger@example.com', '$2y$12$IMCrthOoZZpY6EN0pNLOtucLKMSrshzG/cIpVArQ3J18ieT.yGHtq'),
('Palembang', 'Sponsor A', 'sriwijaya.cahaya@example.com', '0711-555-0102', 'Jl. Sudirman No. 42, Palembang', 'Dimas Pratama', 'dimas.sriwijaya', 'dimas.sriwijaya@example.com', '$2y$12$/C4SYXpZl7BZt0GP83zduuRuoN5Mg0TAWGC85qZRKo39B0yq5C62u'),
('Palembang', 'Sponsor B', 'musi.gemilang@example.com', '0711-555-0103', 'Jl. Kapten A. Rivai No. 7, Palembang', 'Nadia Putri', 'nadia.musi', 'nadia.musi@example.com', '$2y$12$75gn.g/z9Z.tKfE.YfQOie5wu5mxLzz08rjG7.e3UiIoMpctJmyOe'),
('Bali', 'Kementerian Pariwisata RI', 'dewata.kreasi@example.com', '0361-555-0201', 'Jl. Raya Kuta No. 21, Badung', 'Made Aditya', 'made.dewata', 'made.dewata@example.com', '$2y$12$/wMvmv57C3t9Tto4OR/Y6ukBJRXio2LecgEyCy/2eMcDg861ylI4W'),
('Bali', 'Keluarga Sarah Thompson', 'purnama.bali@example.com', '0361-555-0202', 'Jl. Raya Ubud No. 15, Gianyar', 'Ayu Lestari', 'ayu.purnama', 'ayu.purnama@example.com', '$2y$12$P4TnPBx6ReiUTLFqTIhGRuZqRAd928c.OR1pYGh.FuifQYnCYblc.'),
('Bali', 'PT Telkom Indonesia', 'aruna.nusa@example.com', '0361-555-0203', 'Jl. Bypass Ngurah Rai No. 88, Denpasar', 'Komang Sari', 'komang.aruna', 'komang.aruna@example.com', '$2y$12$M36LssmxrdlmpCQSM6VEJuo6NNLlGourXeP3cfQVSDELAdBtHBDVu'),
('Bandung', 'Universitas Padjadjaran', 'parahyangan.cipta@example.com', '022-555-0301', 'Jl. Asia Afrika No. 36, Bandung', 'Fajar Nugraha', 'fajar.parahyangan', 'fajar.parahyangan@example.com', '$2y$12$mD7ooCVSg4JwlDQMOGbCy.pPyNQnFjxBkGhN611CuT8Ta9o7NSJwu'),
('Bandung', 'Keluarga Sari Melati', 'lembur.kreatif@example.com', '022-555-0302', 'Jl. Dago No. 54, Bandung', 'Intan Permata', 'intan.lembur', 'intan.lembur@example.com', '$2y$12$zyXLqc1nwAZZjlXgaP4UO.x.ykbD8PAPw6eG8cdDiQoetEWTNoAdm'),
('Bandung', 'PT PLN (Persero) Regional Jabar', 'priangan.eventika@example.com', '022-555-0303', 'Jl. Buah Batu No. 109, Bandung', 'Rizky Maulana', 'rizky.priangan', 'rizky.priangan@example.com', '$2y$12$4mUXQaSrNo2/pXlKR1kF6eRAwLmpL8Sp97nOJHBmtl2VHhTnv4Hkq');

INSERT INTO customers (branch_id, name, email, phone, address)
SELECT b.id, s.customer_name, s.customer_email, s.phone, s.address
FROM seed_customer_accounts s
JOIN branches b ON b.name = s.branch_name
WHERE NOT EXISTS (
    SELECT 1 FROM customers c WHERE c.email = s.customer_email
);

UPDATE users u
JOIN seed_customer_accounts s ON s.username = u.username
SET u.password_hash = s.password_hash
WHERE u.email = s.account_email;

INSERT INTO users (name, username, email, password_hash, role, branch_id, customer_id)
SELECT s.contact_name, s.username, s.account_email,
       s.password_hash,
       'pelanggan', c.branch_id, c.id
FROM seed_customer_accounts s
JOIN customers c ON c.email = s.customer_email
JOIN branches b ON b.id = c.branch_id AND b.name = s.branch_name
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.username = s.username OR u.email = s.account_email
);

DROP TEMPORARY TABLE seed_customer_accounts;
COMMIT;

SELECT u.username, u.email AS email_login, u.name AS nama_pemegang_akun,
       c.name AS nama_pelanggan, b.name AS cabang
FROM users u
JOIN customers c ON c.id = u.customer_id
JOIN branches b ON b.id = c.branch_id
WHERE u.username IN (
    'rani.siger', 'dimas.sriwijaya', 'nadia.musi',
    'made.dewata', 'ayu.purnama', 'komang.aruna',
    'fajar.parahyangan', 'intan.lembur', 'rizky.priangan'
)
ORDER BY FIELD(b.name, 'Palembang', 'Bali', 'Bandung'), u.username;
