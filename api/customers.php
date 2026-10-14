<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$scope = current_scope();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = database();
if ($method !== 'GET') {
    if (!in_array($scope['role'], ['admin_pusat', 'super_admin'], true)) respond(['success' => false, 'message' => 'Hanya admin pusat yang dapat mengubah profil pelanggan.'], 403);
    if (!in_array($method, ['POST', 'PUT', 'DELETE'], true)) respond(['success' => false, 'message' => 'Metode tidak didukung.'], 405);
    $data = request_data();
    $id = filter_var($_GET['id'] ?? $data['id'] ?? null, FILTER_VALIDATE_INT);
    if ($method === 'DELETE') {
        if (!$id) respond(['success' => false, 'message' => 'ID pelanggan wajib valid.'], 422);
        try { $delete = $db->prepare('DELETE FROM customers WHERE id = :id'); $delete->execute(['id' => $id]); if (!$delete->rowCount()) respond(['success' => false, 'message' => 'Pelanggan tidak ditemukan.'], 404); respond(['success' => true, 'message' => 'Profil pelanggan berhasil dihapus.']); }
        catch (PDOException) { respond(['success' => false, 'message' => 'Profil masih memiliki akun, event, atau tagihan. Hapus atau pindahkan data terkait terlebih dahulu.'], 409); }
    }
    $name = trim((string) ($data['name'] ?? ''));
    $branchId = filter_var($data['branch_id'] ?? null, FILTER_VALIDATE_INT);
    $email = trim((string) ($data['email'] ?? '')); $phone = trim((string) ($data['phone'] ?? '')); $address = trim((string) ($data['address'] ?? ''));
    if ($name === '' || mb_strlen($name) > 150 || !$branchId || $branchId < 1 || ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150)) || mb_strlen($phone) > 30) respond(['success' => false, 'message' => 'Nama, cabang, email, atau telepon tidak valid.'], 422);
    $branch = $db->prepare('SELECT id FROM branches WHERE id = :id'); $branch->execute(['id' => $branchId]);
    if (!$branch->fetch()) respond(['success' => false, 'message' => 'Cabang tidak ditemukan.'], 422);
    $values = ['branch_id' => $branchId, 'name' => $name, 'email' => $email ?: null, 'phone' => $phone ?: null, 'address' => $address ?: null];
    if ($method === 'POST') { $save = $db->prepare('INSERT INTO customers (branch_id, name, email, phone, address) VALUES (:branch_id, :name, :email, :phone, :address)'); $save->execute($values); respond(['success' => true, 'message' => 'Pelanggan berhasil ditambahkan.', 'id' => (int) $db->lastInsertId()], 201); }
    if (!$id) respond(['success' => false, 'message' => 'ID pelanggan wajib valid.'], 422);
    $values['id'] = $id; $save = $db->prepare('UPDATE customers SET branch_id=:branch_id, name=:name, email=:email, phone=:phone, address=:address WHERE id=:id'); $save->execute($values);
    respond(['success' => true, 'message' => $save->rowCount() ? 'Profil pelanggan berhasil diperbarui.' : 'Tidak ada perubahan pada profil pelanggan.']);
}
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
$statement = $db->prepare($sql);
$statement->execute($params);
respond(['success' => true, 'customers' => $statement->fetchAll(), 'scope' => $scope['role']]);
