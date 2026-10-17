# Nusa Karsa Event

Aplikasi web internal untuk pencatatan event, pembayaran, dan pemantauan piutang Nusa Karsa Event. Aplikasi ini menggunakan halaman HTML, CSS, dan JavaScript dengan endpoint PHP yang terhubung ke MySQL.

## Status fitur

Fitur yang tersedia pada kode saat ini:

- Login admin pusat, admin cabang, dan pelanggan menggunakan sesi.
- Ganti password mandiri untuk admin cabang dan pelanggan; admin pusat memiliki pintasan tersembunyi di dashboard.
- Dashboard ringkasan aktivitas dan piutang.
- Pembatasan data admin cabang berdasarkan cabangnya.
- Pencatatan dan riwayat pembayaran.
- Halaman data pelanggan, laporan tahunan, dan pengelolaan akun admin cabang.
- Data event Palembang, Bali, dan Bandung dengan kalkulasi kontrak, pembayaran, sisa piutang, dan status.
- Permintaan penghapusan event dari admin cabang untuk ditinjau admin pusat.
- Portal pelanggan untuk melihat informasi akun dan tagihannya; mode simulasi pelanggan mengurangi saldo operasional dan mencatat transaksi sebagai demo_simulation, bukan sebagai dana terverifikasi.

Dashboard dapat menampilkan kondisi jatuh tempo, tetapi aplikasi belum mengirim pengingat otomatis. Alur pemulihan password dan ekspor laporan penuh juga belum tersedia. Jangan menganggap fitur tersebut siap digunakan.

## Teknologi

- Frontend: HTML, CSS, dan JavaScript vanilla.
- Backend: PHP 8+ dengan PDO.
- Database: MySQL melalui XAMPP.
- Antarmuka: halaman HTML di folder Html, stylesheet di Css, dan JavaScript di Js.

## Menjalankan aplikasi lokal

1. Pasang dan jalankan Apache serta MySQL melalui XAMPP.
2. Siapkan database dan jalankan impor serta migrasi sesuai urutan pada [database/README.md](database/README.md). Panduan tersebut menjelaskan database yang digunakan, akun bawaan, dan pemetaan hak akses.
3. Periksa api/config.php. Sesuaikan host, port, nama database, dan akun MySQL lokal. Jika membuat konfigurasi baru, gunakan api/config.example.php sebagai acuan. Jangan memasukkan kredensial pribadi ke dokumentasi atau repositori yang dibagikan.
4. Letakkan proyek di bawah document root Apache, misalnya C:/xampp/htdocs/web-Kerkom-master.
5. Buka http://localhost/web-Kerkom-master/halaman.html. Jika belum memiliki sesi, aplikasi mengarahkan pengguna ke halaman login.

Jalankan halaman melalui Apache, bukan dengan membuka file HTML langsung, karena halaman menggunakan endpoint PHP dan sesi server.

## Peran akun

Aplikasi mengenal tiga nilai role:

| Role | Kegunaan |
|---|---|
| admin_pusat | Mengelola operasi lintas cabang, akun admin cabang, laporan, dan peninjauan permintaan penghapusan. |
| admin_cabang | Menambahkan event dan mencatat pembayaran dalam lingkup cabangnya, serta mengajukan permintaan penghapusan event. |
| pelanggan | Melihat data pelanggan dan tagihan yang terhubung ke akun tersebut. |

Daftar nama akun seed, email login, cabang, cara membuat akun, dan kueri untuk memeriksa akun di database aktif tersedia di [database/README.md](database/README.md). README ini tidak menyimpan password.

## Penyimpanan data

Aplikasi memakai beberapa database lokal:

- nusa_karsa: data operasional utama, termasuk pengguna cabang dan pelanggan serta data Palembang.
- admin_pusat: akun admin pusat.
- events_bali dan events_bandung: data event dan pembayaran untuk cabang terkait.

Sebagian halaman menggabungkan data dari lebih dari satu database. Karena itu, pastikan konfigurasi pada api/config.php sesuai dengan nama database dan cabang yang telah disiapkan. Urutan migrasi yang aman dan catatan database lama dijelaskan di [database/README.md](database/README.md).

## Struktur proyek

| Lokasi | Isi |
|---|---|
| halaman.html | Dashboard utama. |
| loading.html | Halaman pemuatan. |
| Html/ | Halaman login, cabang, pembayaran, laporan, riwayat, pelanggan, dan permintaan hapus. |
| Css/ | Tampilan halaman dan komponen bersama. |
| Js/ | Navigasi, interaksi halaman, pemuatan data, dan pengiriman permintaan API. |
| api/ | Endpoint PHP, autentikasi sesi, konfigurasi, serta koneksi database. |
| database/ | Skema, seed, migrasi, dan panduan setup database. |
| assets/ | Logo dan aset gambar yang digunakan antarmuka. |

## Batasan dan catatan operasional

- Password disimpan sebagai hash di database. Jangan menaruh password maupun hash di README, issue, atau dokumentasi publik.
- Seed akun ditujukan untuk pengembangan lokal. Ganti kredensial sebelum memasukkan data operasional nyata.
- Jangan menjalankan ulang seed data terhadap database yang telah menerima pembayaran operasional tanpa memahami dampaknya; beberapa seed memperbarui atau membuat ulang data contoh.
- Backup database sebelum menjalankan migrasi pada database lama. Tidak semua migrasi aman untuk dijalankan berulang kali.
- Perhitungan dan saldo event bergantung pada view serta skema masing-masing database event. Ikuti petunjuk versi lama/baru di README database.

## Pemecahan masalah

- Jika halaman tidak dapat memuat data, pastikan Apache dan MySQL aktif, konfigurasi database benar, dan URL dibuka melalui localhost.
- Jika login gagal, periksa apakah migrasi akun yang relevan sudah dijalankan dan pilih jenis akun yang sesuai pada halaman login.
- Jika halaman cabang tidak menampilkan data, pastikan database cabang tersebut sudah diimpor dan nama database pada api/config.php sesuai.
- Jika kolom atau tabel tidak ditemukan, cocokkan struktur database dengan urutan migrasi di database/README.md sebelum mengubah data secara manual.

## Dokumentasi terkait

- [Panduan database, migrasi, dan akun](database/README.md)
- [Audit dan pekerjaan lanjutan](AUDIT-PENYEMPURNAAN.md)


