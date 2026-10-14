<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$scope = current_scope();
if (!in_array($scope['role'], ['admin_pusat', 'super_admin'], true)) {
    respond(['success' => false, 'message' => 'Hanya admin pusat yang dapat membuat akun admin cabang.'], 403);
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = database();
if ($method === 'GET') {
    $users = $db->query("SELECT u.id,u.name,u.username,u.email,u.role,u.branch_id,u.customer_id,b.name AS branch,c.name AS customer FROM users u LEFT JOIN branches b ON b.id=u.branch_id LEFT JOIN customers c ON c.id=u.customer_id ORDER BY u.role,b.name,u.username")->fetchAll();
    respond(['success' => true, 'users' => $users]);
}
if ($method === 'DELETE') {
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id) respond(['success' => false, 'message' => 'ID akun wajib valid.'], 422);
    if ($id === (int) $scope['user_id']) respond(['success' => false, 'message' => 'Akun yang sedang digunakan tidak dapat dihapus.'], 409);
    $delete = $db->prepare('DELETE FROM users WHERE id=:id'); $delete->execute(['id' => $id]);
    if (!$delete->rowCount()) respond(['success' => false, 'message' => 'Akun tidak ditemukan.'], 404);
    respond(['success' => true, 'message' => 'Akun berhasil dihapus.']);
}
if ($method === 'PUT') {
    $data = request_data(); $id = filter_var($_GET['id'] ?? $data['id'] ?? null, FILTER_VALIDATE_INT);
    $name = trim((string)($data['name'] ?? '')); $email = trim((string)($data['email'] ?? ''));
    $branchId = filter_var($data['branch_id'] ?? null, FILTER_VALIDATE_INT); $password = (string)($data['password'] ?? '');
    if (!$id || $name === '' || mb_strlen($name)>100 || !filter_var($email,FILTER_VALIDATE_EMAIL) || mb_strlen($email)>150 || !$branchId) respond(['success'=>false,'message'=>'Data akun tidak valid.'],422);
    $branch = $db->prepare('SELECT id FROM branches WHERE id=:id'); $branch->execute(['id'=>$branchId]); if(!$branch->fetch()) respond(['success'=>false,'message'=>'Cabang tidak ditemukan.'],422);
    $sql='UPDATE users SET name=:name,email=:email,branch_id=:branch_id'; $params=['id'=>$id,'name'=>$name,'email'=>$email,'branch_id'=>$branchId];
    if ($password !== '') { if(strlen($password)<10) respond(['success'=>false,'message'=>'Kata sandi minimal 10 karakter.'],422); $sql.=',password_hash=:password_hash'; $params['password_hash']=password_hash($password,PASSWORD_DEFAULT); }
    $sql.=" WHERE id=:id AND role='admin_cabang'"; $save=$db->prepare($sql); $save->execute($params);
    if(!$save->rowCount()) { $check=$db->prepare("SELECT id FROM users WHERE id=:id AND role='admin_cabang'");$check->execute(['id'=>$id]);if(!$check->fetch())respond(['success'=>false,'message'=>'Akun admin cabang tidak ditemukan.'],404); }
    respond(['success'=>true,'message'=>'Akun admin cabang berhasil diperbarui.']);
}
if ($method !== 'POST') respond(['success' => false, 'message' => 'Metode tidak didukung.'], 405);

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
