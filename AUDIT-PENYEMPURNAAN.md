# Audit dan Rencana Penyempurnaan

Dokumen ini mencatat kondisi yang ditemukan saat membaca repositori dan urutan perubahan yang disarankan. Kode aktual menjadi sumber kebenaran; dokumen rancangan lama tidak boleh dianggap sebagai fitur yang sudah berjalan.

## Stack dan modul yang ada

- Frontend: HTML, CSS, dan JavaScript vanilla (`halaman.html`, `Html/`, `Css/`, `Js/`).
- Backend: endpoint PHP 8+ dengan PDO (`api/`).
- Data: MySQL melalui XAMPP. Data operasional utama berada di `nusa_karsa`; akun pusat, event Bali, dan event Bandung memakai database terpisah.
- Fitur yang terlihat dari implementasi: autentikasi sesi; dashboard; pembatasan peran/cabang; pencatatan event dan pembayaran; riwayat transaksi; laporan; akun pelanggan; dan antrean permintaan hapus event.

## Temuan yang perlu ditangani

### Prioritas 1 — dokumentasi dan setup

1. `prd (1).md` masih menyebut Next.js, Spring Boot, Vercel, dan scheduler Spring; teknologi itu tidak dipakai kode saat ini. Ganti dengan PRD kondisi aktual dan pisahkan kebutuhan yang belum ada sebagai backlog.
2. Satukan panduan setup database. Proyek memerlukan beberapa database dan migrasi berurutan; buat urutan yang jelas untuk instalasi baru dan pembaruan database lama, termasuk backup sebelum migrasi.
3. Hilangkan password awal dan password demo dari dokumentasi yang bisa dibagikan. Ganti dengan prosedur pembuatan kredensial lokal, perubahan password, dan peringatan agar file konfigurasi lokal tidak dipublikasikan.
4. Tambahkan prosedur backup/restore, pengelolaan akun admin, dan panduan pemecahan masalah koneksi database.

### Prioritas 2 — keamanan dan integritas operasional

1. Tinjau ulang setiap endpoint tulis agar semua mutasi membutuhkan sesi operasional dan otorisasi cakupan cabang.
2. Terapkan perlindungan CSRF untuk endpoint berbasis cookie sesi, lalu integrasikan tokennya pada seluruh form/fetch yang melakukan perubahan.
3. Tambahkan pembatasan percobaan login, kebijakan ganti password, dan mekanisme pemulihan akun yang aman.
4. Periksa konsistensi akun pelanggan, visibilitas tagihan, serta data yang dikembalikan endpoint pelanggan. Pastikan hanya data milik pelanggan yang terautentikasi yang keluar.
5. Tetapkan kebijakan audit untuk pembayaran dan penghapusan. Transaksi keuangan sebaiknya dikoreksi dengan pembalikan/koreksi yang tercatat, bukan dihapus tanpa jejak.

### Prioritas 3 — kelengkapan fitur

1. Pengingat otomatis jatuh tempo belum tampak memiliki scheduler/worker, tabel notifikasi operasional, maupun pengaturan aturan pengingat. Dashboard saat ini menghitung kondisi jatuh tempo; ini berbeda dari pengiriman notifikasi otomatis.
2. Fitur reset/ganti password belum tampak tersedia; tautan “Lupa password?” pada login perlu diarahkan ke alur yang benar atau diberi status nonaktif yang jelas.
3. Kelola data pelanggan, ekspor laporan, bukti pembayaran, dan manajemen aturan pengingat perlu disepakati cakupannya lalu dilengkapi bila memang dibutuhkan.
4. File kosong `Css/cabangBandung.css`, `Js/cabangBandung.js`, dan `Css/ringkasan-piutang.css` tidak direferensikan halaman yang diperiksa. Pastikan tidak ada integrasi eksternal yang bergantung padanya sebelum menghapus atau mengisinya.

## Urutan pelaksanaan

1. Rapikan PRD, README, dan panduan database agar cocok dengan kode.
2. Buat checklist instalasi baru dan migrasi lama, termasuk backup/restore.
3. Audit endpoint mutasi dan cakupan role/cabang.
4. Rancang serta implementasikan perlindungan CSRF dan ganti password end-to-end.
5. Tambahkan pengingat terjadwal setelah menentukan kanal (in-app saja atau email/WhatsApp), aturan duplikasi, zona waktu, dan database sumber.
6. Jalankan pemeriksaan sintaks PHP/SQL dan uji alur peran pada instalasi lokal.

## Catatan ruang lingkup

Implementasi pengingat eksternal, email/WhatsApp, deploy produksi, dan alur lupa password berbasis email memerlukan konfigurasi layanan/kanal. Jangan mengklaim fitur-fitur tersebut selesai sebelum integrasi dan uji operasional tersedia.
