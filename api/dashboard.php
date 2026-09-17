<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
$userId = require_login();

$db = database();
$isSuperAdmin = ($_SESSION['user_role'] ?? '') === 'super_admin';
$branchId = $_SESSION['user_branch_id'] ?? null;

if (!$isSuperAdmin && $branchId === null) {
	respond(['success' => false, 'message' => 'Akun belum memiliki cabang. Hubungi admin pusat.'], 403);
}

$filter = $isSuperAdmin ? '' : ' WHERE r.branch_id = :branch_id';
$parameters = $isSuperAdmin ? [] : ['branch_id' => (int) $branchId];

$summaryStatement = $db->prepare("SELECT COALESCE(SUM(balance), 0) AS total_receivables, COALESCE(SUM(CASE WHEN status = 'unpaid' THEN balance ELSE 0 END), 0) AS unpaid, COALESCE(SUM(CASE WHEN due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND balance > 0 THEN balance ELSE 0 END), 0) AS near_due, COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) AS paid FROM receivables r$filter");
$summaryStatement->execute($parameters);
$summary = $summaryStatement->fetch();

$branchFilter = $isSuperAdmin ? '' : ' WHERE b.id = :branch_id';
$branchesStatement = $db->prepare("SELECT b.id, b.name, COALESCE(SUM(r.balance), 0) AS receivables, COUNT(DISTINCT r.customer_id) AS customer_count FROM branches b LEFT JOIN receivables r ON r.branch_id = b.id$branchFilter GROUP BY b.id, b.name ORDER BY b.name");
$branchesStatement->execute($parameters);
$branches = $branchesStatement->fetchAll();

$recentStatement = $db->prepare("SELECT r.id, c.name AS customer, b.name AS branch, e.name AS event, r.invoice_date, r.total_amount, r.balance, r.due_date, r.status FROM receivables r JOIN customers c ON c.id = r.customer_id JOIN branches b ON b.id = r.branch_id JOIN events e ON e.id = r.event_id$filter ORDER BY r.invoice_date DESC, r.id DESC LIMIT 10");
$recentStatement->execute($parameters);
$recent = $recentStatement->fetchAll();

respond(['success' => true, 'summary' => $summary, 'branches' => $branches, 'recent_receivables' => $recent, 'scope' => $isSuperAdmin ? 'all' : 'branch', 'user_id' => $userId]);
