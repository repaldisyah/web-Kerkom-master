const page = document.body.dataset.page;
const statusBox = document.getElementById('status');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);

function setStatus(message, error = false) {
    statusBox.textContent = message;
    statusBox.classList.toggle('error', error);
}

function redirectToLogin() {
    const login = new URL('login.html', window.location.href);
    login.searchParams.set('next', window.location.href);
    window.location.replace(login.href);
}

async function jsonFetch(url) {
    const response = await fetch(url, { cache: 'no-store' });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Server PHP belum berjalan. Buka aplikasi melalui localhost.');
    const data = await response.json();
    if (response.status === 401) redirectToLogin();
    if (!response.ok || !data.success) throw new Error(data.message || 'Data tidak dapat dimuat.');
    return data;
}

function addRow(values) {
    const row = document.createElement('tr');
    values.forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value ?? '-';
        row.append(cell);
    });
    tableBody.append(row);
}

function setScope(role) {
    const labels = { super_admin: 'Akun utama · semua cabang', admin_cabang: 'Akun cabang', pelanggan: 'Akun pelanggan' };
    const badge = document.getElementById('scopeBadge');
    if (badge) badge.textContent = labels[role] || role;
    if (role === 'pelanggan') document.querySelectorAll('.report-link').forEach(link => link.classList.add('hidden'));
}

function showEmpty(show) {
    emptyState.classList.toggle('hidden', !show);
    document.querySelector('.table-wrap').classList.toggle('hidden', show);
}

function renderCustomers(customers, role) {
    const ownAccount = role === 'pelanggan';
    if (ownAccount) {
        document.getElementById('pageTitle').textContent = 'Profil pelanggan saya';
        document.getElementById('sectionTitle').textContent = 'Data akun pelanggan';
        document.getElementById('sectionDescription').textContent = 'Anda hanya dapat melihat data yang terhubung dengan akun ini.';
    }
    customers.forEach(customer => addRow([
        customer.name, customer.branch, [customer.email, customer.phone].filter(Boolean).join(' · ') || '-',
        `${customer.event_count} event`, money(customer.outstanding_balance)
    ]));
}

function renderHistory(payments) {
    payments.forEach(payment => addRow([
        payment.payment_date, payment.payment_token, payment.customer, payment.branch,
        payment.payment_method, money(payment.amount)
    ]));
}

function renderReport(report) {
    const summary = report.summary || {};
    const summaryGrid = document.getElementById('summaryGrid');
    const values = [['Invoice', summary.invoice_count || 0], ['Nilai invoice', money(summary.invoiced)], ['Dana masuk', money(summary.collected)], ['Piutang tersisa', money(summary.outstanding)]];
    values.forEach(([label, value]) => {
        const card = document.createElement('div');
        card.className = 'stat';
        const title = document.createElement('span'); title.textContent = label;
        const number = document.createElement('strong'); number.textContent = value;
        card.append(title, number); summaryGrid.append(card);
    });
    report.by_branch.forEach(branch => addRow([branch.branch, branch.invoice_count, money(branch.invoiced), money(branch.collected), money(branch.outstanding)]));
    document.getElementById('yearLabel').textContent = report.year;
    showEmpty(Number(summary.invoice_count) === 0);
}

async function loadReport() {
    const yearSelect = document.getElementById('yearSelect');
    tableBody.replaceChildren();
    document.getElementById('summaryGrid').replaceChildren();
    setStatus('Memuat laporan...');
    try {
        const report = await jsonFetch(`../api/reports.php?year=${encodeURIComponent(yearSelect.value)}`);
        renderReport(report);
        setStatus(`Laporan ${report.year} berhasil dimuat.`);
    } catch (error) { setStatus(error.message, true); }
}

async function initialize() {
    try {
        const session = await jsonFetch('../api/session.php');
        if (!session.authenticated) return redirectToLogin();
        setScope(session.user.role);
        if (page === 'report') {
            const yearSelect = document.getElementById('yearSelect');
            const currentYear = new Date().getFullYear();
            for (let year = currentYear; year >= 2020; year -= 1) {
                const option = document.createElement('option'); option.value = year; option.textContent = year; yearSelect.append(option);
            }
            yearSelect.addEventListener('change', loadReport);
            await loadReport();
            return;
        }
        const endpoint = page === 'customers' ? '../api/customers.php' : '../api/payment-history.php';
        const data = await jsonFetch(endpoint);
        const rows = page === 'customers' ? data.customers : data.payments;
        if (page === 'customers') renderCustomers(rows, session.user.role); else renderHistory(rows);
        showEmpty(rows.length === 0);
        setStatus(rows.length ? `${rows.length} data berhasil dimuat.` : 'Belum ada data untuk akun ini.');
    } catch (error) { setStatus(error.message, true); }
}

initialize();
