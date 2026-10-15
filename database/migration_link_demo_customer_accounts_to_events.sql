-- Hubungkan 12 akun pelanggan demo ke nama pelanggan event aktif per cabang.
-- Jalankan setelah database event Bali/Bandung dan data event Palembang tersedia.
-- Hanya mengganti nama pada 12 profil demo; tidak menyentuh tabel event/pembayaran/piutang.
START TRANSACTION;

UPDATE customers c
JOIN users u ON u.customer_id = c.id
JOIN branches b ON b.id = c.branch_id
SET c.name = CASE u.username
    WHEN 'dimas.sriwijaya' THEN 'Sponsor A'
    WHEN 'nadia.musi' THEN 'Sponsor B'
    WHEN 'rani.siger' THEN 'Sponsor D'
    WHEN 'ilyas.palembang' THEN 'Sponsor F'
    WHEN 'made.dewata' THEN 'Kementerian Pariwisata RI'
    WHEN 'ayu.purnama' THEN 'Keluarga Sarah Thompson'
    WHEN 'komang.aruna' THEN 'PT Telkom Indonesia'
    WHEN 'dhini.bali' THEN 'PT Alaya Hospitality Group'
    WHEN 'fajar.parahyangan' THEN 'Universitas Padjadjaran'
    WHEN 'intan.lembur' THEN 'Keluarga Sari Melati'
    WHEN 'keyla.bandung' THEN 'PT Kalya Fashion Indonesia'
    WHEN 'rizky.priangan' THEN 'PT PLN (Persero) Regional Jabar'
    ELSE c.name
END
WHERE u.role = 'pelanggan'
  AND ((b.name = 'Palembang' AND u.username IN ('dimas.sriwijaya','nadia.musi','rani.siger','ilyas.palembang'))
    OR (b.name = 'Bali' AND u.username IN ('made.dewata','ayu.purnama','komang.aruna','dhini.bali'))
    OR (b.name = 'Bandung' AND u.username IN ('fajar.parahyangan','intan.lembur','keyla.bandung','rizky.priangan')));

COMMIT;