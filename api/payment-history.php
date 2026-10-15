<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(['success' => false, 'message' => 'Metode harus GET.'], 405);
}

$scope = current_scope();
$db = database();
$isCentral = in_array($scope['role'], ['admin_pusat', 'super_admin'], true);
$requestedBranch = strtolower(trim((string) ($_GET['branch'] ?? '')));
$branchFilterId = null;
$warnings = [];
if ($requestedBranch !== '') {
    if ($scope['role'] === 'pelanggan') respond(['success' => false, 'message' => 'Filter cabang tidak tersedia untuk akun pelanggan.'], 403);
    $branchQuery = $db->prepare('SELECT id, name FROM branches WHERE LOWER(name) = :name LIMIT 1');
    $branchQuery->execute(['name' => $requestedBranch]);
    $requestedBranchRow = $branchQuery->fetch();
    if (!$requestedBranchRow) respond(['success' => false, 'message' => 'Cabang tidak ditemukan.'], 422);
    $branchFilterId = (int) $requestedBranchRow['id'];
    if ($scope['role'] === 'admin_cabang' && $branchFilterId !== (int) $scope['branch_id']) {
        respond(['success' => false, 'message' => 'Anda hanya dapat melihat riwayat cabang sendiri.'], 403);
    }
}

$tokenColumn = has_payment_token_column() ? 'p.payment_token' : "CONCAT('PM-', p.id)";
$methodColumn = has_payment_method_column() ? 'p.payment_method' : "'Manual'";
$noteColumn = has_payment_note_column() ? 'p.note' : 'NULL';
$recordTypeColumn = has_payment_record_type_column() ? 'p.record_type' : "'payment'";
$sql = "SELECT p.id AS transaction_id, $tokenColumn AS payment_token, p.payment_date, p.amount, $methodColumn AS payment_method, $noteColumn AS note, $recordTypeColumn AS record_type, c.name AS customer, b.name AS branch, e.name AS event, r.total_amount, r.balance, r.status FROM payments p JOIN receivables r ON r.id = p.receivable_id JOIN customers c ON c.id = r.customer_id JOIN branches b ON b.id = r.branch_id JOIN events e ON e.id = r.event_id";
$params = [];
if ($scope['role'] === 'admin_cabang') {
    if (!$scope['branch_id']) respond(['success' => false, 'message' => 'Akun belum memiliki cabang.'], 403);
    $sql .= ' WHERE r.branch_id = :branch_id';
    $params['branch_id'] = (int) $scope['branch_id'];
} elseif ($scope['role'] === 'pelanggan') {
    if (!$scope['customer_id']) respond(['success' => false, 'message' => 'Akun pelanggan belum terhubung ke data pelanggan.'], 403);
    $sql .= ' WHERE r.customer_id = :customer_id';
    $params['customer_id'] = (int) $scope['customer_id'];
} elseif ($branchFilterId !== null) {
    $sql .= ' WHERE r.branch_id = :branch_id';
    $params['branch_id'] = $branchFilterId;
}
$statement = $db->prepare($sql);
$statement->execute($params);
$payments = $statement->fetchAll();

$branchRows = $db->query('SELECT id, name FROM branches')->fetchAll();
$branchNames = [];
foreach ($branchRows as $row) $branchNames[(int) $row['id']] = strtolower(trim((string) $row['name']));
$customerName = null;
$customerBranchId = null;
if ($scope['role'] === 'pelanggan') {
    $profile = $db->prepare('SELECT c.name, c.branch_id FROM customers c JOIN users u ON u.customer_id = c.id WHERE u.id = :user_id AND u.customer_id = :customer_id AND u.role = \'pelanggan\' LIMIT 1');
    $profile->execute(['user_id' => $scope['user_id'], 'customer_id' => $scope['customer_id']]);
    $profileRow = $profile->fetch();
    if (!$profileRow) respond(['success' => false, 'message' => 'Profil pelanggan akun ini tidak ditemukan.'], 403);
    $customerName = (string) $profileRow['name'];
    $customerBranchId = (int) $profileRow['branch_id'];
}
$config = require __DIR__ . '/config.php';
$eventDatabases = [
    'bali' => ['database' => (string) ($config['events_bali_db_name'] ?? 'events_bali'), 'branch_id' => (int) ($config['events_bali_branch_id'] ?? 2)],
    'bandung' => ['database' => (string) ($config['events_bandung_db_name'] ?? 'events_bandung'), 'branch_id' => (int) ($config['events_bandung_branch_id'] ?? 3)],
];

    $palembangId = null;
    foreach ($branchNames as $id => $name) if ($name === 'palembang') $palembangId = $id;
    $canSeePalembang = $isCentral && ($branchFilterId === null || $branchFilterId === $palembangId)
        || $scope['role'] === 'admin_cabang' && (int) $scope['branch_id'] === $palembangId
        || $scope['role'] === 'pelanggan' && $customerBranchId === $palembangId;
    if ($palembangId !== null && $canSeePalembang) {
        try {
            if ($db->query("SHOW TABLES LIKE 'palembang_payments'")->fetchColumn()) {
                $hasRecordType = (bool) $db->query("SHOW COLUMNS FROM palembang_payments LIKE 'record_type'")->fetch();
                $recordTypeColumn = $hasRecordType ? 'p.record_type' : "'payment'";
                $hasSnapshot = (bool) $db->query("SHOW COLUMNS FROM palembang_payments LIKE 'event_name'")->fetch();
                $join = $hasSnapshot ? 'LEFT JOIN palembang_events e ON e.id = p.event_id' : 'JOIN palembang_events e ON e.id = p.event_id';
                $snapshotColumns = $hasSnapshot ? 'COALESCE(p.customer_name, e.pelanggan)' : 'e.pelanggan';
                $snapshotEvent = $hasSnapshot ? 'COALESCE(p.event_name, e.nama_event)' : 'e.nama_event';
                $sql = "SELECT p.id AS transaction_id, p.payment_token, p.payment_date, p.amount, p.payment_method, p.note, $snapshotColumns AS customer, 'Palembang' AS branch, $snapshotEvent AS event, $recordTypeColumn AS record_type FROM palembang_payments p $join";
                $params = [];
                if ($scope['role'] === 'pelanggan') {
                    $sql .= " WHERE $snapshotColumns = :customer_name";
                    $params['customer_name'] = $customerName;
                }
                $query = $db->prepare($sql);
                $query->execute($params);
                if (!$hasRecordType) $warnings[] = 'Palembang: jalankan migrasi riwayat untuk menampilkan saldo historis.';
                $payments = array_merge($payments, $query->fetchAll());
            }
        } catch (PDOException) {
            $warnings[] = 'Palembang: struktur tabel riwayat belum lengkap; jalankan migrasi riwayat pembayaran.';
        }
    }

    foreach ($eventDatabases as $branch => $eventConfig) {
        $allowed = $isCentral ? ($branchFilterId === null || $branchFilterId === $eventConfig['branch_id'])
            : ($scope['role'] === 'admin_cabang' && (int) $scope['branch_id'] === $eventConfig['branch_id'])
                || ($scope['role'] === 'pelanggan' && $customerBranchId === $eventConfig['branch_id']);
        if (!$allowed) continue;
        try {
            $eventDb = new PDO(
                sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $eventConfig['database']),
                $config['db_user'],
                $config['db_pass'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
            );
            if (!$eventDb->query("SHOW TABLES LIKE 'event_payments'")->fetchColumn()) {
                $warnings[] = ucfirst($branch) . ': jalankan migrasi riwayat pembayaran.';
                continue;
            }
            $sql = "SELECT id AS transaction_id, payment_token, payment_date, amount, payment_method, note, customer_name AS customer, event_name AS event, record_type FROM event_payments";
            $params = [];
            if ($scope['role'] === 'pelanggan') {
                $sql .= ' WHERE customer_name = :customer_name';
                $params['customer_name'] = $customerName;
            }
            $query = $eventDb->prepare($sql);
            $query->execute($params);
            foreach ($query->fetchAll() as $payment) {
                $payment['branch'] = ucfirst($branch);
                $payments[] = $payment;
            }
        } catch (PDOException) {
            $warnings[] = ucfirst($branch) . ': database riwayat belum dapat diakses.';
        }
    }
usort($payments, static function (array $a, array $b): int {
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

respond(['success' => true, 'payments' => $payments, 'scope' => $scope['role'], 'warnings' => $warnings]);
