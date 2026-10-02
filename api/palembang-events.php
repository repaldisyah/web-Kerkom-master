<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$scope = require_operational_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = database();
$branchQuery = $db->prepare('SELECT id FROM branches WHERE name = :name LIMIT 1');
$branchQuery->execute(['name' => 'Palembang']);
$palembangBranchId = $branchQuery->fetchColumn();
if ($palembangBranchId === false) {
    respond(['success' => false, 'message' => 'Data cabang Palembang tidak ditemukan di database.'], 500);
}
require_branch_access($scope, (int) $palembangBranchId);

if ($method === 'GET') {
    $events = $db->query("SELECT id, nama_event, skala, jenis_acara, tgl_event, lokasi, pelanggan, jenis_pihak, hpp_rab, margin_persen, nilai_kontrak, dp, termin_2, pelunasan, total_dibayar, piutang, status_sumber, sumber_data, tgl_jatuh_tempo,
        CASE WHEN piutang <= 0 THEN 'Lunas' WHEN tgl_jatuh_tempo < CURDATE() THEN 'Menunggak' ELSE 'Belum Lunas' END AS status_terkini,
        CASE WHEN piutang > 0 AND tgl_jatuh_tempo < CURDATE() THEN DATEDIFF(CURDATE(), tgl_jatuh_tempo) ELSE 0 END AS hari_terlambat
        FROM palembang_events ORDER BY tgl_jatuh_tempo, id")->fetchAll();
    $summary = $db->query("SELECT COUNT(*) AS jumlah_event, COALESCE(SUM(nilai_kontrak),0) AS total_kontrak, COALESCE(SUM(total_dibayar),0) AS total_dibayar, COALESCE(SUM(piutang),0) AS total_piutang, SUM(CASE WHEN piutang > 0 AND tgl_jatuh_tempo < CURDATE() THEN 1 ELSE 0 END) AS jumlah_terlambat FROM palembang_events")->fetch();
    respond(['success' => true, 'events' => $events, 'summary' => $summary]);
}

if ($method !== 'POST') {
    respond(['success' => false, 'message' => 'Metode tidak didukung.'], 405);
}

$data = request_data();
$eventId = trim((string) ($data['event_id'] ?? ''));
$rawAmount = $data['amount'] ?? null;
$amount = is_numeric($rawAmount) ? (float) $rawAmount : 0.0;
$paymentMethod = strtoupper(trim((string) ($data['payment_method'] ?? '')));
$note = trim((string) ($data['note'] ?? ''));
$allowedMethods = ['QRIS', 'BRI', 'BCA', 'SEABANK', 'PAYPAL'];
if ($eventId === '' || !is_finite($amount) || $amount <= 0 || !in_array($paymentMethod, $allowedMethods, true)) {
    respond(['success' => false, 'message' => 'Event, nominal, dan metode pembayaran wajib valid.'], 422);
}
if (strlen($note) > 255) {
    respond(['success' => false, 'message' => 'Catatan maksimal 255 karakter.'], 422);
}

$db->beginTransaction();
try {
    $query = $db->prepare('SELECT id, nama_event, pelanggan, piutang FROM palembang_events WHERE id = :id FOR UPDATE');
    $query->execute(['id' => $eventId]);
    $event = $query->fetch();
    if (!$event) throw new RuntimeException('Event Palembang tidak ditemukan.');
    if ((float) $event['piutang'] <= 0 || $amount > (float) $event['piutang']) {
        throw new RuntimeException('Nominal pembayaran melebihi sisa piutang atau piutang sudah lunas.');
    }

    $token = 'NK-P-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
    $insert = $db->prepare('INSERT INTO palembang_payments (event_id, payment_date, amount, payment_method, payment_token, note) VALUES (:event_id, CURDATE(), :amount, :payment_method, :payment_token, :note)');
    $insert->execute(['event_id' => $eventId, 'amount' => $amount, 'payment_method' => $paymentMethod, 'payment_token' => $token, 'note' => $note !== '' ? $note : null]);

    $update = $db->prepare('UPDATE palembang_events SET total_dibayar = LEAST(nilai_kontrak, total_dibayar + :paid), piutang = GREATEST(0, piutang - :balance), pelunasan = pelunasan + :settlement WHERE id = :id');
    $update->execute(['paid' => $amount, 'balance' => $amount, 'settlement' => $amount, 'id' => $eventId]);
    $db->commit();
    respond(['success' => true, 'message' => 'Pembayaran piutang Palembang berhasil dicatat.', 'receipt' => [
        'token' => $token,
        'payment_date' => date('Y-m-d'),
        'amount' => $amount,
        'payment_method' => $paymentMethod,
        'note' => $note,
        'customer' => $event['pelanggan'],
        'branch' => 'Palembang',
        'event' => $event['nama_event'],
    ]]);
} catch (RuntimeException $error) {
    if ($db->inTransaction()) $db->rollBack();
    respond(['success' => false, 'message' => $error->getMessage()], 422);
} catch (Throwable) {
    if ($db->inTransaction()) $db->rollBack();
    respond(['success' => false, 'message' => 'Pembayaran Palembang tidak dapat diproses. Silakan coba lagi.'], 500);
}