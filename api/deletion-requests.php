<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$scope = require_operational_user();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = database();
if (!$db->query("SHOW TABLES LIKE 'deletion_requests'")->fetchColumn()) {
    respond(['success' => false, 'message' => 'Tabel permintaan belum tersedia. Jalankan database/migration_add_deletion_requests.sql.'], 503);
}
$config = require __DIR__ . '/config.php';
$central = in_array($scope['role'], ['admin_pusat', 'super_admin'], true);
$branchMap = [
    'palembang' => ['id' => null, 'database' => (string) ($config['db_name'] ?? 'nusa_karsa')],
    'bali' => ['id' => (int) ($config['events_bali_branch_id'] ?? 2), 'database' => (string) ($config['events_bali_db_name'] ?? 'events_bali')],
    'bandung' => ['id' => (int) ($config['events_bandung_branch_id'] ?? 3), 'database' => (string) ($config['events_bandung_db_name'] ?? 'events_bandung')],
];
$branchRows = $db->query('SELECT id, name FROM branches')->fetchAll();
foreach ($branchRows as $row) {
    if (strtolower(trim((string) $row['name'])) === 'palembang') $branchMap['palembang']['id'] = (int) $row['id'];
}
if ($branchMap['palembang']['id'] === null) respond(['success' => false, 'message' => 'Cabang Palembang tidak ditemukan.'], 500);

$connectBranch = static function (string $branch) use ($config, $branchMap, $db): PDO {
    if ($branch === 'palembang') return $db;
    return new PDO(
        sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $branchMap[$branch]['database']),
        $config['db_user'], $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
};

if ($method === 'GET') {
    $sql = 'SELECT r.*, b.name AS branch, u.name AS requester FROM deletion_requests r JOIN branches b ON b.id = r.branch_id LEFT JOIN users u ON u.id = r.requested_by';
    if (!$central) {
        if (!$scope['branch_id']) respond(['success' => false, 'message' => 'Akun admin cabang belum terhubung ke cabang.'], 403);
        $sql .= ' WHERE r.branch_id = :branch_id';
        $query = $db->prepare($sql . ' ORDER BY r.created_at DESC, r.id DESC');
        $query->execute(['branch_id' => (int) $scope['branch_id']]);
    } else {
        $query = $db->query($sql . ' ORDER BY (r.status = \'pending\') DESC, r.created_at DESC, r.id DESC');
    }
    respond(['success' => true, 'requests' => $query->fetchAll(), 'scope' => $scope['role']]);
}

if ($method === 'POST') {
    if ($scope['role'] !== 'admin_cabang' || !$scope['branch_id']) respond(['success' => false, 'message' => 'Hanya admin cabang yang dapat mengajukan permintaan penghapusan.'], 403);
    $data = request_data();
    $branch = strtolower(trim((string) ($data['branch'] ?? '')));
    $eventId = trim((string) ($data['event_id'] ?? ''));
    $reason = trim((string) ($data['reason'] ?? ''));
    if (!isset($branchMap[$branch]) || (int) $branchMap[$branch]['id'] !== (int) $scope['branch_id']) respond(['success' => false, 'message' => 'Permintaan hanya dapat dibuat untuk event cabang Anda.'], 403);
    if ($eventId === '' || $reason === '' || mb_strlen($reason) > 500) respond(['success' => false, 'message' => 'ID event dan alasan (maksimal 500 karakter) wajib diisi.'], 422);
    try {
        $eventDb = $connectBranch($branch);
        $eventQuery = $branch === 'palembang'
            ? $eventDb->prepare('SELECT id, nama_event AS event_name FROM palembang_events WHERE id = :id')
            : $eventDb->prepare('SELECT id, nama_event AS event_name FROM events WHERE id = :id');
        $eventQuery->execute(['id' => $eventId]);
        $event = $eventQuery->fetch();
        if (!$event) respond(['success' => false, 'message' => 'Event tidak ditemukan.'], 404);
        $pending = $db->prepare("SELECT id FROM deletion_requests WHERE branch_id = :branch_id AND branch_key = :branch AND event_id = :event_id AND status = 'pending' LIMIT 1");
        $pending->execute(['branch_id' => (int) $scope['branch_id'], 'branch' => $branch, 'event_id' => $eventId]);
        if ($pending->fetch()) respond(['success' => false, 'message' => 'Masih ada permintaan penghapusan yang menunggu keputusan untuk event ini.'], 409);
        $insert = $db->prepare('INSERT INTO deletion_requests (branch_id, branch_key, event_id, event_name, requested_by, reason) VALUES (:branch_id, :branch, :event_id, :event_name, :requested_by, :reason)');
        $insert->execute(['branch_id' => (int) $scope['branch_id'], 'branch' => $branch, 'event_id' => $eventId, 'event_name' => $event['event_name'], 'requested_by' => $scope['user_id'], 'reason' => $reason]);
        respond(['success' => true, 'message' => 'Permintaan penghapusan telah dikirim ke admin pusat.'], 201);
    } catch (PDOException) {
        respond(['success' => false, 'message' => 'Permintaan tidak dapat diproses. Pastikan migration permintaan penghapusan sudah dijalankan.'], 500);
    }
}

if ($method === 'PUT') {
    if (!$central) respond(['success' => false, 'message' => 'Keputusan permintaan hanya dapat dilakukan admin pusat.'], 403);
    $data = request_data();
    $requestId = filter_var($data['request_id'] ?? null, FILTER_VALIDATE_INT);
    $decision = (string) ($data['decision'] ?? '');
    $reviewNote = trim((string) ($data['review_note'] ?? ''));
    if (!$requestId || !in_array($decision, ['approve', 'reject'], true) || mb_strlen($reviewNote) > 500) respond(['success' => false, 'message' => 'Keputusan atau ID permintaan tidak valid.'], 422);

    $db->beginTransaction();
    try {
        $requestQuery = $db->prepare('SELECT * FROM deletion_requests WHERE id = :id FOR UPDATE');
        $requestQuery->execute(['id' => $requestId]);
        $request = $requestQuery->fetch();
        if (!$request) throw new RuntimeException('Permintaan tidak ditemukan.');
        if ($request['status'] !== 'pending') throw new RuntimeException('Permintaan ini sudah diproses.');
        if ($decision === 'approve') {
            $branch = (string) $request['branch_key'];
            $eventDb = $connectBranch($branch);
            $table = $branch === 'palembang' ? 'palembang_events' : 'events';
            $delete = $eventDb->prepare("DELETE FROM $table WHERE id = :id");
            $delete->execute(['id' => $request['event_id']]);
            if ($delete->rowCount() === 0) throw new RuntimeException('Event sudah tidak ditemukan; permintaan tidak dapat disetujui.');
            $status = 'approved';
        } else {
            $status = 'rejected';
        }
        $update = $db->prepare('UPDATE deletion_requests SET status = :status, reviewed_by = :reviewed_by, review_note = :review_note, reviewed_at = CURRENT_TIMESTAMP WHERE id = :id');
        $update->execute(['status' => $status, 'reviewed_by' => $scope['user_id'], 'review_note' => $reviewNote !== '' ? $reviewNote : null, 'id' => $requestId]);
        $db->commit();
        respond(['success' => true, 'message' => $decision === 'approve' ? 'Permintaan disetujui dan event dihapus.' : 'Permintaan ditolak.']);
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        $message = $error instanceof RuntimeException ? $error->getMessage() : 'Permintaan tidak dapat diproses. Pastikan database cabang dan migration sudah siap.';
        respond(['success' => false, 'message' => $message], 422);
    }
}

respond(['success' => false, 'message' => 'Metode tidak didukung.'], 405);
