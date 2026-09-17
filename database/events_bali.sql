-- Modul pencatatan piutang event Cabang Bali.
-- MySQL 8.0+; aman dijalankan pertama kali pada server lokal.
CREATE DATABASE IF NOT EXISTS events_bali
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE events_bali;

CREATE TABLE IF NOT EXISTS events (
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
    CONSTRAINT chk_events_hpp_rab CHECK (hpp_rab >= 0),
    CONSTRAINT chk_events_margin CHECK (margin >= 0),
    CONSTRAINT chk_events_dibayar CHECK (total_dibayar >= 0)
) ENGINE=InnoDB;

DROP VIEW IF EXISTS vw_events_dashboard;
CREATE VIEW vw_events_dashboard AS
SELECT
    e.*,
    e.hpp_rab + e.margin AS nilai_kontrak,
    (e.hpp_rab + e.margin) - e.total_dibayar AS piutang,
    CASE e.skala
        WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40
        WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30
        ELSE (e.hpp_rab + e.margin) * 0.50
    END AS dp,
    CASE
        WHEN e.total_dibayar > CASE e.skala
            WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40
            WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30
            ELSE (e.hpp_rab + e.margin) * 0.50
        END THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - CASE e.skala
            WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40
            WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30
            ELSE (e.hpp_rab + e.margin) * 0.50
        END)
        ELSE 0
    END AS termin_2,
    GREATEST((e.hpp_rab + e.margin) -
        CASE e.skala
            WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40
            WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30
            ELSE (e.hpp_rab + e.margin) * 0.50
        END -
        CASE
            WHEN e.total_dibayar > CASE e.skala
                WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40
                WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30
                ELSE (e.hpp_rab + e.margin) * 0.50
            END THEN LEAST((e.hpp_rab + e.margin) * 0.30, e.total_dibayar - CASE e.skala
                WHEN 'Besar' THEN (e.hpp_rab + e.margin) * 0.40
                WHEN 'Sedang' THEN (e.hpp_rab + e.margin) * 0.30
                ELSE (e.hpp_rab + e.margin) * 0.50
            END)
            ELSE 0
        END, 0) AS pelunasan,
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
FROM events e;

DELIMITER //
DROP PROCEDURE IF EXISTS sp_perbarui_event //
CREATE PROCEDURE sp_perbarui_event(
    IN p_id VARCHAR(20),
    IN p_total_dibayar DECIMAL(15,2),
    IN p_status_data VARCHAR(10)
)
BEGIN
    DECLARE v_nilai_kontrak DECIMAL(15,2);

    SELECT hpp_rab + margin INTO v_nilai_kontrak
    FROM events WHERE id = p_id FOR UPDATE;

    IF v_nilai_kontrak IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Event tidak ditemukan.';
    END IF;
    IF p_total_dibayar < 0 OR p_total_dibayar > v_nilai_kontrak THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Total pembayaran harus antara 0 dan nilai kontrak.';
    END IF;
    IF p_status_data NOT IN ('Draft', 'Final') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status data tidak valid.';
    END IF;

    UPDATE events
    SET total_dibayar = p_total_dibayar, status_data = p_status_data
    WHERE id = p_id;
END //
DELIMITER ;

INSERT INTO events (id, nama_event, skala, jenis_acara, tgl_event, lokasi, pelanggan, jenis_pihak, hpp_rab, margin, total_dibayar, tgl_jatuh_tempo, status_data) VALUES
('EDK-001', 'Royal Beach Wedding - Putu & Kadek', 'Besar', 'Wedding', '2026-03-05', 'Nusa Dua', 'Keluarga Putu Wirawan', 'Perorangan', 393500000, 86500000, 480000000, '2026-02-21', 'Final'),
('EDK-002', 'Rapat Kerja Nasional PT Astra Nusantara', 'Besar', 'Corporate Meeting', '2026-04-10', 'Nusa Dua Convention Center', 'PT Astra Nusantara Tbk', 'Perusahaan', 539500000, 110500000, 650000000, '2026-04-04', 'Final'),
('EDK-003', 'Launching Produk Skincare GlowBali', 'Sedang', 'Product Launching', '2026-05-02', 'Seminyak', 'PT Kosmetika Bali Jaya', 'Perusahaan', 168000000, 42000000, 210000000, '2026-04-24', 'Final'),
('EDK-004', 'Baby Shower & Family Party Ibu Ratna', 'Kecil', 'Family Party', '2026-06-03', 'Villa Seminyak', 'Ratna Dewi', 'Perorangan', 44000000, 11000000, 55000000, '2026-05-09', 'Final'),
('EDK-005', 'Konferensi Pariwisata ASEAN 2026', 'Besar', 'Konferensi', '2026-07-11', 'Bali Nusa Dua Convention Center', 'Kementerian Pariwisata RI', 'Perusahaan', 833000000, 147000000, 392000000, '2026-07-03', 'Final'),
('EDK-006', 'Wedding Destination Sarah & James', 'Besar', 'Wedding', '2026-08-08', 'Uluwatu', 'Keluarga Sarah Thompson', 'Perorangan', 459000000, 101000000, 392000000, '2026-07-25', 'Final'),
('EDK-007', 'Family Gathering PT Bank Sinar Mas', 'Sedang', 'Family Gathering', '2026-08-22', 'Sanur', 'PT Bank Sinar Mas Cabang Bali', 'Perusahaan', 186500000, 43500000, 230000000, '2026-08-22', 'Final'),
('EDK-008', 'Konser Amal Peduli Anak Bali', 'Sedang', 'Konser', '2026-09-05', 'Lapangan Renon Denpasar', 'Yayasan Peduli Anak Bali', 'Perusahaan', 201500000, 38500000, 72000000, '2026-09-05', 'Final'),
('EDK-009', 'Seminar Nasional Digital Marketing', 'Kecil', 'Seminar', '2026-09-26', 'Ubud', 'Universitas Udayana', 'Perusahaan', 68000000, 17000000, 85000000, '2026-09-12', 'Final'),
('EDK-010', 'Pernikahan Adat Bali Made & Ayu', 'Sedang', 'Wedding', '2026-10-09', 'Denpasar', 'Keluarga Made Suryawan', 'Perorangan', 213000000, 47000000, 182000000, '2026-10-03', 'Final'),
('EDK-011', 'Annual Meeting PT Telkom Indonesia Regional Bali', 'Besar', 'Corporate Meeting', '2026-10-24', 'Nusa Dua', 'PT Telkom Indonesia', 'Perusahaan', 498000000, 102000000, 480000000, '2026-11-08', 'Final'),
('EDK-012', 'Product Launching Motor Listrik EvoBike', 'Besar', 'Product Launching', '2026-11-07', 'Canggu', 'PT EvoBike Indonesia', 'Perusahaan', 348500000, 81500000, 172000000, '2026-11-07', 'Draft'),
('EDK-013', 'Wedding Expo Bali 2026', 'Besar', 'Exhibition', '2026-11-21', 'Kuta', 'Asosiasi Wedding Organizer Bali', 'Perusahaan', 588000000, 112000000, 490000000, '2026-11-28', 'Draft'),
('EDK-014', 'Company Outing PT Unilever Indonesia', 'Sedang', 'Company Outing', '2026-12-05', 'Tanah Lot', 'PT Unilever Indonesia', 'Perusahaan', 158000000, 37000000, 97500000, '2026-12-05', 'Final'),
('EDK-015', 'Pernikahan Elegan Michael & Chelsea', 'Besar', 'Wedding', '2026-12-12', 'Jimbaran', 'Keluarga Michael Tanoto', 'Perorangan', 410000000, 90000000, 350000000, '2026-12-12', 'Final'),
('EDK-016', 'Rapat Tahunan Koperasi Simpan Pinjam Bali Sejahtera', 'Kecil', 'Corporate Meeting', '2027-01-09', 'Denpasar', 'Koperasi Bali Sejahtera', 'Perusahaan', 54500000, 13500000, 34000000, '2026-12-26', 'Final'),
('EDK-017', 'Konser Musik Jazz Sunset Sanur', 'Sedang', 'Konser', '2027-01-23', 'Pantai Sanur', 'Sanur Jazz Community', 'Perusahaan', 191000000, 39000000, 161000000, '2027-01-23', 'Draft'),
('EDK-018', 'Grand Launching Resort Alaya Ubud', 'Besar', 'Product Launching', '2027-02-06', 'Ubud', 'PT Alaya Hospitality Group', 'Perusahaan', 539500000, 110500000, 260000000, '2027-02-13', 'Final'),
('EDK-019', 'Ulang Tahun Pernikahan ke-25 Bapak & Ibu Santoso', 'Kecil', 'Ulang Tahun', '2027-02-20', 'Villa Nusa Dua', 'Keluarga Santoso', 'Perorangan', 57500000, 14500000, 36000000, '2027-02-13', 'Final'),
('EDK-020', 'Gala Dinner Penghargaan PT Pertamina Regional Bali', 'Besar', 'Corporate Gala', NULL, 'Nusa Dua', 'PT Pertamina (Persero)', 'Perusahaan', 451000000, 99000000, 385000000, '2027-03-22', 'Draft');
