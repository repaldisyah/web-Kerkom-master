<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Metode harus POST.'], 405);
}

$data = request_data();
$accountType = (string) ($data['account_type'] ?? '');
if (!in_array($accountType, ['admin', 'pelanggan'], true)) {
    respond(['success' => false, 'message' => 'Pilih jenis akun admin atau pelanggan.'], 422);
}
$login = trim((string) ($data['username'] ?? ''));
$password = (string) ($data['password'] ?? '');
if ($login === '' || $password === '') {
    respond(['success' => false, 'message' => 'Username/email dan password wajib diisi.'], 422);
}

$user = null;

// Pelanggan berada di database operasional. Jangan membuka database admin pusat
// untuk jenis akun ini agar login pelanggan tetap berfungsi tanpa database admin.
if ($accountType === 'admin') {
    $centralDatabase = try_admin_database();
    if ($centralDatabase instanceof PDO) {
        $centralStatement = $centralDatabase->prepare(
            "SELECT id, name, username, email, password_hash, 'admin_pusat' AS role,
                    NULL AS branch_id, NULL AS customer_id
             FROM users WHERE username = :login OR email = :login LIMIT 1"
        );
        $centralStatement->execute(['login' => $login]);
        $user = $centralStatement->fetch();
    }
}

// Akun admin cabang dan pelanggan tersimpan di database operasional.
if (!$user) {
    $customerColumn = has_customer_account_column() ? 'customer_id' : 'NULL AS customer_id';
    $roles = $accountType === 'pelanggan' ? "'pelanggan'" : "'admin_cabang'";
    $statement = database()->prepare(
        "SELECT id, name, username, email, password_hash, role, branch_id, $customerColumn
         FROM users WHERE (username = :login OR email = :login)
         AND role IN ($roles) LIMIT 1"
    );
    $statement->execute(['login' => $login]);
    $user = $statement->fetch();
}

if (!$user || !password_verify($password, $user['password_hash'])) {
    respond(['success' => false, 'message' => 'Username/email atau password tidak valid.'], 401);
}

$isCustomerAccount = $user['role'] === 'pelanggan';
if (($accountType === 'pelanggan') !== $isCustomerAccount) {
    respond(['success' => false, 'message' => 'Jenis akun yang dipilih tidak sesuai dengan akun ini.'], 403);
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
