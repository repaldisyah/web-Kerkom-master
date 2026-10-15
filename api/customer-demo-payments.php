<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
$scope = current_scope();
if ($scope['role'] !== 'pelanggan' || !$scope['customer_id']) {
    respond(['success' => false, 'message' => 'Simulasi pembayaran hanya tersedia untuk akun pelanggan tertaut.'], 403);
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(['success' => false, 'message' => 'Metode harus POST.'], 405);
}
$data = request_data();
$source = strtolower(trim((string) ($data['source'] ?? '')));
$recordId = trim((string) ($data['record_id'] ?? ''));
$amount = is_numeric($data['amount'] ?? null) ? round((float) $data['amount'], 2) : 0.0;
$method = strtoupper(trim((string) ($data['payment_method'] ?? '')));
$note = trim((string) ($data['note'] ?? ''));
if (!in_array($source, ['master', 'palembang', 'bali', 'bandung'], true) || $recordId === '' || !is_finite($amount) || $amount <= 0 || !in_array($method, ['QRIS', 'BRI', 'BCA', 'SEABANK', 'PAYPAL'], true) || strlen($note) > 220) {
    respond(['success' => false, 'message' => 'Tagihan, nominal, dan metode pembayaran wajib valid.'], 422);
}
$mainDb = database();
$profileQuery = $mainDb->prepare('SELECT c.name, b.name AS branch FROM users u JOIN customers c ON c.id = u.customer_id JOIN branches b ON b.id = c.branch_id WHERE u.id = :user_id AND u.customer_id = :customer_id AND u.role = \'pelanggan\' LIMIT 1');
$profileQuery->execute(['user_id' => $scope['user_id'], 'customer_id' => $scope['customer_id']]);
$profile = $profileQuery->fetch();
if (!$profile) respond(['success' => false, 'message' => 'Profil pelanggan tidak ditemukan.'], 403);
$customerName = (string) $profile['name'];
$profileBranch = strtolower(trim((string) $profile['branch']));
if ($source !== 'master' && $source !== $profileBranch) {
    respond(['success' => false, 'message' => 'Tagihan tidak sesuai dengan cabang akun pelanggan.'], 403);
}
$config = require __DIR__ . '/config.php';
$db = $mainDb;
if (in_array($source, ['bali', 'bandung'], true)) {
    $databaseKey = $source === 'bali' ? 'events_bali_db_name' : 'events_bandung_db_name';
    $databaseName = (string) ($config[$databaseKey] ?? ('events_' . $source));
    try {
        $db = new PDO(sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $databaseName), $config['db_user'], $config['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    } catch (PDOException) {
        respond(['success' => false, 'message' => 'Database cabang belum tersedia.'], 503);
    }
}
$token = 'DEMO-' . strtoupper(bin2hex(random_bytes(8)));
$storedNote = '[SIMULASI DEMO]' . ($note !== '' ? ' ' . $note : '');
$db->beginTransaction();
try {
    if ($source === 'master') {
        $query = $db->prepare('SELECT r.id, r.balance, c.name AS customer, b.name AS branch, e.name AS event FROM receivables r JOIN customers c ON c.id = r.customer_id JOIN branches b ON b.id = r.branch_id JOIN events e ON e.id = r.event_id WHERE r.id = :id AND r.customer_id = :customer_id AND r.balance > 0 FOR UPDATE');
        $query->execute(['id' => $recordId, 'customer_id' => $scope['customer_id']]);
        $invoice = $query->fetch();
        if (!$invoice || $amount > (float) $invoice['balance']) throw new RuntimeException('Tagihan tidak tersedia atau nominal melebihi sisa piutang.');
        $insert = $db->prepare('INSERT INTO payments (receivable_id, payment_date, amount, payment_method, payment_token, note, record_type) VALUES (:id, CURDATE(), :amount, :method, :token, :note, \'demo_simulation\')');
        $insert->execute(['id' => $recordId, 'amount' => $amount, 'method' => $method, 'token' => $token, 'note' => $storedNote]);
        $balance = max(0, (float) $invoice['balance'] - $amount);
        $status = $balance <= 0 ? 'paid' : 'partial';
        $update = $db->prepare('UPDATE receivables SET balance = :balance, status = :status WHERE id = :id AND customer_id = :customer_id');
        $update->execute(['balance' => $balance, 'status' => $status, 'id' => $recordId, 'customer_id' => $scope['customer_id']]);
        $receipt = ['token' => $token, 'payment_date' => date('Y-m-d H:i:s'), 'amount' => $amount, 'payment_method' => $method, 'note' => $note, 'customer' => $invoice['customer'], 'branch' => $invoice['branch'], 'event' => $invoice['event'], 'balance' => $balance, 'simulated' => true];
    } elseif ($source === 'palembang') {
        $query = $db->prepare('SELECT id, nama_event AS event, pelanggan AS customer, nilai_kontrak, total_dibayar, piutang AS balance FROM palembang_events WHERE id = :id AND pelanggan = :customer FOR UPDATE');
        $query->execute(['id' => $recordId, 'customer' => $customerName]);
        $invoice = $query->fetch();
        if (!$invoice || $amount > (float) $invoice['balance'] || (float) $invoice['balance'] <= 0) throw new RuntimeException('Tagihan tidak tersedia atau nominal melebihi sisa piutang.');
        $insert = $db->prepare('INSERT INTO palembang_payments (event_id, payment_date, amount, payment_method, payment_token, note, record_type) VALUES (:id, CURDATE(), :amount, :method, :token, :note, \'demo_simulation\')');
        $insert->execute(['id' => $recordId, 'amount' => $amount, 'method' => $method, 'token' => $token, 'note' => $storedNote]);
        $balance = max(0, (float) $invoice['balance'] - $amount);
        $update = $db->prepare('UPDATE palembang_events SET total_dibayar = total_dibayar + :amount, piutang = :balance, pelunasan = pelunasan + :amount WHERE id = :id AND pelanggan = :customer');
        $update->execute(['amount' => $amount, 'balance' => $balance, 'id' => $recordId, 'customer' => $customerName]);
        $receipt = ['token' => $token, 'payment_date' => date('Y-m-d H:i:s'), 'amount' => $amount, 'payment_method' => $method, 'note' => $note, 'customer' => $invoice['customer'], 'branch' => 'Palembang', 'event' => $invoice['event'], 'balance' => $balance, 'simulated' => true];
    } else {
        $query = $db->prepare('SELECT id, nama_event AS event, pelanggan AS customer, hpp_rab + margin AS contract_total, total_dibayar FROM events WHERE id = :id AND pelanggan = :customer FOR UPDATE');
        $query->execute(['id' => $recordId, 'customer' => $customerName]);
        $invoice = $query->fetch();
        $balanceBefore = $invoice ? max(0, (float) $invoice['contract_total'] - (float) $invoice['total_dibayar']) : 0;
        if (!$invoice || $amount > $balanceBefore || $balanceBefore <= 0) throw new RuntimeException('Tagihan tidak tersedia atau nominal melebihi sisa piutang.');
        $insert = $db->prepare('INSERT INTO event_payments (event_id, event_name, customer_name, payment_date, amount, payment_method, payment_token, note, record_type) VALUES (:id, :event, :customer, CURDATE(), :amount, :method, :token, :note, \'demo_simulation\')');
        $insert->execute(['id' => $recordId, 'event' => $invoice['event'], 'customer' => $invoice['customer'], 'amount' => $amount, 'method' => $method, 'token' => $token, 'note' => $storedNote]);
        $update = $db->prepare('UPDATE events SET total_dibayar = total_dibayar + :amount WHERE id = :id AND pelanggan = :customer');
        $update->execute(['amount' => $amount, 'id' => $recordId, 'customer' => $customerName]);
        $balance = max(0, $balanceBefore - $amount);
        $receipt = ['token' => $token, 'payment_date' => date('Y-m-d H:i:s'), 'amount' => $amount, 'payment_method' => $method, 'note' => $note, 'customer' => $invoice['customer'], 'branch' => ucfirst($source), 'event' => $invoice['event'], 'balance' => $balance, 'simulated' => true];
    }
    $db->commit();
    respond(['success' => true, 'message' => 'Simulasi tersimpan dan saldo piutang diperbarui.', 'receipt' => $receipt]);
} catch (RuntimeException $error) {
    if ($db->inTransaction()) $db->rollBack();
    respond(['success' => false, 'message' => $error->getMessage()], 422);
} catch (Throwable) {
    if ($db->inTransaction()) $db->rollBack();
    respond(['success' => false, 'message' => 'Simulasi tidak dapat disimpan. Pastikan migrasi tipe transaksi demo sudah dijalankan.'], 500);
}