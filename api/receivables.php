<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(['success' => false, 'message' => 'Metode harus GET.'], 405);
}

$db = database();
$isSuperAdmin = ($_SESSION['user_role'] ?? '') === 'super_admin';
$branchId = $_SESSION['user_branch_id'] ?? null;
if (!$isSuperAdmin && $branchId === null) {
    respond(['success' => false, 'message' => 'Akun belum memiliki cabang. Hubungi admin pusat.'], 403);
}
$filter = $isSuperAdmin ? '' : ' AND r.branch_id = :branch_id';
$parameters = $isSuperAdmin ? [] : ['branch_id' => (int) $branchId];

$statement = $db->prepare("SELECT r.id, c.name AS customer, b.name AS branch, e.name AS event, r.due_date, r.total_amount, r.balance, r.status FROM receivables r JOIN customers c ON c.id = r.customer_id JOIN branches b ON b.id = r.branch_id JOIN events e ON e.id = r.event_id WHERE r.balance > 0$filter ORDER BY r.due_date ASC, r.id ASC");
$statement->execute($parameters);
respond(['success' => true, 'receivables' => $statement->fetchAll()]);
