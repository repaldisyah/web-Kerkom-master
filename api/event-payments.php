<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$scope = require_operational_user();
$branch = strtolower(trim((string) ($_GET['branch'] ?? '')));
$config = require __DIR__ . '/config.php';
$branches = [
    'bali' => ['database' => (string) ($config['events_bali_db_name'] ?? 'events_bali'), 'branch_id' => (int) ($config['events_bali_branch_id'] ?? 2), 'prefix' => 'B'],
    'bandung' => ['database' => (string) ($config['events_bandung_db_name'] ?? 'events_bandung'), 'branch_id' => (int) ($config['events_bandung_branch_id'] ?? 3), 'prefix' => 'BD'],
];
if (!isset($branches[$branch])) respond(['success' => false, 'message' => 'Cabang pembayaran tidak valid.'], 422);
$branchConfig = $branches[$branch];
require_branch_access($scope, $branchConfig['branch_id']);

try {
    $db = new PDO(
        sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $branchConfig['database']),
        $config['db_user'],
        $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (PDOException) {
    respond(['success' => false, 'message' => 'Database cabang belum siap. Periksa konfigurasi dan jalankan migrasi riwayat pembayaran.'], 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    try {
        $eventId = trim((string) ($_GET['event_id'] ?? ''));
        if ($eventId !== '') {
            $query = $db->prepare('SELECT id, event_id, event_name AS event, customer_name AS customer, payment_date, amount, payment_method, payment_token, note, record_type FROM event_payments WHERE event_id = :event_id ORDER BY payment_date DESC, id DESC');
            $query->execute(['event_id' => $eventId]);
        } else {
            $query = $db->query('SELECT id, event_id, event_name AS event, customer_name AS customer, payment_date, amount, payment_method, payment_token, note, record_type FROM event_payments ORDER BY payment_date DESC, id DESC');
        }
        respond(['success' => true, 'branch' => $branch, 'payments' => $query->fetchAll()]);
    } catch (PDOException) {
        respond(['success' => false, 'message' => 'Tabel riwayat pembayaran cabang belum tersedia. Jalankan database/migration_add_branch_payment_history.sql.'], 500);
    }
}

if ($method !== 'POST') respond(['success' => false, 'message' => 'Metode tidak didukung.'], 405);
$data = request_data();
$eventId = trim((string) ($data['event_id'] ?? ''));
$amount = is_numeric($data['amount'] ?? null) ? (float) $data['amount'] : 0.0;
$paymentDate = trim((string) ($data['payment_date'] ?? date('Y-m-d')));
$paymentMethod = trim((string) ($data['payment_method'] ?? 'Manual'));
$note = trim((string) ($data['note'] ?? ''));
$allowedMethods = ['QRIS', 'BRI', 'BCA', 'SEABANK', 'PAYPAL', 'Tunai', 'Transfer', 'Manual'];
$parsedDate = DateTime::createFromFormat('Y-m-d', $paymentDate);
if ($eventId === '' || !is_finite($amount) || $amount <= 0 || !$parsedDate || $parsedDate->format('Y-m-d') !== $paymentDate || !in_array($paymentMethod, $allowedMethods, true) || strlen($note) > 255) {
    respond(['success' => false, 'message' => 'Event, tanggal, nominal, dan metode pembayaran wajib valid.'], 422);
}

$db->beginTransaction();
try {
    $query = $db->prepare('SELECT id, nama_event, pelanggan, total_dibayar, (hpp_rab + margin) AS contract_total FROM events WHERE id = :id FOR UPDATE');
    $query->execute(['id' => $eventId]);
    $event = $query->fetch();
    if (!$event) throw new RuntimeException('Event tidak ditemukan.');
    $balance = (float) $event['contract_total'] - (float) $event['total_dibayar'];
    if ($balance <= 0 || $amount > $balance) throw new RuntimeException('Nominal melebihi sisa piutang event.');

    $token = 'NK-' . $branchConfig['prefix'] . '-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
    $insert = $db->prepare('INSERT INTO event_payments (event_id, event_name, customer_name, payment_date, amount, payment_method, payment_token, note) VALUES (:event_id, :event_name, :customer_name, :payment_date, :amount, :payment_method, :payment_token, :note)');
    $insert->execute([
        'event_id' => $eventId,
        'event_name' => $event['nama_event'],
        'customer_name' => $event['pelanggan'],
        'payment_date' => $paymentDate,
        'amount' => $amount,
        'payment_method' => $paymentMethod,
        'payment_token' => $token,
        'note' => $note !== '' ? $note : null,
    ]);
    $update = $db->prepare('UPDATE events SET total_dibayar = total_dibayar + :amount WHERE id = :id');
    $update->execute(['amount' => $amount, 'id' => $eventId]);
    $db->commit();
    respond(['success' => true, 'message' => 'Pembayaran berhasil dicatat.', 'payment' => [
        'payment_token' => $token,
        'payment_date' => $paymentDate,
        'amount' => $amount,
        'payment_method' => $paymentMethod,
        'note' => $note,
        'customer' => $event['pelanggan'],
        'branch' => ucfirst($branch),
        'event' => $event['nama_event'],
    ]]);
} catch (RuntimeException $error) {
    if ($db->inTransaction()) $db->rollBack();
    respond(['success' => false, 'message' => $error->getMessage()], 422);
} catch (Throwable) {
    if ($db->inTransaction()) $db->rollBack();
    respond(['success' => false, 'message' => 'Pembayaran tidak dapat dicatat. Periksa apakah migrasi riwayat sudah dijalankan.'], 500);
}
