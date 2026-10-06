# Menjalankan backend lokal

1. Jalankan **Apache** dan **MySQL** dari XAMPP.
2. Buka `http://localhost/phpmyadmin`, lalu impor file `nusa_karsa.sql`. Setelah itu jalankan `migration_separate_admin_pusat.sql` satu kali untuk memindahkan akun `admin` ke database khusus `admin_pusat`; setelahnya jalankan `migration_seed_admin_accounts.sql` satu kali untuk membuat akun awal pusat dan cabang.
3. Jalankan `migration_add_palembang_events.sql` satu kali untuk membuat tabel event dan pembayaran Palembang. Impor `events_bali.sql` dan `events_bandung.sql` untuk membuat database event tiap cabang. Untuk instalasi baru, setelah itu jalankan `events_bandung_upsert.sql` agar jadwal DP/Termin 2/Pelunasan Bandung tersimpan. Untuk database Bandung lama, jalankan `migration_add_bandung_schedules.sql` satu kali, lalu jalankan `events_bandung_upsert.sql`.
4. Sesuaikan `../api/config.php` bila username, password, port, atau nama database MySQL Anda berbeda. Pemetaan cabang mengikuti data `nusa_karsa.sql`: Bali = `branch_id` 2 dan Bandung = `branch_id` 3.
5. Jalankan `migration_add_branch_payment_history.sql` satu kali setelah database Palembang, Bali, dan Bandung siap. Skrip ini menambahkan tabel/kolom riwayat dan mencatat satu saldo historis per event yang sudah memiliki pembayaran; tanggal dibiarkan kosong karena tanggal transaksi lama tidak tersedia.
6. Jalankan `migration_add_deletion_requests.sql` satu kali setelah migrasi riwayat pembayaran dan tabel event Palembang tersedia. Skrip ini membuat antrean permintaan penghapusan dan snapshot pembayaran Palembang.
7. Letakkan folder proyek ini di `C:/xampp/htdocs/web-Kerkom-master` (atau atur virtual host ke folder proyek), kemudian buka `http://localhost/web-Kerkom-master/halaman.html`.

Halaman `Html/cabangBali.html` dan `Html/cabangBandung.html` memakai stylesheet serta JavaScript eksternal masing-masing. Data tabel, ringkasan, tambah, ubah, dan hapus diambil dari `api/events.php` atau `api/events-bandung.php`; akun `admin_cabang` hanya dapat mengakses database cabangnya, sedangkan akun `admin_pusat` pada database `admin_pusat` dapat mengakses seluruh cabang.

## Modul event Bali/Bandung

Stack yang digunakan adalah PHP 8+ dengan PDO MySQL untuk backend, MySQL 8+ untuk database/view kalkulasi, serta HTML/CSS/JavaScript vanilla untuk frontend. Setelah impor SQL, buka `Html/events-bali.html` atau `Html/cabangBali.html` melalui Apache XAMPP, lalu login sebagai admin.

View `vw_events_dashboard` menghitung nilai kontrak, piutang, dan status terkini. Untuk Cabang Bali, nilai DP, Termin 2, dan Pelunasan pada 20 event sumber disimpan pada kolom jadwal tersendiri; total dibayar tetap merupakan pembayaran yang benar-benar telah diterima. Event baru tanpa jadwal khusus tetap memakai rumus bawaan berdasarkan skala. Cabang Bandung tetap memakai rumus otomatis berdasarkan skala.

Untuk database yang sudah pernah diimpor, jalankan migration sesuai urutan nama file. Fitur akun pelanggan membutuhkan `migration_add_customer_account.sql`; token riwayat pembayaran membutuhkan `migration_add_payment_token.sql`.
Untuk database event yang sudah berisi data, jalankan `migration_add_event_calculations.sql` agar view kalkulasi menampilkan Termin 2 dan Pelunasan terbaru tanpa menghapus 20 seed event.
Untuk database `events_bali` lama, jalankan `migration_update_bali_events.sql` satu kali setelah migrasi kalkulasi; skrip ini menambahkan kolom jadwal pembayaran dan memperbarui 20 ID EDK terbaru. Untuk instalasi baru, impor `events_bali.sql` yang sudah memuat struktur dan data tersebut. Jangan impor ulang file seed setelah pembayaran operasional dicatat karena nilai total dibayar akan kembali ke nilai sumber.
Pembayaran baru event Bali/Bandung dicatat melalui `event_payments` dan menaikkan `total_dibayar` dalam transaksi database yang sama. Admin cabang dapat menambahkan event dan pembayaran, tetapi tidak dapat mengubah atau menghapus event. Untuk meminta penghapusan, admin cabang mengisi alasan melalui tombol **Minta hapus**; admin pusat meninjau pada halaman **Permintaan hapus** dan dapat menyetujui atau menolak. Admin pusat dapat menghapus event langsung dari halaman cabang. Riwayat transaksi tersedia di halaman Riwayat Pembayaran dan dapat difilter per cabang oleh admin pusat. Saldo historis hanya berupa total kumulatif lama per event, bukan rincian cicilan.

## Akun awal

Jalankan `migration_seed_admin_accounts.sql` satu kali setelah kedua database dibuat. Skrip tersebut membuat atau memperbarui akun berikut:

| Peran | Cabang | Username | Email | Password awal |
|---|---|---|---|---|
| Admin pusat | Semua cabang | `admin` | `admin@nusakarsa.com` | `NK-Pusat!26_R7q#4` |
| Admin cabang | Palembang | `admin_palembang` | `admin.palembang@nusakarsa.com` | `NK-Palembang!26_R7q` |
| Admin cabang | Bali | `admin_bali` | `admin.bali@nusakarsa.com` | `NK-Bali!26_X4p#9` |
| Admin cabang | Bandung | `admin_bandung` | `admin.bandung@nusakarsa.com` | `NK-Bandung!26_T8m#2` |

Gunakan kredensial ini hanya untuk setup lokal, lalu ganti password setelah login pertama dan sebelum aplikasi dipakai secara nyata. Jangan publikasikan README atau kredensial ini ke repositori/lingkungan produksi.

## Endpoint awal

- `POST /api/login.php` — membuat sesi admin.
- `POST /api/logout.php` — menghapus sesi.
- `GET /api/session.php` — membaca status sesi.
- `GET /api/dashboard.php` — ringkasan dan daftar piutang terbaru; wajib login.
- `GET /api/branches.php` — cabang yang diizinkan untuk akun operasional.
- `GET /api/customers.php` — pelanggan sesuai lingkup akun.
- `GET /api/payment-history.php` — riwayat pembayaran sesuai lingkup akun.
- `GET /api/reports.php?year=2026` — rekap tahunan untuk admin pusat atau cabang.
