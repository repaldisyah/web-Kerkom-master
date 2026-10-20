# Nusa Karsa Event

Aplikasi web internal untuk mencatat event, pembayaran, dan piutang. Frontend menggunakan HTML, CSS, dan JavaScript vanilla; backend berupa endpoint PHP/PDO dengan sesi; data disimpan di MySQL.

## Fitur yang tersedia

- Login admin pusat, admin cabang, dan pelanggan; ganti password mandiri serta alur lupa password simulasi dua langkah.
- Dashboard aktivitas/piutang; data event Palembang, Bali, dan Bandung.
- Pencatatan pembayaran, riwayat, pembatalan dengan alasan dan pembalikan saldo, serta struk cetak/PDF, DOCX, dan JPG/JPEG.
- Laporan tahunan dan riwayat bulanan dengan ekspor PDF, XLSX, dan DOCX sesuai cakupan akses.
- Portal pelanggan, pengelolaan akun admin cabang, permintaan penghapusan event, dan notifikasi dalam aplikasi.
- Worker PHP CLI membuat notifikasi jatuh tempo in-app; skrip PowerShell memasang Task Scheduler harian. Tidak ada pengiriman email/WhatsApp.

Pembayaran portal pelanggan adalah simulasi demo, bukan pembayaran gateway. Simulasi mengurangi saldo operasional dan tercatat sebagai `demo_simulation`; jangan jalankan pada data operasional. Tautan â€œLupa password?â€ belum memiliki alur pemulihan.

## Struktur dan teknologi

- `halaman.html`, `Html/`: dashboard dan halaman aplikasi.
- `Css/`, `Js/`: tampilan dan interaksi; dashboard utama menggunakan `Css/dashboard.css` dan `Js/dashboard.js`.
- `api/`: autentikasi, endpoint, worker, dan konfigurasi.
- `database/`: skema, seed, migrasi, dan panduan setup.
- `assets/`: gambar dan logo.
- `assets/contoh-struk-pembayaran.svg`: pratinjau visual struk simulasi.

## Menjalankan lokal

1. Jalankan Apache dan MySQL melalui XAMPP.
2. Siapkan database sesuai [panduan database](database/README.md). Jangan gunakan langkah instalasi baru pada database berisi transaksi.
3. Sesuaikan `api/config.php` secara lokal dengan `api/config.example.php`. Jangan bagikan konfigurasi lokal.
4. Buka `http://localhost/web-Kerkom-master/halaman.html` melalui Apache; jangan buka berkas HTML langsung.
5. Untuk pengingat, pasang `install-due-reminders-task.ps1` setelah migrasi notifikasi. Worker memerlukan Windows, PHP, dan MySQL berjalan.

Aplikasi menggunakan database `nusa_karsa`, `admin_pusat`, `events_bali`, dan `events_bandung`. Rincian setup, role, seed, dan migrasi ada di [database/README.md](database/README.md).

## Catatan operasional

- Ganti kredensial seed sebelum penggunaan nyata; jangan jalankan ulang seed pada database operasional tanpa memahami dampaknya.
- Backup semua database terkait sebelum migrasi. Tidak semua migrasi aman dijalankan berulang.
- CSRF ditemukan pada perubahan password, belum diintegrasikan pada seluruh endpoint mutasi. Audit cakupan otorisasi server masih perlu dilakukan.
- Rate limit login, pemulihan melalui kanal email/SMS nyata, deployment produksi, monitoring, dan backup teruji belum tersedia.

## Fitur demo tambahan

- Lupa password memakai halaman terpisah dan verifikasi dua langkah. Kode verifikasi ditampilkan di halaman karena proyek tidak terhubung ke layanan email/SMS; gunakan hanya untuk demo lokal.
- Ringkasan pelanggan mengikuti role: admin cabang melihat pelanggan cabangnya, admin pusat melihat rekap semua cabang per tahun, dan pelanggan melihat ringkasan akun sendiri.
- Struk pembayaran dapat dicetak/disimpan sebagai PDF, diunduh sebagai DOCX atau JPG/JPEG. Contoh visual struk tersedia di `assets/contoh-struk-pembayaran.svg`.
- Event cabang lama mengaitkan pelanggan melalui nama; nama yang sama di cabang yang sama belum dapat dipisahkan secara pasti tanpa `customer_id` pada tabel event.

Lihat [PRD](prd%20(1).md) dan [audit](AUDIT-PENYEMPURNAAN.md) untuk batas fitur dan tindak lanjut.
Aktifkan notifikasi perangkat dari halaman Notifikasi. Bunyi mengikuti izin browser dan setelan suara OS. Akses ponsel memerlukan HTTPS.
