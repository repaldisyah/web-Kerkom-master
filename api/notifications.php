<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$scope = current_scope();
$db = database();
if (!$db->query("SHOW TABLES LIKE 'due_notifications'")->fetchColumn()) {
    respond(['success' => false, 'message' => 'Notifikasi belum disiapkan. Jalankan database/migration_add_due_notifications.sql.'], 503);
}
$role = $scope['role'];
$userId = $scope['user_id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $query = $db->prepare('SELECT id, source_type, source_id, reminder_key, due_date, title, message, target_url, created_at, read_at FROM due_notifications WHERE recipient_role = :role AND recipient_user_id = :user_id ORDER BY created_at DESC, id DESC LIMIT 250');
    $query->execute(['role' => $role, 'user_id' => $userId]);
    $items = $query->fetchAll();
    $unreadQuery = $db->prepare('SELECT COUNT(*) FROM due_notifications WHERE recipient_role = :role AND recipient_user_id = :user_id AND read_at IS NULL');
    $unreadQuery->execute(['role' => $role, 'user_id' => $userId]);
    respond(['success' => true, 'notifications' => $items, 'unread_count' => (int) $unreadQuery->fetchColumn()]);
}

if ($method === 'POST') {
    $data = request_data();
    if (!empty($data['mark_all'])) {
        $statement = $db->prepare('UPDATE due_notifications SET read_at = CURRENT_TIMESTAMP WHERE recipient_role = :role AND recipient_user_id = :user_id AND read_at IS NULL');
        $statement->execute(['role' => $role, 'user_id' => $userId]);
        respond(['success' => true, 'updated' => $statement->rowCount()]);
    }
    $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id || $id < 1) respond(['success' => false, 'message' => 'ID notifikasi tidak valid.'], 422);
    $statement = $db->prepare('UPDATE due_notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = :id AND recipient_role = :role AND recipient_user_id = :user_id');
    $statement->execute(['id' => $id, 'role' => $role, 'user_id' => $userId]);
    if (!$statement->rowCount()) {
        $check = $db->prepare('SELECT id FROM due_notifications WHERE id = :id AND recipient_role = :role AND recipient_user_id = :user_id');
        $check->execute(['id' => $id, 'role' => $role, 'user_id' => $userId]);
        if (!$check->fetch()) respond(['success' => false, 'message' => 'Notifikasi tidak ditemukan.'], 404);
    }
    respond(['success' => true]);
}

respond(['success' => false, 'message' => 'Metode tidak didukung.'], 405);
