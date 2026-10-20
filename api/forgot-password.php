<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(['success' => false, 'message' => 'Metode harus POST.'], 405);
}
$data = request_data();
$action = (string) ($data['action'] ?? '');

if ($action === 'start') {
    $accountType = (string) ($data['account_type'] ?? '');
    $login = trim((string) ($data['login'] ?? ''));
    if (!in_array($accountType, ['admin', 'pelanggan'], true) || $login === '') {
        respond(['success' => false, 'message' => 'Jenis akun dan username/email wajib diisi.'], 422);
    }
    $user = null;
    $connectionName = '';
    if ($accountType === 'admin') {
        $central = try_admin_database();
        if ($central instanceof PDO) {
            $query = $central->prepare('SELECT id FROM users WHERE username = :login OR email = :login LIMIT 1');
            $query->execute(['login' => $login]);
            $user = $query->fetch();
            if ($user) $connectionName = 'central';
        }
        if (!$user) {
            $query = database()->prepare("SELECT id FROM users WHERE (username = :login OR email = :login) AND role = 'admin_cabang' LIMIT 1");
            $query->execute(['login' => $login]);
            $user = $query->fetch();
            if ($user) $connectionName = 'operational';
        }
    } else {
        $query = database()->prepare("SELECT id FROM users WHERE (username = :login OR email = :login) AND role = 'pelanggan' LIMIT 1");
        $query->execute(['login' => $login]);
        $user = $query->fetch();
        if ($user) $connectionName = 'operational';
    }
    if (!$user) respond(['success' => false, 'message' => 'Akun tidak ditemukan untuk jenis akun tersebut.'], 404);

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $_SESSION['password_reset_challenge'] = [
        'user_id' => (int) $user['id'], 'connection' => $connectionName,
        'code_hash' => password_hash($code, PASSWORD_DEFAULT), 'expires_at' => time() + 600, 'attempts' => 0,
    ];
    respond(['success' => true, 'demo_code' => $code, 'expires_in' => 600]);
}

if ($action !== 'verify') respond(['success' => false, 'message' => 'Tahap pemulihan tidak valid.'], 422);
$challenge = $_SESSION['password_reset_challenge'] ?? null;
if (!is_array($challenge) || (int) ($challenge['expires_at'] ?? 0) < time()) {
    unset($_SESSION['password_reset_challenge']);
    respond(['success' => false, 'message' => 'Kode tidak tersedia atau sudah kedaluwarsa. Minta kode baru.'], 410);
}
$code = trim((string) ($data['code'] ?? ''));
if (!preg_match('/^\d{6}$/', $code) || !password_verify($code, (string) ($challenge['code_hash'] ?? ''))) {
    $challenge['attempts'] = (int) ($challenge['attempts'] ?? 0) + 1;
    if ($challenge['attempts'] >= 5) unset($_SESSION['password_reset_challenge']);
    else $_SESSION['password_reset_challenge'] = $challenge;
    respond(['success' => false, 'message' => $challenge['attempts'] >= 5 ? 'Batas percobaan tercapai. Minta kode baru.' : 'Kode verifikasi salah.'], 422);
}
$newPassword = (string) ($data['new_password'] ?? '');
$confirmPassword = (string) ($data['confirm_password'] ?? '');
if (strlen($newPassword) < 12 || strlen($newPassword) > 72) respond(['success' => false, 'message' => 'Password harus terdiri dari 12 hingga 72 byte.'], 422);
if (!hash_equals($newPassword, $confirmPassword)) respond(['success' => false, 'message' => 'Konfirmasi password tidak cocok.'], 422);

$connection = ($challenge['connection'] ?? '') === 'central' ? try_admin_database() : database();
if (!$connection instanceof PDO) respond(['success' => false, 'message' => 'Database akun tidak tersedia.'], 503);
$update = $connection->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
$update->execute(['hash' => password_hash($newPassword, PASSWORD_DEFAULT), 'id' => (int) $challenge['user_id']]);
if ($update->rowCount() === 0) {
    $exists = $connection->prepare('SELECT id FROM users WHERE id = :id');
    $exists->execute(['id' => (int) $challenge['user_id']]);
    if (!$exists->fetch()) {
        unset($_SESSION['password_reset_challenge']);
        respond(['success' => false, 'message' => 'Akun tidak lagi tersedia.'], 404);
    }
}
unset($_SESSION['password_reset_challenge']);
respond(['success' => true, 'message' => 'Password berhasil diperbarui.']);
