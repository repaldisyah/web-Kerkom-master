<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$scope = current_scope();
if (!in_array($scope['role'], ['admin_pusat', 'super_admin', 'admin_cabang', 'pelanggan'], true)) {
    respond(['success' => false, 'message' => 'Akun ini tidak dapat mengganti password.'], 403);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['password_change_csrf'])) {
        $_SESSION['password_change_csrf'] = bin2hex(random_bytes(32));
    }
    respond(['success' => true, 'role' => $scope['role'], 'csrf_token' => $_SESSION['password_change_csrf']]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    respond(['success' => false, 'message' => 'Metode permintaan tidak diizinkan.'], 405);
}

$data = request_data();
$providedToken = (string) ($data['csrf_token'] ?? '');
$sessionToken = (string) ($_SESSION['password_change_csrf'] ?? '');
if ($sessionToken === '' || !hash_equals($sessionToken, $providedToken)) {
    respond(['success' => false, 'message' => 'Sesi formulir tidak valid. Muat ulang halaman lalu coba lagi.'], 403);
}

$currentPassword = (string) ($data['current_password'] ?? '');
$newPassword = (string) ($data['new_password'] ?? '');
$confirmPassword = (string) ($data['confirm_password'] ?? '');
if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
    respond(['success' => false, 'message' => 'Semua kolom wajib diisi.'], 422);
}
if (strlen($newPassword) < 12) {
    respond(['success' => false, 'message' => 'Password baru harus memiliki sedikitnya 12 karakter.'], 422);
}
if (strlen($newPassword) > 72) {
    respond(['success' => false, 'message' => 'Password baru tidak boleh lebih dari 72 byte.'], 422);
}
if (!hash_equals($newPassword, $confirmPassword)) {
    respond(['success' => false, 'message' => 'Konfirmasi password baru tidak cocok.'], 422);
}
if (hash_equals($currentPassword, $newPassword)) {
    respond(['success' => false, 'message' => 'Password baru harus berbeda dari password saat ini.'], 422);
}

$connection = in_array($scope['role'], ['admin_pusat', 'super_admin'], true) ? admin_database() : database();
$find = $connection->prepare('SELECT password_hash FROM users WHERE id = :id LIMIT 1');
$find->execute(['id' => $scope['user_id']]);
$user = $find->fetch();
if (!$user || !password_verify($currentPassword, (string) $user['password_hash'])) {
    respond(['success' => false, 'message' => 'Password saat ini tidak benar.'], 422);
}

$update = $connection->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id');
$update->execute(['password_hash' => password_hash($newPassword, PASSWORD_DEFAULT), 'id' => $scope['user_id']]);
session_regenerate_id(true);
$_SESSION['password_change_csrf'] = bin2hex(random_bytes(32));
respond(['success' => true, 'message' => 'Password berhasil diperbarui.']);
