const api = '../api/events.php';
const form = document.querySelector('#eventForm');
const rows = document.querySelector('#eventRows');
const notice = document.querySelector('#notice');
const errorBox = document.querySelector('#error');
const search = document.querySelector('#search');
const statusFilter = document.querySelector('#statusFilter');
const scaleFilter = document.querySelector('#scaleFilter');
const partyFilter = document.querySelector('#partyFilter');
const calculator = document.querySelector('#calculator');
const formTitle = document.querySelector('#formTitle');
const submitButton = document.querySelector('#submitButton');
let events = [];
let editId = null;

const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const values = () => Object.fromEntries(new FormData(form));
const calculate = data => {
    const contract = Number(data.hpp_rab || 0) + Number(data.margin || 0);
    const dp = contract * ({ Besar: 0.4, Sedang: 0.3, Kecil: 0.5 }[data.skala] || 0.5);
    const paid = Number(data.total_dibayar || 0);
    const termin = paid > dp ? Math.min(contract * 0.3, paid - dp) : 0;
    return { contract, dp, termin, pelunasan: Math.max(contract - dp - termin, 0), piutang: Math.max(contract - paid, 0) };
};

function showNotice(message, error) {
    notice.textContent = message;
    notice.hidden = false;
    notice.classList.toggle('error', Boolean(error));
}

async function request(url = api, options = {}) {
    const response = await fetch(url, { ...options, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Permintaan gagal.');
    return result;
}

function renderCalculator() {
    const result = calculate(values());
    const items = [['Nilai kontrak', result.contract], ['DP perkiraan', result.dp], ['Termin 2 perkiraan', result.termin], ['Sisa jadwal pelunasan', result.pelunasan], ['Sisa piutang', result.piutang]];
    calculator.innerHTML = items.map(item => '<div><span>' + item[0] + '</span><strong>' + money(item[1]) + '</strong></div>').join('');
}

function renderSummary(summary) {
    const cards = [
        ['Jumlah event', (Number(summary.jumlah_event ?? events.length)).toLocaleString('id-ID') + ' event'],
        ['Nilai kontrak', money(summary.total_nilai_kontrak)],
        ['Sudah dibayar', money(summary.total_dibayar)],
        ['Sisa piutang', money(summary.total_piutang)],
        ['Piutang jatuh tempo', money(summary.piutang_jatuh_tempo)]
    ];
    document.querySelector('#summary').innerHTML = cards.map(item => '<article class="stat palembang-metric"><span>' + item[0] + '</span><strong>' + escapeHtml(item[1]) + '</strong></article>').join('');
}

function visibleEvents() {
    const keyword = search.value.trim().toLocaleLowerCase('id-ID');
    return events.filter(event =>
        (String(event.id) + ' ' + String(event.nama_event) + ' ' + String(event.jenis_acara) + ' ' + String(event.pelanggan)).toLocaleLowerCase('id-ID').includes(keyword)
        && (!statusFilter.value || event.status_piutang === statusFilter.value)
        && (!scaleFilter.value || event.skala === scaleFilter.value)
        && (!partyFilter.value || event.jenis_pihak === partyFilter.value)
    );
}

function displayDate(value) {
    if (!value) return '-';
    const parts = String(value).slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return escapeHtml(value);
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])));
}

function renderRows() {
    const visible = visibleEvents();
    if (!visible.length) {
        rows.innerHTML = '<tr><td colspan="19">Tidak ada event yang cocok dengan pencarian atau filter.</td></tr>';
        return;
    }
    rows.innerHTML = visible.map(event => '<tr>'
        + '<td><b>' + escapeHtml(event.id) + '</b><br><span class="event-id">' + escapeHtml(event.nama_event) + '</span></td>'
        + '<td>' + escapeHtml(event.skala) + '</td><td>' + escapeHtml(event.jenis_acara) + '</td>'
        + '<td>' + displayDate(event.tgl_event) + '</td><td>' + escapeHtml(event.lokasi || '-') + '</td><td>' + escapeHtml(event.pelanggan || '-') + '</td>'
        + '<td>' + escapeHtml(event.jenis_pihak) + '</td><td>' + money(event.hpp_rab) + '</td><td>' + money(event.margin) + '</td>'
        + '<td>' + money(event.nilai_kontrak) + '</td><td>' + money(event.dp) + '</td><td>' + money(event.termin_2) + '</td><td>' + money(event.pelunasan) + '</td>'
        + '<td>' + money(event.total_dibayar) + '</td><td><strong>' + money(event.piutang) + '</strong></td><td>' + displayDate(event.tgl_jatuh_tempo) + '</td>'
        + '<td>' + escapeHtml(event.status_data) + '</td><td><span class="tag ' + escapeHtml(event.indikator_warna) + '">' + escapeHtml(event.status_piutang) + '</span></td>'
        + '<td class="actions"><button type="button" data-edit="' + escapeHtml(event.id) + '" aria-label="Ubah ' + escapeHtml(event.nama_event) + '">Ubah</button>'
        + '<button type="button" class="delete" data-delete="' + escapeHtml(event.id) + '" aria-label="Hapus ' + escapeHtml(event.nama_event) + '">Hapus</button></td></tr>'
    ).join('');
}

async function load() {
    try {
        if (errorBox) errorBox.hidden = true;
        const data = await request();
        events = Array.isArray(data.events) ? data.events : [];
        renderSummary(data.summary || {});
        renderRows();
    } catch (error) {
        showNotice(error.message, true);
        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.hidden = false;
        }
        rows.innerHTML = '<tr><td colspan="19">Data event belum dapat dimuat.</td></tr>';
        document.querySelector('#summary').innerHTML = '';
    }
}

function resetForm() {
    form.reset();
    ['hpp_rab', 'margin', 'total_dibayar'].forEach(name => form.elements[name].value = 0);
    form.elements.id.disabled = false;
    editId = null;
    formTitle.textContent = 'Tambah event Bali';
    submitButton.textContent = 'Simpan event';
    renderCalculator();
}

function edit(id) {
    const event = events.find(item => item.id === id);
    if (!event) return;
    Object.entries(event).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; });
    form.elements.id.disabled = true;
    editId = id;
    formTitle.textContent = 'Ubah ' + id;
    submitButton.textContent = 'Perbarui event';
    renderCalculator();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

form.addEventListener('input', renderCalculator);
form.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = values();
    ['hpp_rab', 'margin', 'total_dibayar'].forEach(key => payload[key] = Number(payload[key] || 0));
    try {
        const url = editId ? api + '?id=' + encodeURIComponent(editId) : api;
        await request(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        showNotice(editId ? 'Event berhasil diperbarui.' : 'Event berhasil ditambahkan.');
        resetForm();
        await load();
    } catch (error) {
        showNotice(error.message, true);
    }
});

rows.addEventListener('click', async event => {
    const id = event.target.dataset.edit || event.target.dataset.delete;
    if (!id) return;
    if (event.target.dataset.edit) return edit(id);
    if (!confirm('Hapus ' + id + '?')) return;
    try {
        await request(api + '?id=' + encodeURIComponent(id), { method: 'DELETE' });
        showNotice('Event berhasil dihapus.');
        await load();
    } catch (error) {
        showNotice(error.message, true);
    }
});

[search, statusFilter, scaleFilter, partyFilter].forEach(control => control.addEventListener('input', renderRows));
[statusFilter, scaleFilter, partyFilter].forEach(control => control.addEventListener('change', renderRows));
document.querySelector('#resetButton').addEventListener('click', resetForm);
resetForm();
load();
