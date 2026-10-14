<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(['success' => false, 'message' => 'Metode harus GET.'], 405);
}

$scope = current_scope();
$isCentral = in_array($scope['role'], ['admin_pusat', 'super_admin'], true);
$isCustomer = $scope['role'] === 'pelanggan';
if ($isCustomer) respond(['success' => false, 'message' => 'Laporan hanya tersedia untuk admin.'], 403);
$requestedYear = filter_input(INPUT_GET, 'year', FILTER_VALIDATE_INT);
if ($requestedYear === false || ($requestedYear !== null && ($requestedYear < 2020 || $requestedYear > 2100))) {
    respond(['success' => false, 'message' => 'Tahun tidak valid.'], 422);
}
$db = database();
$year = $requestedYear;
if ($year === null) {
    $availableYears = [];
    $masterYear = $db->query('SELECT MAX(YEAR(invoice_date)) FROM receivables')->fetchColumn();
    if ($masterYear) $availableYears[] = (int) $masterYear;
    try {
        if ($db->query("SHOW TABLES LIKE 'palembang_events'")->fetchColumn()) {
            $palembangYear = $db->query('SELECT MAX(YEAR(COALESCE(tgl_event, tgl_jatuh_tempo))) FROM palembang_events')->fetchColumn();
            if ($palembangYear) $availableYears[] = (int) $palembangYear;
        }
    } catch (PDOException) {
    }
    $config = require __DIR__ . '/config.php';
    foreach (['events_bali_db_name', 'events_bandung_db_name'] as $databaseKey) {
        try {
            $eventDb = new PDO(
                sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $config[$databaseKey]),
                $config['db_user'],
                $config['db_pass'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            $eventYear = $eventDb->query('SELECT MAX(YEAR(COALESCE(tgl_event, tgl_jatuh_tempo))) FROM vw_events_dashboard')->fetchColumn();
            if ($eventYear) $availableYears[] = (int) $eventYear;
        } catch (PDOException) {
        }
    }
    $year = $availableYears ? max($availableYears) : (int) date('Y');
}
$branchRows = $db->query('SELECT id, name FROM branches ORDER BY name')->fetchAll();
$branchNames = [];
$branchIdsByName = [];
foreach ($branchRows as $branch) {
    $branchId = (int) $branch['id'];
    $branchName = trim((string) $branch['name']);
    $branchNames[$branchId] = $branchName;
    $branchIdsByName[strtolower($branchName)] = $branchId;
}

$customerName = null;
$customerBranchId = null;
if (!$isCentral && $scope['role'] === 'admin_cabang' && $scope['branch_id'] === null) {
    respond(['success' => false, 'message' => 'Akun belum memiliki cabang. Hubungi admin pusat.'], 403);
}

$visibleBranchIds = $isCentral ? array_keys($branchNames) : [(int) $scope['branch_id']];
$byBranch = [];
foreach ($visibleBranchIds as $branchId) {
    if (!isset($branchNames[$branchId])) continue;
    $byBranch[$branchId] = [
        'branch' => $branchNames[$branchId],
        'invoice_count' => 0,
        'invoiced' => 0.0,
        'collected' => 0.0,
        'outstanding' => 0.0,
    ];
}
$addTotals = static function (int $branchId, array $row) use (&$byBranch): void {
    if (!isset($byBranch[$branchId])) return;
    $byBranch[$branchId]['invoice_count'] += (int) ($row['invoice_count'] ?? 0);
    $byBranch[$branchId]['invoiced'] += (float) ($row['invoiced'] ?? 0);
    $byBranch[$branchId]['collected'] += (float) ($row['collected'] ?? 0);
    $byBranch[$branchId]['outstanding'] += (float) ($row['outstanding'] ?? 0);
};
$addCollected = static function (int $branchId, float $amount) use (&$byBranch): void {
    if (isset($byBranch[$branchId])) $byBranch[$branchId]['collected'] += $amount;
};

$masterSql = 'SELECT r.branch_id, COUNT(*) AS invoice_count,
                     COALESCE(SUM(r.total_amount), 0) AS invoiced,
                     0 AS collected,
                     COALESCE(SUM(r.balance), 0) AS outstanding
              FROM receivables r WHERE YEAR(r.invoice_date) = :year';
$masterParams = ['year' => $year];
if (!$isCentral) {
    $masterSql .= ' AND r.branch_id = :branch_id';
    $masterParams['branch_id'] = (int) $scope['branch_id'];
}
$masterSql .= ' GROUP BY r.branch_id';
$masterStatement = $db->prepare($masterSql);
$masterStatement->execute($masterParams);
foreach ($masterStatement->fetchAll() as $row) $addTotals((int) $row['branch_id'], $row);
$paymentSql = 'SELECT r.branch_id, COALESCE(SUM(p.amount), 0) AS collected FROM payments p JOIN receivables r ON r.id = p.receivable_id WHERE YEAR(p.payment_date) = :year';
$paymentParams = ['year' => $year];
if (!$isCentral) {
    $paymentSql .= ' AND r.branch_id = :branch_id';
    $paymentParams['branch_id'] = (int) $scope['branch_id'];
}
$paymentSql .= ' GROUP BY r.branch_id';
$paymentStatement = $db->prepare($paymentSql);
$paymentStatement->execute($paymentParams);
foreach ($paymentStatement->fetchAll() as $row) $addCollected((int) $row['branch_id'], (float) $row['collected']);

$config = require __DIR__ . '/config.php';
$warnings = [];
$branchDatabaseConfig = [
    'bali' => ['database' => (string) ($config['events_bali_db_name'] ?? 'events_bali')],
    'bandung' => ['database' => (string) ($config['events_bandung_db_name'] ?? 'events_bandung')],
];
$canSeeBranch = static function (int $branchId) use ($isCentral, $scope): bool {
    if ($isCentral) return true;
    return $scope['role'] === 'admin_cabang' && (int) $scope['branch_id'] === $branchId;
};
$aggregateEventDatabase = static function (string $databaseName, int $branchId) use ($config, $year, $addTotals, &$warnings): void {
    try {
        $eventDb = new PDO(
            sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $databaseName),
            $config['db_user'],
            $config['db_pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        $sql = 'SELECT COUNT(*) AS invoice_count, COALESCE(SUM(nilai_kontrak), 0) AS invoiced,
                       COALESCE(SUM(total_dibayar), 0) AS collected, COALESCE(SUM(piutang), 0) AS outstanding
                FROM vw_events_dashboard WHERE YEAR(COALESCE(tgl_event, tgl_jatuh_tempo)) = :year';
        $params = ['year' => $year];
        $statement = $eventDb->prepare($sql);
        $statement->execute($params);
        $addTotals($branchId, $statement->fetch() ?: []);
    } catch (PDOException) {
        $warnings[] = ucfirst($databaseName) . ': data laporan cabang belum tersedia.';
    }
};

$palembangId = $branchIdsByName['palembang'] ?? null;
if ($palembangId !== null && $canSeeBranch($palembangId)) {
    try {
        if (!$db->query("SHOW TABLES LIKE 'palembang_events'")->fetchColumn()) {
            $warnings[] = 'Palembang: tabel event belum tersedia.';
        } else {
            $sql = 'SELECT COUNT(*) AS invoice_count, COALESCE(SUM(nilai_kontrak), 0) AS invoiced,
                           COALESCE(SUM(total_dibayar), 0) AS collected, COALESCE(SUM(piutang), 0) AS outstanding
                    FROM palembang_events WHERE YEAR(COALESCE(tgl_event, tgl_jatuh_tempo)) = :year';
            $params = ['year' => $year];
            $statement = $db->prepare($sql);
            $statement->execute($params);
            $addTotals($palembangId, $statement->fetch() ?: []);
        }
    } catch (PDOException) {
        $warnings[] = 'Palembang: laporan event belum dapat dimuat.';
    }
}

foreach ($branchDatabaseConfig as $branchKey => $branchConfig) {
    $branchId = $branchIdsByName[$branchKey] ?? null;
    if ($branchId === null || !$canSeeBranch($branchId)) continue;
    $aggregateEventDatabase($branchConfig['database'], $branchId);
}

$summary = ['invoice_count' => 0, 'invoiced' => 0.0, 'collected' => 0.0, 'outstanding' => 0.0];
foreach ($byBranch as $row) {
    foreach ($summary as $key => $_) $summary[$key] += $row[$key];
}
respond([
    'success' => true,
    'year' => $year,
    'summary' => $summary,
    'by_branch' => array_values($byBranch),
    'scope' => $isCentral ? 'all' : 'branch',
    'warnings' => array_values(array_unique($warnings)),
]);
