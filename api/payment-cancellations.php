<?php

declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
$scope = current_scope();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(['success'=>false,'message'=>'Metode harus POST.'],405);
$data = request_data();
$source = strtolower(trim((string)($data['source'] ?? '')));
$id = filter_var($data['transaction_id'] ?? null, FILTER_VALIDATE_INT);
$reason = trim((string)($data['reason'] ?? ''));
if (!in_array($source,['master','palembang','bali','bandung'],true) || !$id || $id < 1 || $reason === '' || mb_strlen($reason)>255) respond(['success'=>false,'message'=>'Transaksi dan alasan pembatalan wajib valid (maksimal 255 karakter).'],422);
$isCentral = in_array($scope['role'],['admin_pusat','super_admin'],true);
$config = require __DIR__.'/config.php';
$main = database(); $db = $main; $table = 'payments'; $branchId = null; $join = '';
if ($source === 'palembang') { $table='palembang_payments'; $q=$main->prepare("SELECT id FROM branches WHERE LOWER(name)='palembang' LIMIT 1"); $q->execute(); $branchId=(int)$q->fetchColumn(); }
if (in_array($source,['bali','bandung'],true)) {
  $table='event_payments'; $branchId=(int)($config[$source==='bali'?'events_bali_branch_id':'events_bandung_branch_id'] ?? ($source==='bali'?2:3));
  try { $db=new PDO(sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',$config['db_host'],$config['db_port'],$config[$source==='bali'?'events_bali_db_name':'events_bandung_db_name']),$config['db_user'],$config['db_pass'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]); }
  catch(PDOException) { respond(['success'=>false,'message'=>'Database cabang tidak tersedia.'],503); }
}
if ($source==='master') $join=' JOIN receivables r ON r.id=p.receivable_id';
$db->beginTransaction();
try {
  $select = $source==='master'
    ? "SELECT p.*, r.branch_id, r.customer_id, r.id AS linked_id FROM payments p JOIN receivables r ON r.id=p.receivable_id WHERE p.id=:id FOR UPDATE"
    : ($source==='palembang' ? "SELECT p.*, p.event_id AS linked_id, 'Palembang' AS branch_name FROM palembang_payments p WHERE p.id=:id FOR UPDATE" : "SELECT p.*, p.event_id AS linked_id FROM event_payments p WHERE p.id=:id FOR UPDATE");
  $q=$db->prepare($select); $q->execute(['id'=>$id]); $p=$q->fetch();
  if (!$p) throw new RuntimeException('Transaksi tidak ditemukan.');
  if ($p['cancelled_at']!==null) throw new RuntimeException('Transaksi ini sudah dibatalkan.');
  if (($p['record_type']??'payment')==='historical_balance') throw new RuntimeException('Saldo historis tidak dapat dibatalkan karena tidak memiliki rincian transaksi.');
  if ($scope['role']==='pelanggan') {
    if (($p['record_type']??'')!=='demo_simulation') throw new RuntimeException('Pelanggan hanya dapat membatalkan simulasi miliknya.');
    $profile=$main->prepare('SELECT c.name,c.branch_id FROM users u JOIN customers c ON c.id=u.customer_id WHERE u.id=:uid AND u.customer_id=:cid AND u.role=\'pelanggan\''); $profile->execute(['uid'=>$scope['user_id'],'cid'=>$scope['customer_id']]); $c=$profile->fetch();
    if (!$c) throw new RuntimeException('Profil pelanggan tidak valid.');
    $owns=false;
    if ($source==='master') $owns=(int)$p['customer_id']===(int)$scope['customer_id'];
    else $owns=mb_strtolower(trim((string)($p['customer_name']??'')))===mb_strtolower(trim((string)$c['name'])) && (int)$c['branch_id']===$branchId;
    if (!$owns) throw new RuntimeException('Transaksi bukan milik akun pelanggan ini.');
    $created=strtotime((string)($p['created_at']??$p['payment_date']??''));
    if (!$created || time()-$created>86400) throw new RuntimeException('Batas pembatalan pelanggan adalah 24 jam sejak transaksi dicatat.');
  } elseif (!$isCentral) {
    if ($scope['role']!=='admin_cabang' || !$scope['branch_id'] || (int)$scope['branch_id']!==($source==='master'?(int)$p['branch_id']:$branchId)) throw new RuntimeException('Anda tidak memiliki akses ke cabang transaksi ini.');
    $created=strtotime((string)($p['created_at']??$p['payment_date']??''));
    if (!$created || time()-$created>30*86400) throw new RuntimeException('Batas pembatalan admin cabang adalah 30 hari sejak transaksi dicatat.');
  }
  $now=date('Y-m-d H:i:s');
  $u=$db->prepare("UPDATE `$table` SET cancelled_at=:at,cancelled_by=:uid,cancelled_by_role=:role,cancellation_reason=:reason WHERE id=:id AND cancelled_at IS NULL");
  $u->execute(['at'=>$now,'uid'=>$scope['user_id'],'reason'=>$reason,'id'=>$id]);
  if (!$u->rowCount()) throw new RuntimeException('Transaksi sudah berubah. Muat ulang riwayat.');
  $amount=(float)$p['amount']; $eventStillExists=true;
  if ($source==='master') {
    $u=$db->prepare("UPDATE receivables SET balance=LEAST(total_amount,balance+:amount),status=CASE WHEN LEAST(total_amount,balance+:amount)>=total_amount THEN 'unpaid' WHEN LEAST(total_amount,balance+:amount)>0 THEN 'partial' ELSE 'paid' END WHERE id=:id");
    $u->execute(['amount'=>$amount,'id'=>$p['receivable_id']]); $eventStillExists=$u->rowCount()>0;
  } else {
    $eventTable=$source==='palembang'?'palembang_events':'events';
    try {
      if ($source==='palembang') { $u=$db->prepare('UPDATE palembang_events SET total_dibayar=GREATEST(0,total_dibayar-:a), piutang=LEAST(nilai_kontrak,piutang+:b), pelunasan=GREATEST(0,pelunasan-:c) WHERE id=:id'); }
      else { $u=$db->prepare('UPDATE events SET total_dibayar=GREATEST(0,total_dibayar-:a) WHERE id=:id'); }
      if ($source==='palembang') $u->execute(['a'=>$amount,'b'=>$amount,'c'=>$amount,'id'=>$p['event_id']]); else $u->execute(['a'=>$amount,'id'=>$p['event_id']]); $eventStillExists=$u->rowCount()>0;
    } catch (PDOException $e) { if ($e->getCode()!=='42S02') throw $e; $eventStillExists=false; }
  }
  $notice='Pembayaran '.$p['payment_token'].' sebesar Rp '.number_format($amount,0,',','.').' dibatalkan oleh '.$scope['role'].' (ID '.$scope['user_id'].') pada '.$now.'. Alasan: '.$reason;
  $branch=$source==='master'?(int)$p['branch_id']:$branchId;
  $recipients=$db->prepare("SELECT id FROM nusa_karsa.users WHERE role='admin_cabang' AND branch_id=:branch"); $recipients->execute(['branch'=>$branch]);
  $ins=$db->prepare("INSERT IGNORE INTO nusa_karsa.due_notifications (source_type,source_id,reminder_key,due_date,recipient_user_id,recipient_role,title,message,target_url) VALUES ('payment_cancel',:source_id,'cancelled',CURRENT_DATE,:uid,'admin_cabang','Pembayaran dibatalkan',:message,'../Html/history.html')");
  foreach($recipients->fetchAll(PDO::FETCH_COLUMN) as $uid) $ins->execute(['source_id'=>$source.':'.$id,'uid'=>$uid,'message'=>$notice]);
  $db->commit();
  respond(['success'=>true,'message'=>'Pembatalan tersimpan; saldo tagihan disesuaikan otomatis. Admin cabang terkait menerima notifikasi.','balance_adjusted'=>$eventStillExists]);
} catch(RuntimeException $e) { if($db->inTransaction())$db->rollBack(); respond(['success'=>false,'message'=>$e->getMessage()],422); }
catch(Throwable) { if($db->inTransaction())$db->rollBack(); respond(['success'=>false,'message'=>'Pembatalan gagal diproses. Periksa migrasi pembatalan dan coba lagi.'],500); }
