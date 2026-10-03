<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Versi sesi baru membatalkan sesi lama yang masih memakai role super_admin dari DB bersama.
session_name('nusa_karsa_session_v2');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Lax');
$cookieSecure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params([
    'httponly' => true,
    'secure' => $cookieSecure,
    'samesite' => 'Lax',
    'path' => '/',
]);
session_start();

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function request_data(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($contentType, 'application/json')) {
        $data = json_decode(file_get_contents('php://input'), true);
        return is_array($data) ? $data : [];
    }

    return $_POST;
}

function database(): PDO
{
    static $connection = null;
    if ($connection instanceof PDO) {
        return $connection;
    }

    $configFile = __DIR__ . '/config.php';
    if (!is_file($configFile)) {
        respond(['success' => false, 'message' => 'Konfigurasi database belum dibuat. Salin api/config.example.php menjadi api/config.php lalu sesuaikan kredensial MySQL.'], 500);
    }

    $config = require $configFile;
    try {
        $connection = new PDO(
            sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $config['db_name']),
            $config['db_user'],
            $config['db_pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        return $connection;
    } catch (PDOException) {
        respond(['success' => false, 'message' => 'Koneksi database gagal. Periksa api/config.php dan pastikan MySQL menyala.'], 500);
    }
}

function admin_database(): PDO
{
    static $connection = null;
    if ($connection instanceof PDO) return $connection;

    $config = require __DIR__ . '/config.php';
    $databaseName = $config['admin_db_name'] ?? 'admin_pusat';
    try {
        $connection = new PDO(
            sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $databaseName),
            $config['db_user'],
            $config['db_pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        return $connection;
    } catch (PDOException) {
        respond(['success' => false, 'message' => 'Database admin pusat belum disiapkan. Jalankan database/migration_separate_admin_pusat.sql.'], 500);
    }
}
function require_login(): int
{
    $userId = $_SESSION['user_id'] ?? null;
    if (!is_int($userId) && !ctype_digit((string) $userId)) {
        respond(['success' => false, 'message' => 'Silakan login terlebih dahulu.'], 401);
    }
    return (int) $userId;
}

function require_operational_user(): array
{
    $scope = current_scope();
    if (!in_array($scope['role'], ['admin_pusat', 'super_admin', 'admin_cabang'], true)) {
        respond(['success' => false, 'message' => 'Aksi ini hanya tersedia untuk admin.'], 403);
    }
    return $scope;
}
function current_scope(): array
{
    $userId = require_login();
    $role = (string) ($_SESSION['user_role'] ?? '');
    $allowedRoles = ['admin_pusat', 'super_admin', 'admin_cabang', 'pelanggan'];
    if (!in_array($role, $allowedRoles, true)) {
        respond(['success' => false, 'message' => 'Peran akun tidak valid.'], 403);
    }

    return [
        'user_id' => $userId,
        'role' => $role,
        'branch_id' => isset($_SESSION['user_branch_id']) ? (int) $_SESSION['user_branch_id'] : null,
        'customer_id' => isset($_SESSION['user_customer_id']) ? (int) $_SESSION['user_customer_id'] : null,
    ];
}

function require_branch_access(array $scope, int $branchId): void
{
    if ($scope['role'] === 'pelanggan') {
        respond(['success' => false, 'message' => 'Akun pelanggan tidak dapat mengakses data event cabang.'], 403);
    }
    if ($scope['role'] === 'admin_cabang' && $scope['branch_id'] !== $branchId) {
        respond(['success' => false, 'message' => 'Akun ini tidak memiliki akses ke cabang tersebut.'], 403);
    }
}

function has_customer_account_column(): bool
{
    static $exists = null;
    if (is_bool($exists)) return $exists;
    $statement = database()->query("SHOW COLUMNS FROM users LIKE 'customer_id'");
    $exists = (bool) $statement->fetch();
    return $exists;
}

function has_payment_token_column(): bool
{
    static $exists = null;
    if (is_bool($exists)) return $exists;
    $statement = database()->query("SHOW COLUMNS FROM payments LIKE 'payment_token'");
    $exists = (bool) $statement->fetch();
    return $exists;
}

function has_payment_method_column(): bool
{
    static $exists = null;
    if (is_bool($exists)) return $exists;
    $statement = database()->query("SHOW COLUMNS FROM payments LIKE 'payment_method'");
    $exists = (bool) $statement->fetch();
    return $exists;
}

function has_payment_note_column(): bool
{
    static $exists = null;
    if (is_bool($exists)) return $exists;
    $statement = database()->query("SHOW COLUMNS FROM payments LIKE 'note'");
    $exists = (bool) $statement->fetch();
    return $exists;
}
