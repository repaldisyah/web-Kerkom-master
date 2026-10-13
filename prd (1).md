# PRD â€” Sistem Informasi Nusa Karsa Event

## 1. Tujuan

Aplikasi membantu staf Nusa Karsa Event mencatat event, pembayaran, dan piutang dari cabang Palembang, Bali, dan Bandung. Admin pusat memantau lintas cabang; admin cabang bekerja pada cakupan cabangnya; akun pelanggan memiliki akses terbatas sesuai implementasi portal.

Dokumen ini menggambarkan stack dan kemampuan repositori saat ini. Fitur yang belum tersedia dicatat sebagai kebutuhan lanjutan, bukan sebagai kemampuan yang sudah aktif.

## 2. Teknologi dan arsitektur aktual

- **Frontend:** HTML, CSS, JavaScript vanilla di `halaman.html`, `Html/`, `Css/`, dan `Js/`.
- **Backend:** PHP 8+ dan PDO; endpoint JSON berada di `api/`.
- **Database:** MySQL 8+ melalui XAMPP. Database utama `nusa_karsa`; database akun pusat `admin_pusat`; data event Bali dan Bandung berada di database terpisah. Event Palembang berada pada database operasional utama.
- **Autentikasi:** sesi PHP dengan cookie HttpOnly dan SameSite Lax. Password diverifikasi menggunakan `password_verify`.
- **Alur request:** browser memanggil endpoint PHP; endpoint memvalidasi sesi/peran, mengakses MySQL, lalu mengembalikan JSON.

Next.js, Spring Boot, Vercel, dan Spring Scheduler yang pernah tercantum dalam rancangan lama bukan bagian stack kode ini.

## 3. Jenis pengguna

| Peran | Cakupan yang dimaksud |
|---|---|
| Admin pusat | Ringkasan dan pengelolaan lintas cabang, termasuk akun admin cabang dan peninjauan permintaan penghapusan. |
| Admin cabang | Operasi pada cabang yang ditetapkan; penghapusan event diajukan kepada admin pusat. |
| Pelanggan | Melihat data akun dan transaksi miliknya yang tersedia melalui portal. |

Setiap endpoint wajib menerapkan otorisasi di sisi server. Menyembunyikan menu di frontend tidak dianggap sebagai kontrol akses.

## 4. Kemampuan yang tersedia di repositori

- Login dan logout berbasis sesi untuk admin dan pelanggan.
- Dashboard ringkasan, aktivitas, cabang, pelanggan, piutang, laporan tahunan, dan riwayat transaksi.
- Pencatatan pembayaran dengan transaksi database dan token tanda terima pada modul yang mendukungnya.
- Modul event terpisah untuk Palembang, Bali, dan Bandung; perhitungan dan struktur datanya berbeda antar cabang.
- Permintaan penghapusan event oleh admin cabang dan peninjauan oleh admin pusat.
- Halaman portal pelanggan serta navigasi berdasarkan sesi/peran.

Daftar ini perlu dikonfirmasi lewat uji browser dan database sebelum dijadikan klaim kesiapan produksi.

## 5. Kebutuhan lanjutan yang belum terbukti tersedia

1. **Pengingat terjadwal:** dashboard dapat menghitung jatuh tempo, tetapi repositori yang ditinjau belum menunjukkan worker terjadwal, tabel notifikasi operasional, pengaturan aturan pengingat, atau kanal pengiriman.
2. **Ganti/lupa password:** tautan lupa password perlu memiliki alur aman yang benar-benar berfungsi. Pemulihan melalui email memerlukan konfigurasi mailer dan token sekali pakai.
3. **Ekspor laporan:** tetapkan format dan kebutuhan ekspor (CSV/XLSX/PDF), lalu implementasikan dan uji pembatasan aksesnya.
4. **Bukti pembayaran:** tentukan apakah bukti berupa unggahan berkas diperlukan, berikut batas ukuran, tipe berkas, retensi, dan hak akses.
5. **Perubahan keuangan:** buat prosedur koreksi/pembalikan pembayaran yang menyimpan jejak audit; jangan menghapus transaksi tanpa rekam alasan.
6. **Operasional:** dokumentasikan backup/restore, monitoring error, retensi data, dan deployment di lingkungan aman.

## 6. Persyaratan keamanan

- Gunakan password hash; jangan menyimpan password asli.
- Batasi akses data berdasarkan peran, cabang, dan pemilik akun di setiap endpoint.
- Terapkan perlindungan CSRF untuk endpoint perubahan yang memakai sesi cookie.
- Batasi percobaan login dan sediakan proses perubahan password yang aman.
- Produksi harus memakai HTTPS, kredensial database dengan hak minimum, dan konfigurasi rahasia di luar direktori publik/repository.
- Catat tindakan sensitif seperti pembuatan akun, pencatatan/koreksi pembayaran, dan keputusan penghapusan.

## 7. Kriteria penerimaan utama

- Admin cabang tidak dapat membaca atau mengubah data cabang lain dengan mengubah URL/request secara manual.
- Pelanggan hanya dapat membaca profil dan transaksi yang terhubung ke akun tersebut.
- Pembayaran tidak dapat melebihi saldo dan pembaruan saldo serta riwayat transaksi tersimpan secara konsisten.
- Permintaan penghapusan dan keputusan admin pusat dapat ditelusuri.
- Setup database baru dan pembaruan database lama mengikuti urutan terdokumentasi dan dapat dipulihkan dari backup.
- Fitur yang belum diimplementasikan ditandai sebagai backlog, bukan ditampilkan sebagai kemampuan aktif.

## 8. Panduan struktur proyek

- `Html/`, `Css/`, `Js/`: halaman dan aset antarmuka.
- `api/`: endpoint PHP dan konfigurasi koneksi (`config.example.php` sebagai template).
- `database/`: skema awal, seed, migrasi, serta petunjuk setup.
- `assets/`: logo dan aset gambar.
- `halaman.html`: dashboard utama.

Untuk setup lokal, ikuti `database/README.md` dan hindari menjalankan seed ulang pada database yang telah menerima transaksi operasional.
