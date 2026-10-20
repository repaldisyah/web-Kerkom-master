# Database dan akun

Panduan setup lokal, role, seed, dan migrasi. Periksa skema aktual dan backup seluruh database sebelum perubahan.

## Database

| Database | Isi |
|---|---|
| `nusa_karsa` | Operasi utama, cabang, pelanggan, admin cabang, pembayaran umum, event Palembang. |
| `admin_pusat` | Akun admin pusat. |
| `events_bali` | Event dan pembayaran Bali. |
| `events_bandung` | Event dan pembayaran Bandung. |

Koneksi diatur oleh `api/config.php`; gunakan `api/config.example.php` sebagai acuan. Jangan membagikan konfigurasi lokal.

## Instalasi baru

Gunakan database kosong; langkah ini bukan untuk database yang sudah menerima transaksi.

1. Impor `nusa_karsa.sql` ke `nusa_karsa`.
2. Jalankan `migration_separate_admin_pusat.sql`, lalu `migration_seed_admin_accounts.sql`.
3. Pastikan `customer_id` tersedia; bila belum, jalankan `migration_add_customer_account.sql`. Jalankan seed akun pelanggan hanya setelah profil dan cabang yang dirujuk tersedia. Seed demo tambahan opsional.
4. Jalankan `migration_add_payment_method.sql` dan `migration_add_payment_token.sql` hanya bila kolom belum tersedia.
5. Jalankan `migration_add_palembang_events.sql`.
6. Impor `events_bali.sql` dan `events_bandung.sql` ke database masing-masing; sesudah Bandung jalankan `events_bandung_upsert.sql`.
7. Setelah database event siap, terapkan migrasi riwayat pembayaran, simulasi demo, permintaan penghapusan, dan notifikasi sesuai database sasaran dalam setiap SQL.
8. Jalankan `migration_payment_cancellations.sql` setelah tabel transaksi/riwayat tersedia.
9. Atur `api/config.php`, jalankan Apache/MySQL, buka `http://localhost/web-Kerkom-master/halaman.html` melalui Apache.
10. Untuk pengingat, pasang `install-due-reminders-task.ps1` setelah migrasi notifikasi. Worker perlu PHP/MySQL berjalan dan hanya membuat notifikasi in-app.

Periksa database sasaran dalam tiap skrip SQL. Tidak semua migrasi aman dijalankan ulang.

## Pembaruan database lama

1. Ekspor backup semua database yang akan disentuh.
2. Bandingkan skema aktual dengan migrasi; jalankan hanya yang belum diterapkan.
3. Bali lama mungkin memerlukan `migration_add_event_calculations.sql` lalu `migration_update_bali_events.sql` sesuai skema.
4. Bandung lama tanpa jadwal mungkin memerlukan `migration_add_bandung_schedules.sql`, lalu `events_bandung_upsert.sql`.
5. Terapkan migrasi riwayat setelah database event siap, lalu tipe simulasi, permintaan hapus, notifikasi, dan pembatalan sesuai prasyarat.
6. Migrasi pengaitan akun demo dan pembersihan progres demo hanya untuk kondisi tertentu; baca SQL dan periksa dampaknya dahulu.
7. Periksa login, cakupan role/cabang, pembayaran, pembatalan, saldo, riwayat, laporan, dan notifikasi setelah migrasi.

Jangan impor ulang seed event pada database operasional. Pulihkan backup jika migrasi menghasilkan kondisi yang salah.

## Peran dan akun

| Role | Database | Cakupan |
|---|---|---|
| `admin_pusat` | `admin_pusat` | Lintas cabang, laporan, akun cabang, peninjauan permintaan hapus. |
| `admin_cabang` | `nusa_karsa` | Cabang pada akun. |
| `pelanggan` | `nusa_karsa` | Profil yang ditautkan melalui `customer_id`. |

Skrip seed dapat membuat/memperbarui akun demo dan mengatur ulang password seed ketika dijalankan. Dokumen ini sengaja tidak memuat nama akun seed, password, maupun hash. Untuk memeriksa akun aktual tanpa membaca hash:

    SELECT id, name, username, email, role FROM admin_pusat.users ORDER BY username;

    SELECT u.id, u.name, u.username, u.email, u.role,
           b.name AS cabang, c.name AS profil_pelanggan
    FROM nusa_karsa.users AS u
    LEFT JOIN nusa_karsa.branches AS b ON b.id = u.branch_id
    LEFT JOIN nusa_karsa.customers AS c ON c.id = u.customer_id
    ORDER BY u.role, b.name, u.username;

Jangan jalankan ulang seed pada database operasional untuk mereset kredensial. Perubahan password tersedia bagi akun yang login. Alur lupa password simulasi tersedia melalui halaman terpisah, tetapi kode verifikasi ditampilkan di halaman dan tidak membuktikan kepemilikan email/nomor telepon.

## Pembayaran dan data demo

Simulasi portal pelanggan membuat transaksi `demo_simulation` dan mengurangi saldo operasional. Ini bukan pembayaran gateway atau bukti penerimaan uang. Pakai hanya pada database demo yang dapat dipulihkan dari backup. Sebagian data lama berupa snapshot saldo historis, bukan rincian cicilan bertanggal.

Pembatalan mempertahankan transaksi dan alasan, membalik saldo, serta membuat notifikasi. Pelanggan dapat membatalkan simulasi sendiri dalam 24 jam; admin cabang dibatasi 30 hari dan cabangnya; admin pusat dapat membatalkan transaksi tersimpan. Snapshot historis tidak dapat dibatalkan. Pembatalan lintas database memerlukan InnoDB dan izin MySQL yang sesuai.

Worker `api/due-reminders-worker.php` berjalan melalui PHP CLI, memeriksa H-7, H-3, H-1, hari-H, dan interval keterlambatan mingguan. Kunci unik mencegah notifikasi identik berulang. Pengiriman email/WhatsApp tidak tersedia.

## Backup dan keamanan

- Backup semua database sebelum migrasi, seed, atau uji demo; simpan terpisah dan verifikasi proses restore.
- Jangan bagikan `api/config.php`, password, atau hash. Batasi izin akun MySQL.
- Gunakan HTTPS dan penyimpanan rahasia di luar webroot untuk produksi.
- CSRF tersedia pada perubahan password; perlindungan seluruh endpoint mutasi belum lengkap. Audit otorisasi server sebelum produksi.
- Jangan gunakan simulasi pelanggan pada data nyata.

## Laporan dan notifikasi perangkat

Pemilih bulan laporan dan riwayat mendukung Januari 2022 hingga Desember 2100. Riwayat dan laporan mengikuti tanggal pembayaran/invoice tersimpan; data lama tanpa tanggal transaksi yang tepat tidak dapat direkonstruksi.

Notifikasi transaksi baru memakai tabel due_notifications yang dibuat oleh migration_add_due_notifications.sql. Pada menu Notifikasi, pengguna harus memilih **Aktifkan notif dering** dan mengizinkan notifikasi browser. Notifikasi sistem dan bunyi mengikuti pengaturan OS/browser; bunyi halaman hanya aktif setelah interaksi pengguna. Polling berjalan saat aplikasi terbuka, sehingga browser yang ditutup atau menangguhkan tab tidak dijamin menerima notifikasi langsung. Akses dari handphone melalui jaringan memerlukan HTTPS; localhost aman untuk pengembangan lokal.
