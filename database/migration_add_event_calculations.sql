-- Memperbarui view kalkulasi event tanpa menghapus tabel atau data.

USE events_bali;
DROP VIEW IF EXISTS vw_events_dashboard;
CREATE VIEW vw_events_dashboard AS
SELECT e.*,
       e.hpp_rab + e.margin AS nilai_kontrak,
       (e.hpp_rab + e.margin) - e.total_dibayar AS piutang,
       CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END AS dp,
       CASE WHEN e.total_dibayar > CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) ELSE 0 END AS termin_2,
       GREATEST((e.hpp_rab + e.margin) - CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END - CASE WHEN e.total_dibayar > CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) ELSE 0 END, 0) AS pelunasan,
       CASE WHEN (e.hpp_rab + e.margin) - e.total_dibayar = 0 THEN 'Lunas' WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Piutang Jatuh Tempo' ELSE 'Berjalan' END AS status_piutang,
       CASE WHEN (e.hpp_rab + e.margin) - e.total_dibayar = 0 THEN 'Hijau' WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Merah' ELSE 'Kuning' END AS indikator_warna
FROM events e;

USE events_bandung;
DROP VIEW IF EXISTS vw_events_dashboard;
CREATE VIEW vw_events_dashboard AS
SELECT e.*,
       e.hpp_rab + e.margin AS nilai_kontrak,
       (e.hpp_rab + e.margin) - e.total_dibayar AS piutang,
       CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END AS dp,
       CASE WHEN e.total_dibayar > CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) ELSE 0 END AS termin_2,
       GREATEST((e.hpp_rab + e.margin) - CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END - CASE WHEN e.total_dibayar > CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) ELSE 0 END, 0) AS pelunasan,
       CASE WHEN (e.hpp_rab + e.margin) - e.total_dibayar = 0 THEN 'Lunas' WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Piutang Jatuh Tempo' ELSE 'Berjalan' END AS status_piutang,
       CASE WHEN (e.hpp_rab + e.margin) - e.total_dibayar = 0 THEN 'Hijau' WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Merah' ELSE 'Kuning' END AS indikator_warna
FROM events e;
