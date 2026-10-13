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

$statement = $db->prepare("SELECT r.id, c.name AS customer, b.name AS branch, e.name AS event, r.due_date, r.total_amount, r.balance, r.status FROM receivables r JOIN customers c ON c.id = r.customer_id JOIN branches b ON b.id = r.branch_id JOIN events e ON e.id = r.event_id WHERE r.balance > 0$filter ORDER BY r.due_date ASC, r.id ASC");
$statement->execute($parameters);
respond(['success' => true, 'receivables' => $statement->fetchAll(), 'scope' => $isCustomer ? 'customer' : ($isCentral ? 'all' : 'branch')]);