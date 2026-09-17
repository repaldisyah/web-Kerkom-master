USE nusa_karsa;

ALTER TABLE users
    ADD COLUMN branch_id INT UNSIGNED NULL AFTER role,
    ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id);

-- Contoh penetapan admin cabang:
-- UPDATE users SET branch_id = 1 WHERE username = 'admin_palembang';
