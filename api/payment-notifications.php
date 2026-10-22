<?php

declare(strict_types=1);

function notify_payment_received(int $branchId, string $source, string $sourceId, string $customerName, string $eventName, float $amount, bool $simulated = false, int $customerId = 0): void
{
    try {
        $db = database();
        if (!$db->query("SHOW TABLES LIKE 'due_notifications'")->fetchColumn()) return;
        $recipients = [];
        $adminDb = try_admin_database();
        if ($adminDb instanceof PDO) {
            foreach ($adminDb->query("SELECT id, role FROM users WHERE role IN ('admin_pusat','super_admin')") as $row) {
                $recipients[$row['role'] . ':' . $row['id']] = ['id' => (int) $row['id'], 'role' => (string) $row['role']];
            }
        }
        $statement = $db->prepare("SELECT id FROM users WHERE role='admin_cabang' AND branch_id=:branch_id");
        $statement->execute(['branch_id' => $branchId]);
        foreach ($statement->fetchAll(PDO::FETCH_COLUMN) as $id) $recipients['admin_cabang:' . $id] = ['id' => (int) $id, 'role' => 'admin_cabang'];
        if ($customerId > 0) {
            $statement = $db->prepare("SELECT id FROM users WHERE role='pelanggan' AND customer_id=:customer_id");
            $statement->execute(['customer_id' => $customerId]);
            foreach ($statement->fetchAll(PDO::FETCH_COLUMN) as $id) $recipients['pelanggan:' . $id] = ['id' => (int) $id, 'role' => 'pelanggan'];
        }
        if (!$recipients) return;
        $title = $simulated ? 'Simulasi pembayaran pelanggan' : 'Pembayaran baru diterima';
        $prefix = $simulated ? 'SIMULASI - belum diverifikasi. ' : '';
        $message = $prefix . $customerName . ' membayar Rp ' . number_format($amount, 0, ',', '.') . ' untuk ' . $eventName . ' (' . ucfirst($source) . ').';
        $insert = $db->prepare("INSERT IGNORE INTO due_notifications (source_type,source_id,reminder_key,due_date,recipient_user_id,recipient_role,title,message,target_url) VALUES ('payment_received',:source_id,'transaction',CURRENT_DATE,:user_id,:role,:title,:message,:target_url)");
        foreach ($recipients as $recipient) {
            $insert->execute(['source_id' => $source . ':' . $sourceId, 'user_id' => $recipient['id'], 'role' => $recipient['role'], 'title' => $title, 'message' => $message, 'target_url' => 'history.html']);
        }
    } catch (Throwable $error) {
        error_log('Notifikasi pembayaran tidak dapat dibuat: ' . $error->getMessage());
    }
}
