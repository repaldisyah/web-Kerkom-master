<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
$scope = current_scope();
$db = database();
$isCentral = in_array($scope['role'], ['admin_pusat', 'super_admin'], true);
$isBranch = $scope['role'] === 'admin_cabang';
$isCustomer = $scope['role'] === 'pelanggan';
if ($isBranch && !$scope['branch_id']) respond(['success' => false, 'message' => 'Akun admin cabang belum memiliki cabang.'], 403);
if ($isCustomer && !$scope['customer_id']) respond(['success' => false, 'message' => 'Akun pelanggan belum terhubung ke profil pelanggan.'], 403);

$branchRows = $db->query('SELECT id, name FROM branches ORDER BY name')->fetchAll();
$branchNames = [];
foreach ($branchRows as $branch) $branchNames[(int) $branch['id']] = (string) $branch['name'];
$customerName = null;
$customerBranchId = null;
if ($isCustomer) {
    $profile = $db->prepare('SELECT c.name, c.branch_id FROM customers c JOIN users u ON u.customer_id=c.id WHERE u.id=:user_id AND u.customer_id=:customer_id AND u.role=\'pelanggan\' LIMIT 1');
    $profile->execute(['user_id' => $scope['user_id'], 'customer_id' => $scope['customer_id']]);
    $row = $profile->fetch();
    if (!$row) respond(['success' => false, 'message' => 'Profil pelanggan tidak ditemukan.'], 403);
    $customerName = (string) $row['name'];
    $customerBranchId = (int) $row['branch_id'];
}

$visibleBranchIds = $isCentral ? array_keys($branchNames) : [$isBranch ? (int) $scope['branch_id'] : $customerBranchId];
$rows = [];
$append = static function (int $branchId, string $customer, int $eventCount, float $contract, float $paid, float $outstanding, int $year, string $identity = '') use (&$rows, $branchNames): void {
    if ($year < 2022 || !isset($branchNames[$branchId]) || trim($customer) === '') return;
    $rows[] = ['year' => $year, 'branch_id' => $branchId, 'branch' => $branchNames[$branchId], 'customer' => $customer,
        'identity' => $identity !== '' ? $identity : mb_strtolower(trim($customer), 'UTF-8'), 'event_count' => $eventCount,
        'contract_total' => $contract, 'paid_total' => $paid, 'outstanding' => $outstanding];
};

// Sumber utama memakai customer_id sehingga identitas pelanggan tidak bergantung pada nama.
$masterSql = "SELECT YEAR(e.event_date) AS year, b.id AS branch_id, c.id AS customer_id, c.name AS customer,
    COUNT(DISTINCT e.id) AS event_count, COALESCE(SUM(r.total_amount),0) AS contract_total,
    COALESCE(SUM(r.total_amount-r.balance),0) AS paid_total, COALESCE(SUM(r.balance),0) AS outstanding
    FROM events e JOIN customers c ON c.id=e.customer_id JOIN branches b ON b.id=e.branch_id
    LEFT JOIN (SELECT event_id, SUM(total_amount) AS total_amount, SUM(balance) AS balance FROM receivables GROUP BY event_id) r ON r.event_id=e.id";
$masterWhere = [];
$masterParams = [];
if ($isBranch) { $masterWhere[] = 'b.id=:branch_id'; $masterParams['branch_id'] = (int) $scope['branch_id']; }
if ($isCustomer) { $masterWhere[] = 'c.id=:customer_id'; $masterParams['customer_id'] = (int) $scope['customer_id']; }
if ($masterWhere) $masterSql .= ' WHERE ' . implode(' AND ', $masterWhere);
$masterSql .= ' GROUP BY YEAR(e.event_date), b.id, c.id, c.name';
$masterQuery = $db->prepare($masterSql);
$masterQuery->execute($masterParams);
foreach ($masterQuery->fetchAll() as $row) $append((int) $row['branch_id'], (string) $row['customer'], (int) $row['event_count'], (float) $row['contract_total'], (float) $row['paid_total'], (float) $row['outstanding'], (int) $row['year'], 'name:' . mb_strtolower(trim((string) $row['customer']), 'UTF-8'));

$config = require __DIR__ . '/config.php';
$external = [
    'bali' => ['database' => (string) ($config['events_bali_db_name'] ?? 'events_bali'), 'branch_id' => (int) ($config['events_bali_branch_id'] ?? 2)],
    'bandung' => ['database' => (string) ($config['events_bandung_db_name'] ?? 'events_bandung'), 'branch_id' => (int) ($config['events_bandung_branch_id'] ?? 3)],
];
$branchIdsByName = [];
foreach ($branchNames as $id => $name) $branchIdsByName[mb_strtolower(trim($name), 'UTF-8')] = (int) $id;
$palembangId = null;
foreach ($branchNames as $id => $name) if (mb_strtolower(trim($name), 'UTF-8') === 'palembang') $palembangId = $id;
foreach ($external as $key => &$item) {
    $item['branch_id'] = $branchIdsByName[$key] ?? $item['branch_id'];
}
unset($item);
$external['palembang'] = ['database' => null, 'branch_id' => $palembangId];

foreach ($external as $key => $item) {
    $branchId = $item['branch_id'];
    if (!$branchId || !in_array((int) $branchId, $visibleBranchIds, true)) continue;
    if ($isCustomer && (int) $branchId !== $customerBranchId) continue;
    try {
        if ($key === 'palembang') $eventDb = $db;
        else $eventDb = new PDO(sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $item['database']), $config['db_user'], $config['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $table = $key === 'palembang' ? 'palembang_events' : 'events';
        if (!$eventDb->query("SHOW TABLES LIKE '$table'")->fetchColumn()) continue;
        $contractExpr = $key === 'palembang' ? 'nilai_kontrak' : '(hpp_rab+margin)';
        $paidExpr = 'total_dibayar';
        $balanceExpr = $key === 'palembang' ? 'piutang' : "GREATEST(0,(hpp_rab+margin)-total_dibayar)";
        $customerExpr = 'pelanggan';
        $sql = "SELECT YEAR(tgl_event) AS year, $customerExpr AS customer, COUNT(*) AS event_count, COALESCE(SUM($contractExpr),0) AS contract_total, COALESCE(SUM($paidExpr),0) AS paid_total, COALESCE(SUM($balanceExpr),0) AS outstanding FROM $table";
        $params = [];
        if ($isCustomer) { $sql .= ' WHERE pelanggan=:customer'; $params['customer'] = $customerName; }
        $sql .= ' GROUP BY YEAR(tgl_event), pelanggan';
        $query = $eventDb->prepare($sql);
        $query->execute($params);
        foreach ($query->fetchAll() as $row) $append((int) $branchId, (string) $row['customer'], (int) $row['event_count'], (float) $row['contract_total'], (float) $row['paid_total'], (float) $row['outstanding'], (int) $row['year'], 'name:' . mb_strtolower(trim((string) $row['customer']), 'UTF-8'));
    } catch (Throwable) {
        // Database cabang yang belum tersedia dilewati agar ringkasan cabang lain tetap tampil.
    }
}

if ($isCentral) {
    $annual = [];
    $byBranch = [];
    foreach ($rows as $row) {
        $year = $row['year'];
        $identity = $row['branch_id'] . '|' . $row['identity'];
        $annual[$year] ??= ['year' => $year, 'customer_keys' => [], 'event_count' => 0, 'contract_total' => 0.0, 'paid_total' => 0.0, 'outstanding' => 0.0];
        $annual[$year]['customer_keys'][$identity] = true;
        foreach (['event_count', 'contract_total', 'paid_total', 'outstanding'] as $field) $annual[$year][$field] += $row[$field];
        $branchKey = $year . '|' . $row['branch_id'];
        $byBranch[$branchKey] ??= ['year' => $year, 'branch' => $row['branch'], 'customer_keys' => [], 'event_count' => 0, 'contract_total' => 0.0, 'paid_total' => 0.0, 'outstanding' => 0.0];
        $byBranch[$branchKey]['customer_keys'][$identity] = true;
        foreach (['event_count', 'contract_total', 'paid_total', 'outstanding'] as $field) $byBranch[$branchKey][$field] += $row[$field];
    }
    foreach ($annual as &$item) { $item['customer_count'] = count($item['customer_keys']); unset($item['customer_keys']); }
    foreach ($byBranch as &$item) { $item['customer_count'] = count($item['customer_keys']); unset($item['customer_keys']); }
    unset($item);
    usort($annual, static fn(array $a,array $b): int => $b['year'] <=> $a['year']);
    usort($byBranch, static fn(array $a,array $b): int => $b['year'] <=> $a['year'] ?: strcmp($a['branch'],$b['branch']));
    respond(['success' => true, 'scope' => 'central', 'annual' => $annual, 'by_branch' => $byBranch]);
}

if ($isBranch) {
    $customers = [];
    foreach ($rows as $row) {
        $key = $row['identity'];
        $customers[$key] ??= ['customer' => $row['customer'], 'event_count' => 0, 'contract_total' => 0.0, 'paid_total' => 0.0, 'outstanding' => 0.0, 'last_year' => $row['year']];
        foreach (['event_count', 'contract_total', 'paid_total', 'outstanding'] as $field) $customers[$key][$field] += $row[$field];
        $customers[$key]['last_year'] = max($customers[$key]['last_year'], $row['year']);
    }
    usort($customers, static fn(array $a,array $b): int => strcmp($a['customer'],$b['customer']));
    respond(['success' => true, 'scope' => 'branch', 'branch' => $branchNames[(int) $scope['branch_id']], 'customers' => array_values($customers), 'customer_count' => count($customers)]);
}

$annual = [];
foreach ($rows as $row) {
    $annual[$row['year']] ??= ['year' => $row['year'], 'event_count' => 0, 'contract_total' => 0.0, 'paid_total' => 0.0, 'outstanding' => 0.0];
    foreach (['event_count', 'contract_total', 'paid_total', 'outstanding'] as $field) $annual[$row['year']][$field] += $row[$field];
}
foreach ($annual as &$item) $item['customer_count'] = 1;
unset($item);
usort($annual, static fn(array $a,array $b): int => $b['year'] <=> $a['year']);
respond(['success' => true, 'scope' => 'customer', 'annual' => array_values($annual)]);
