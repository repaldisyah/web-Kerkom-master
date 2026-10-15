<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
$scope = current_scope();
$isCustomer = $scope['role'] === 'pelanggan';
$isCentral = in_array($scope['role'], ['admin_pusat', 'super_admin'], true);
if (!$isCustomer && !$isCentral && $scope['role'] !== 'admin_cabang') {
    respond(['success' => false, 'message' => 'Peran akun tidak diizinkan melihat piutang.'], 403);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(['success' => false, 'message' => 'Metode harus GET.'], 405);
}

$db = database();
$branchId = $scope['branch_id'];
if ($isCustomer && !$scope['customer_id']) {
    respond(['success' => false, 'message' => 'Akun pelanggan belum terhubung ke data pelanggan. Hubungi admin.'], 403);
}
if (!$isCentral && !$isCustomer && $branchId === null) {
    respond(['success' => false, 'message' => 'Akun belum memiliki cabang. Hubungi admin pusat.'], 403);
}

if ($isCustomer) {
    $filter = ' AND r.customer_id = :customer_id';
    $parameters = ['customer_id' => (int) $scope['customer_id']];
} elseif ($isCentral) {
    $filter = '';
    $parameters = [];
} else {
    $filter = ' AND r.branch_id = :branch_id';
    $parameters = ['branch_id' => (int) $branchId];
}

$statement = $db->prepare("SELECT r.id, 'master' AS source, c.name AS customer, b.name AS branch, e.name AS event, r.due_date, r.total_amount, r.balance, r.status FROM receivables r JOIN customers c ON c.id = r.customer_id JOIN branches b ON b.id = r.branch_id JOIN events e ON e.id = r.event_id WHERE r.balance > 0$filter ORDER BY r.due_date ASC, r.id ASC");
$statement->execute($parameters);
$receivables = $statement->fetchAll();

if ($isCustomer) {
    $profile = $db->prepare('SELECT c.name, c.branch_id FROM customers c JOIN users u ON u.customer_id = c.id WHERE u.id = :user_id AND u.customer_id = :customer_id AND u.role = \'pelanggan\' LIMIT 1');
    $profile->execute(['user_id' => $scope['user_id'], 'customer_id' => $scope['customer_id']]);
    $customer = $profile->fetch();
    if (!$customer) respond(['success' => false, 'message' => 'Profil pelanggan akun ini tidak ditemukan.'], 403);
    $customerName = (string) $customer['name'];
    $customerBranchId = (int) $customer['branch_id'];
    $branchNames = [];
    foreach ($db->query('SELECT id, name FROM branches')->fetchAll() as $branch) {
        $branchNames[strtolower(trim((string) $branch['name']))] = (int) $branch['id'];
    }
    $config = require __DIR__ . '/config.php';
    foreach ([
        'bali' => (string) ($config['events_bali_db_name'] ?? 'events_bali'),
        'bandung' => (string) ($config['events_bandung_db_name'] ?? 'events_bandung'),
    ] as $branchKey => $databaseName) {
        if (($branchNames[$branchKey] ?? null) !== $customerBranchId) continue;
        try {
            $eventDb = new PDO(
                sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $databaseName),
                $config['db_user'],
                $config['db_pass'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
            );
            $eventQuery = $eventDb->prepare("SELECT id, :source AS source, :customer AS customer, :branch AS branch, nama_event AS event, tgl_jatuh_tempo AS due_date, nilai_kontrak AS total_amount, piutang AS balance, status_piutang AS status FROM vw_events_dashboard WHERE pelanggan = :customer_name AND piutang > 0");
            $eventQuery->execute(['source' => $branchKey, 'customer' => $customerName, 'branch' => ucfirst($branchKey), 'customer_name' => $customerName]);
            $receivables = array_merge($receivables, $eventQuery->fetchAll());
        } catch (PDOException) {
            respond(['success' => false, 'message' => 'Data tagihan cabang belum dapat dimuat.'], 503);
        }
    }
    if (($branchNames['palembang'] ?? null) === $customerBranchId) {
        $eventQuery = $db->prepare("SELECT id, 'palembang' AS source, :customer AS customer, 'Palembang' AS branch, nama_event AS event, tgl_jatuh_tempo AS due_date, nilai_kontrak AS total_amount, piutang AS balance, CASE WHEN piutang <= 0 THEN 'Lunas' WHEN tgl_jatuh_tempo < CURDATE() THEN 'Menunggak' ELSE 'Belum Lunas' END AS status FROM palembang_events WHERE pelanggan = :customer_name AND piutang > 0");
        $eventQuery->execute(['customer' => $customerName, 'customer_name' => $customerName]);
        $receivables = array_merge($receivables, $eventQuery->fetchAll());
    }
    usort($receivables, static fn (array $left, array $right): int => strcmp((string) ($left['due_date'] ?? ''), (string) ($right['due_date'] ?? '')));
}

respond(['success' => true, 'receivables' => $receivables, 'scope' => $isCustomer ? 'customer' : ($isCentral ? 'all' : 'branch')]);
