<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(['success' => false, 'message' => 'Metode harus GET.'], 405);
}

$scope = current_scope();
if ($scope['role'] === 'pelanggan') {
    respond(['success' => false, 'message' => 'Laporan tahunan hanya tersedia untuk akun operasional.'], 403);
}
$year = filter_input(INPUT_GET, 'year', FILTER_VALIDATE_INT) ?: (int) date('Y');
if ($year < 2020 || $year > 2100) respond(['success' => false, 'message' => 'Tahun tidak valid.'], 422);

$filter = ' WHERE YEAR(r.invoice_date) = :year';
$params = ['year' => $year];
if ($scope['role'] === 'admin_cabang') {
    if (!$scope['branch_id']) respond(['success' => false, 'message' => 'Akun belum memiliki cabang.'], 403);
    $filter .= ' AND r.branch_id = :branch_id';
    $params['branch_id'] = $scope['branch_id'];
}
$db = database();
$summary = $db->prepare("SELECT COUNT(*) AS invoice_count, COALESCE(SUM(r.total_amount), 0) AS invoiced, COALESCE(SUM(r.balance), 0) AS outstanding, COALESCE(SUM(r.total_amount - r.balance), 0) AS collected FROM receivables r$filter");
$summary->execute($params);
$byBranch = $db->prepare("SELECT b.name AS branch, COUNT(r.id) AS invoice_count, COALESCE(SUM(r.total_amount), 0) AS invoiced, COALESCE(SUM(r.total_amount - r.balance), 0) AS collected, COALESCE(SUM(r.balance), 0) AS outstanding FROM branches b LEFT JOIN receivables r ON r.branch_id = b.id AND YEAR(r.invoice_date) = :year" . ($scope['role'] === 'admin_cabang' ? ' WHERE b.id = :branch_id' : '') . ' GROUP BY b.id, b.name ORDER BY b.name');
$byBranch->execute($params);
respond(['success' => true, 'year' => $year, 'summary' => $summary->fetch(), 'by_branch' => $byBranch->fetchAll(), 'scope' => $scope['role']]);
