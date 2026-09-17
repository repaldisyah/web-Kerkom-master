<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Metode harus POST.'], 405);
}

$data = request_data();
$username = trim((string) ($data['username'] ?? ''));
$password = (string) ($data['password'] ?? '');

if ($username === '' || $password === '') {
    respond(['success' => false, 'message' => 'Username/email dan password wajib diisi.'], 422);
}

$customerColumn = has_customer_account_column() ? 'customer_id' : 'NULL AS customer_id';
$statement = database()->prepare("SELECT id, name, username, email, password_hash, role, branch_id, $customerColumn FROM users WHERE username = :login OR email = :login LIMIT 1");
$statement->execute(['login' => $username]);
$user = $statement->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    respond(['success' => false, 'message' => 'Username/email atau password tidak valid.'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['user_name'] = $user['name'];
$_SESSION['user_role'] = $user['role'];
$_SESSION['user_branch_id'] = $user['branch_id'] === null ? null : (int) $user['branch_id'];
$_SESSION['user_customer_id'] = $user['customer_id'] === null ? null : (int) $user['customer_id'];

respond([
    'success' => true,
    'message' => 'Login berhasil.',
    'user' => [
        'name' => $user['name'],
        'role' => $user['role'],
        'branch_id' => $_SESSION['user_branch_id'],
        'customer_id' => $_SESSION['user_customer_id'],
    ],
]);
