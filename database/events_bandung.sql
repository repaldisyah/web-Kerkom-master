-- Modul piutang event khusus Cabang Bandung (MySQL 8.0+).
CREATE DATABASE IF NOT EXISTS events_bandung CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE events_bandung;

-- Reimport file ini menghapus data lama sehingga hanya seed Bandung yang tersisa.
DROP VIEW IF EXISTS vw_events_dashboard;
DROP TABLE IF EXISTS events;

CREATE TABLE events (
    id VARCHAR(20) PRIMARY KEY,
    nama_event VARCHAR(255) NOT NULL,
    skala ENUM('Kecil', 'Sedang', 'Besar') NOT NULL,
    jenis_acara VARCHAR(100) NOT NULL,
    tgl_event DATE NULL,
    lokasi VARCHAR(255) NULL,
    pelanggan VARCHAR(255) NULL,
    jenis_pihak ENUM('Perorangan', 'Perusahaan') NOT NULL,
    hpp_rab DECIMAL(15,2) NOT NULL DEFAULT 0,
    margin DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_dibayar DECIMAL(15,2) NOT NULL DEFAULT 0,
    tgl_jatuh_tempo DATE NULL,
    status_data ENUM('Draft', 'Final') NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_bandung_hpp CHECK (hpp_rab >= 0),
    CONSTRAINT chk_bandung_margin CHECK (margin >= 0),
    CONSTRAINT chk_bandung_bayar CHECK (total_dibayar >= 0)
) ENGINE=InnoDB;

CREATE VIEW vw_events_dashboard AS
SELECT e.*,
       e.hpp_rab + e.margin AS nilai_kontrak,
       (e.hpp_rab + e.margin) - e.total_dibayar AS piutang,
       CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END AS dp,
    CASE WHEN e.total_dibayar > CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) ELSE 0 END AS termin_2,
    GREATEST((e.hpp_rab + e.margin) - CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END - CASE WHEN e.total_dibayar > CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - CASE e.skala WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40 WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30 ELSE (e.hpp_rab + e.margin) * 0.50 END) ELSE 0 END, 0) AS pelunasan,
       CASE WHEN (e.hpp_rab + e.margin) - e.total_dibayar <= 0 THEN 'Lunas' WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Piutang Jatuh Tempo' ELSE 'Berjalan' END AS status_piutang,
       CASE WHEN (e.hpp_rab + e.margin) - e.total_dibayar <= 0 THEN 'Hijau' WHEN e.tgl_jatuh_tempo < CURRENT_DATE() THEN 'Merah' ELSE 'Kuning' END AS indikator_warna
FROM events e;

INSERT INTO events (id,nama_event,skala,jenis_acara,tgl_event,lokasi,pelanggan,jenis_pihak,hpp_rab,margin,total_dibayar,tgl_jatuh_tempo,status_data) VALUES
('ED-001','Wedding Elegan Rina & Fajar','Besar','Wedding','2026-02-14','The Trans Luxury Hotel, Bandung','Keluarga Fajar Nugraha','Perorangan',265500000,54500000,320000000,'2026-02-21','Final'),
('ED-002','Rapat Kerja Regional PT Pos Indonesia','Besar','Corporate Meeting','2026-03-05','Hotel Savoy Homann, Bandung','PT Pos Indonesia (Persero)','Perusahaan',353000000,67000000,420000000,'2026-04-04','Final'),
('ED-003','Launching Kopi Lokal Parahyangan Blend','Sedang','Product Launching','2026-04-10','Braga, Bandung','PT Kapal Api Bandung Raya','Perusahaan',113500000,26500000,140000000,'2026-04-24','Final'),
('ED-004','Ulang Tahun ke-17 Keysha','Kecil','Ulang Tahun','2026-05-02','Dago, Bandung','Rita Kusnadi','Perorangan',30500000,7500000,38000000,'2026-05-09','Final'),
('ED-005','Konferensi Pendidikan Nasional Unpad','Besar','Konferensi','2026-06-03','Grha Sanusi Hardjadinata, Unpad','Universitas Padjadjaran','Perusahaan',533000000,87000000,248000000,'2026-07-03','Final'),
('ED-006','Wedding Intimate Sari & Yoga','Sedang','Wedding','2026-07-11','Lembang, Bandung Barat','Keluarga Sari Melati','Perorangan',157500000,32500000,133000000,'2026-07-25','Final'),
('ED-007','Family Gathering Bank Jabar Banten','Sedang','Family Gathering','2026-08-08','Ciwidey, Bandung','PT Bank Jabar Banten (bjb)','Perusahaan',123000000,27000000,150000000,'2026-08-22','Final'),
('ED-008','Konser Musik Indie Bandung Bergema','Sedang','Konser','2026-08-22','Sabuga, Bandung','Komunitas Musik Indie Bandung','Perusahaan',132000000,23000000,46500000,'2026-09-05','Final'),
('ED-009','Seminar Nasional Inovasi Teknologi ITB','Kecil','Seminar','2026-09-05','Kampus ITB, Bandung','Institut Teknologi Bandung','Perusahaan',44500000,10500000,55000000,'2026-09-12','Final'),
('ED-010','Pernikahan Adat Sunda Dewi & Reza','Sedang','Wedding','2026-09-26','Gedung Merdeka, Bandung','Keluarga Dewi Anggraeni','Perorangan',141000000,29000000,119000000,'2026-10-03','Final'),
('ED-011','Annual Meeting PT Dirgantara Indonesia','Besar','Corporate Meeting','2026-10-09','Hotel Aryaduta, Bandung','PT Dirgantara Indonesia','Perusahaan',327500000,62500000,312000000,'2026-11-08','Final'),
('ED-012','Product Launching Local Brand Fashion Kalya','Besar','Product Launching','2026-10-24','Paskal 23, Bandung','PT Kalya Fashion Indonesia','Perusahaan',229500000,50500000,112000000,'2026-11-07','Draft'),
('ED-013','Wedding Expo Bandung 2026','Besar','Exhibition','2026-11-07','Trans Studio Mall, Bandung','Asosiasi Wedding Organizer Jabar','Perusahaan',382500000,67500000,315000000,'2026-11-28','Draft'),
('ED-014','Company Outing PT Kimia Farma Tbk','Sedang','Company Outing','2026-11-21','Kota Baru Parahyangan, Bandung Barat','PT Kimia Farma Tbk','Perusahaan',106500000,23500000,65000000,'2026-12-05','Final'),
('ED-015','Wedding Mewah Dimas & Clarissa','Besar','Wedding','2026-12-05','Hotel Padma, Bandung','Keluarga Dimas Pratama','Perorangan',265500000,54500000,224000000,'2026-12-12','Final'),
('ED-016','Rapat Tahunan Koperasi Guru Bandung','Kecil','Corporate Meeting','2026-12-12','Buah Batu, Bandung','Koperasi Guru Sejahtera Bandung','Perusahaan',36500000,8500000,22500000,'2026-12-26','Final'),
('ED-017','Konser Jazz Braga Malam','Sedang','Konser','2027-01-09','Jalan Braga, Bandung','Braga Jazz Community','Perusahaan',126000000,24000000,105000000,'2027-01-23','Draft'),
('ED-018','Grand Launching Resort Ciwidey Valley','Besar','Product Launching','2027-01-23','Ciwidey, Bandung Selatan','PT Ciwidey Valley Hospitality','Perusahaan',353000000,67000000,168000000,'2027-02-13','Final'),
('ED-019','Ulang Tahun Pernikahan ke-25 Bapak & Ibu Kurniawan','Kecil','Ulang Tahun','2027-02-06','Setiabudi, Bandung','Keluarga Kurniawan','Perorangan',39000000,9000000,24000000,'2027-02-13','Final'),
('ED-020','Gala Dinner Penghargaan PT PLN Regional Jabar','Besar','Corporate Gala','2027-02-20','Hotel Aston Pasteur, Bandung','PT PLN (Persero) Regional Jabar','Perusahaan',294500000,60500000,248500000,'2027-03-22','Draft');
