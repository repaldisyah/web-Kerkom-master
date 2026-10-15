<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$scope = current_scope();
$db = database();
$isCentral = in_array($scope['role'], ['admin_pusat', 'super_admin'], true);
$branchId = $scope['branch_id'];
$customerName = null;
$customerBranchId = null;
if ($scope['role'] === 'pelanggan') {
    if (!$scope['customer_id']) respond(['success' => false, 'message' => 'Akun pelanggan tidak terhubung ke profil pelanggan.'], 403);
    $profile = $db->prepare('SELECT c.name, c.branch_id FROM customers c JOIN users u ON u.customer_id = c.id WHERE u.id = :user_id AND u.customer_id = :customer_id AND u.role = \'pelanggan\' LIMIT 1');
    $profile->execute(['user_id' => $scope['user_id'], 'customer_id' => $scope['customer_id']]);
    $profileRow = $profile->fetch();
    if (!$profileRow) respond(['success' => false, 'message' => 'Profil pelanggan akun ini tidak ditemukan.'], 403);
    $customerName = (string) $profileRow['name'];
    $customerBranchId = (int) $profileRow['branch_id'];
}
$params = [];
$where = '';
if ($scope['role'] === 'admin_cabang') {
    if (!$scope['branch_id']) respond(['success' => false, 'message' => 'Akun belum memiliki cabang.'], 403);
    $where = ' WHERE r.branch_id = :branch_id';
    $params['branch_id'] = $scope['branch_id'];
} elseif ($scope['role'] === 'pelanggan') {
    if (!$scope['customer_id']) respond(['success' => false, 'message' => 'Akun pelanggan belum terhubung ke data pelanggan.'], 403);
    $where = ' WHERE r.customer_id = :customer_id';
    $params['customer_id'] = $scope['customer_id'];
}

$paymentRows = [];
$sql = 'SELECT p.id AS transaction_id, p.payment_date, p.amount, ' . (has_payment_method_column() ? 'p.payment_method' : "'Manual' AS payment_method") . ', c.name AS customer, b.name AS branch, e.name AS event, ' . (has_payment_record_type_column() ? 'p.record_type' : "'payment'") . ' AS record_type FROM payments p JOIN receivables r ON r.id = p.receivable_id JOIN customers c ON c.id = r.customer_id JOIN branches b ON b.id = r.branch_id JOIN events e ON e.id = r.event_id' . $where . ' ORDER BY p.payment_date DESC, p.id DESC LIMIT 100';
$statement = $db->prepare($sql);
$statement->execute($params);
$paymentRows = $statement->fetchAll();

// Palembang menyimpan transaksi pada tabel pembayaran terpisah.
    $palembangId = $db->query("SELECT id FROM branches WHERE LOWER(name) = 'palembang' LIMIT 1")->fetchColumn();
    if ($palembangId !== false && ($isCentral || $scope['role'] === 'admin_cabang' && (int) $scope['branch_id'] === (int) $palembangId || $scope['role'] === 'pelanggan' && $customerBranchId === (int) $palembangId)) {
        $palembangTable = $db->query("SHOW TABLES LIKE 'palembang_payments'")->fetchColumn();
        if ($palembangTable) {
            $hasRecordType = (bool) $db->query("SHOW COLUMNS FROM palembang_payments LIKE 'record_type'")->fetch();
            $hasSnapshot = (bool) $db->query("SHOW COLUMNS FROM palembang_payments LIKE 'event_name'")->fetch();
            $method = $hasRecordType ? 'p.record_type' : "'payment' AS record_type";
            if ($hasSnapshot) {
                $paymentSql = "SELECT p.id AS transaction_id, p.payment_date, p.amount, p.payment_method, COALESCE(p.customer_name, e.pelanggan) AS customer, 'Palembang' AS branch, COALESCE(p.event_name, e.nama_event) AS event, $method FROM palembang_payments p LEFT JOIN palembang_events e ON e.id = p.event_id";
            } else {
                $paymentSql = "SELECT p.id AS transaction_id, p.payment_date, p.amount, p.payment_method, e.pelanggan AS customer, 'Palembang' AS branch, e.nama_event AS event, $method FROM palembang_payments p JOIN palembang_events e ON e.id = p.event_id";
            }
            $palembangParams = [];
            if ($scope['role'] === 'pelanggan') {
                $paymentSql .= ' WHERE ' . ($hasSnapshot ? 'COALESCE(p.customer_name, e.pelanggan)' : 'e.pelanggan') . ' = :customer_name';
                $palembangParams['customer_name'] = $customerName;
            }
            $paymentSql .= ' ORDER BY p.payment_date DESC, p.id DESC LIMIT 100';
            $query = $db->prepare($paymentSql);
            $query->execute($palembangParams);
            $paymentRows = array_merge($paymentRows, $query->fetchAll());
        }
    }

    $branchNamesById = [];
    foreach ($db->query('SELECT id, name FROM branches')->fetchAll() as $branchRow) {
        $branchNamesById[(int) $branchRow['id']] = trim((string) $branchRow['name']);
    }
    $config = require __DIR__ . '/config.php';
    foreach ([
        'bali' => ['database' => (string) ($config['events_bali_db_name'] ?? 'events_bali'), 'branch_id' => (int) ($config['events_bali_branch_id'] ?? 2)],
        'bandung' => ['database' => (string) ($config['events_bandung_db_name'] ?? 'events_bandung'), 'branch_id' => (int) ($config['events_bandung_branch_id'] ?? 3)],
    ] as $branchKey => $eventConfig) {
        if (!$isCentral && !($scope['role'] === 'admin_cabang' && (int) $branchId === $eventConfig['branch_id']) && !($scope['role'] === 'pelanggan' && $customerBranchId === $eventConfig['branch_id'])) continue;
        try {
            $eventDb = new PDO(
                sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $eventConfig['database']),
                $config['db_user'],
                $config['db_pass'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
            );
            if (!$eventDb->query("SHOW TABLES LIKE 'event_payments'")->fetchColumn()) continue;
            $paymentSql = "SELECT id AS transaction_id, payment_date, amount, payment_method, customer_name AS customer, event_name AS event, record_type FROM event_payments";
            $paymentParams = [];
            if ($scope['role'] === 'pelanggan') {
                $paymentSql .= ' WHERE customer_name = :customer_name';
                $paymentParams['customer_name'] = $customerName;
            }
            $paymentSql .= ' ORDER BY payment_date DESC, id DESC LIMIT 100';
            $query = $eventDb->prepare($paymentSql);
            $query->execute($paymentParams);
            foreach ($query->fetchAll() as $payment) {
                $payment['branch'] = $branchNamesById[$eventConfig['branch_id']] ?? ucfirst($branchKey);
                $payment['payment_token'] = '';
                $paymentRows[] = $payment;
            }
        } catch (Throwable) {
            // Dashboard tetap dapat menampilkan data cabang lain jika satu database belum tersedia.
        }
    }
usort($paymentRows, static function (array $a, array $b): int {
    $aDate = (string) ($a['payment_date'] ?? '');
    $bDate = (string) ($b['payment_date'] ?? '');
    if ($aDate === '' || $bDate === '') {
        if ($aDate !== $bDate) return $aDate === '' ? 1 : -1;
    } else {
        $dateOrder = strcmp($bDate, $aDate);
        if ($dateOrder !== 0) return $dateOrder;
    }
    return ((int) ($b['transaction_id'] ?? 0)) <=> ((int) ($a['transaction_id'] ?? 0));
});
$actualPaymentRows = array_values(array_filter($paymentRows, static fn (array $row): bool => ($row['record_type'] ?? 'payment') !== 'historical_balance'));
$recentPayments = array_slice($actualPaymentRows, 0, 8);
$customers = [];
foreach ($paymentRows as $payment) {
    $name = trim((string) ($payment['customer'] ?? ''));
    if ($name === '') continue;
    $key = mb_strtolower((string) $payment['branch'] . '|' . $name, 'UTF-8');
    if (!isset($customers[$key])) {
        $customers[$key] = ['customer' => $name, 'branch' => (string) $payment['branch'], 'last_payment_date' => $payment['payment_date'], 'last_payment_amount' => (float) $payment['amount'], 'record_type' => $payment['record_type'] ?? 'payment'];
    }
}
$recentCustomers = array_values($customers);
usort($recentCustomers, static fn (array $a, array $b): int => strcmp((string) $b['last_payment_date'], (string) $a['last_payment_date']));

respond(['success' => true, 'recent_payments' => $recentPayments, 'recent_customers' => array_slice($recentCustomers, 0, 8)]);
