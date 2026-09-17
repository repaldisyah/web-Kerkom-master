<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Metode harus POST.'], 405);
}

$data = request_data();
$receivableId = (int) ($data['receivable_id'] ?? 0);
$amount = (float) ($data['amount'] ?? 0);
$paymentMethod = strtoupper(trim((string) ($data['payment_method'] ?? '')));
$note = trim((string) ($data['note'] ?? ''));
$allowedMethods = ['QRIS', 'BRI', 'BCA', 'SEABANK', 'PAYPAL'];

if ($receivableId < 1 || $amount <= 0 || !in_array($paymentMethod, $allowedMethods, true)) {
    respond(['success' => false, 'message' => 'Tagihan, nominal, dan metode pembayaran wajib valid.'], 422);
}
if (strlen($note) > 255) {
    respond(['success' => false, 'message' => 'Catatan maksimal 255 karakter.'], 422);
}

$db = database();
$isSuperAdmin = ($_SESSION['user_role'] ?? '') === 'super_admin';
$branchId = $_SESSION['user_branch_id'] ?? null;
if (!$isSuperAdmin && $branchId === null) {
    respond(['success' => false, 'message' => 'Akun belum memiliki cabang. Hubungi admin pusat.'], 403);
}

$db->beginTransaction();
try {
    $scope = $isSuperAdmin ? '' : ' AND branch_id = :branch_id';
    $statement = $db->prepare("SELECT r.id, r.balance, c.name AS customer, b.name AS branch, e.name AS event FROM receivables r JOIN customers c ON c.id = r.customer_id JOIN branches b ON b.id = r.branch_id JOIN events e ON e.id = r.event_id WHERE r.id = :id AND r.balance > 0$scope FOR UPDATE");
    $parameters = ['id' => $receivableId];
    if (!$isSuperAdmin) $parameters['branch_id'] = (int) $branchId;
    $statement->execute($parameters);
    $receivable = $statement->fetch();
    if (!$receivable || $amount > (float) $receivable['balance']) {
        throw new RuntimeException('Nominal melebihi sisa tagihan atau tagihan tidak tersedia.');
    }

    $paymentToken = 'NK-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
    $payment = $db->prepare('INSERT INTO payments (receivable_id, payment_date, amount, payment_method, payment_token, note) VALUES (:receivable_id, CURDATE(), :amount, :payment_method, :payment_token, :note)');
    $payment->execute(['receivable_id' => $receivableId, 'amount' => $amount, 'payment_method' => $paymentMethod, 'payment_token' => $paymentToken, 'note' => $note !== '' ? $note : null]);
    $newBalance = (float) $receivable['balance'] - $amount;
    $status = $newBalance <= 0 ? 'paid' : 'partial';
    $update = $db->prepare('UPDATE receivables SET balance = :balance, status = :status WHERE id = :id');
    $update->execute(['balance' => max(0, $newBalance), 'status' => $status, 'id' => $receivableId]);
    $db->commit();
    respond([
        'success' => true,
        'message' => 'Pembayaran berhasil dicatat.',
        'balance' => max(0, $newBalance),
        'status' => $status,
        'receipt' => [
            'token' => $paymentToken,
            'payment_date' => date('Y-m-d'),
            'amount' => $amount,
            'payment_method' => $paymentMethod,
            'note' => $note,
            'customer' => $receivable['customer'],
            'branch' => $receivable['branch'],
            'event' => $receivable['event'],
        ],
    ]);
} catch (RuntimeException $error) {
    if ($db->inTransaction()) $db->rollBack();
    respond(['success' => false, 'message' => $error->getMessage()], 422);
} catch (Throwable) {
    if ($db->inTransaction()) $db->rollBack();
    respond(['success' => false, 'message' => 'Pembayaran tidak dapat diproses. Silakan coba lagi.'], 500);
}
