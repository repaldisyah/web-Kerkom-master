# Menjalankan backend lokal

1. Jalankan **Apache** dan **MySQL** dari XAMPP.
2. Buka `http://localhost/phpmyadmin`, lalu impor file `nusa_karsa.sql`.
3. Impor `events_bali.sql` dan `events_bandung.sql` untuk membuat database event khusus masing-masing cabang.
4. Sesuaikan `../api/config.php` bila username, password, port, atau nama database MySQL Anda berbeda. Pemetaan cabang mengikuti data `nusa_karsa.sql`: Bali = `branch_id` 2 dan Bandung = `branch_id` 3.
5. Letakkan folder proyek ini di `C:/xampp/htdocs/web-Kerkom` (atau atur virtual host ke folder proyek), kemudian buka `http://localhost/web-Kerkom/halaman.html`.

Halaman `Html/cabangBali.html` dan `Html/cabangBandung.html` memakai stylesheet serta JavaScript eksternal masing-masing. Data tabel, ringkasan, tambah, ubah, dan hapus diambil dari `api/events.php` atau `api/events-bandung.php`; akun `admin_cabang` hanya dapat mengakses database cabangnya, sedangkan `super_admin` dapat mengakses keduanya.

## Modul event Bali/Bandung

Stack yang digunakan adalah PHP 8+ dengan PDO MySQL untuk backend, MySQL 8+ untuk database/view kalkulasi, serta HTML/CSS/JavaScript vanilla untuk frontend. Setelah impor SQL, buka `Html/events-bali.html` atau `Html/cabangBali.html` melalui Apache XAMPP, lalu login sebagai admin.

View `vw_events_dashboard` menghitung nilai kontrak, DP, Termin 2, pelunasan, piutang, dan status pembayaran. Karena input yang tersedia tidak memiliki kolom terpisah untuk menandai Termin 2, pembayaran yang melebihi DP dianggap mulai masuk Termin 2 sampai maksimum 30% nilai kontrak; jika pembayaran belum melewati DP, Termin 2 bernilai Rp0. Jalankan ulang impor `events_bali.sql` atau `events_bandung.sql` setelah perubahan view agar database lama memakai formula terbaru.

Untuk database yang sudah pernah diimpor, jalankan migration sesuai urutan nama file. Fitur akun pelanggan membutuhkan `migration_add_customer_account.sql`; token riwayat pembayaran membutuhkan `migration_add_payment_token.sql`.
Untuk database event yang sudah berisi data, jalankan `migration_add_event_calculations.sql` agar view kalkulasi menampilkan Termin 2 dan Pelunasan terbaru tanpa menghapus 20 seed event.

## Akun awal

- Username: `admin`
- Email: `admin@nusakarsa.com`
- Password: `Admin123!`

Ganti password akun ini sebelum aplikasi dipakai secara nyata.

## Endpoint awal

- `POST /api/login.php` — membuat sesi admin.
- `POST /api/logout.php` — menghapus sesi.
- `GET /api/session.php` — membaca status sesi.
- `GET /api/dashboard.php` — ringkasan dan daftar piutang terbaru; wajib login.
- `GET /api/branches.php` — cabang yang diizinkan untuk akun operasional.
- `GET /api/customers.php` — pelanggan sesuai lingkup akun.
- `GET /api/payment-history.php` — riwayat pembayaran sesuai lingkup akun.
- `GET /api/reports.php?year=2026` — rekap tahunan untuk admin pusat atau cabang.
