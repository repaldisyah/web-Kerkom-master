-- Skema Database SQLite untuk Data Event Cabang Bali
-- Versi: 2.0 | Diperbarui: September 2026
-- Sumber: Data OCR yang telah dibersihkan & divalidasi
DROP TABLE IF EXISTS events;

CREATE TABLE events (
    no INTEGER PRIMARY KEY,
    id TEXT NOT NULL UNIQUE,
    nama_event TEXT NOT NULL,
    skala TEXT,
    jenis_acara TEXT,
    tanggal TEXT,
    lokasi TEXT,
    pelanggan TEXT,
    rab INTEGER DEFAULT 0,
    nilai_kontrak INTEGER DEFAULT 0,
    dp INTEGER DEFAULT 0,
    termin_2 INTEGER DEFAULT 0,
    pelunasan INTEGER DEFAULT 0,
    total_dibayar INTEGER DEFAULT 0,
    piutang INTEGER DEFAULT 0,
    status TEXT,
    jatuh_tempo TEXT,
    status_data TEXT,
    catatan TEXT
);

INSERT INTO events VALUES (1, 'EDK-001', 'Royal Beach Wedding - Putu & Kadek', 'Besar', 'Wedding', '05/03/2026', 'Nusa Dua Beach Hotel', 'Keluarga Putu Wiranata', 230500000, 480000000, 144000000, 140000000, 196000000, 480000000, 0, 'Lunas', '21/02/2026', 'Final', '-');
INSERT INTO events VALUES (2, 'EDK-002', 'Rapat Kerja Nasional PT Astra Nusantara', 'Besar', 'Corporate Meeting', '10/04/2026', 'Nusa Dua Convention Center', 'PT Astra Nusantara', 530500000, 650000000, 260000000, 195000000, 195000000, 650000000, 0, 'Lunas', '04/04/2026', 'Final', '-');
INSERT INTO events VALUES (3, 'EDK-003', 'Launching Produk Skincare GlowBali', 'Besar', 'Product Launching', '02/05/2026', 'W Hotel Seminyak', 'PT GlowBali Kosmetik', 210000000, 300000000, 150000000, 0, 150000000, 300000000, 0, 'Lunas', '24/04/2026', 'Final', '-');
INSERT INTO events VALUES (4, 'EDK-004', 'Baby Shower & Family Party Ibu Ratna', 'Kecil', 'Family Party', '03/06/2026', 'Villa Seminyak', 'Keluarga Ratna Dewi', 44000000, 55000000, 27500000, 0, 27500000, 55000000, 0, 'Lunas', '09/05/2026', 'Final', '-');
INSERT INTO events VALUES (5, 'EDK-005', 'Konferensi Pariwisata ASEAN 2026', 'Besar', 'Konferensi', '11/07/2026', 'Bali Nusa Dua Convention Center', 'Kementerian Pariwisata RI', 980000000, 1200000000, 600000000, 0, 0, 600000000, 600000000, 'Proses', '30/07/2026', 'Final', 'Pembayaran termin 2 & pelunasan belum diterima');
INSERT INTO events VALUES (6, 'EDK-006', 'Wedding Destination Sarah & James', 'Besar', 'Wedding', '08/08/2026', 'Ubud Jungle Resort', 'Keluarga Sarah Thompson', 160000000, 420000000, 210000000, 0, 0, 210000000, 210000000, 'Proses', '30/07/2026', 'Final', 'Pelunasan belum diterima. Jatuh tempo H-7 sebelum acara.');
INSERT INTO events VALUES (7, 'EDK-007', 'Family Gathering PT Bank Sinar Mas', 'Besar', 'Family Gathering', '12/08/2026', 'Kuta Beach Resort', 'PT Bank Sinar Mas', 150000000, 325000000, 162500000, 0, 0, 162500000, 162500000, 'Proses', '05/08/2026', 'Final', 'Termin 2 / pelunasan menunggu konfirmasi divisi keuangan klien');
INSERT INTO events VALUES (8, 'EDK-008', 'Konser Amal Peduli Anak Bali', 'Besar', 'Konser Amal', '25/09/2026', 'GWK Cultural Park', 'Yayasan Peduli Anak Bali', 220000000, 280000000, 140000000, 0, 0, 140000000, 140000000, 'Proses', '18/09/2026', 'Final', 'Pelunasan akan dilakukan setelah pencairan donasi event selesai');
INSERT INTO events VALUES (9, 'EDK-009', 'Seminar Nasional Digital Marketing', 'Kecil', 'Seminar', '26/09/2026', 'Harris Hotel Sunset Road, Denpasar', 'Komunitas Digital Bali', 85000000, 120000000, 60000000, 0, 0, 60000000, 60000000, 'Proses', '20/09/2026', 'Final', 'Pelunasan dijadwalkan H-5 sebelum acara');
INSERT INTO events VALUES (10, 'EDK-010', 'Pernikahan Adat Bali Made & Ayu', 'Besar', 'Wedding', '09/10/2026', 'Puri Agung Mengwi, Badung', 'Keluarga I Made Suarjana', 310000000, 390000000, 195000000, 97500000, 0, 292500000, 97500000, 'Proses', '02/10/2026', 'Final', 'DP & termin 2 sudah lunas, menunggu pembayaran pelunasan akhir');
INSERT INTO events VALUES (11, 'EDK-011', 'Annual Meeting PT Telkom Indonesia Regional Bali', 'Besar', 'Corporate Meeting', '24/10/2026', 'Hotel Westin Nusa Dua', 'PT Telkom Indonesia', 320000000, 480000000, 240000000, 0, 0, 240000000, 240000000, 'Proses', '17/10/2026', 'Final', 'Pelunasan menunggu persetujuan RAPS internal PT Telkom');
INSERT INTO events VALUES (12, 'EDK-012', 'Product Launching Motor Listrik EvoBike', 'Besar', 'Product Launching', '07/11/2026', 'Bali International Convention Centre', 'PT EvoBike Indonesia', 330000000, 520000000, 260000000, 0, 0, 260000000, 260000000, 'Proses', '01/11/2026', 'Final', 'Sisa pembayaran 50% dijadwalkan H-7 sebelum launching');
INSERT INTO events VALUES (13, 'EDK-013', 'Wedding Expo Bali 2026', 'Besar', 'Exhibition', '21/11/2026', 'Bali Nusa Dua Theatre', 'Asosiasi Wedding Organizer Bali', 340000000, 450000000, 225000000, 0, 0, 225000000, 225000000, 'Proses', '15/11/2026', 'Final', 'Sisa 50% akan dibayarkan setelah konfirmasi vendor & dekorasi');
INSERT INTO events VALUES (14, 'EDK-014', 'Company Outing PT Unilever Indonesia', 'Besar', 'Company Outing', '15/12/2026', 'Munduk Eco Resort, Buleleng', 'PT Unilever Indonesia', 350000000, 560000000, 280000000, 0, 0, 280000000, 280000000, 'Proses', '08/12/2026', 'Final', 'Outing 2 hari 1 malam, pelunasan menunggu approval HRD');
INSERT INTO events VALUES (15, 'EDK-015', 'Pernikahan Elegan Michael & Chelsea', 'Besar', 'Wedding', '12/12/2026', 'Ayana Resort Jimbaran', 'Keluarga Michael Hartono', 360000000, 780000000, 390000000, 0, 0, 390000000, 390000000, 'Proses', '05/12/2026', 'Final', 'Destination wedding internasional; pelunasan dijadwalkan 1 bulan sebelum acara');
INSERT INTO events VALUES (16, 'EDK-016', 'Rapat Tahunan KSP Bali Sejahtera', 'Sedang', 'Corporate Meeting', '09/01/2027', 'Grand Inna Kuta Hotel', 'KSP Bali Sejahtera', 75000000, 110000000, 55000000, 0, 0, 55000000, 55000000, 'Proses', '02/01/2027', 'Final', 'Event perdana koperasi bersama Nusa Karsa; pelunasan H-7');
INSERT INTO events VALUES (17, 'EDK-017', 'Konser Musik Jazz Sunset Sanur', 'Sedang', 'Konser Musik', '(belum dikonfirmasi)', 'Pantai Sanur', 'Komunitas Jazz Bali', 95000000, 175000000, 87500000, 0, 0, 87500000, 87500000, 'Proses', 'TBD', 'Draft', 'Tanggal event belum dikonfirmasi; kontrak masih berstatus Draft');
