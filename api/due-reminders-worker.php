<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

date_default_timezone_set('Asia/Jakarta');
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    fwrite(STDERR, "Konfigurasi api/config.php tidak ditemukan.\n");
    exit(1);
}
$config = require $configFile;
$dsn = static fn (string $name): string => sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $name);
$pdoOptions = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
try {
    $db = new PDO($dsn((string) $config['db_name']), $config['db_user'], $config['db_pass'], $pdoOptions);
    if (!$db->query("SHOW TABLES LIKE 'due_notifications'")->fetchColumn()) {
        throw new RuntimeException('Jalankan database/migration_add_due_notifications.sql terlebih dahulu.');
    }
} catch (Throwable $error) {
    fwrite(STDERR, "Worker pengingat berhenti: {$error->getMessage()}\n");
    exit(1);
}

$runDateText = date('Y-m-d');
foreach ($argv as $argument) {
    if (preg_match('/^--date=(\d{4}-\d{2}-\d{2})$/', $argument, $match)) $runDateText = $match[1];
}
$runDate = DateTimeImmutable::createFromFormat('!Y-m-d', $runDateText, new DateTimeZone('Asia/Jakarta'));
if (!$runDate || $runDate->format('Y-m-d') !== $runDateText) {
    fwrite(STDERR, "Tanggal worker tidak valid. Gunakan --date=YYYY-MM-DD.\n");
    exit(2);
}

$warnings = [];
$created = 0;
$candidates = 0;
$centralRecipients = [];
try {
    $adminDbName = (string) ($config['admin_db_name'] ?? 'admin_pusat');
    $adminDb = new PDO($dsn($adminDbName), $config['db_user'], $config['db_pass'], $pdoOptions);
    foreach ($adminDb->query("SELECT id, role FROM users WHERE role IN ('admin_pusat','super_admin')") as $admin) {
        $centralRecipients[] = ['id' => (int) $admin['id'], 'role' => (string) $admin['role']];
    }
} catch (Throwable $error) {
    $warnings[] = "Database admin pusat tidak tersedia: {$error->getMessage()}";
}

$branchAdmins = [];
foreach ($db->query("SELECT id, role, branch_id FROM users WHERE role = 'admin_cabang' AND branch_id IS NOT NULL") as $admin) {
    $branchAdmins[(int) $admin['branch_id']][] = ['id' => (int) $admin['id'], 'role' => 'admin_cabang'];
}

$chooseReminder = static function (string $dueDate) use ($runDate): ?array {
    $due = DateTimeImmutable::createFromFormat('!Y-m-d', $dueDate, new DateTimeZone('Asia/Jakarta'));
    if (!$due) return null;
    $days = (int) $runDate->diff($due)->format('%r%a');
    if ($days === 7) return ['key' => 'due_7', 'label' => 'jatuh tempo dalam 7 hari', 'days' => $days];
    if ($days === 3) return ['key' => 'due_3', 'label' => 'jatuh tempo dalam 3 hari', 'days' => $days];
    if ($days === 1) return ['key' => 'due_1', 'label' => 'jatuh tempo besok', 'days' => $days];
    if ($days === 0) return ['key' => 'due_today', 'label' => 'jatuh tempo hari ini', 'days' => $days];
    if ($days < 0 && abs($days) % 7 === 0) {
        $week = intdiv(abs($days), 7);
        return ['key' => 'overdue_week_' . $week, 'label' => 'terlambat ' . abs($days) . ' hari', 'days' => $days];
    }
    return null;
};

$customerRecipients = static function (int $branchId, string $customerName) use ($db): array {
    $query = $db->prepare('SELECT u.id FROM users u JOIN customers c ON c.id = u.customer_id WHERE u.role = \'pelanggan\' AND c.branch_id = :branch_id AND LOWER(TRIM(c.name)) = LOWER(TRIM(:name))');
    $query->execute(['branch_id' => $branchId, 'name' => $customerName]);
    $out = [];
    foreach ($query->fetchAll() as $user) $out[] = ['id' => (int) $user['id'], 'role' => 'pelanggan'];
    return $out;
};

$queue = static function (string $source, string $sourceId, string $event, string $customer, string $branch,
    string $dueDate, float $balance, int $branchId, array $extraRecipients = []) use (
        $db, $centralRecipients, $branchAdmins, $customerRecipients, $chooseReminder, $runDate, &$created, &$candidates
    ): void {
    if ($balance <= 0) return;
    $reminder = $chooseReminder($dueDate);
    if (!$reminder) return;
    $candidates++;
    $recipients = array_merge($centralRecipients, $branchAdmins[$branchId] ?? [], $extraRecipients, $customerRecipients($branchId, $customer));
    $unique = [];
    foreach ($recipients as $recipient) $unique[$recipient['role'] . ':' . $recipient['id']] = $recipient;
    $title = $reminder['days'] < 0 ? 'Tagihan melewati jatuh tempo' : 'Pengingat jatuh tempo';
    $message = sprintf('%s — %s, %s. Jatuh tempo %s. Sisa tagihan Rp %s.', $event, $customer, $branch,
        $dueDate, number_format($balance, 0, ',', '.'));
    if ($reminder['days'] > 0) $message .= ' Jatuh tempo dalam ' . $reminder['days'] . ' hari.';
    elseif ($reminder['days'] < 0) $message .= ' Terlambat ' . abs($reminder['days']) . ' hari.';
    else $message .= ' Jatuh tempo hari ini.';
    $insert = $db->prepare('INSERT IGNORE INTO due_notifications (source_type, source_id, reminder_key, due_date, recipient_user_id, recipient_role, title, message, target_url) VALUES (:source, :source_id, :reminder, :due_date, :user_id, :role, :title, :message, :target_url)');
    foreach ($unique as $recipient) {
        $insert->execute([
            'source' => $source, 'source_id' => $sourceId, 'reminder' => $reminder['key'], 'due_date' => $dueDate,
            'user_id' => $recipient['id'], 'role' => $recipient['role'], 'title' => $title, 'message' => $message,
            'target_url' => $recipient['role'] === 'pelanggan' ? 'piutang.html' : 'piutang.html',
        ]);
        $created += $insert->rowCount();
    }
};

try {
    $query = $db->query('SELECT r.id, r.branch_id, b.name AS branch, c.id AS customer_id, c.name AS customer, e.name AS event, r.due_date, r.balance FROM receivables r JOIN branches b ON b.id = r.branch_id JOIN customers c ON c.id = r.customer_id JOIN events e ON e.id = r.event_id WHERE r.balance > 0 AND r.due_date IS NOT NULL');
    foreach ($query->fetchAll() as $row) {
        $customerUsers = $db->prepare("SELECT id FROM users WHERE role = 'pelanggan' AND customer_id = :customer_id");
        $customerUsers->execute(['customer_id' => $row['customer_id']]);
        $recipients = array_map(static fn ($user): array => ['id' => (int) $user['id'], 'role' => 'pelanggan'], $customerUsers->fetchAll());
        $queue('receivable', (string) $row['id'], (string) $row['event'], (string) $row['customer'], (string) $row['branch'], (string) $row['due_date'], (float) $row['balance'], (int) $row['branch_id'], $recipients);
    }
} catch (Throwable $error) {
    $warnings[] = "Piutang utama tidak dapat dipindai: {$error->getMessage()}";
}

$branchRows = $db->query('SELECT id, name FROM branches')->fetchAll();
$branchIds = [];
foreach ($branchRows as $row) $branchIds[strtolower(trim((string) $row['name']))] = (int) $row['id'];
$palembangId = $branchIds['palembang'] ?? null;
if ($palembangId !== null) {
    try {
        foreach ($db->query('SELECT id, nama_event AS event, pelanggan AS customer, tgl_jatuh_tempo AS due_date, piutang AS balance FROM palembang_events WHERE piutang > 0 AND tgl_jatuh_tempo IS NOT NULL') as $row) {
            $queue('palembang', (string) $row['id'], (string) $row['event'], (string) $row['customer'], 'Palembang', (string) $row['due_date'], (float) $row['balance'], $palembangId);
        }
    } catch (Throwable $error) {
        $warnings[] = "Event Palembang tidak dapat dipindai: {$error->getMessage()}";
    }
}

$eventSources = [
    'bali' => ['database' => (string) ($config['events_bali_db_name'] ?? 'events_bali'), 'branch_id' => (int) ($config['events_bali_branch_id'] ?? ($branchIds['bali'] ?? 2))],
    'bandung' => ['database' => (string) ($config['events_bandung_db_name'] ?? 'events_bandung'), 'branch_id' => (int) ($config['events_bandung_branch_id'] ?? ($branchIds['bandung'] ?? 3))],
];
foreach ($eventSources as $branch => $sourceConfig) {
    try {
        $eventDb = new PDO($dsn($sourceConfig['database']), $config['db_user'], $config['db_pass'], $pdoOptions);
        $statement = $eventDb->query("SELECT id, nama_event AS event, pelanggan AS customer, tgl_jatuh_tempo AS due_date, piutang AS balance FROM events WHERE piutang > 0 AND tgl_jatuh_tempo IS NOT NULL AND status_data = 'Final'");
        foreach ($statement->fetchAll() as $row) {
            $queue($branch, (string) $row['id'], (string) $row['event'], (string) $row['customer'], ucfirst($branch), (string) $row['due_date'], (float) $row['balance'], $sourceConfig['branch_id']);
        }
    } catch (Throwable $error) {
        $warnings[] = ucfirst($branch) . " tidak dapat dipindai: {$error->getMessage()}";
    }
}

fwrite(STDOUT, sprintf("Pengingat due-reminders-worker: tanggal=%s, kandidat=%d, notifikasi_baru=%d\n", $runDateText, $candidates, $created));
foreach ($warnings as $warning) fwrite(STDERR, "PERINGATAN: {$warning}\n");
exit($warnings ? 1 : 0);
