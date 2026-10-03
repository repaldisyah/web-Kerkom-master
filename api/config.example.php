<?php

declare(strict_types=1);

/**
 * Salin file ini menjadi config.php lalu sesuaikan bila konfigurasi MySQL Anda
 * berbeda. Untuk instalasi XAMPP standar, nilai di bawah biasanya sudah benar.
 */
return [
    'db_host' => '127.0.0.1',
    'db_port' => '3306',
    'db_name' => 'nusa_karsa',
    'admin_db_name' => 'admin_pusat',
    'events_bali_db_name' => 'events_bali',
    'events_bandung_db_name' => 'events_bandung',
    'events_bali_branch_id' => 2,
    'events_bandung_branch_id' => 3,
    'db_user' => 'root',
    'db_pass' => '',
];
