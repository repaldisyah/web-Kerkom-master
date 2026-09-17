<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

function events_database(): PDO
{
    static $connection = null;
    if ($connection instanceof PDO) return $connection;

    $config = require __DIR__ . '/config.php';
    $databaseName = $config['events_bali_db_name'] ?? 'events_bali';
    try {
        $connection = new PDO(
            sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $databaseName),
            $config['db_user'],
            $config['db_pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        return $connection;
    } catch (PDOException) {
        respond(['success' => false, 'message' => 'Database events_bali belum siap. Impor database/events_bali.sql terlebih dahulu.'], 500);
    }
}

function events_branch_id(): int
{
    $config = require __DIR__ . '/config.php';
    return (int) ($config['events_bali_branch_id'] ?? 2);
}

function nullable_date(mixed $value): ?string
{
    $value = trim((string) $value);
    if ($value === '') return null;
    $date = DateTime::createFromFormat('Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        throw new InvalidArgumentException('Format tanggal harus YYYY-MM-DD.');
    }
    return $value;
}

function event_payload(array $data, bool $isCreate): array
{
    $allowedScales = ['Kecil', 'Sedang', 'Besar'];
    $allowedParties = ['Perorangan', 'Perusahaan'];
    $allowedStatuses = ['Draft', 'Final'];
    $fields = [
        'nama_event', 'skala', 'jenis_acara', 'tgl_event', 'lokasi', 'pelanggan',
        'jenis_pihak', 'hpp_rab', 'margin', 'total_dibayar', 'tgl_jatuh_tempo', 'status_data',
    ];
    $payload = [];
    foreach ($fields as $field) {
        if ($isCreate || array_key_exists($field, $data)) $payload[$field] = $data[$field] ?? null;
    }

    if ($isCreate && (!isset($data['id']) || !preg_match('/^EDK-[A-Za-z0-9-]+$/', (string) $data['id']))) {
        throw new InvalidArgumentException('ID event wajib berformat EDK-... .');
    }
    if (array_key_exists('nama_event', $payload) && trim((string) $payload['nama_event']) === '') {
        throw new InvalidArgumentException('Nama event wajib diisi.');
    }
    if (array_key_exists('skala', $payload) && !in_array($payload['skala'], $allowedScales, true)) {
        throw new InvalidArgumentException('Skala tidak valid.');
    }
    if (array_key_exists('jenis_pihak', $payload) && !in_array($payload['jenis_pihak'], $allowedParties, true)) {
        throw new InvalidArgumentException('Jenis pihak tidak valid.');
    }
    if (array_key_exists('status_data', $payload) && !in_array($payload['status_data'], $allowedStatuses, true)) {
        throw new InvalidArgumentException('Status data tidak valid.');
    }
    foreach (['hpp_rab', 'margin', 'total_dibayar'] as $moneyField) {
        if (!array_key_exists($moneyField, $payload)) continue;
        if (!is_numeric($payload[$moneyField]) || (float) $payload[$moneyField] < 0) {
            throw new InvalidArgumentException("$moneyField harus berupa angka nol atau lebih.");
        }
        $payload[$moneyField] = (float) $payload[$moneyField];
    }
    foreach (['tgl_event', 'tgl_jatuh_tempo'] as $dateField) {
        if (array_key_exists($dateField, $payload)) $payload[$dateField] = nullable_date($payload[$dateField]);
    }
    foreach (['nama_event', 'jenis_acara', 'lokasi', 'pelanggan'] as $textField) {
        if (array_key_exists($textField, $payload)) $payload[$textField] = trim((string) $payload[$textField]);
    }
    return $payload;
}

function fetch_event(PDO $db, string $id): array
{
    $statement = $db->prepare('SELECT * FROM vw_events_dashboard WHERE id = :id');
    $statement->execute(['id' => $id]);
    $event = $statement->fetch();
    if (!$event) respond(['success' => false, 'message' => 'Event tidak ditemukan.'], 404);
    return $event;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id = trim((string) ($_GET['id'] ?? ''));
$db = events_database();
$scope = current_scope();
require_branch_access($scope, events_branch_id());

try {
    if ($method === 'GET') {
        if ($id !== '') respond(['success' => true, 'event' => fetch_event($db, $id)]);
        $events = $db->query('SELECT * FROM vw_events_dashboard ORDER BY tgl_event IS NULL, tgl_event, id')->fetchAll();
        $summary = $db->query("SELECT
            COALESCE(SUM(nilai_kontrak), 0) AS total_nilai_kontrak,
            COALESCE(SUM(total_dibayar), 0) AS total_dibayar,
            COALESCE(SUM(piutang), 0) AS total_piutang,
            COALESCE(SUM(margin), 0) AS total_margin,
            COALESCE(SUM(CASE WHEN status_piutang = 'Berjalan' THEN piutang ELSE 0 END), 0) AS piutang_berjalan,
            COALESCE(SUM(CASE WHEN status_piutang = 'Piutang Jatuh Tempo' THEN piutang ELSE 0 END), 0) AS piutang_jatuh_tempo,
            COALESCE(SUM(CASE WHEN status_piutang = 'Lunas' THEN 1 ELSE 0 END), 0) AS jumlah_lunas
            FROM vw_events_dashboard")->fetch();
        respond(['success' => true, 'events' => $events, 'summary' => $summary]);
    }

    $data = request_data();

    if ($method === 'POST') {
        $payload = event_payload($data, true);
        $nilaiKontrak = $payload['hpp_rab'] + $payload['margin'];
        if ($payload['total_dibayar'] > $nilaiKontrak) throw new InvalidArgumentException('Total pembayaran tidak boleh melebihi nilai kontrak.');
        $payload['id'] = trim((string) $data['id']);
        $columns = array_keys($payload);
        $sql = 'INSERT INTO events (' . implode(', ', $columns) . ') VALUES (:' . implode(', :', $columns) . ')';
        $db->prepare($sql)->execute($payload);
        respond(['success' => true, 'message' => 'Event berhasil ditambahkan.', 'event' => fetch_event($db, $payload['id'])], 201);
    }

    if ($method === 'PUT') {
        if ($id === '') respond(['success' => false, 'message' => 'ID event wajib diisi.'], 422);
        fetch_event($db, $id);
        $payload = event_payload($data, false);
        if (!$payload) respond(['success' => false, 'message' => 'Tidak ada data yang diperbarui.'], 422);
        $current = fetch_event($db, $id);
        $nilaiKontrak = (float) ($payload['hpp_rab'] ?? $current['hpp_rab']) + (float) ($payload['margin'] ?? $current['margin']);
        if ((float) ($payload['total_dibayar'] ?? $current['total_dibayar']) > $nilaiKontrak) throw new InvalidArgumentException('Total pembayaran tidak boleh melebihi nilai kontrak.');
        $set = implode(', ', array_map(fn ($column) => "$column = :$column", array_keys($payload)));
        $payload['id'] = $id;
        $db->prepare("UPDATE events SET $set WHERE id = :id")->execute($payload);
        respond(['success' => true, 'message' => 'Event berhasil diperbarui.', 'event' => fetch_event($db, $id)]);
    }

    if ($method === 'DELETE') {
        if ($id === '') respond(['success' => false, 'message' => 'ID event wajib diisi.'], 422);
        $delete = $db->prepare('DELETE FROM events WHERE id = :id');
        $delete->execute(['id' => $id]);
        if ($delete->rowCount() === 0) respond(['success' => false, 'message' => 'Event tidak ditemukan.'], 404);
        respond(['success' => true, 'message' => 'Event berhasil dihapus.']);
    }

    respond(['success' => false, 'message' => 'Metode tidak didukung.'], 405);
} catch (InvalidArgumentException $error) {
    respond(['success' => false, 'message' => $error->getMessage()], 422);
} catch (PDOException $error) {
    respond(['success' => false, 'message' => 'Data event tidak dapat diproses. Pastikan ID unik dan database telah diimpor.'], 422);
}
