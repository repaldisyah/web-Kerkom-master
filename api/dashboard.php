<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
$userId = require_login();

$config = require __DIR__ . '/config.php';
$db = database();
$isSuperAdmin = in_array($_SESSION['user_role'] ?? '', ['admin_pusat', 'super_admin'], true);
$branchId = $_SESSION['user_branch_id'] ?? null;
if (!$isSuperAdmin && $branchId === null) {
    respond(['success' => false, 'message' => 'Akun belum memiliki cabang. Hubungi admin pusat.'], 403);
}

$branchRows = $db->query('SELECT id, name FROM branches ORDER BY name')->fetchAll();
$branchNames = [];
$branchTotals = [];
$branchCustomers = [];
foreach ($branchRows as $branch) {
    $id = (int) $branch['id'];
    $branchNames[$id] = (string) $branch['name'];
    $branchTotals[$id] = 0.0;
    $branchCustomers[$id] = [];
}

$records = [];
$summary = ['total_receivables' => 0.0, 'unpaid' => 0.0, 'near_due' => 0.0, 'paid' => 0.0];
$today = new DateTimeImmutable('today');
$nearDueLimit = $today->modify('+7 days');

$appendRecord = static function (int $recordBranchId, array $record) use (&$records, &$summary, &$branchTotals, &$branchCustomers, $branchNames, $today, $nearDueLimit): void {
    if (!isset($branchNames[$recordBranchId])) return;
    $total = (float) ($record['total_amount'] ?? 0);
    $balance = max(0.0, (float) ($record['balance'] ?? 0));
    $customer = (string) ($record['customer'] ?? '');
    $dueDate = $record['due_date'] ?? null;
    $paidAmount = max(0.0, $total - $balance);
    $status = $balance <= 0 ? 'paid' : ($paidAmount <= 0 ? 'unpaid' : 'partial');

    $summary['total_receivables'] += $balance;
    if ($status === 'unpaid') $summary['unpaid'] += $balance;
    if ($status === 'paid') $summary['paid'] += $total;
    if ($balance > 0 && $dueDate) {
        try {
            if (new DateTimeImmutable((string) $dueDate) <= $nearDueLimit) $summary['near_due'] += $balance;
        } catch (Exception) {
            // Abaikan tanggal jatuh tempo yang tidak valid, tetapi tetap tampilkan tagihannya.
        }
    }

    $branchTotals[$recordBranchId] += $balance;
    if ($customer !== '') $branchCustomers[$recordBranchId][$customer] = true;
    if ($balance <= 0) return;

    $records[] = [
        'id' => (string) ($record['id'] ?? ''),
        'customer' => $customer,
        'branch' => $branchNames[$recordBranchId],
        'event' => (string) ($record['event'] ?? ''),
        'invoice_date' => $record['invoice_date'] ?? null,
        'total_amount' => $total,
        'balance' => $balance,
        'due_date' => $dueDate,
        'status' => $status,
    ];
};

// Tagihan umum yang tersimpan pada database utama.
$masterSql = 'SELECT r.id, r.branch_id, c.name AS customer, e.name AS event, r.invoice_date,
                     r.total_amount, r.balance, r.due_date
              FROM receivables r
              JOIN customers c ON c.id = r.customer_id
              JOIN events e ON e.id = r.event_id';
$masterParameters = [];
if (!$isSuperAdmin) {
    $masterSql .= ' WHERE r.branch_id = :branch_id';
    $masterParameters['branch_id'] = (int) $branchId;
}
$masterStatement = $db->prepare($masterSql);
$masterStatement->execute($masterParameters);
foreach ($masterStatement->fetchAll() as $record) {
    $appendRecord((int) $record['branch_id'], $record);
}

// Data operasional tiap cabang disimpan dalam tabel event khusus.
$branchIdByName = [];
foreach ($branchNames as $id => $name) $branchIdByName[strtolower(trim($name))] = $id;

$loadEventDatabase = static function (string $databaseName): PDO {
    $settings = require __DIR__ . '/config.php';
    try {
        return new PDO(
            sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $settings['db_host'], $settings['db_port'], $databaseName),
            $settings['db_user'],
            $settings['db_pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    } catch (PDOException) {
        respond(['success' => false, 'message' => 'Database event cabang belum siap: ' . $databaseName . '. Periksa konfigurasi dan impor SQL cabang.'], 500);
    }
};

foreach ([
    'bali' => (string) ($config['events_bali_db_name'] ?? 'events_bali'),
    'bandung' => (string) ($config['events_bandung_db_name'] ?? 'events_bandung'),
] as $branchKey => $databaseName) {
    $eventBranchId = $branchIdByName[$branchKey] ?? null;
    if ($eventBranchId === null || (!$isSuperAdmin && (int) $branchId !== $eventBranchId)) continue;
    $eventDb = $loadEventDatabase($databaseName);
    $events = $eventDb->query('SELECT id, nama_event AS event, pelanggan AS customer, tgl_event AS invoice_date,
                                      nilai_kontrak AS total_amount, piutang AS balance, tgl_jatuh_tempo AS due_date
                               FROM vw_events_dashboard')->fetchAll();
    foreach ($events as $record) $appendRecord((int) $eventBranchId, $record);
}

$palembangBranchId = $branchIdByName['palembang'] ?? null;
if ($palembangBranchId !== null && ($isSuperAdmin || (int) $branchId === $palembangBranchId)) {
    $events = $db->query('SELECT id, nama_event AS event, pelanggan AS customer, tgl_event AS invoice_date,
                                 nilai_kontrak AS total_amount, piutang AS balance, tgl_jatuh_tempo AS due_date
                          FROM palembang_events')->fetchAll();
    foreach ($events as $record) $appendRecord((int) $palembangBranchId, $record);
}

usort($records, static function (array $left, array $right): int {
    $dateOrder = strcmp((string) ($right['invoice_date'] ?? ''), (string) ($left['invoice_date'] ?? ''));
    return $dateOrder !== 0 ? $dateOrder : strcmp($right['id'], $left['id']);
});

$branches = [];
foreach ($branchNames as $id => $name) {
    if (!$isSuperAdmin && (int) $branchId !== $id) continue;
    $branches[] = [
        'id' => $id,
        'name' => $name,
        'receivables' => $branchTotals[$id],
        'customer_count' => count($branchCustomers[$id]),
    ];
}

respond([
    'success' => true,
    'summary' => $summary,
    'branches' => $branches,
    'recent_receivables' => $records,
    'scope' => $isSuperAdmin ? 'all' : 'branch',
    'user_id' => $userId,
]);