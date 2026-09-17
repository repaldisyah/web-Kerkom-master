<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(['success' => false, 'message' => 'Metode harus GET.'], 405);
}

$scope = current_scope();
$sql = 'SELECT c.id, c.name, c.email, c.phone, c.address, b.name AS branch, (SELECT COUNT(*) FROM events e WHERE e.customer_id = c.id) AS event_count, (SELECT COALESCE(SUM(r.balance), 0) FROM receivables r WHERE r.customer_id = c.id) AS outstanding_balance FROM customers c JOIN branches b ON b.id = c.branch_id';
$params = [];
if ($scope['role'] === 'admin_cabang') {
    if (!$scope['branch_id']) respond(['success' => false, 'message' => 'Akun belum memiliki cabang.'], 403);
    $sql .= ' WHERE c.branch_id = :branch_id';
    $params['branch_id'] = $scope['branch_id'];
} elseif ($scope['role'] === 'pelanggan') {
    if (!$scope['customer_id']) respond(['success' => false, 'message' => 'Akun pelanggan belum terhubung ke data pelanggan.'], 403);
    $sql .= ' WHERE c.id = :customer_id';
    $params['customer_id'] = $scope['customer_id'];
}
$sql .= ' ORDER BY c.name';
$statement = database()->prepare($sql);
$statement->execute($params);
respond(['success' => true, 'customers' => $statement->fetchAll(), 'scope' => $scope['role']]);
