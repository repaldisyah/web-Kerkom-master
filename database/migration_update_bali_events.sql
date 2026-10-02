USE events_bali;

DROP VIEW IF EXISTS vw_events_dashboard;
ALTER TABLE events
    ADD COLUMN dp_schedule DECIMAL(15,2) NULL AFTER total_dibayar,
    ADD COLUMN termin_2_schedule DECIMAL(15,2) NULL AFTER dp_schedule,
    ADD COLUMN pelunasan_schedule DECIMAL(15,2) NULL AFTER termin_2_schedule;

DROP VIEW IF EXISTS vw_events_dashboard;
CREATE VIEW vw_events_dashboard AS
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
    FROM events
) AS e;
INSERT INTO events
(id,nama_event,skala,jenis_acara,tgl_event,lokasi,pelanggan,jenis_pihak,hpp_rab,margin,total_dibayar,dp_schedule,termin_2_schedule,pelunasan_schedule,tgl_jatuh_tempo,status_data)
VALUES
('EDK-001','Royal Beach Wedding - Putu & Kadek','Besar','Wedding','2026-03-05','Nusa Dua','Keluarga Putu Wirawan','Perorangan',393500000,86500000,480000000,144000000,192000000,144000000,'2026-02-21','Final'),
('EDK-002','Rapat Kerja Nasional PT Astra Nusantara','Besar','Corporate Meeting','2026-04-10','Nusa Dua Convention Center','PT Astra Nusantara Tbk','Perusahaan',539500000,110500000,650000000,260000000,195000000,195000000,'2026-04-04','Final'),
('EDK-003','Launching Produk Skincare GlowBali','Sedang','Product Launching','2026-05-02','Seminyak','PT Kosmetika Bali Jaya','Perusahaan',168000000,42000000,210000000,63000000,84000000,63000000,'2026-04-24','Final'),
('EDK-004','Baby Shower & Family Party Ibu Ratna','Kecil','Family Party','2026-06-03','Villa Seminyak','Ratna Dewi','Perorangan',44000000,11000000,55000000,27500000,0,27500000,'2026-05-09','Final'),
('EDK-005','Konferensi Pariwisata ASEAN 2026','Besar','Konferensi','2026-07-11','Bali Nusa Dua Convention Center','Kementerian Pariwisata RI','Perusahaan',833000000,147000000,392000000,392000000,294000000,294000000,'2026-07-03','Final'),
('EDK-006','Wedding Destination Sarah & James','Besar','Wedding','2026-08-08','Uluwatu','Keluarga Sarah Thompson','Perorangan',459000000,101000000,392000000,168000000,224000000,168000000,'2026-07-25','Final'),
('EDK-007','Family Gathering PT Bank Sinar Mas','Sedang','Family Gathering','2026-08-22','Sanur','PT Bank Sinar Mas Cabang Bali','Perusahaan',186500000,43500000,230000000,115000000,0,115000000,'2026-08-22','Final'),
('EDK-008','Konser Amal Peduli Anak Bali','Sedang','Konser','2026-09-05','Lapangan Renon Denpasar','Yayasan Peduli Anak Bali','Perusahaan',201500000,38500000,72000000,72000000,96000000,72000000,'2026-09-05','Final'),
('EDK-009','Seminar Nasional Digital Marketing','Kecil','Seminar','2026-09-26','Ubud','Universitas Udayana','Perusahaan',68000000,17000000,85000000,42500000,0,42500000,'2026-09-12','Final'),
('EDK-010','Pernikahan Adat Bali Made & Ayu','Sedang','Wedding','2026-10-09','Denpasar','Keluarga Made Suryawan','Perorangan',213000000,47000000,182000000,78000000,104000000,78000000,'2026-10-03','Final'),
('EDK-011','Annual Meeting PT Telkom Indonesia Regional Bali','Besar','Corporate Meeting','2026-10-24','Nusa Dua','PT Telkom Indonesia','Perusahaan',498000000,102000000,480000000,300000000,180000000,120000000,'2026-11-08','Final'),
('EDK-012','Product Launching Motor Listrik EvoBike','Besar','Product Launching','2026-11-07','Canggu','PT EvoBike Indonesia','Perusahaan',348500000,81500000,172000000,172000000,129000000,129000000,'2026-11-07','Draft'),
('EDK-013','Wedding Expo Bali 2026','Besar','Exhibition','2026-11-21','Kuta','Asosiasi Wedding Organizer Bali','Perusahaan',588000000,112000000,490000000,280000000,210000000,210000000,'2026-11-28','Draft'),
('EDK-014','Company Outing PT Unilever Indonesia','Sedang','Company Outing','2026-12-05','Tanah Lot','PT Unilever Indonesia','Perusahaan',158000000,37000000,97500000,97500000,0,97500000,'2026-12-05','Final'),
('EDK-015','Pernikahan Elegan Michael & Chelsea','Besar','Wedding','2026-12-12','Jimbaran','Keluarga Michael Tanoto','Perorangan',410000000,90000000,350000000,150000000,200000000,150000000,'2026-12-12','Final'),
('EDK-016','Rapat Tahunan Koperasi Simpan Pinjam Bali Sejahtera','Kecil','Corporate Meeting','2027-01-09','Denpasar','Koperasi Bali Sejahtera','Perusahaan',54500000,13500000,34000000,34000000,0,34000000,'2026-12-26','Final'),
('EDK-017','Konser Musik Jazz Sunset Sanur','Sedang','Konser','2027-01-23','Pantai Sanur','Sanur Jazz Community','Perusahaan',191000000,39000000,161000000,69000000,92000000,69000000,'2027-01-23','Draft'),
('EDK-018','Grand Launching Resort Alaya Ubud','Besar','Product Launching','2027-02-06','Ubud','PT Alaya Hospitality Group','Perusahaan',539500000,110500000,260000000,260000000,195000000,195000000,'2027-02-13','Final'),
('EDK-019','Ulang Tahun Pernikahan ke-25 Bapak & Ibu Santoso','Kecil','Ulang Tahun','2027-02-20','Villa Nusa Dua','Keluarga Santoso','Perorangan',57500000,14500000,36000000,36000000,0,36000000,'2027-02-13','Final'),
('EDK-020','Gala Dinner Penghargaan PT Pertamina Regional Bali','Besar','Corporate Gala',NULL,'Nusa Dua','PT Pertamina (Persero)','Perusahaan',451000000,99000000,385000000,220000000,165000000,165000000,'2027-03-22','Draft')
ON DUPLICATE KEY UPDATE
 nama_event=VALUES(nama_event), skala=VALUES(skala), jenis_acara=VALUES(jenis_acara), tgl_event=VALUES(tgl_event), lokasi=VALUES(lokasi), pelanggan=VALUES(pelanggan), jenis_pihak=VALUES(jenis_pihak), hpp_rab=VALUES(hpp_rab), margin=VALUES(margin), total_dibayar=VALUES(total_dibayar), dp_schedule=VALUES(dp_schedule), termin_2_schedule=VALUES(termin_2_schedule), pelunasan_schedule=VALUES(pelunasan_schedule), tgl_jatuh_tempo=VALUES(tgl_jatuh_tempo), status_data=VALUES(status_data);