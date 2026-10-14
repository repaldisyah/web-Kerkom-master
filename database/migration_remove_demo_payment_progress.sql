-- Hapus hanya fixture 25%, 50%, dan 100% yang sebelumnya memakai event contoh Rp10 juta.
-- Baris dibatasi pada nama event sintetis yang dibuat oleh migration_seed_customer_payment_progress.sql.
-- Jalankan sekali pada database yang pernah menerapkan fixture tersebut.

START TRANSACTION;

DELETE p
FROM payments p
JOIN receivables r ON r.id = p.receivable_id
JOIN events e ON e.id = r.event_id
WHERE e.name REGEXP '^Contoh Pembayaran (25|50|100)% Lunas$';

DELETE r
FROM receivables r
JOIN events e ON e.id = r.event_id
WHERE e.name REGEXP '^Contoh Pembayaran (25|50|100)% Lunas$';

DELETE FROM events
WHERE name REGEXP '^Contoh Pembayaran (25|50|100)% Lunas$';

COMMIT;
