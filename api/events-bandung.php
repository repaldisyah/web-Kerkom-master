<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

function bandung_database(): PDO
{
    static $connection = null;
    if ($connection instanceof PDO) return $connection;
    $config = require __DIR__ . '/config.php';
    try {
        $connection = new PDO(
            sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $config['events_bandung_db_name'] ?? 'events_bandung'),
            $config['db_user'], $config['db_pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        return $connection;
    } catch (PDOException) {
        respond(['success' => false, 'message' => 'Database events_bandung belum siap. Impor database/events_bandung.sql terlebih dahulu.'], 500);
    }
}

function bandung_branch_id(): int
{
    $config = require __DIR__ . '/config.php';
    return (int) ($config['events_bandung_branch_id'] ?? 3);
}

function bandung_date(mixed $value): ?string
{
    $value = trim((string) $value);
    if ($value === '') return null;
    $date = DateTime::createFromFormat('Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) throw new InvalidArgumentException('Format tanggal harus YYYY-MM-DD.');
    return $value;
}

function bandung_payload(array $data, bool $create): array
{
    $fields = ['nama_event', 'skala', 'jenis_acara', 'tgl_event', 'lokasi', 'pelanggan', 'jenis_pihak', 'hpp_rab', 'margin', 'total_dibayar', 'tgl_jatuh_tempo', 'status_data'];
    $payload = [];
    foreach ($fields as $field) if ($create || array_key_exists($field, $data)) $payload[$field] = $data[$field] ?? null;
    if ($create && !preg_match('/^ED-[A-Za-z0-9-]+$/', (string) ($data['id'] ?? ''))) throw new InvalidArgumentException('ID event wajib berformat ED-... .');
    if (array_key_exists('nama_event', $payload) && trim((string) $payload['nama_event']) === '') throw new InvalidArgumentException('Nama event wajib diisi.');
    if (array_key_exists('jenis_acara', $payload) && trim((string) $payload['jenis_acara']) === '') throw new InvalidArgumentException('Jenis acara wajib diisi.');
    if (array_key_exists('skala', $payload) && !in_array($payload['skala'], ['Kecil', 'Sedang', 'Besar'], true)) throw new InvalidArgumentException('Skala tidak valid.');
    if (array_key_exists('jenis_pihak', $payload) && !in_array($payload['jenis_pihak'], ['Perorangan', 'Perusahaan'], true)) throw new InvalidArgumentException('Jenis pihak tidak valid.');
    if (array_key_exists('status_data', $payload) && !in_array($payload['status_data'], ['Draft', 'Final'], true)) throw new InvalidArgumentException('Status data tidak valid.');
    foreach (['hpp_rab', 'margin', 'total_dibayar'] as $field) {
        if (!array_key_exists($field, $payload)) continue;
        if (!is_numeric($payload[$field]) || (float) $payload[$field] < 0) throw new InvalidArgumentException("$field harus bernilai nol atau lebih.");
        $payload[$field] = (float) $payload[$field];
    }
    foreach (['tgl_event', 'tgl_jatuh_tempo'] as $field) if (array_key_exists($field, $payload)) $payload[$field] = bandung_date($payload[$field]);
    foreach (['nama_event', 'jenis_acara', 'lokasi', 'pelanggan'] as $field) if (array_key_exists($field, $payload)) $payload[$field] = trim((string) $payload[$field]);
    return $payload;
}

function bandung_event(PDO $db, string $id): array
{
    $query = $db->prepare('SELECT * FROM vw_events_dashboard WHERE id = :id');
    $query->execute(['id' => $id]);
    $event = $query->fetch();
    if (!$event) respond(['success' => false, 'message' => 'Event Bandung tidak ditemukan.'], 404);
    return $event;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id = trim((string) ($_GET['id'] ?? ''));
$db = bandung_database();
$scope = current_scope();
require_branch_access($scope, bandung_branch_id());

try {
    if ($method === 'GET') {
        if ($id !== '') respond(['success' => true, 'event' => bandung_event($db, $id)]);
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
        respond(['success' => true, 'branch' => 'Bandung', 'events' => $events, 'summary' => $summary]);
    }

    $data = request_data();

    if ($method === 'POST') {
        $payload = bandung_payload($data, true);
        if ($payload['total_dibayar'] > $payload['hpp_rab'] + $payload['margin']) throw new InvalidArgumentException('Total pembayaran tidak boleh melebihi nilai kontrak.');
        $payload['id'] = trim((string) $data['id']);
        $columns = array_keys($payload);
        $db->prepare('INSERT INTO events (' . implode(', ', $columns) . ') VALUES (:' . implode(', :', $columns) . ')')->execute($payload);
        respond(['success' => true, 'message' => 'Event Bandung berhasil ditambahkan.', 'event' => bandung_event($db, $payload['id'])], 201);
    }

    if ($method === 'PUT') {
        if ($id === '') respond(['success' => false, 'message' => 'ID event wajib diisi.'], 422);
        $current = bandung_event($db, $id);
        $payload = bandung_payload($data, false);
        if (!$payload) respond(['success' => false, 'message' => 'Tidak ada data yang diperbarui.'], 422);
        $nilaiKontrak = (float) ($payload['hpp_rab'] ?? $current['hpp_rab']) + (float) ($payload['margin'] ?? $current['margin']);
        if ((float) ($payload['total_dibayar'] ?? $current['total_dibayar']) > $nilaiKontrak) throw new InvalidArgumentException('Total pembayaran tidak boleh melebihi nilai kontrak.');
        $set = implode(', ', array_map(fn ($field) => "$field = :$field", array_keys($payload)));
        $payload['id'] = $id;
        $db->prepare("UPDATE events SET $set WHERE id = :id")->execute($payload);
        respond(['success' => true, 'message' => 'Event Bandung berhasil diperbarui.', 'event' => bandung_event($db, $id)]);
    }

    if ($method === 'DELETE') {
        if ($id === '') respond(['success' => false, 'message' => 'ID event wajib diisi.'], 422);
        $statement = $db->prepare('DELETE FROM events WHERE id = :id');
        $statement->execute(['id' => $id]);
        if ($statement->rowCount() === 0) respond(['success' => false, 'message' => 'Event Bandung tidak ditemukan.'], 404);
        respond(['success' => true, 'message' => 'Event Bandung berhasil dihapus.']);
    }
    respond(['success' => false, 'message' => 'Metode tidak didukung.'], 405);
} catch (InvalidArgumentException $error) {
    respond(['success' => false, 'message' => $error->getMessage()], 422);
} catch (PDOException) {
    respond(['success' => false, 'message' => 'Data tidak dapat diproses. Pastikan ID unik dan database siap.'], 422);
}
