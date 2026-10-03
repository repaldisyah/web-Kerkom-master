-- Tambahkan kolom jadwal pembayaran ke database Bandung yang sudah ada.
USE events_bandung;

DROP VIEW IF EXISTS vw_events_dashboard;
ALTER TABLE events
    ADD COLUMN dp_schedule DECIMAL(15,2) NULL AFTER total_dibayar,
    ADD COLUMN termin_2_schedule DECIMAL(15,2) NULL AFTER dp_schedule,
    ADD COLUMN pelunasan_schedule DECIMAL(15,2) NULL AFTER termin_2_schedule;

CREATE VIEW vw_events_dashboard AS
SELECT e.*,
       e.hpp_rab + e.margin AS nilai_kontrak,
       (e.hpp_rab + e.margin) - e.total_dibayar AS piutang,
       COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) AS dp,
       COALESCE(e.termin_2_schedule, CASE WHEN e.total_dibayar > COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END)) ELSE 0 END) AS termin_2,
       COALESCE(e.pelunasan_schedule, GREATEST((e.hpp_rab + e.margin) - COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) - COALESCE(e.termin_2_schedule, CASE WHEN e.total_dibayar > COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - COALESCE(e.dp_schedule, CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END)) ELSE 0 END), 0)) AS pelunasan,
       CASE WHEN (e.hpp_rab + e.margin) - e.total_dibayar <= 0 THEN 'Lunas' WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Piutang Jatuh Tempo' ELSE 'Berjalan' END AS status_piutang,
       CASE WHEN (e.hpp_rab + e.margin) - e.total_dibayar <= 0 THEN 'Hijau' WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Merah' ELSE 'Kuning' END AS indikator_warna
FROM events e;