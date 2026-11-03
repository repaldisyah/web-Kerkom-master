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
9. Jika memakai seed akun pelanggan demo, jalankan `migration_link_demo_customer_accounts_to_events.sql` lebih dahulu agar profil demo merujuk pelanggan event yang benar. Setelah tabel pelanggan, event, dan riwayat pembayaran siap, jalankan `migration_link_events_to_customer_codes.sql`. Migrasi hanya mengaitkan nama lama yang unik pada cabangnya; baris tanpa tautan perlu dipilih manual memakai kode pelanggan `NKC-xxxxxx` pada halaman cabang.
10. Atur `api/config.php`, jalankan Apache/MySQL, buka `http://localhost/web-Kerkom-master/halaman.html` melalui Apache.
11. Untuk pengingat, pasang `install-due-reminders-task.ps1` setelah migrasi notifikasi. Worker perlu PHP/MySQL berjalan dan hanya membuat notifikasi in-app.

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

### ID akun, ID login, dan profil pelanggan

`users.id` adalah ID akun database dan dibuat otomatis saat akun dibuat; nilainya dapat berbeda antar instalasi. Untuk login, gunakan `username` atau `email`, bukan `users.id`. Akun pelanggan juga memiliki `users.customer_id`, yang menunjuk ke `customers.id`; ID profil pelanggan bukan ID login.

Akun yang disediakan oleh skrip seed saat ini:

| Jenis akun | Username | Email login | Keterangan |
|---|---|---|---|
| Admin pusat | `admin` | `admin@nusakarsa.com` | Dibuat oleh `migration_seed_admin_accounts.sql` di `admin_pusat`. |
| Admin cabang Palembang | `admin_palembang` | `admin.palembang@nusakarsa.com` | Dibuat oleh `migration_seed_admin_accounts.sql`. |
| Admin cabang Bali | `admin_bali` | `admin.bali@nusakarsa.com` | Dibuat oleh `migration_seed_admin_accounts.sql`. |
| Admin cabang Bandung | `admin_bandung` | `admin.bandung@nusakarsa.com` | Dibuat oleh `migration_seed_admin_accounts.sql`. |
| Pelanggan | `rani.siger` | `rani.siger@example.com` | Seed akun pelanggan per cabang; lihat `migration_seed_customer_accounts_by_branch.sql`. |
| Pelanggan | `dimas.sriwijaya` | `dimas.sriwijaya@example.com` | Seed akun pelanggan per cabang. |
| Pelanggan | `nadia.musi` | `nadia.musi@example.com` | Seed akun pelanggan per cabang. |
| Pelanggan | `made.dewata` | `made.dewata@example.com` | Seed akun pelanggan per cabang. |
| Pelanggan | `ayu.purnama` | `ayu.purnama@example.com` | Seed akun pelanggan per cabang. |
| Pelanggan | `komang.aruna` | `komang.aruna@example.com` | Seed akun pelanggan per cabang. |
| Pelanggan | `fajar.parahyangan` | `fajar.parahyangan@example.com` | Seed akun pelanggan per cabang. |
| Pelanggan | `intan.lembur` | `intan.lembur@example.com` | Seed akun pelanggan per cabang. |
| Pelanggan | `rizky.priangan` | `rizky.priangan@example.com` | Seed akun pelanggan per cabang. |
| Pelanggan demo opsional | `ilyas.palembang` | `ilyas.palembang@demo.nusakarsa.com` | Dibuat oleh `migration_seed_demo_customers.sql`. |
| Pelanggan demo opsional | `keyla.bandung` | `keyla.bandung@demo.nusakarsa.com` | Dibuat oleh `migration_seed_demo_customers.sql`. |
| Pelanggan demo opsional | `dhini.bali` | `dhini.bali@demo.nusakarsa.com` | Dibuat oleh `migration_seed_demo_customers.sql`. |

Tabel di atas adalah daftar akun yang didefinisikan skrip seed, bukan jaminan semua akun tersebut ada di database saat ini. Akun aktual dan ID-nya bergantung pada skrip yang pernah dijalankan serta perubahan di aplikasi. Jalankan query berikut untuk memeriksa akun dan relasi profil saat ini tanpa membaca hash password:

    SELECT id, name, username, email, role FROM admin_pusat.users ORDER BY username;

    SELECT u.id, u.name, u.username, u.email, u.role,
           u.branch_id, b.name AS cabang, u.customer_id, c.name AS profil_pelanggan
    FROM nusa_karsa.users AS u
    LEFT JOIN nusa_karsa.branches AS b ON b.id = u.branch_id
    LEFT JOIN nusa_karsa.customers AS c ON c.id = u.customer_id
    ORDER BY u.role, b.name, u.username;

Password setiap akun tidak dicantumkan karena skrip menyimpan `password_hash`, bukan password asli. Hash tidak dapat dikembalikan menjadi password. Karena itu README maupun query database tidak dapat menunjukkan password yang saat ini berlaku; gunakan fitur ganti/lupa password atau atur kredensial baru melalui proses administrasi yang sesuai. Alur lupa password simulasi tersedia melalui halaman terpisah, tetapi kode verifikasi ditampilkan di halaman dan tidak membuktikan kepemilikan email/nomor telepon.

Jangan jalankan ulang skrip seed pada database operasional untuk mencari atau mereset password: beberapa seed memperbarui hash akun yang sudah ada. Seed demo ditujukan untuk instalasi/presentasi lokal dan bukan sumber password akun produksi.

## Pembayaran dan data demo

Simulasi portal pelanggan membuat transaksi `demo_simulation` dan mengurangi saldo operasional. Ini bukan pembayaran gateway atau bukti penerimaan uang. Pakai hanya pada database demo yang dapat dipulihkan dari backup. Sebagian data lama berupa snapshot saldo historis, bukan rincian cicilan bertanggal.

Pembatalan mempertahankan transaksi dan alasan, membalik saldo, serta membuat notifikasi. Pelanggan dapat membatalkan simulasi sendiri dalam 24 jam; admin cabang dibatasi 30 hari dan cabangnya; admin pusat dapat membatalkan transaksi tersimpan. Snapshot historis tidak dapat dibatalkan. Pembatalan lintas database memerlukan InnoDB dan izin MySQL yang sesuai.

## Kode pelanggan dan tautan event

Kode pelanggan ditampilkan sebagai `NKC-` diikuti ID profil enam digit, misalnya `NKC-000123`. Event baru harus memilih kode dari daftar cabangnya. Relasi disimpan memakai `customer_id`; nama pelanggan tetap dipakai sebagai teks tampilan/snapshot, bukan sebagai kunci pencocokan.

Migrasi `migration_link_events_to_customer_codes.sql` mengisi tautan lama hanya bila nama tersebut cocok dengan tepat satu profil dalam cabang yang sama. Tinjau event yang masih `customer_id IS NULL` setelah migrasi. Admin dapat menautkan event lama yang belum jelas dari halaman Bali/Bandung melalui edit event, atau dari kolom pelanggan Palembang. Riwayat pembayaran terkait ikut diperbarui saat event ditautkan.

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
