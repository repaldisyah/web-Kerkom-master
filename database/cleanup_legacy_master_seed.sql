-- Menghapus seed/demo lama di database master saja.
-- Tabel 20 event Bali, Bandung, dan Palembang tidak disentuh.
START TRANSACTION;
DELETE FROM nusa_karsa.payments;
DELETE FROM nusa_karsa.receivables;
DELETE FROM nusa_karsa.events;
DELETE FROM nusa_karsa.customers;
COMMIT;