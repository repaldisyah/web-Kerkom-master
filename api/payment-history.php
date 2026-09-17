<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(['success' => false, 'message' => 'Metode harus GET.'], 405);
}

$scope = current_scope();
$tokenColumn = has_payment_token_column() ? 'p.payment_token' : "CONCAT('PM-', p.id) AS payment_token";
$methodColumn = has_payment_method_column() ? 'p.payment_method' : "'Manual' AS payment_method";
$noteColumn = has_payment_note_column() ? 'p.note' : 'NULL AS note';
$sql = "SELECT p.id, $tokenColumn, p.payment_date, p.amount, $methodColumn, $noteColumn, c.name AS customer, b.name AS branch, e.name AS event FROM payments p JOIN receivables r ON r.id = p.receivable_id JOIN customers c ON c.id = r.customer_id JOIN branches b ON b.id = r.branch_id JOIN events e ON e.id = r.event_id";
$params = [];
if ($scope['role'] === 'admin_cabang') {
    if (!$scope['branch_id']) respond(['success' => false, 'message' => 'Akun belum memiliki cabang.'], 403);
    $sql .= ' WHERE r.branch_id = :branch_id';
    $params['branch_id'] = $scope['branch_id'];
} elseif ($scope['role'] === 'pelanggan') {
    if (!$scope['customer_id']) respond(['success' => false, 'message' => 'Akun pelanggan belum terhubung ke data pelanggan.'], 403);
    $sql .= ' WHERE r.customer_id = :customer_id';
    $params['customer_id'] = $scope['customer_id'];
}
$sql .= ' ORDER BY p.payment_date DESC, p.id DESC';
$statement = database()->prepare($sql);
$statement->execute($params);
respond(['success' => true, 'payments' => $statement->fetchAll(), 'scope' => $scope['role']]);
