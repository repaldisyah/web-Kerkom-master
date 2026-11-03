-- Link event and payment records to customers by the stable customer ID.
-- Run once after all customer and branch tables exist. This only auto-links
-- a legacy name when it resolves to exactly one customer in that branch.

ALTER TABLE events_bali.events
    ADD COLUMN customer_id INT UNSIGNED NULL AFTER pelanggan;
ALTER TABLE events_bandung.events
    ADD COLUMN customer_id INT UNSIGNED NULL AFTER pelanggan;
ALTER TABLE nusa_karsa.palembang_events
    ADD COLUMN customer_id INT UNSIGNED NULL AFTER pelanggan;

ALTER TABLE events_bali.event_payments
    ADD COLUMN customer_id INT UNSIGNED NULL AFTER customer_name;
ALTER TABLE events_bandung.event_payments
    ADD COLUMN customer_id INT UNSIGNED NULL AFTER customer_name;
ALTER TABLE nusa_karsa.palembang_payments
    ADD COLUMN customer_id INT UNSIGNED NULL AFTER customer_name;

-- Backfill only unambiguous name matches. Ambiguous or unknown records remain NULL
-- and must be linked from the event editor by selecting the customer code.
UPDATE events_bali.events e
JOIN nusa_karsa.branches b ON LOWER(TRIM(b.name)) = 'bali'
JOIN nusa_karsa.customers c ON c.branch_id = b.id AND LOWER(TRIM(c.name)) = LOWER(TRIM(e.pelanggan))
JOIN (SELECT branch_id, LOWER(TRIM(name)) AS normalized_name
      FROM nusa_karsa.customers GROUP BY branch_id, LOWER(TRIM(name)) HAVING COUNT(*) = 1) u
  ON u.branch_id = c.branch_id AND u.normalized_name = LOWER(TRIM(c.name))
SET e.customer_id = c.id WHERE e.pelanggan IS NOT NULL AND TRIM(e.pelanggan) <> '';

UPDATE events_bandung.events e
JOIN nusa_karsa.branches b ON LOWER(TRIM(b.name)) = 'bandung'
JOIN nusa_karsa.customers c ON c.branch_id = b.id AND LOWER(TRIM(c.name)) = LOWER(TRIM(e.pelanggan))
JOIN (SELECT branch_id, LOWER(TRIM(name)) AS normalized_name
      FROM nusa_karsa.customers GROUP BY branch_id, LOWER(TRIM(name)) HAVING COUNT(*) = 1) u
  ON u.branch_id = c.branch_id AND u.normalized_name = LOWER(TRIM(c.name))
SET e.customer_id = c.id WHERE e.pelanggan IS NOT NULL AND TRIM(e.pelanggan) <> '';

UPDATE nusa_karsa.palembang_events e
JOIN nusa_karsa.branches b ON LOWER(TRIM(b.name)) = 'palembang'
JOIN nusa_karsa.customers c ON c.branch_id = b.id AND LOWER(TRIM(c.name)) = LOWER(TRIM(e.pelanggan))
JOIN (SELECT branch_id, LOWER(TRIM(name)) AS normalized_name
      FROM nusa_karsa.customers GROUP BY branch_id, LOWER(TRIM(name)) HAVING COUNT(*) = 1) u
  ON u.branch_id = c.branch_id AND u.normalized_name = LOWER(TRIM(c.name))
SET e.customer_id = c.id WHERE e.pelanggan IS NOT NULL AND TRIM(e.pelanggan) <> '';

UPDATE events_bali.event_payments p JOIN events_bali.events e ON e.id = p.event_id
SET p.customer_id = e.customer_id WHERE e.customer_id IS NOT NULL;
UPDATE events_bandung.event_payments p JOIN events_bandung.events e ON e.id = p.event_id
SET p.customer_id = e.customer_id WHERE e.customer_id IS NOT NULL;
UPDATE nusa_karsa.palembang_payments p JOIN nusa_karsa.palembang_events e ON e.id = p.event_id
SET p.customer_id = e.customer_id WHERE e.customer_id IS NOT NULL;

-- Keep a deleted event's payment snapshots visible to the right account when
-- the saved customer name still maps uniquely to a profile in that branch.
UPDATE events_bali.event_payments p
JOIN nusa_karsa.branches b ON LOWER(TRIM(b.name)) = 'bali'
JOIN nusa_karsa.customers c ON c.branch_id = b.id AND LOWER(TRIM(c.name)) = LOWER(TRIM(p.customer_name))
JOIN (SELECT branch_id, LOWER(TRIM(name)) AS normalized_name
      FROM nusa_karsa.customers GROUP BY branch_id, LOWER(TRIM(name)) HAVING COUNT(*) = 1) u
  ON u.branch_id = c.branch_id AND u.normalized_name = LOWER(TRIM(c.name))
SET p.customer_id = c.id WHERE p.customer_id IS NULL AND p.customer_name IS NOT NULL AND TRIM(p.customer_name) <> '';

UPDATE events_bandung.event_payments p
JOIN nusa_karsa.branches b ON LOWER(TRIM(b.name)) = 'bandung'
JOIN nusa_karsa.customers c ON c.branch_id = b.id AND LOWER(TRIM(c.name)) = LOWER(TRIM(p.customer_name))
JOIN (SELECT branch_id, LOWER(TRIM(name)) AS normalized_name
      FROM nusa_karsa.customers GROUP BY branch_id, LOWER(TRIM(name)) HAVING COUNT(*) = 1) u
  ON u.branch_id = c.branch_id AND u.normalized_name = LOWER(TRIM(c.name))
SET p.customer_id = c.id WHERE p.customer_id IS NULL AND p.customer_name IS NOT NULL AND TRIM(p.customer_name) <> '';

UPDATE nusa_karsa.palembang_payments p
JOIN nusa_karsa.branches b ON LOWER(TRIM(b.name)) = 'palembang'
JOIN nusa_karsa.customers c ON c.branch_id = b.id AND LOWER(TRIM(c.name)) = LOWER(TRIM(p.customer_name))
JOIN (SELECT branch_id, LOWER(TRIM(name)) AS normalized_name
      FROM nusa_karsa.customers GROUP BY branch_id, LOWER(TRIM(name)) HAVING COUNT(*) = 1) u
  ON u.branch_id = c.branch_id AND u.normalized_name = LOWER(TRIM(c.name))
SET p.customer_id = c.id WHERE p.customer_id IS NULL AND p.customer_name IS NOT NULL AND TRIM(p.customer_name) <> '';

-- Review unresolved legacy rows before enabling customer portal use:
-- SELECT id, pelanggan FROM events_bali.events WHERE pelanggan IS NOT NULL AND customer_id IS NULL;
-- SELECT id, pelanggan FROM events_bandung.events WHERE pelanggan IS NOT NULL AND customer_id IS NULL;
-- SELECT id, pelanggan FROM nusa_karsa.palembang_events WHERE pelanggan IS NOT NULL AND customer_id IS NULL;

-- MySQL does not refresh a view's expanded SELECT * after a base-table column is added.
-- Recreate these views so customer_id is available to dashboard and portal queries.
CREATE OR REPLACE VIEW events_bali.vw_events_dashboard AS
SELECT e.*,
       e.hpp_rab + e.margin AS nilai_kontrak,
       (e.hpp_rab + e.margin) - e.total_dibayar AS piutang,
       COALESCE(e.termin_2_schedule,
           CASE WHEN e.total_dibayar > e.dp
               THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - e.dp)
               ELSE 0 END) AS termin_2,
       COALESCE(e.pelunasan_schedule,
           GREATEST((e.hpp_rab + e.margin) - e.dp -
               COALESCE(e.termin_2_schedule,
                   CASE WHEN e.total_dibayar > e.dp
                       THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - e.dp)
                       ELSE 0 END), 0)) AS pelunasan,
       CASE
           WHEN (e.hpp_rab + e.margin) - e.total_dibayar <= 0 THEN 'Lunas'
           WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Piutang Jatuh Tempo'
           ELSE 'Berjalan'
       END AS status_piutang,
       CASE
           WHEN (e.hpp_rab + e.margin) - e.total_dibayar <= 0 THEN 'Hijau'
           WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Merah'
           ELSE 'Kuning'
       END AS indikator_warna
FROM (
    SELECT events.*,
           COALESCE(dp_schedule,
               CASE skala WHEN 'Besar' THEN (hpp_rab + margin) * 0.40
                          WHEN 'Sedang' THEN (hpp_rab + margin) * 0.30
                          ELSE (hpp_rab + margin) * 0.50 END) AS dp
    FROM events_bali.events AS events
) AS e;

CREATE OR REPLACE VIEW events_bandung.vw_events_dashboard AS
SELECT e.*,
       e.hpp_rab + e.margin AS nilai_kontrak,
       (e.hpp_rab + e.margin) - e.total_dibayar AS piutang,
       COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) AS dp,
       COALESCE(e.termin_2_schedule, CASE WHEN e.total_dibayar > COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END)) ELSE 0 END) AS termin_2,
       COALESCE(e.pelunasan_schedule, GREATEST((e.hpp_rab + e.margin) - COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) - COALESCE(e.termin_2_schedule, CASE WHEN e.total_dibayar > COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END)) ELSE 0 END), 0)) AS pelunasan,
       CASE WHEN (e.hpp_rab + e.margin) - e.total_dibayar <= 0 THEN 'Lunas' WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Piutang Jatuh Tempo' ELSE 'Berjalan' END AS status_piutang,
       CASE WHEN (e.hpp_rab + e.margin) - e.total_dibayar <= 0 THEN 'Hijau' WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Merah' ELSE 'Kuning' END AS indikator_warna
FROM events_bandung.events AS e;
