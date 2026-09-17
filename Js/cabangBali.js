/**
 * ============================================================================
 * Nusa Karsa Event — Cabang Bali Event Monitoring System
 * Script File: Js/cabangBali.js
 * SQLite (SQL.js WASM) & Interactive Frontend Handlers
 * ============================================================================
 */

// Initial Seed / Fallback Data (17 Records from Raw OCR Table)
const MOCK_EVENTS = [
  {
    "no": 1,
    "id": "EDK-001",
    "nama_event": "Royal Beach Wedding - Putu & Kadek",
    "skala": "Besar",
    "jenis_acara": "Wedding",
    "tanggal": "05/03/2026",
    "lokasi": "Nusa Dua Beach Hotel",
    "pelanggan": "Keluarga Putu Wiranata",
    "rab": 230500000,
    "nilai_kontrak": 480000000,
    "dp": 144000000,
    "termin_2": 140000000,
    "pelunasan": 196000000,
    "total_dibayar": 480000000,
    "piutang": 0,
    "status": "Lunas",
    "jatuh_tempo": "21/02/2026",
    "status_data": "Final",
    "catatan": "-"
  },
  {
    "no": 2,
    "id": "EDK-002",
    "nama_event": "Rapat Kerja Nasional PT Astra Nusantara",
    "skala": "Besar",
    "jenis_acara": "Corporate Meeting",
    "tanggal": "10/04/2026",
    "lokasi": "Nusa Dua Convention Center",
    "pelanggan": "PT Astra Nusantara",
    "rab": 530500000,
    "nilai_kontrak": 650000000,
    "dp": 260000000,
    "termin_2": 195000000,
    "pelunasan": 195000000,
    "total_dibayar": 650000000,
    "piutang": 0,
    "status": "Lunas",
    "jatuh_tempo": "04/04/2026",
    "status_data": "Final",
    "catatan": "-"
  },
  {
    "no": 3,
    "id": "EDK-003",
    "nama_event": "Launching Produk Skincare GlowBali",
    "skala": "Besar",
    "jenis_acara": "Product Launching",
    "tanggal": "02/05/2026",
    "lokasi": "W Hotel Seminyak",
    "pelanggan": "PT GlowBali Kosmetik",
    "rab": 210000000,
    "nilai_kontrak": 300000000,
    "dp": 150000000,
    "termin_2": 0,
    "pelunasan": 150000000,
    "total_dibayar": 300000000,
    "piutang": 0,
    "status": "Lunas",
    "jatuh_tempo": "24/04/2026",
    "status_data": "Final",
    "catatan": "-"
  },
  {
    "no": 4,
    "id": "EDK-004",
    "nama_event": "Baby Shower & Family Party Ibu Ratna",
    "skala": "Kecil",
    "jenis_acara": "Family Party",
    "tanggal": "03/06/2026",
    "lokasi": "Villa Seminyak",
    "pelanggan": "Keluarga Ratna Dewi",
    "rab": 44000000,
    "nilai_kontrak": 55000000,
    "dp": 27500000,
    "termin_2": 0,
    "pelunasan": 27500000,
    "total_dibayar": 55000000,
    "piutang": 0,
    "status": "Lunas",
    "jatuh_tempo": "09/05/2026",
    "status_data": "Final",
    "catatan": "-"
  },
  {
    "no": 5,
    "id": "EDK-005",
    "nama_event": "Konferensi Pariwisata ASEAN 2026",
    "skala": "Besar",
    "jenis_acara": "Konferensi",
    "tanggal": "11/07/2026",
    "lokasi": "Bali Nusa Dua Convention Center",
    "pelanggan": "Kementerian Pariwisata RI",
    "rab": 980000000,
    "nilai_kontrak": 1200000000,
    "dp": 600000000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 600000000,
    "piutang": 600000000,
    "status": "Proses",
    "jatuh_tempo": "30/07/2026",
    "status_data": "Final",
    "catatan": "Pembayaran termin 2 & pelunasan belum diterima"
  },
  {
    "no": 6,
    "id": "EDK-006",
    "nama_event": "Wedding Destination Sarah & James",
    "skala": "Besar",
    "jenis_acara": "Wedding",
    "tanggal": "08/08/2026",
    "lokasi": "Ubud Jungle Resort",
    "pelanggan": "Keluarga Sarah Thompson",
    "rab": 160000000,
    "nilai_kontrak": 420000000,
    "dp": 210000000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 210000000,
    "piutang": 210000000,
    "status": "Proses",
    "jatuh_tempo": "30/07/2026",
    "status_data": "Final",
    "catatan": "Pelunasan belum diterima. Jatuh tempo H-7 sebelum acara."
  },
  {
    "no": 7,
    "id": "EDK-007",
    "nama_event": "Family Gathering PT Bank Sinar Mas",
    "skala": "Besar",
    "jenis_acara": "Family Gathering",
    "tanggal": "12/08/2026",
    "lokasi": "Kuta Beach Resort",
    "pelanggan": "PT Bank Sinar Mas",
    "rab": 150000000,
    "nilai_kontrak": 325000000,
    "dp": 162500000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 162500000,
    "piutang": 162500000,
    "status": "Proses",
    "jatuh_tempo": "05/08/2026",
    "status_data": "Final",
    "catatan": "Termin 2 / pelunasan menunggu konfirmasi divisi keuangan klien"
  },
  {
    "no": 8,
    "id": "EDK-008",
    "nama_event": "Konser Amal Peduli Anak Bali",
    "skala": "Besar",
    "jenis_acara": "Konser Amal",
    "tanggal": "25/09/2026",
    "lokasi": "GWK Cultural Park",
    "pelanggan": "Yayasan Peduli Anak Bali",
    "rab": 220000000,
    "nilai_kontrak": 280000000,
    "dp": 140000000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 140000000,
    "piutang": 140000000,
    "status": "Proses",
    "jatuh_tempo": "18/09/2026",
    "status_data": "Final",
    "catatan": "Pelunasan akan dilakukan setelah pencairan donasi event selesai"
  },
  {
    "no": 9,
    "id": "EDK-009",
    "nama_event": "Seminar Nasional Digital Marketing",
    "skala": "Kecil",
    "jenis_acara": "Seminar",
    "tanggal": "26/09/2026",
    "lokasi": "Harris Hotel Sunset Road, Denpasar",
    "pelanggan": "Komunitas Digital Bali",
    "rab": 85000000,
    "nilai_kontrak": 120000000,
    "dp": 60000000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 60000000,
    "piutang": 60000000,
    "status": "Proses",
    "jatuh_tempo": "20/09/2026",
    "status_data": "Final",
    "catatan": "Pelunasan dijadwalkan H-5 sebelum acara"
  },
  {
    "no": 10,
    "id": "EDK-010",
    "nama_event": "Pernikahan Adat Bali Made & Ayu",
    "skala": "Besar",
    "jenis_acara": "Wedding",
    "tanggal": "09/10/2026",
    "lokasi": "Puri Agung Mengwi, Badung",
    "pelanggan": "Keluarga I Made Suarjana",
    "rab": 310000000,
    "nilai_kontrak": 390000000,
    "dp": 195000000,
    "termin_2": 97500000,
    "pelunasan": 0,
    "total_dibayar": 292500000,
    "piutang": 97500000,
    "status": "Proses",
    "jatuh_tempo": "02/10/2026",
    "status_data": "Final",
    "catatan": "DP & termin 2 sudah lunas, menunggu pembayaran pelunasan akhir"
  },
  {
    "no": 11,
    "id": "EDK-011",
    "nama_event": "Annual Meeting PT Telkom Indonesia Regional Bali",
    "skala": "Besar",
    "jenis_acara": "Corporate Meeting",
    "tanggal": "24/10/2026",
    "lokasi": "Hotel Westin Nusa Dua",
    "pelanggan": "PT Telkom Indonesia",
    "rab": 320000000,
    "nilai_kontrak": 480000000,
    "dp": 240000000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 240000000,
    "piutang": 240000000,
    "status": "Proses",
    "jatuh_tempo": "17/10/2026",
    "status_data": "Final",
    "catatan": "Pelunasan menunggu persetujuan RAPS internal PT Telkom"
  },
  {
    "no": 12,
    "id": "EDK-012",
    "nama_event": "Product Launching Motor Listrik EvoBike",
    "skala": "Besar",
    "jenis_acara": "Product Launching",
    "tanggal": "07/11/2026",
    "lokasi": "Bali International Convention Centre",
    "pelanggan": "PT EvoBike Indonesia",
    "rab": 330000000,
    "nilai_kontrak": 520000000,
    "dp": 260000000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 260000000,
    "piutang": 260000000,
    "status": "Proses",
    "jatuh_tempo": "01/11/2026",
    "status_data": "Final",
    "catatan": "Sisa pembayaran 50% dijadwalkan H-7 sebelum launching"
  },
  {
    "no": 13,
    "id": "EDK-013",
    "nama_event": "Wedding Expo Bali 2026",
    "skala": "Besar",
    "jenis_acara": "Exhibition",
    "tanggal": "21/11/2026",
    "lokasi": "Bali Nusa Dua Theatre",
    "pelanggan": "Asosiasi Wedding Organizer Bali",
    "rab": 340000000,
    "nilai_kontrak": 450000000,
    "dp": 225000000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 225000000,
    "piutang": 225000000,
    "status": "Proses",
    "jatuh_tempo": "15/11/2026",
    "status_data": "Final",
    "catatan": "Sisa 50% akan dibayarkan setelah konfirmasi vendor & dekorasi"
  },
  {
    "no": 14,
    "id": "EDK-014",
    "nama_event": "Company Outing PT Unilever Indonesia",
    "skala": "Besar",
    "jenis_acara": "Company Outing",
    "tanggal": "15/12/2026",
    "lokasi": "Munduk Eco Resort, Buleleng",
    "pelanggan": "PT Unilever Indonesia",
    "rab": 350000000,
    "nilai_kontrak": 560000000,
    "dp": 280000000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 280000000,
    "piutang": 280000000,
    "status": "Proses",
    "jatuh_tempo": "08/12/2026",
    "status_data": "Final",
    "catatan": "Outing 2 hari 1 malam, pelunasan menunggu approval HRD"
  },
  {
    "no": 15,
    "id": "EDK-015",
    "nama_event": "Pernikahan Elegan Michael & Chelsea",
    "skala": "Besar",
    "jenis_acara": "Wedding",
    "tanggal": "12/12/2026",
    "lokasi": "Ayana Resort Jimbaran",
    "pelanggan": "Keluarga Michael Hartono",
    "rab": 360000000,
    "nilai_kontrak": 780000000,
    "dp": 390000000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 390000000,
    "piutang": 390000000,
    "status": "Proses",
    "jatuh_tempo": "05/12/2026",
    "status_data": "Final",
    "catatan": "Destination wedding internasional; pelunasan dijadwalkan 1 bulan sebelum acara"
  },
  {
    "no": 16,
    "id": "EDK-016",
    "nama_event": "Rapat Tahunan KSP Bali Sejahtera",
    "skala": "Sedang",
    "jenis_acara": "Corporate Meeting",
    "tanggal": "09/01/2027",
    "lokasi": "Grand Inna Kuta Hotel",
    "pelanggan": "KSP Bali Sejahtera",
    "rab": 75000000,
    "nilai_kontrak": 110000000,
    "dp": 55000000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 55000000,
    "piutang": 55000000,
    "status": "Proses",
    "jatuh_tempo": "02/01/2027",
    "status_data": "Final",
    "catatan": "Event perdana koperasi bersama Nusa Karsa; pelunasan H-7"
  },
  {
    "no": 17,
    "id": "EDK-017",
    "nama_event": "Konser Musik Jazz Sunset Sanur",
    "skala": "Sedang",
    "jenis_acara": "Konser Musik",
    "tanggal": "(belum dikonfirmasi)",
    "lokasi": "Pantai Sanur",
    "pelanggan": "Komunitas Jazz Bali",
    "rab": 95000000,
    "nilai_kontrak": 175000000,
    "dp": 87500000,
    "termin_2": 0,
    "pelunasan": 0,
    "total_dibayar": 87500000,
    "piutang": 87500000,
    "status": "Proses",
    "jatuh_tempo": "TBD",
    "status_data": "Draft",
    "catatan": "Tanggal event belum dikonfirmasi; kontrak masih berstatus Draft"
  }
];

// Global Variables
let dbInstance = null;
let currentEvents = [...MOCK_EVENTS];
let allEvents = [...MOCK_EVENTS];
let isSqlJsActive = false;

// Currency Formatter Helper (Rupiah)
function formatRupiah(number) {
  if (number === null || number === undefined || isNaN(number)) return 'Rp 0';
  return 'Rp ' + Number(number).toLocaleString('id-ID');
}

// Toast notification helper
function showToast(message) {
  const toast = document.getElementById('appToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

/**
 * Initialize SQLite via SQL.js WASM
 */
async function initSQLite() {
  const statusDot = document.getElementById('dbStatusDot');
  const statusText = document.getElementById('dbStatusText');

  try {
    if (typeof initSqlJs !== 'function') {
      throw new Error('Library SQL.js tidak ditemukan');
    }

    if (statusText) statusText.textContent = 'Memuat SQLite WASM...';

    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    // Create In-Memory SQLite Database
    dbInstance = new SQL.Database();

    // 1. Create Table Schema
    const createTableQuery = `
      CREATE TABLE events (
        no INTEGER PRIMARY KEY,
        id TEXT NOT NULL UNIQUE,
        nama_event TEXT NOT NULL,
        skala TEXT,
        jenis_acara TEXT,
        tanggal TEXT,
        lokasi TEXT,
        pelanggan TEXT,
        rab INTEGER DEFAULT 0,
        nilai_kontrak INTEGER DEFAULT 0,
        dp INTEGER DEFAULT 0,
        termin_2 INTEGER DEFAULT 0,
        pelunasan INTEGER DEFAULT 0,
        total_dibayar INTEGER DEFAULT 0,
        piutang INTEGER DEFAULT 0,
        status TEXT,
        jatuh_tempo TEXT,
        status_data TEXT,
        catatan TEXT
      );
    `;
    dbInstance.run(createTableQuery);

    // 2. Insert Mock Data into SQLite
    const insertStmt = dbInstance.prepare(`
      INSERT INTO events (no, id, nama_event, skala, jenis_acara, tanggal, lokasi, pelanggan, rab, nilai_kontrak, dp, termin_2, pelunasan, total_dibayar, piutang, status, jatuh_tempo, status_data, catatan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const ev of MOCK_EVENTS) {
      insertStmt.run([
        ev.no, ev.id, ev.nama_event, ev.skala, ev.jenis_acara,
        ev.tanggal, ev.lokasi, ev.pelanggan, ev.rab, ev.nilai_kontrak,
        ev.dp, ev.termin_2, ev.pelunasan, ev.total_dibayar, ev.piutang,
        ev.status, ev.jatuh_tempo, ev.status_data, ev.catatan
      ]);
    }
    insertStmt.free();

    // 3. Query All Data from SQLite
    allEvents = queryAllFromSQLite();
    currentEvents = [...allEvents];
    isSqlJsActive = true;

    // Update Status Indicator
    if (statusDot) statusDot.classList.add('active');
    if (statusText) statusText.textContent = `SQLite.js WASM Aktif (${MOCK_EVENTS.length} Baris)`;
    showToast('Database SQLite in-memory berhasil dimuat!');

  } catch (err) {
    console.warn('Gagal memuat SQL.js, beralih ke Fallback Mode:', err);
    isSqlJsActive = false;
    allEvents = [...MOCK_EVENTS];
    currentEvents = [...allEvents];

    if (statusDot) {
      statusDot.classList.remove('active');
      statusDot.style.backgroundColor = 'var(--info)';
    }
    if (statusText) statusText.textContent = 'Mode Data Standar Aktif';
    showToast('Berjalan dalam Mode Mock Data Standar.');
  }

  updateMetrics(currentEvents);
  renderTable(currentEvents);
}

/**
 * Query all events from SQLite
 */
function queryAllFromSQLite() {
  if (!dbInstance) return MOCK_EVENTS;

  const results = [];
  const stmt = dbInstance.prepare('SELECT * FROM events ORDER BY no ASC');
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

/**
 * Update Metric / KPI Cards
 */
function updateMetrics(events) {
  const totalCount = events.length;
  const totalKontrak = events.reduce((sum, item) => sum + (Number(item.nilai_kontrak) || 0), 0);
  const totalBayar = events.reduce((sum, item) => sum + (Number(item.total_dibayar) || 0), 0);
  const totalPiutang = events.reduce((sum, item) => sum + (Number(item.piutang) || 0), 0);

  const elCount = document.getElementById('metricTotalEvents');
  const elKontrak = document.getElementById('metricTotalKontrak');
  const elBayar = document.getElementById('metricTotalBayar');
  const elPiutang = document.getElementById('metricTotalPiutang');

  if (elCount) elCount.textContent = totalCount;
  if (elKontrak) elKontrak.textContent = formatRupiah(totalKontrak);
  if (elBayar) elBayar.textContent = formatRupiah(totalBayar);
  if (elPiutang) elPiutang.textContent = formatRupiah(totalPiutang);

  const rowCountBadge = document.getElementById('rowCountBadge');
  if (rowCountBadge) {
    rowCountBadge.textContent = `${totalCount} dari ${allEvents.length} Event Ditampilkan`;
  }
}

/**
 * Render Data Table
 */
function renderTable(events) {
  const tbody = document.getElementById('eventsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!events || events.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="19">
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3>Data Event Tidak Ditemukan</h3>
            <p>Tidak ada baris event yang cocok dengan kriteria pencarian atau filter saat ini.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  events.forEach(item => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;
    tr.title = 'Klik untuk melihat rincian lengkap event';
    tr.onclick = () => openDetailModal(item);

    // Skala badge class
    const skalaLower = (item.skala || '').toLowerCase();
    const skalaClass = skalaLower === 'besar' ? 'badge-skala-besar' : (skalaLower === 'sedang' ? 'badge-skala-sedang' : 'badge-skala-kecil');

    // Status badge class
    const statusLower = (item.status || '').toLowerCase();
    const statusClass = statusLower === 'lunas' ? 'badge-status-lunas' : 'badge-status-proses';

    tr.innerHTML = `
      <td style="text-align:center; font-weight:700; color:var(--text-muted);">${item.no}</td>
      <td class="td-id">${item.id}</td>
      <td class="td-event-name" title="${item.nama_event}">${item.nama_event}</td>
      <td><span class="badge ${skalaClass}">${item.skala || '-'}</span></td>
      <td>${item.jenis_acara || '-'}</td>
      <td>${item.tanggal || '-'}</td>
      <td>${item.lokasi || '-'}</td>
      <td>${item.pelanggan || '-'}</td>
      <td class="td-money">${formatRupiah(item.rab)}</td>
      <td class="td-money money-kontrak">${formatRupiah(item.nilai_kontrak)}</td>
      <td class="td-money">${formatRupiah(item.dp)}</td>
      <td class="td-money">${formatRupiah(item.termin_2)}</td>
      <td class="td-money">${formatRupiah(item.pelunasan)}</td>
      <td class="td-money money-bayar">${formatRupiah(item.total_dibayar)}</td>
      <td class="td-money money-piutang">${formatRupiah(item.piutang)}</td>
      <td><span class="badge ${statusClass}">${item.status || '-'}</span></td>
      <td>${item.jatuh_tempo || '-'}</td>
      <td><span class="badge badge-status-data">${item.status_data || '-'}</span></td>
      <td style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.catatan || '-'}">
        ${item.catatan && item.catatan !== '-' ? `<span class="catatan-indicator">📝 ${item.catatan}</span>` : '<span style="color:var(--text-muted);">-</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Filter & Search Handlers
 */
function applyFilters() {
  const searchVal = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const skalaVal = (document.getElementById('filterSkala')?.value || '').trim();
  const jenisVal = (document.getElementById('filterJenis')?.value || '').trim();
  const statusVal = (document.getElementById('filterStatus')?.value || '').trim();

  let filtered = allEvents.filter(item => {
    // Search match (Nama Event or ID or Lokasi or Jenis Acara or Pelanggan)
    const matchSearch = !searchVal || 
      (item.nama_event && item.nama_event.toLowerCase().includes(searchVal)) ||
      (item.id && item.id.toLowerCase().includes(searchVal)) ||
      (item.lokasi && item.lokasi.toLowerCase().includes(searchVal)) ||
      (item.jenis_acara && item.jenis_acara.toLowerCase().includes(searchVal)) ||
      (item.pelanggan && item.pelanggan.toLowerCase().includes(searchVal));

    // Skala match
    const matchSkala = !skalaVal || (item.skala === skalaVal);

    // Jenis Acara match
    const matchJenis = !jenisVal || (item.jenis_acara === jenisVal);

    // Status match
    const matchStatus = !statusVal || (item.status === statusVal);

    return matchSearch && matchSkala && matchJenis && matchStatus;
  });

  currentEvents = filtered;
  updateMetrics(currentEvents);
  renderTable(currentEvents);
}

function resetFilters() {
  const searchInput = document.getElementById('searchInput');
  const filterSkala = document.getElementById('filterSkala');
  const filterJenis = document.getElementById('filterJenis');
  const filterStatus = document.getElementById('filterStatus');

  if (searchInput) searchInput.value = '';
  if (filterSkala) filterSkala.value = '';
  if (filterJenis) filterJenis.value = '';
  if (filterStatus) filterStatus.value = '';

  currentEvents = [...allEvents];
  updateMetrics(currentEvents);
  renderTable(currentEvents);
  showToast('Filter pencarian telah direset');
}

/**
 * Detail Modal Popup
 */
function openDetailModal(item) {
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalDetailBody');
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Nomor & ID Event</div>
        <div class="detail-value" style="color:#818cf8;">#${item.no} — ${item.id}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Status & Skala</div>
        <div class="detail-value">
          <span class="badge ${item.status === 'Lunas' ? 'badge-status-lunas' : 'badge-status-proses'}">${item.status}</span>
          <span class="badge badge-skala-besar" style="margin-left:6px;">${item.skala}</span>
        </div>
      </div>
      <div class="detail-item" style="grid-column: span 2;">
        <div class="detail-label">Nama Event</div>
        <div class="detail-value" style="font-size:1.05rem;">${item.nama_event}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Jenis Acara</div>
        <div class="detail-value">${item.jenis_acara}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Tanggal Pelaksanaan</div>
        <div class="detail-value">${item.tanggal}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Lokasi</div>
        <div class="detail-value">${item.lokasi}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Pelanggan</div>
        <div class="detail-value">${item.pelanggan}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Jatuh Tempo</div>
        <div class="detail-value" style="color:#f59e0b;">${item.jatuh_tempo}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Status Data</div>
        <div class="detail-value">${item.status_data}</div>
      </div>
    </div>

    <div class="payment-breakdown-card">
      <div style="font-weight:700; font-size:0.88rem; color:#cbd5e1; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
        <span>💰 Rincian Finansial & Pembayaran</span>
      </div>
      <div class="breakdown-row">
        <span>Rancangan Anggaran Biaya (RAB):</span>
        <span>${formatRupiah(item.rab)}</span>
      </div>
      <div class="breakdown-row">
        <span>Nilai Kontrak:</span>
        <span class="money-kontrak">${formatRupiah(item.nilai_kontrak)}</span>
      </div>
      <div class="breakdown-row">
        <span>Uang Muka (DP):</span>
        <span>${formatRupiah(item.dp)}</span>
      </div>
      <div class="breakdown-row">
        <span>Termin 2:</span>
        <span>${formatRupiah(item.termin_2)}</span>
      </div>
      <div class="breakdown-row">
        <span>Pelunasan:</span>
        <span>${formatRupiah(item.pelunasan)}</span>
      </div>
      <div class="breakdown-row">
        <span style="color:#34d399;">Total Pembayaran Diterima:</span>
        <span class="money-bayar">${formatRupiah(item.total_dibayar)}</span>
      </div>
      <div class="breakdown-row">
        <span style="color:#f87171;">Sisa Piutang:</span>
        <span class="money-piutang">${formatRupiah(item.piutang)}</span>
      </div>
    </div>

    <div style="margin-top:16px; background:rgba(15,23,42,0.6); padding:12px 14px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
      <div class="detail-label">Catatan Teknis / Anomali OCR:</div>
      <div style="font-size:0.85rem; color:#94a3b8; font-style:italic;">${item.catatan || 'Tidak ada catatan khusus.'}</div>
    </div>
  `;

  modal.classList.add('active');
}

function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('active');
}

/**
 * SQL Console & Query Runner
 */
function toggleSqlConsole() {
  const body = document.getElementById('sqlConsoleBody');
  if (!body) return;
  body.classList.toggle('open');
}

function runCustomQuery() {
  const queryInput = document.getElementById('sqlQueryInput');
  const resultArea = document.getElementById('sqlResultArea');
  if (!queryInput || !resultArea) return;

  const sql = queryInput.value.trim();
  if (!sql) {
    showToast('Ketik perintah SQL terlebih dahulu');
    return;
  }

  if (!isSqlJsActive || !dbInstance) {
    resultArea.style.display = 'block';
    resultArea.innerHTML = `<span style="color:#f87171;">⚠️ Engine SQLite (SQL.js) belum aktif di browser. Perintah SQL kustom hanya dapat dieksekusi saat koneksi WASM siap.</span>`;
    return;
  }

  try {
    const res = dbInstance.exec(sql);
    resultArea.style.display = 'block';

    if (res.length === 0) {
      resultArea.innerHTML = `<span style="color:#6ee7b7;">Perintah SQL berhasil dieksekusi (0 baris dikembalikan atau aksi non-SELECT).</span>`;
      // Refresh current table if table was modified
      allEvents = queryAllFromSQLite();
      applyFilters();
      return;
    }

    const columns = res[0].columns;
    const values = res[0].values;

    let html = `<div style="margin-bottom:8px; color:#38bdf8;">Query: <code>${sql}</code> (${values.length} baris)</div>`;
    html += '<table style="width:100%; border-collapse:collapse; font-size:0.75rem; color:#cbd5e1;">';
    html += '<tr style="background:#1e293b; color:#93c5fd;">' + columns.map(c => `<th style="padding:6px 8px; border:1px solid #334155;">${c}</th>`).join('') + '</tr>';

    values.forEach(row => {
      html += '<tr>' + row.map(v => `<td style="padding:6px 8px; border:1px solid #334155;">${v === null ? 'NULL' : v}</td>`).join('') + '</tr>';
    });
    html += '</table>';

    resultArea.innerHTML = html;
    showToast(`SQL berhasil: ${values.length} baris dikembalikan`);

    // If query was a SELECT * FROM events with filters, also update the main table!
    if (sql.toLowerCase().startsWith('select') && sql.toLowerCase().includes('from events')) {
      const parsedRows = values.map(valArray => {
        const obj = {};
        columns.forEach((col, idx) => { obj[col] = valArray[idx]; });
        return obj;
      });
      currentEvents = parsedRows;
      updateMetrics(currentEvents);
      renderTable(currentEvents);
    }
  } catch (err) {
    resultArea.style.display = 'block';
    resultArea.innerHTML = `<span style="color:#ef4444;">❌ Error SQL: ${err.message}</span>`;
  }
}

function setSqlPreset(query) {
  const queryInput = document.getElementById('sqlQueryInput');
  if (queryInput) {
    queryInput.value = query;
    runCustomQuery();
  }
}

/**
 * Export Table to CSV
 */
function exportToCSV() {
  if (!currentEvents || currentEvents.length === 0) {
    showToast('Tidak ada data untuk diekspor');
    return;
  }

  const headers = ['No', 'ID', 'Nama Event', 'Skala', 'Jenis Acara', 'Tanggal', 'Lokasi', 'Pelanggan', 'RAB', 'Nilai Kontrak', 'DP', 'Termin 2', 'Pelunasan', 'Total Dibayar', 'Piutang', 'Status', 'Jatuh Tempo', 'Status Data', 'Catatan'];
  
  const csvRows = [];
  csvRows.push(headers.join(','));

  currentEvents.forEach(row => {
    const values = [
      row.no,
      `"${row.id}"`,
      `"${(row.nama_event || '').replace(/"/g, '""')}"`,
      `"${row.skala || ''}"`,
      `"${(row.jenis_acara || '').replace(/"/g, '""')}"`,
      `"${row.tanggal || ''}"`,
      `"${(row.lokasi || '').replace(/"/g, '""')}"`,
      `"${(row.pelanggan || '').replace(/"/g, '""')}"`,
      row.rab || 0,
      row.nilai_kontrak || 0,
      row.dp || 0,
      row.termin_2 || 0,
      row.pelunasan || 0,
      row.total_dibayar || 0,
      row.piutang || 0,
      `"${row.status || ''}"`,
      `"${row.jatuh_tempo || ''}"`,
      `"${row.status_data || ''}"`,
      `"${(row.catatan || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(values.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Events_Cabang_Bali_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('File CSV berhasil diunduh!');
}

// Global Event Listeners initialization
document.addEventListener('DOMContentLoaded', () => {
  // Input search event listener
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // Filter dropdown listeners
  const filterSkala = document.getElementById('filterSkala');
  if (filterSkala) {
    filterSkala.addEventListener('change', applyFilters);
  }

  const filterJenis = document.getElementById('filterJenis');
  if (filterJenis) {
    filterJenis.addEventListener('change', applyFilters);
  }

  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) {
    filterStatus.addEventListener('change', applyFilters);
  }

  // Close modal when clicking outside content
  const modal = document.getElementById('detailModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDetailModal();
    });
  }

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetailModal();
  });

  // Start SQLite initialization
  initSQLite();
});
