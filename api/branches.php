<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$scope = current_scope();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = database();
if ($method !== 'GET') {
    if (!in_array($scope['role'], ['admin_pusat', 'super_admin'], true)) respond(['success'=>false,'message'=>'Hanya admin pusat yang dapat mengelola cabang.'],403);
    if (!in_array($method,['POST','PUT','DELETE'],true)) respond(['success'=>false,'message'=>'Metode tidak didukung.'],405);
    $data=request_data(); $id=filter_var($_GET['id'] ?? $data['id'] ?? null,FILTER_VALIDATE_INT);
    if($method==='DELETE') {
        if(!$id) respond(['success'=>false,'message'=>'ID cabang wajib valid.'],422);
        try{$delete=$db->prepare('DELETE FROM branches WHERE id=:id');$delete->execute(['id'=>$id]);if(!$delete->rowCount())respond(['success'=>false,'message'=>'Cabang tidak ditemukan.'],404);respond(['success'=>true,'message'=>'Cabang berhasil dihapus.']);}
        catch(PDOException){respond(['success'=>false,'message'=>'Cabang masih memiliki akun, pelanggan, atau event. Pindahkan atau hapus data terkait terlebih dahulu.'],409);}
    }
    $name=trim((string)($data['name']??''));$city=trim((string)($data['city']??''));
    if($name===''||$city===''||mb_strlen($name)>100||mb_strlen($city)>100)respond(['success'=>false,'message'=>'Nama dan kota cabang wajib diisi (maksimal 100 karakter).'],422);
    try {
        if($method==='POST'){$save=$db->prepare('INSERT INTO branches(name,city) VALUES(:name,:city)');$save->execute(['name'=>$name,'city'=>$city]);respond(['success'=>true,'message'=>'Cabang berhasil ditambahkan.','id'=>(int)$db->lastInsertId()],201);}
        if(!$id)respond(['success'=>false,'message'=>'ID cabang wajib valid.'],422);
        $save=$db->prepare('UPDATE branches SET name=:name,city=:city WHERE id=:id');$save->execute(['id'=>$id,'name'=>$name,'city'=>$city]);
        if(!$save->rowCount()){$check=$db->prepare('SELECT id FROM branches WHERE id=:id');$check->execute(['id'=>$id]);if(!$check->fetch())respond(['success'=>false,'message'=>'Cabang tidak ditemukan.'],404);}
        respond(['success'=>true,'message'=>'Data cabang berhasil diperbarui.']);
    } catch(PDOException){respond(['success'=>false,'message'=>'Nama cabang sudah digunakan atau perubahan ditolak database.'],409);}
}
if ($scope['role'] === 'pelanggan') {
    respond(['success' => false, 'message' => 'Akun pelanggan tidak memiliki akses data cabang.'], 403);
}
if ($scope['role'] === 'admin_cabang' && !$scope['branch_id']) {
    respond(['success' => false, 'message' => 'Akun belum memiliki cabang.'], 403);
}

$sql = 'SELECT b.id, b.name, b.city, (SELECT COUNT(*) FROM customers c WHERE c.branch_id = b.id) AS customer_count, (SELECT COUNT(*) FROM events e WHERE e.branch_id = b.id) AS event_count, (SELECT COALESCE(SUM(r.balance), 0) FROM receivables r WHERE r.branch_id = b.id) AS receivables FROM branches b';
$params = [];
$sql .= ' ORDER BY b.name';
$statement = $db->prepare($sql);
$statement->execute($params);

$branches = $statement->fetchAll();
// Cabang lain hanya tampil sebagai ringkasan, tanpa daftar pelanggan/event atau rincian transaksi.
respond(['success' => true, 'branches' => $branches, 'scope' => $scope['role'], 'own_branch_id' => $scope['branch_id']]);
