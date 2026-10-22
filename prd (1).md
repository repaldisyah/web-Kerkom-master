# PRD â€” Sistem Informasi Nusa Karsa Event

## Tujuan

Aplikasi mendukung pencatatan event, pembayaran, piutang, dan pemantauan cabang Palembang, Bali, dan Bandung. Dokumen ini mencatat keadaan repositori dan membedakan kemampuan yang ada dari backlog.

## Arsitektur

- Frontend HTML, CSS, JavaScript vanilla.
- Backend endpoint PHP dengan PDO dan sesi.
- MySQL melalui XAMPP: `nusa_karsa`, `admin_pusat`, `events_bali`, dan `events_bandung`.
- Browser memanggil API PHP; setiap API wajib memeriksa sesi, role, cabang, dan kepemilikan data di server.

## Peran

| Peran | Cakupan |
|---|---|
| Admin pusat | Operasi lintas cabang, laporan, akun admin cabang, peninjauan permintaan hapus. |
| Admin cabang | Operasi cabang yang ditetapkan, pembayaran, dan permintaan hapus. |
| Pelanggan | Profil/tagihan yang ditautkan ke akun; pembayaran portal adalah simulasi. |

## Kemampuan di kode

Login/logout dan perubahan password; dashboard, aktivitas, data cabang/pelanggan, piutang, laporan, dan riwayat; modul event per cabang; pencatatan dan pembatalan pembayaran; ekspor PDF/XLSX/DOCX; struk; portal pelanggan; permintaan penghapusan; notifikasi in-app; worker PHP untuk pengingat jatuh tempo dan skrip Task Scheduler Windows.

Perhitungan dan skema data berbeda antarcabang. Sebagian riwayat lama merupakan snapshot saldo tanpa tanggal transaksi.

## Backlog dan batasan

1. Tautan lupa password belum berfungsi; belum ada pemulihan email/token.
2. CSRF hanya ditemukan pada perubahan password, belum di semua mutasi.
3. Belum ditemukan pembatasan percobaan login.
4. Worker membuat notifikasi in-app saja; email/WhatsApp dan pengaturan aturan pengingat belum tersedia.
5. Simulasi pembayaran pelanggan mengurangi saldo operasional; pisahkan data demo dari data nyata.
6. Data event lama yang belum dapat dipetakan unik harus ditautkan manual melalui kode pelanggan.
7. Prosedur backup/restore, monitoring, retensi, dan deployment produksi perlu ditetapkan serta diverifikasi.
8. Audit penuh otorisasi endpoint dan uji alur browser/database dibutuhkan sebelum menyatakan siap produksi.

## Kriteria penerimaan

- Setiap endpoint memvalidasi sesi, role, cabang, dan pemilik data.
- Pelanggan hanya menerima data terkait `customer_id` pada sesi.
- Pembayaran/pembatalan dan perubahan saldo konsisten serta dapat diaudit.
- Semua mutasi memakai perlindungan CSRF.
- Migrasi dan backup/restore dapat diikuti dan dipulihkan.
- Antarmuka dan laporan membedakan transaksi demo dari dana terverifikasi.
