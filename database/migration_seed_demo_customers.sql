-- Akun demo pelanggan untuk presentasi.
-- Jalankan setelah nusa_karsa.sql dan migration_add_customer_account.sql.
-- Profil demo dipetakan ke pelanggan event aktif pada cabang yang sama.

UPDATE nusa_karsa.customers c
JOIN nusa_karsa.branches b ON b.id = c.branch_id
SET c.name = CASE
    WHEN b.name = 'Palembang' AND c.name = 'PT. Maju Bersama' THEN 'Sponsor F'
    WHEN b.name = 'Bandung' AND c.name = 'PT. Sukses Jaya' THEN 'PT Kalya Fashion Indonesia'
    WHEN b.name = 'Bali' AND c.name = 'CV. Kreatif Abadi' THEN 'PT Alaya Hospitality Group'
    ELSE c.name
END
WHERE (b.name = 'Palembang' AND c.name = 'PT. Maju Bersama')
   OR (b.name = 'Bandung' AND c.name = 'PT. Sukses Jaya')
   OR (b.name = 'Bali' AND c.name = 'CV. Kreatif Abadi');
INSERT INTO nusa_karsa.users (name, username, email, password_hash, role, branch_id, customer_id)
SELECT 'Ilyas', 'ilyas.palembang', 'ilyas.palembang@demo.nusakarsa.com', '$2y$12$RYt0dZG3bemGF5JlcfYuk.eZtVo3O9DUlwhdo0JItP3OL6cT/xpnS', 'pelanggan', b.id, c.id
FROM nusa_karsa.branches b
JOIN nusa_karsa.customers c ON c.branch_id = b.id
WHERE b.name = 'Palembang' AND c.name = 'Sponsor F'
LIMIT 1
ON DUPLICATE KEY UPDATE username = username;

INSERT INTO nusa_karsa.users (name, username, email, password_hash, role, branch_id, customer_id)
SELECT 'Keyla', 'keyla.bandung', 'keyla.bandung@demo.nusakarsa.com', '$2y$12$RnBFfnwcVolQzA1jqQZCJekL5hr7UszObkVvkH7yR85fePsrin1o6', 'pelanggan', b.id, c.id
FROM nusa_karsa.branches b
JOIN nusa_karsa.customers c ON c.branch_id = b.id
WHERE b.name = 'Bandung' AND c.name = 'PT Kalya Fashion Indonesia'
LIMIT 1
ON DUPLICATE KEY UPDATE username = username;

INSERT INTO nusa_karsa.users (name, username, email, password_hash, role, branch_id, customer_id)
SELECT 'Dhini', 'dhini.bali', 'dhini.bali@demo.nusakarsa.com', '$2y$12$shUOqoAaIKlAshplZBUQoOgmYo0S8x9jzKWiYTxx0RB80mpvFWN6W', 'pelanggan', b.id, c.id
FROM nusa_karsa.branches b
JOIN nusa_karsa.customers c ON c.branch_id = b.id
WHERE b.name = 'Bali' AND c.name = 'PT Alaya Hospitality Group'
LIMIT 1
ON DUPLICATE KEY UPDATE username = username;

SELECT id AS account_id, customer_id, name, email, username
FROM nusa_karsa.users
WHERE username IN ('ilyas.palembang', 'keyla.bandung', 'dhini.bali')
ORDER BY FIELD(username, 'ilyas.palembang', 'keyla.bandung', 'dhini.bali');
