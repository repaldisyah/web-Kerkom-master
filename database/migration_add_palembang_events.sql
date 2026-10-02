USE nusa_karsa;

CREATE TABLE IF NOT EXISTS palembang_events (
    id VARCHAR(20) PRIMARY KEY,
    nama_event VARCHAR(255) NOT NULL,
    skala VARCHAR(20) NOT NULL,
    jenis_acara VARCHAR(100) NOT NULL,
    tgl_event DATE NULL,
    lokasi VARCHAR(255) NULL,
    pelanggan VARCHAR(255) NULL,
    jenis_pihak VARCHAR(40) NOT NULL,
    hpp_rab DECIMAL(15,2) NOT NULL DEFAULT 0,
    margin_persen DECIMAL(5,2) NOT NULL DEFAULT 0,
    nilai_kontrak DECIMAL(15,2) NOT NULL DEFAULT 0,
    dp DECIMAL(15,2) NOT NULL DEFAULT 0,
    termin_2 DECIMAL(15,2) NOT NULL DEFAULT 0,
    pelunasan DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_dibayar DECIMAL(15,2) NOT NULL DEFAULT 0,
    piutang DECIMAL(15,2) NOT NULL DEFAULT 0,
    status_sumber VARCHAR(30) NOT NULL,
    sumber_data VARCHAR(100) NOT NULL,
    tgl_jatuh_tempo DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_palembang_amounts CHECK (hpp_rab >= 0 AND nilai_kontrak >= 0 AND total_dibayar >= 0 AND piutang >= 0 AND piutang <= nilai_kontrak)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS palembang_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(20) NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method ENUM('QRIS', 'BRI', 'BCA', 'SEABANK', 'PAYPAL') NOT NULL,
    payment_token VARCHAR(32) NOT NULL UNIQUE,
    note VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_palembang_payment_event FOREIGN KEY (event_id) REFERENCES palembang_events(id) ON DELETE RESTRICT,
    CONSTRAINT chk_palembang_payment_amount CHECK (amount > 0)
) ENGINE=InnoDB;

INSERT INTO palembang_events
(id,nama_event,skala,jenis_acara,tgl_event,lokasi,pelanggan,jenis_pihak,hpp_rab,margin_persen,nilai_kontrak,dp,termin_2,pelunasan,total_dibayar,piutang,status_sumber,sumber_data,tgl_jatuh_tempo)
VALUES
('EBG-001','Sriwijaya Expo 2025','Regional','Expo','2025-08-01','Benteng Kuto Besak','Tenant A','Tenant',350000000,18,426830000,128050000,150000000,148780000,426830000,0,'Lunas','Event ASLI / Keuangan SIM','2025-08-15'),
('EBG-002','Palembang Expo 2025','Regional','Expo',NULL,'Palembang','Sponsor A','Sponsor',300000000,18,365850000,109760000,120000000,80000000,309760000,56090000,'Menunggak','Event ASLI / Keuangan SIM','2025-09-20'),
('EBG-003','Festival Wong Kito Besongket','Regional','Festival Budaya',NULL,'Palembang','Sponsor B','Sponsor',275000000,18,335370000,100610000,100000000,70000000,270610000,64760000,'Menunggak','Event ASLI / Keuangan SIM','2025-05-31'),
('EBG-004','Festival Sriwijaya 2025','Regional','Festival Budaya','2025-05-16','Palembang','Sponsor C','Sponsor',275000000,18,335370000,100610000,100000000,134760000,335370000,0,'Lunas','Event ASLI / Keuangan SIM','2025-05-31'),
('EBG-005','Festival Perahu Bidar Tradisional 2025','Major','Festival/Olahraga','2025-08-15','Benteng Kuto Besak','Sponsor D','Sponsor',400000000,15,470590000,141180000,150000000,100000000,391180000,79410000,'Menunggak','Event ASLI / Keuangan SIM','2025-08-30'),
('EBG-006','Ampera Tourism Run 2025','Major','Sport/Tourism','2025-06-15','Palembang','Sponsor E','Sponsor',300000000,15,352940000,141180000,100000000,111760000,352940000,0,'Lunas','Event ASLI / Keuangan SIM','2025-06-30'),
('EBG-007','Sriwijaya Lantern Festival 2025','Major','Festival',NULL,'Palembang','Sponsor F','Sponsor',450000000,15,529410000,158820000,180000000,100000000,438820000,90590000,'Menunggak','Event ASLI / Keuangan SIM','2025-09-30'),
('EBG-008','Cap Go Meh Pulau Kemaro 2025','Major','Budaya/Keagamaan',NULL,'Pulau Kemaro','Sponsor G','Sponsor',350000000,15,411760000,164710000,120000000,80000000,364710000,47050000,'Menunggak','Event ASLI / Keuangan SIM','2025-03-15'),
('EBG-009','Ziarah Kubro 2025','Major','Religi/Budaya',NULL,'Palembang','Sponsor H','Sponsor',220000000,15,258820000,77650000,100000000,81180000,258820000,0,'Lunas','Event ASLI / Keuangan SIM','2025-04-15'),
('EBG-010','Festival Jazz Internasional Suara Musi','Major','Musik',NULL,'Palembang','Sponsor I','Sponsor',500000000,12,568180000,227270000,200000000,100000000,527270000,40910000,'Menunggak','Event ASLI / Keuangan SIM','2025-10-15'),
('EBG-011','Festival Band Competition 2025','Regional','Musik/Kompetisi',NULL,'Palembang','Sponsor J','Sponsor',175000000,18,213410000,64020000,75000000,74390000,213410000,0,'Lunas','Event ASLI / Keuangan SIM','2025-09-15'),
('EBG-012','Sriwijaya Travel Fair 2025','Regional','Travel Expo',NULL,'Palembang','Tenant K','Tenant',180000000,17,216870000,65060000,75000000,76870000,216870000,0,'Lunas','Event ASLI / Keuangan SIM','2025-09-15'),
('EBG-013','Kadin Sumsel Expo 2025','Regional','Business Expo','2025-10-21','Palembang','Tenant L','Tenant',200000000,18,243900000,73170000,90000000,40000000,203170000,40730000,'Belum Lunas','Event ASLI / Keuangan SIM','2025-11-15'),
('EBG-014','Pertamina SMEXPO Palembang 2025','Regional','UMKM Expo',NULL,'Palembang','Tenant M','Tenant',200000000,18,243900000,73170000,90000000,80730000,243900000,0,'Lunas','Event ASLI / Keuangan SIM','2025-11-30'),
('EBG-015','Palembang Half Marathon 2025','Major','Olahraga',NULL,'Palembang','Sponsor N','Sponsor',300000000,15,352940000,141180000,100000000,50000000,291180000,61760000,'Menunggak','Event ASLI / Keuangan SIM','2025-06-30'),
('EBG-016','Bujang Gadis Kesehatan Palembang 2025','Medium','Beauty/Competition',NULL,'Palembang','Sponsor O','Sponsor',110330000,20,137910000,55160000,40000000,20000000,115160000,22750000,'Menunggak','RAB ASLI / Piutang SIM','2025-09-30'),
('EBG-017','Youth Volunteer League 2025','Medium','Competition',NULL,'Palembang','Sponsor P','Sponsor',43990000,20,54990000,21990000,20000000,0,41990000,13000000,'Menunggak','RAB ASLI / Piutang SIM','2025-10-15'),
('EBG-018','English Festival Polsri 2025','Medium','Education Festival',NULL,'Polsri','Sponsor Q','Sponsor',27100000,20,33880000,13550000,10000000,10000000,33550000,330000,'Belum Lunas','RAB/Sponsorship ASLI','2025-11-30'),
('EBG-019','Festival Seni Islam 2025','Medium','Islamic Festival',NULL,'Palembang','Sponsor R','Sponsor',35000000,20,43750000,17500000,15000000,11250000,43750000,0,'Lunas','RAB ASLI / Piutang SIM','2025-10-30'),
('EBG-020','Pelantikan & Seminar HIMAPALI Sumsel 2025','Medium','Seminar',NULL,'Palembang','Sponsor S','Sponsor',42140000,20,52670000,21070000,15000000,10000000,46070000,6600000,'Belum Lunas','RAB ASLI / Piutang SIM','2025-11-30')
ON DUPLICATE KEY UPDATE
 nama_event=VALUES(nama_event), skala=VALUES(skala), jenis_acara=VALUES(jenis_acara), tgl_event=VALUES(tgl_event), lokasi=VALUES(lokasi), pelanggan=VALUES(pelanggan), jenis_pihak=VALUES(jenis_pihak), margin_persen=VALUES(margin_persen), status_sumber=VALUES(status_sumber), sumber_data=VALUES(sumber_data), tgl_jatuh_tempo=VALUES(tgl_jatuh_tempo);