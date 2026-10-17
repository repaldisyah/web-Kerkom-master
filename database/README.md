# Database dan akun

Dokumen ini menjelaskan database yang dipakai aplikasi, urutan setup lokal, akun bawaan dari skrip seed, dan cara memeriksa akun yang benar-benar tersimpan. Stack saat ini adalah PHP dengan PDO, MySQL, dan frontend HTML/CSS/JavaScript.

## Database yang digunakan

| Database | Isi |
|---|---|
| nusa_karsa | Data operasional utama, cabang, pelanggan, akun admin cabang dan pelanggan, pembayaran umum, serta event Palembang. |
| admin_pusat | Akun admin pusat. |
| events_bali | Event dan pembayaran khusus Bali. |
| events_bandung | Event dan pembayaran khusus Bandung. |

Nama database, host, port, dan pemetaan ID cabang dibaca dari ../api/config.php. Gunakan ../api/config.example.php sebagai acuan saat menyiapkan konfigurasi lokal. Jangan publikasikan kredensial dari api/config.php.

## Setup instalasi baru

Jalankan Apache dan MySQL dari XAMPP. Sebelum impor atau migrasi, pastikan database yang akan digunakan masih kosong dan Anda memilih file sesuai langkah berikut.

1. Impor nusa_karsa.sql melalui phpMyAdmin ke database nusa_karsa.
2. Jalankan migration_separate_admin_pusat.sql satu kali untuk membuat database admin_pusat dan memindahkan akun pusat.
3. Jalankan migration_seed_admin_accounts.sql satu kali untuk membuat akun admin pusat dan admin cabang.
4. Periksa apakah nusa_karsa.users sudah memiliki kolom customer_id. Jika belum, jalankan migration_add_customer_account.sql satu kali.
5. Jalankan migration_seed_customer_accounts_by_branch.sql untuk membuat akun pelanggan yang ditautkan ke profil masing-masing. Untuk tiga akun tambahan, pastikan profil yang dirujuk tersedia, lalu jalankan migration_seed_demo_customers.sql.
6. Jalankan migration_add_payment_method.sql dan migration_add_payment_token.sql bila kolom tersebut belum tersedia.
7. Jalankan migration_add_palembang_events.sql satu kali untuk membuat tabel event dan pembayaran Palembang.
8. Impor events_bali.sql ke database events_bali dan events_bandung.sql ke database events_bandung. Setelah impor Bandung, jalankan events_bandung_upsert.sql untuk memasukkan data jadwal pembayaran.
9. Jalankan migration_add_branch_payment_history.sql setelah seluruh database event tersedia, kemudian migration_add_demo_simulation_type.sql dan migration_add_deletion_requests.sql.
10. Periksa ../api/config.php, pastikan nama database dan kredensial MySQL sesuai, lalu buka http://localhost/web-Kerkom-master/halaman.html melalui Apache.

Seed akun membutuhkan kolom customer_id, cabang, dan profil pelanggan yang dirujuk. Akun pelanggan hanya menampilkan data yang tertaut pada customer_id. Pembayaran pelanggan di halaman demo bukan pembayaran gateway: kliknya menulis transaksi berlabel demo_simulation dan mengurangi saldo operasional pada database. Nilai tersebut tidak dianggap dana terverifikasi oleh laporan. Buat backup sebelum uji transaksi; pulihkan backup untuk mengembalikan saldo awal.

## Pembaruan database lama

1. Ekspor backup seluruh database yang akan disentuh.
2. Periksa struktur tabel dan kolom saat ini melalui phpMyAdmin. Migrasi proyek tidak semuanya aman untuk dijalankan berulang kali.
3. Jalankan hanya migrasi yang belum diterapkan. Untuk akun pelanggan, pastikan migration_add_customer_account.sql sudah diterapkan dan data cabang/profil pelanggan tersedia sebelum menjalankan seed akun. Jalankan migration_add_payment_method.sql dan migration_add_payment_token.sql bila kolom belum ada.
4. Database events_bali lama memerlukan migration_add_event_calculations.sql, lalu migration_update_bali_events.sql sesuai kondisi skemanya. Jangan impor ulang events_bali.sql ke database yang telah menerima pembayaran.
5. Database events_bandung lama yang belum memiliki kolom jadwal memerlukan migration_add_bandung_schedules.sql, lalu events_bandung_upsert.sql.
6. Jalankan migration_add_branch_payment_history.sql setelah seluruh database event siap; lanjutkan dengan migration_add_demo_simulation_type.sql dan migration_add_deletion_requests.sql.
7. Jalankan migration_link_demo_customer_accounts_to_events.sql untuk memasangkan akun uji lama ke nama pelanggan event. Skrip hanya memperbarui profil dummy dan tidak mengubah transaksi atau saldo.
8. Setelah migrasi, cek login ketiga peran, pembatasan cabang, pencatatan pembayaran, saldo, dan riwayat sebelum sistem dipakai.

Cocokkan nama dan urutan migrasi dengan struktur aktual sebelum menjalankan SQL. Jika hasil atau kondisi skema berbeda dari panduan, hentikan migrasi dan buat backup sebelum melakukan perubahan manual.

Riwayat event lama tanpa transaksi bertanggal menampilkan satu snapshot saldo historis per event, tanpa tanggal transaksi; snapshot ini bukan rincian cicilan. Data event yang saat ini dipetakan ke akun demo masih berisi snapshot historical_balance, bukan transaksi pembayaran satu per satu. Pembayaran admin tersimpan sebagai transaksi payment. Klik pembayaran pelanggan pada mode demo mengurangi saldo operasional dan tersimpan sebagai demo_simulation; transaksi tersebut muncul di riwayat tetapi laporan tidak menghitungnya sebagai uang terverifikasi. Untuk memakai data awal lagi, pulihkan backup sebelum percobaan demo. Jika database pernah menjalankan seed progres sintetis, jalankan migration_remove_demo_payment_progress.sql untuk membersihkan baris tersebut.

## Peran dan cakupan akun

Tabel users menyimpan akun aplikasi. Nilai role menentukan pangkat akses; branch_id membatasi akun admin cabang, sedangkan customer_id menautkan akun pelanggan ke profilnya.

| Nilai role | Database | Kegunaan |
|---|---|---|
| admin_pusat | admin_pusat | Admin pusat untuk memantau dan mengelola operasi lintas cabang, mengelola akun admin cabang, melihat laporan, serta meninjau permintaan penghapusan event. |
| admin_cabang | nusa_karsa | Admin operasional yang dapat menambahkan event dan mencatat pembayaran di cabangnya, melihat data lingkup cabang, serta mengajukan permintaan penghapusan. Tidak dapat mengelola cabang lain atau menyetujui permintaan hapus. |
| pelanggan | nusa_karsa | Pengguna portal pelanggan. Akun hanya terhubung ke satu customer_id untuk melihat tagihan dan riwayat milik profil tersebut. Dapat menjalankan simulasi pembayaran yang mengurangi saldo operasional dan tercatat sebagai demo_simulation; ini tidak membuktikan penerimaan dana. |

Pada halaman login, pilih jenis akun Admin untuk admin_pusat dan admin_cabang. Pilih Pelanggan untuk role pelanggan.

## Akun admin bawaan

Akun berikut dibuat atau diperbarui oleh migration_seed_admin_accounts.sql. Password akun admin tidak dicantumkan di dokumentasi; atur kredensialnya secara lokal dan ganti sebelum aplikasi digunakan dengan data nyata.

| Nama akun | Username | Email login | Role | Cakupan |
|---|---|---|---|---|
| Admin Pusat | admin | admin@nusakarsa.com | admin_pusat | Semua cabang |
| Admin Cabang Palembang | admin_palembang | admin.palembang@nusakarsa.com | admin_cabang | Palembang |
| Admin Cabang Bali | admin_bali | admin.bali@nusakarsa.com | admin_cabang | Bali |
| Admin Cabang Bandung | admin_bandung | admin.bandung@nusakarsa.com | admin_cabang | Bandung |

## Akun pelanggan seed per cabang

migration_seed_customer_accounts_by_branch.sql membuat sembilan akun contoh, masing-masing ditautkan ke nama pelanggan pada data event aktif berikut. Semua memakai role pelanggan. Password seed tidak dicantumkan di dokumentasi; atur atau ganti kredensial secara lokal sebelum login.

| Username | Email login | Nama pemegang akun | Profil pelanggan | Cabang | Kredensial |
|---|---|---|---|---|---|
| rani.siger | rani.siger@example.com | Rani Puspita | Sponsor D | Palembang | Atur secara lokal |
| dimas.sriwijaya | dimas.sriwijaya@example.com | Dimas Pratama | Sponsor A | Palembang | Atur secara lokal |
| nadia.musi | nadia.musi@example.com | Nadia Putri | Sponsor B | Palembang | Atur secara lokal |
| made.dewata | made.dewata@example.com | Made Aditya | Kementerian Pariwisata RI | Bali | Atur secara lokal |
| ayu.purnama | ayu.purnama@example.com | Ayu Lestari | Keluarga Sarah Thompson | Bali | Atur secara lokal |
| komang.aruna | komang.aruna@example.com | Komang Sari | PT Telkom Indonesia | Bali | Atur secara lokal |
| fajar.parahyangan | fajar.parahyangan@example.com | Fajar Nugraha | Universitas Padjadjaran | Bandung | Atur secara lokal |
| intan.lembur | intan.lembur@example.com | Intan Permata | Keluarga Sari Melati | Bandung | Atur secara lokal |
| rizky.priangan | rizky.priangan@example.com | Rizky Maulana | PT PLN (Persero) Regional Jabar | Bandung | Atur secara lokal |

## Akun demo pelanggan

migration_seed_demo_customers.sql membuat tiga akun presentasi tambahan. Akun ini menautkan pengguna ke nama pelanggan pada data event aktif, terpisah dari sembilan akun seed di atas. Kredensial seed ditetapkan oleh skrip SQL dan tidak dicantumkan di sini. Atur password secara lokal sebelum digunakan.

| Username | Email login | Nama pemegang akun | Profil pelanggan | Cabang | Kredensial |
|---|---|---|---|---|---|
| ilyas.palembang | ilyas.palembang@demo.nusakarsa.com | Ilyas | Sponsor F | Palembang | Atur secara lokal |
| keyla.bandung | keyla.bandung@demo.nusakarsa.com | Keyla | PT Kalya Fashion Indonesia | Bandung | Atur secara lokal |
| dhini.bali | dhini.bali@demo.nusakarsa.com | Dhini | PT Alaya Hospitality Group | Bali | Atur secara lokal |

Akun di atas dibuat oleh seed. Akun di database aktif dapat berbeda jika password pernah diganti, akun baru dibuat, atau akun seed dihapus. Untuk login, email atau username dapat digunakan. Email demo hanya identitas login contoh dan bukan alamat mailbox. Jangan gunakan password seed pada data nyata atau layanan yang dapat diakses publik; ganti password sebelum pemakaian operasional.

## Password akun dan pemulihan akses

Password akun tidak dapat ditampilkan dari database. Aplikasi menyimpan nilai `password_hash`, bukan password asli; hash tidak bisa dibalik menjadi password yang digunakan saat login. Karena itu, README ini sengaja tidak mencantumkan password akun, termasuk password seed. Jika password admin pusat ditolak saat ganti password, pastikan password saat ini yang dimasukkan sama dengan password yang berhasil dipakai untuk login ke akun admin pusat.

Pada 17 Oktober 2026, password setiap akun yang tercatat di `admin_pusat.users` dan `nusa_karsa.users` pada database lokal aktif telah diatur ulang ke nilai acak yang unik. Daftar password baru diserahkan secara terpisah kepada pengelola dan disimpan sementara di komputer lokal; jangan menyalinnya ke README, repositori GitHub, atau tiket yang dapat dibagikan. Minta setiap pemilik akun mengganti password setelah menerima akses.

Jika password benar-benar hilang, lakukan reset secara lokal dan hanya untuk akun yang Anda kelola:

1. Buat hash password baru dengan `password_hash($password, PASSWORD_DEFAULT)` menggunakan PHP lokal. Jangan masukkan password atau hash ke percakapan, README, atau file yang akan dibagikan.
2. Di phpMyAdmin, perbarui hanya baris akun yang dipilih. Akun `admin_pusat` berada di database `admin_pusat`; akun `admin_cabang` dan `pelanggan` berada di `nusa_karsa`:

       UPDATE admin_pusat.users
       SET password_hash = '<hash-baru>'
       WHERE username = '<username-akun>';

   Untuk akun cabang atau pelanggan, gunakan `nusa_karsa.users` sebagai pengganti `admin_pusat.users`.
3. Pastikan hanya satu akun yang cocok sebelum menjalankan perubahan, lalu uji login dengan password baru. Hapus skrip sementara yang digunakan untuk membuat hash.

Jangan mengatur satu password yang sama untuk semua akun. Seed berikutnya dapat mengubah atau membuat ulang akun contoh; jangan jalankan ulang seed untuk memulihkan password akun operasional.

## Melihat semua akun yang tersimpan

Jalankan kueri berikut dari phpMyAdmin untuk memeriksa akun aktual. Kueri tidak mengambil password_hash.

Akun pusat:

    SELECT id, name, username, email, role
    FROM admin_pusat.users
    ORDER BY username;

Akun cabang dan pelanggan:

    SELECT u.id, u.name, u.username, u.email, u.role,
           b.name AS cabang, c.name AS profil_pelanggan
    FROM nusa_karsa.users AS u
    LEFT JOIN nusa_karsa.branches AS b ON b.id = u.branch_id
    LEFT JOIN nusa_karsa.customers AS c ON c.id = u.customer_id
    ORDER BY u.role, b.name, u.username;

Kueri operasional memerlukan kolom customer_id dari migration_add_customer_account.sql. Hasil kueri menunjukkan akun yang tersimpan, bukan status bahwa pemilik masih mengetahui password atau masih boleh menggunakan akun.

## Modul event Bali dan Bandung

Frontend memakai HTML, CSS, dan JavaScript vanilla. API PHP membaca database event melalui konfigurasi aplikasi.

- View vw_events_dashboard menghitung nilai kontrak, piutang, dan status pembayaran.
- Pembayaran baru dicatat sebagai transaksi dan memperbarui total_dibayar dalam transaksi database yang sama.
- Bali menggunakan jadwal pembayaran khusus untuk data seed yang disediakan; event baru tanpa jadwal khusus memakai perhitungan berdasarkan skala.
- Bandung memakai perhitungan pembayaran berdasarkan skala.
- Admin cabang dapat menambahkan event dan mencatat pembayaran, tetapi tidak dapat mengubah atau menghapus event. Penghapusan diajukan ke admin pusat.
- migration_add_branch_payment_history.sql menambahkan snapshot saldo historis untuk event yang sudah memiliki pembayaran. Snapshot lama bukan rincian cicilan dan tidak selalu memiliki tanggal transaksi.

Jangan impor ulang file seed event setelah pembayaran operasional dicatat karena data sumber dapat menimpa nilai saldo atau jadwal.

## Endpoint utama

- POST api/login.php membuat sesi pengguna.
- POST api/logout.php mengakhiri sesi.
- GET api/session.php membaca status sesi.
- GET/POST api/change-password.php menyediakan token formulir dan mengganti password akun yang sedang login setelah verifikasi password saat ini; password baru minimal 12 karakter.
- GET api/dashboard.php menyediakan ringkasan dashboard dan memerlukan sesi.
- GET api/branches.php menyediakan data cabang sesuai lingkup akun.
- GET api/customers.php menyediakan data pelanggan sesuai hak akses.
- GET api/payment-history.php menyediakan riwayat pembayaran sesuai lingkup akun.
- GET api/reports.php?year=2026 menyediakan rekap tahunan untuk admin.

Endpoint tulis memerlukan sesi dan hak akses yang sesuai. Gunakan halaman aplikasi untuk operasi harian, bukan mengirim perubahan langsung ke database.

## Backup dan keamanan

- Ekspor database yang terkait sebelum migrasi atau pembaruan seed.
- Simpan backup terenkripsi di lokasi terpisah dan uji proses pemulihan secara berkala.
- Jangan menyalin password atau hash password ke README, issue, atau repositori publik.
- Jangan membagikan api/config.php jika berisi kredensial lokal. Batasi hak akses akun MySQL untuk kebutuhan aplikasi.
- Jangan menjalankan migrasi berulang tanpa memastikan skrip tersebut aman diulang.

## Batasan fitur

Dashboard dapat menghitung tagihan yang mendekati jatuh tempo atau tertunggak, tetapi belum ada worker terjadwal yang mengirim pengingat otomatis. README ini juga tidak mengasumsikan adanya pemulihan password, pengiriman email/WhatsApp, atau ekspor laporan penuh.

Jika database lama memiliki baris progres pembayaran sintetis, tinjau dahulu baris demo yang ada dan backup database sebelum menjalankan migration_remove_demo_payment_progress.sql. Migrasi ini ditujukan untuk membersihkan progres demo lama; jangan jalankan tanpa memastikan data yang akan dihapus. Data transaksi operasional tetap dikelola dari tabel pembayaran.

