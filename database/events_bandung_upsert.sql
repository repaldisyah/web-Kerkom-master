-- Jalankan setelah database/events_bandung.sql atau migration_add_bandung_schedules.sql.
-- Upsert aman: data diperbarui berdasarkan ID tanpa menghapus tabel.
USE events_bandung;

INSERT INTO events
    (id, nama_event, skala, jenis_acara, tgl_event, lokasi, pelanggan, jenis_pihak,
     hpp_rab, margin, total_dibayar, dp_schedule, termin_2_schedule, pelunasan_schedule,
     tgl_jatuh_tempo, status_data)
VALUES
('ED-001','Wedding Elegan Rina & Fajar','Besar','Wedding','2026-02-14','The Trans Luxury Hotel, Bandung','Keluarga Fajar Nugraha','Perorangan',265500000,54500000,320000000,96000000,128000000,96000000,'2026-02-21','Final'),
('ED-002','Rapat Kerja Regional PT Pos Indonesia','Besar','Corporate Meeting','2026-03-05','Hotel Savoy Homann, Bandung','PT Pos Indonesia (Persero)','Perusahaan',353000000,67000000,420000000,168000000,126000000,126000000,'2026-04-04','Final'),
('ED-003','Launching Kopi Lokal Parahyangan Blend','Sedang','Product Launching','2026-04-10','Braga, Bandung','PT Kapal Api Bandung Raya','Perusahaan',113500000,26500000,140000000,42000000,56000000,42000000,'2026-04-24','Final'),
('ED-004','Ulang Tahun ke-17 Keysha','Kecil','Ulang Tahun','2026-05-02','Dago, Bandung','Rita Kusnadi','Perorangan',30500000,7500000,38000000,19000000,0,19000000,'2026-05-09','Final'),
('ED-005','Konferensi Pendidikan Nasional Unpad','Besar','Konferensi','2026-06-03','Grha Sanusi Hardjadinata, Unpad','Universitas Padjadjaran','Perusahaan',533000000,87000000,248000000,248000000,186000000,186000000,'2026-07-03','Final'),
('ED-006','Wedding Intimate Sari & Yoga','Sedang','Wedding','2026-07-11','Lembang, Bandung Barat','Keluarga Sari Melati','Perorangan',157500000,32500000,133000000,57000000,76000000,57000000,'2026-07-25','Final'),
('ED-007','Family Gathering Bank Jabar Banten','Sedang','Family Gathering','2026-08-08','Ciwidey, Bandung','PT Bank Jabar Banten (bjb)','Perusahaan',123000000,27000000,150000000,75000000,0,75000000,'2026-08-22','Final'),
('ED-008','Konser Musik Indie Bandung Bergema','Sedang','Konser','2026-08-22','Sabuga, Bandung','Komunitas Musik Indie Bandung','Perusahaan',132000000,23000000,46500000,46500000,62000000,46500000,'2026-09-05','Final'),
('ED-009','Seminar Nasional Inovasi Teknologi ITB','Kecil','Seminar','2026-09-05','Kampus ITB, Bandung','Institut Teknologi Bandung','Perusahaan',44500000,10500000,55000000,27500000,0,27500000,'2026-09-12','Final'),
('ED-010','Pernikahan Adat Sunda Dewi & Reza','Sedang','Wedding','2026-09-26','Gedung Merdeka, Bandung','Keluarga Dewi Anggraeni','Perorangan',141000000,29000000,119000000,51000000,68000000,51000000,'2026-10-03','Final'),
('ED-011','Annual Meeting PT Dirgantara Indonesia','Besar','Corporate Meeting','2026-10-09','Hotel Aryaduta, Bandung','PT Dirgantara Indonesia','Perusahaan',327500000,62500000,312000000,195000000,117000000,78000000,'2026-11-08','Final'),
('ED-012','Product Launching Local Brand Fashion Kalya','Besar','Product Launching','2026-10-24','Paskal 23, Bandung','PT Kalya Fashion Indonesia','Perusahaan',229500000,50500000,112000000,112000000,84000000,84000000,'2026-11-07','Draft'),
('ED-013','Wedding Expo Bandung 2026','Besar','Exhibition','2026-11-07','Trans Studio Mall, Bandung','Asosiasi Wedding Organizer Jabar','Perusahaan',382500000,67500000,315000000,180000000,135000000,135000000,'2026-11-28','Draft'),
('ED-014','Company Outing PT Kimia Farma Tbk','Sedang','Company Outing','2026-11-21','Kota Baru Parahyangan, Bandung Barat','PT Kimia Farma Tbk','Perusahaan',106500000,23500000,65000000,65000000,0,65000000,'2026-12-05','Final'),
('ED-015','Wedding Mewah Dimas & Clarissa','Besar','Wedding','2026-12-05','Hotel Padma, Bandung','Keluarga Dimas Pratama','Perorangan',265500000,54500000,224000000,96000000,128000000,96000000,'2026-12-12','Final'),
('ED-016','Rapat Tahunan Koperasi Guru Bandung','Kecil','Corporate Meeting','2026-12-12','Buah Batu, Bandung','Koperasi Guru Sejahtera Bandung','Perusahaan',36500000,8500000,22500000,22500000,0,22500000,'2026-12-26','Final'),
('ED-017','Konser Jazz Braga Malam','Sedang','Konser','2027-01-09','Jalan Braga, Bandung','Braga Jazz Community','Perusahaan',126000000,24000000,105000000,45000000,60000000,45000000,'2027-01-23','Draft'),
('ED-018','Grand Launching Resort Ciwidey Valley','Besar','Product Launching','2027-01-23','Ciwidey, Bandung Selatan','PT Ciwidey Valley Hospitality','Perusahaan',353000000,67000000,168000000,168000000,126000000,126000000,'2027-02-13','Final'),
('ED-019','Ulang Tahun Pernikahan ke-25 Bapak & Ibu Kurniawan','Kecil','Ulang Tahun','2027-02-06','Setiabudi, Bandung','Keluarga Kurniawan','Perorangan',39000000,9000000,24000000,24000000,0,24000000,'2027-02-13','Final'),
('ED-020','Gala Dinner Penghargaan PT PLN Regional Jabar','Besar','Corporate Gala','2027-02-20','Hotel Aston Pasteur, Bandung','PT PLN (Persero) Regional Jabar','Perusahaan',294500000,60500000,248500000,142000000,106500000,106500000,'2027-03-22','Draft')
ON DUPLICATE KEY UPDATE
    nama_event=VALUES(nama_event), skala=VALUES(skala), jenis_acara=VALUES(jenis_acara),
    tgl_event=VALUES(tgl_event), lokasi=VALUES(lokasi), pelanggan=VALUES(pelanggan),
    jenis_pihak=VALUES(jenis_pihak), hpp_rab=VALUES(hpp_rab), margin=VALUES(margin),
    total_dibayar=VALUES(total_dibayar), dp_schedule=VALUES(dp_schedule),
    termin_2_schedule=VALUES(termin_2_schedule), pelunasan_schedule=VALUES(pelunasan_schedule),
    tgl_jatuh_tempo=VALUES(tgl_jatuh_tempo), status_data=VALUES(status_data);