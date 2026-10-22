# Audit dan Rencana Penyempurnaan

Dokumen ini mencocokkan panduan dengan implementasi yang ditemukan. Keberadaan kode belum membuktikan keberhasilan operasional; butir runtime tetap perlu diverifikasi.

## Koreksi status dokumentasi

- Worker jatuh tempo, migrasi/halaman notifikasi, ekspor laporan, dan pembatalan transaksi memiliki implementasi.
- Pengingat hanya membuat notifikasi in-app; email/WhatsApp tidak tersedia.
- Perubahan password tersedia. Tautan lupa password membuka alur simulasi terpisah; pengiriman kode lewat email/SMS belum tersedia.
- Panduan database lama memuat password demo dan harus tetap bebas dari password/hash.

## Temuan

### Pemeriksaan akses data (pemeriksaan kode)

1. Endpoint utama memakai sesi dan role; API event/pembayaran cabang juga memeriksa cabang, dan endpoint pelanggan umumnya memakai `customer_id` untuk data utama.
2. Ditemukan dan diperbaiki: `api/branches.php` sebelumnya mengembalikan ringkasan semua cabang kepada admin cabang. Kini hasil admin cabang dibatasi ke `branch_id` miliknya.
3. Event cabang kini memakai kode pelanggan `NKC-xxxxxx` dan `customer_id` untuk pencocokan akun. Migrasi `database/migration_link_events_to_customer_codes.sql` hanya mengaitkan data lama dengan nama unik; baris ambigu atau tanpa profil harus ditautkan manual.
4. Pemeriksaan ini berbasis pembacaan kode. Uji runtime lintas akun/cabang dan database belum dijalankan.

Untuk proyek uji coba, cakupan akses tersebut menjadi fokus. Rate limit, CSRF menyeluruh, pemulihan password, backup/restore, dan kesiapan produksi dapat tetap menjadi backlog jika proyek nanti dipakai aktif.

### Struk pembayaran

- Setelah pembayaran/simulasi berhasil, halaman pembayaran menyediakan cetak atau simpan PDF, unduh JPG/JPEG, dan unduh DOCX.
- Struk simulasi diberi label bahwa data tersebut bukan bukti dana diterima.
- DOCX dibuat di browser; PDF dihasilkan melalui dialog cetak browser.

### Fitur demo lanjutan

- Pratinjau contoh struk disediakan sebagai `assets/contoh-struk-pembayaran.svg`.
- Pemulihan password memakai halaman terpisah dan kode simulasi sesi yang berlaku 10 menit dengan maksimal lima percobaan. Kode ditampilkan kepada pengguna karena tidak ada kanal email/SMS; ini tidak memverifikasi identitas untuk penggunaan nyata.
- `api/customer-summary.php` membatasi ringkasan berdasarkan role: admin cabang mendapat daftar pelanggan cabangnya, admin pusat mendapat ringkasan tahunan semua cabang, dan pelanggan mendapat ringkasan akun sendiri.
- Tahun ringkasan memakai tanggal event dan mulai 2022. Event cabang yang belum ditautkan melalui migrasi kode pelanggan tidak masuk ke portal pelanggan sampai admin memilih kode yang benar.

### Pemeliharaan frontend

1. Dashboard sebelumnya menanam sekitar 1.160 baris CSS dan 600 baris JavaScript di `halaman.html`; pindahkan ke `Css/dashboard.css` dan `Js/dashboard.js`.
2. Hindari atribut gaya inline pada halaman Palembang; gunakan kelas CSS.
3. `Css/cabangBandung.css`, `Js/cabangBandung.js`, dan `Css/ringkasan-piutang.css` kosong dan tidak direferensikan halaman yang diperiksa. Bandung memakai `events-bandung.css` dan `events-bandung.js`; file kosong dapat dihapus.
4. `Js/script.js` dan `Js/cabangBali.js` tidak direferensikan oleh halaman proyek yang ditinjau. Periksa integrasi eksternal sebelum membersihkan file legacy.

## Backlog tambahan

Pemulihan password melalui kanal email/SMS nyata, rate limit login, kanal notifikasi eksternal, bukti unggahan (jika diperlukan), deployment, monitoring, retensi, dan prosedur backup/restore.

## Urutan tindak lanjut

1. Jaga dokumentasi sesuai kode dan jangan publikasikan kredensial.
2. Pisahkan struktur, gaya, dan perilaku dashboard; hapus hanya file kosong yang dipastikan tidak dipakai.
3. Tinjau event `customer_id IS NULL` setelah migrasi kode pelanggan dan tautkan manual bila cocokannya ambigu.
4. Untuk penggunaan aktif, rencanakan perlindungan mutasi, pemisahan data demo/operasional, pemulihan akun, dan prosedur backup.
