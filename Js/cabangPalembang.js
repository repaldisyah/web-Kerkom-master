const rows = document.getElementById("eventRows");
const summary = document.getElementById("summary");
const errorBox = document.getElementById("error");
const searchInput = document.getElementById("search");
const statusFilter = document.getElementById("statusFilter");
let events = [];
let canDeleteEvents = false;
let canRequestDeletion = false;

const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const formatDate = value => {
    if (!value) return "Tanggal belum dicatat";
    const parts = String(value).slice(0, 10).split("-");
    if (parts.length !== 3) return escapeHtml(value);
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))));
};

function renderSummary(data) {
    const cards = [
        ["Jumlah event", Number(data.jumlah_event || 0).toLocaleString("id-ID")],
        ["Nilai kontrak", money(data.total_kontrak)],
        ["Sudah dibayar", money(data.total_dibayar)],
        ["Sisa piutang", money(data.total_piutang)],
        ["Piutang terlambat", `${Number(data.jumlah_terlambat || 0).toLocaleString("id-ID")} event`]
    ];
    summary.innerHTML = cards.map(([label, value]) => `<article class="palembang-metric"><span>${label}</span><strong>${escapeHtml(value)}</strong></article>`).join("");
}

function renderRows() {
    const query = searchInput.value.trim().toLocaleLowerCase("id-ID");
    const status = statusFilter.value;
    const filtered = events.filter(event => {
        const text = `${event.id} ${event.nama_event} ${event.pelanggan} ${event.lokasi}`.toLocaleLowerCase("id-ID");
        return (!query || text.includes(query)) && (!status || event.status_terkini === status);
    });
    if (!filtered.length) {
        rows.innerHTML = '<tr><td colspan="12">Tidak ada event yang cocok.</td></tr>';
        return;
    }
    rows.innerHTML = filtered.map(event => {
        const paid = Number(event.piutang) <= 0;
        const statusClass = paid ? "paid" : event.status_terkini === "Menunggak" ? "overdue" : "open";
        const dueLabel = event.hari_terlambat > 0
            ? `${formatDate(event.tgl_jatuh_tempo)}<br><span class="event-id">Terlambat ${Number(event.hari_terlambat).toLocaleString("id-ID")} hari</span>`
            : formatDate(event.tgl_jatuh_tempo);
        const paymentUrl = `pembayaran.html?source=palembang&event_id=${encodeURIComponent(event.id)}`;
        const deletionAction = canDeleteEvents
            ? `<button type="button" data-delete="${escapeHtml(event.id)}">Hapus</button>`
            : canRequestDeletion ? `<button type="button" data-request-delete="${escapeHtml(event.id)}">Minta hapus</button>` : '';
        return `<tr>
            <td><span class="event-name">${escapeHtml(event.nama_event)}</span><span class="event-id">${escapeHtml(event.id)} · Sumber: ${escapeHtml(event.sumber_data)}</span></td>
            <td>${escapeHtml(event.skala)}<br><span class="event-id">${escapeHtml(event.jenis_acara)}</span></td>
            <td>${escapeHtml(event.pelanggan)}<br><span class="event-id">${escapeHtml(event.lokasi)}</span></td>
            <td>${formatDate(event.tgl_event)}</td>
            <td>${money(event.hpp_rab)}<br><span class="event-id">Margin ${Number(event.margin_persen).toLocaleString("id-ID")}%</span></td>
            <td>${money(event.nilai_kontrak)}</td>
            <td><span class="event-id">DP</span> ${money(event.dp)}<br><span class="event-id">Termin 2</span> ${money(event.termin_2)}<br><span class="event-id">Pelunasan</span> ${money(event.pelunasan)}</td>
            <td>${money(event.total_dibayar)}</td>
            <td><strong>${money(event.piutang)}</strong></td>
            <td>${dueLabel}</td>
            <td><span class="palembang-status ${statusClass}">${escapeHtml(event.status_terkini)}</span><span class="event-id">Data sumber: ${escapeHtml(event.status_sumber)}</span></td>
            <td>${paid ? '<span class="palembang-pay disabled">Lunas</span>' : `<a class="palembang-pay" href="${paymentUrl}"><i class="fa-solid fa-money-bill-wave"></i> Bayar ${money(event.piutang)}</a>`} ${deletionAction}</td>
        </tr>`;
    }).join("");
}

async function loadEvents() {
    try {
        const response = await fetch("../api/palembang-events.php", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Data event Palembang gagal dimuat.");
        events = result.events || [];
        renderSummary(result.summary || {});
        renderRows();
    } catch (error) {
        errorBox.textContent = `${error.message} Pastikan migrasi database/migration_add_palembang_events.sql sudah dijalankan.`;
        errorBox.hidden = false;
        rows.innerHTML = '<tr><td colspan="12">Data belum tersedia.</td></tr>';
        summary.innerHTML = "";
    }
}

rows.addEventListener('click', async event => {
    const requestId = event.target.dataset.requestDelete;
    const deleteId = event.target.dataset.delete;
    if (requestId && canRequestDeletion) {
        const reason = prompt('Jelaskan alasan penghapusan event ini:');
        if (!reason || !reason.trim()) return;
        try {
            const response = await fetch('../api/deletion-requests.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch: 'palembang', event_id: requestId, reason: reason.trim() }) });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Permintaan gagal.');
            errorBox.textContent = result.message; errorBox.hidden = false;
        } catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; }
    } else if (deleteId && canDeleteEvents && confirm(`Hapus ${deleteId}? Riwayat pembayaran akan tetap tersimpan.`)) {
        try {
            const response = await fetch(`../api/palembang-events.php?id=${encodeURIComponent(deleteId)}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Penghapusan gagal.');
            await loadEvents();
        } catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; }
    }
});

searchInput.addEventListener("input", renderRows);
statusFilter.addEventListener("change", renderRows);
(async () => {
    try {
        const response = await fetch('../api/session.php', { cache: 'no-store' });
        const session = await response.json();
        if (!session.authenticated) { const login = new URL('login.html', window.location.href); login.searchParams.set('next', window.location.href); location.replace(login.href); return; }
        canDeleteEvents = ['admin_pusat', 'super_admin'].includes(session.user.role);
        canRequestDeletion = session.user.role === 'admin_cabang';
        await loadEvents();
    } catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; }
})();
