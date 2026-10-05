const tableBody = document.getElementById('tableBody');
const statusBox = document.getElementById('status');
const emptyState = document.getElementById('emptyState');
const rowCount = document.getElementById('rowCount');
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);

function showStatus(message, error = false) {
    statusBox.textContent = message;
    statusBox.classList.toggle('error', error);
}

function displayDate(value) {
    if (!value) return '-';
    const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return String(value);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        .toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function appendCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value ?? '-';
    row.append(cell);
}

function renderReceivables(receivables) {
    tableBody.replaceChildren();
    receivables.forEach(item => {
        const row = document.createElement('tr');
        const due = item.due_date ? new Date(`${String(item.due_date).slice(0, 10)}T00:00:00`) : null;
        const overdue = due && !Number.isNaN(due.getTime()) && due < new Date(new Date().setHours(0, 0, 0, 0));
        appendCell(row, displayDate(item.due_date));
        appendCell(row, item.customer);
        appendCell(row, item.branch);
        appendCell(row, item.event);
        appendCell(row, money(item.total_amount));
        appendCell(row, money(item.balance));
        appendCell(row, overdue ? 'Lewat tenggat' : (item.status || 'Belum lunas'));
        if (overdue) row.classList.add('overdue-row');
        tableBody.append(row);
    });
    rowCount.textContent = `${receivables.length} piutang aktif`;
    emptyState.classList.toggle('hidden', receivables.length !== 0);
    document.querySelector('.table-wrap').classList.toggle('hidden', receivables.length === 0);
}

async function requestJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('API tidak mengembalikan JSON. Pastikan halaman dibuka melalui Apache XAMPP.');
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || `Permintaan gagal (${response.status}).`);
    return data;
}

async function initializeReceivables() {
    try {
        const session = await requestJson('../api/session.php');
        if (!session.authenticated) {
            const login = new URL('login.html', window.location.href);
            login.searchParams.set('next', window.location.href);
            window.location.replace(login.href);
            return;
        }
        if (session.user.role === 'pelanggan') {
            window.location.replace(new URL('history.html', window.location.href));
            return;
        }
        showStatus('Memuat daftar piutang...');
        const result = await requestJson('../api/receivables.php');
        renderReceivables(result.receivables || []);
        showStatus('Daftar piutang berhasil dimuat.');
    } catch (error) {
        rowCount.textContent = 'Daftar piutang belum tersedia';
        renderReceivables([]);
        showStatus(error.message, true);
    }
}

initializeReceivables();
