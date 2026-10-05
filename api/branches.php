<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(['success' => false, 'message' => 'Metode harus GET.'], 405);
}

$scope = current_scope();
if ($scope['role'] === 'pelanggan') {
    respond(['success' => false, 'message' => 'Akun pelanggan tidak memiliki akses data cabang.'], 403);
}
if ($scope['role'] === 'admin_cabang' && !$scope['branch_id']) {
    respond(['success' => false, 'message' => 'Akun belum memiliki cabang.'], 403);
}

$sql = 'SELECT b.id, b.name, b.city, (SELECT COUNT(*) FROM customers c WHERE c.branch_id = b.id) AS customer_count, (SELECT COUNT(*) FROM events e WHERE e.branch_id = b.id) AS event_count, (SELECT COALESCE(SUM(r.balance), 0) FROM receivables r WHERE r.branch_id = b.id) AS receivables FROM branches b';
$params = [];
$sql .= ' ORDER BY b.name';
$statement = database()->prepare($sql);
$statement->execute($params);

$branches = $statement->fetchAll();
// Cabang lain hanya tampil sebagai ringkasan, tanpa daftar pelanggan/event atau rincian transaksi.
respond(['success' => true, 'branches' => $branches, 'scope' => $scope['role'], 'own_branch_id' => $scope['branch_id']]);
