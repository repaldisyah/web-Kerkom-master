<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$scope = current_scope();
if (!in_array($scope['role'], ['admin_pusat', 'super_admin'], true)) {
    respond(['success' => false, 'message' => 'Hanya admin pusat yang dapat membuat akun admin cabang.'], 403);
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(['success' => false, 'message' => 'Metode harus POST.'], 405);
}

$data = request_data();
$name = trim((string) ($data['name'] ?? ''));
$username = trim((string) ($data['username'] ?? ''));
$email = trim((string) ($data['email'] ?? ''));
$password = (string) ($data['password'] ?? '');
$branchId = filter_var($data['branch_id'] ?? null, FILTER_VALIDATE_INT);

if ($name === '' || mb_strlen($name) > 100 || !preg_match('/^[A-Za-z0-9_.-]{3,50}$/', $username)
    || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150
    || strlen($password) < 10 || $branchId === false || $branchId === null || $branchId < 1) {
    respond(['success' => false, 'message' => 'Nama, username, email, kata sandi minimal 10 karakter, dan cabang yang valid wajib diisi.'], 422);
}

$db = database();
$branch = $db->prepare('SELECT id FROM branches WHERE id = :id');
$branch->execute(['id' => $branchId]);
if (!$branch->fetch()) respond(['success' => false, 'message' => 'Cabang tidak ditemukan.'], 422);

try {
    $statement = $db->prepare("INSERT INTO users (name, username, email, password_hash, role, branch_id) VALUES (:name, :username, :email, :password_hash, 'admin_cabang', :branch_id)");
    $statement->execute([
        'name' => $name,
        'username' => $username,
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'branch_id' => $branchId,
    ]);
    respond(['success' => true, 'message' => 'Akun admin cabang berhasil dibuat.', 'user' => [
        'id' => (int) $db->lastInsertId(), 'name' => $name, 'username' => $username,
        'email' => $email, 'role' => 'admin_cabang', 'branch_id' => $branchId,
    ]], 201);
} catch (PDOException $error) {
    if ((string) $error->getCode() === '23000') {
        respond(['success' => false, 'message' => 'Username atau email sudah digunakan.'], 409);
    }
    respond(['success' => false, 'message' => 'Akun tidak dapat dibuat. Periksa migrasi database dan konfigurasi.'], 500);
}
