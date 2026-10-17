const page = document.body.dataset.page;
const statusBox = document.getElementById('status');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
let activeRole = null;
let currentUser = null;
let lastReport = null;
let lastPayments = [];
let lastHistoryWarnings = [];
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

function localMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

async function setScope(user) {
    const role = user.role;
    activeRole = role;
    const labels = { admin_pusat: 'Admin pusat · semua cabang', super_admin: 'Admin pusat · semua cabang', admin_cabang: 'Admin cabang', pelanggan: 'Pelanggan · akun pribadi' };
    const badge = document.getElementById('scopeBadge');
    if (badge) badge.textContent = labels[role] || role;
    if (role === 'pelanggan') {
        document.querySelectorAll('.export-controls').forEach(control => control.classList.add('hidden'));
        document.querySelectorAll('.report-link').forEach(link => link.classList.add('hidden'));
        document.querySelectorAll('.nav-menu .nav-item').forEach(link => {
            const path = new URL(link.href, window.location.href).pathname.toLowerCase();
            if (/\/(cabang(?:palembang|bandung|bali)?|laporan|events-(?:bali|bandung))\.html$/.test(path)) {
                link.classList.add('hidden');
            }
        });
        document.querySelectorAll('.nav-menu .nav-branch').forEach(link => link.classList.add('hidden'));
        document.querySelectorAll('.nav-menu .nav-item').forEach(link => {
            if (/\/history\.html$/i.test(new URL(link.href, window.location.href).pathname)) {
                const label = link.querySelector('span');
                if (label) label.textContent = 'Riwayat Pembayaran';
            }
        });
        return;
    }
    if (['admin_pusat', 'super_admin'].includes(role)) {
        const filter = document.getElementById('historyBranchFilterWrap');
        if (filter) filter.hidden = false;
    }
    if (role === 'admin_cabang') {
        const data = await jsonFetch('../api/branches.php');
        const branch = data.branches.find(item => Number(item.id) === Number(data.own_branch_id))?.name;
        if (badge && branch) badge.textContent = `Admin cabang · ${branch}`;
        const allowedBranches = new Set(branch ? [String(branch).trim().toLowerCase().replace(/^cabang\s+/, '')] : []);
        document.querySelectorAll('.nav-menu .nav-branch').forEach(link => {
            const branchKey = [...link.classList].find(name => name.startsWith('nav-branch-') && name !== 'nav-branch')?.replace('nav-branch-', '');
            if (!allowedBranches.has(branchKey)) link.classList.add('hidden');
        });
    }
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

    const orderedCustomers = [...customers].sort((left, right) => {
        const balanceDifference = (Number(right.outstanding_balance) || 0) - (Number(left.outstanding_balance) || 0);
        if (balanceDifference !== 0) return balanceDifference;

        const eventDifference = (Number(right.event_count) || 0) - (Number(left.event_count) || 0);
        if (eventDifference !== 0) return eventDifference;

        return String(left.name).localeCompare(String(right.name), 'id');
    });

    orderedCustomers.forEach(customer => addRow([
        customer.id, customer.name, customer.email || '-', customer.phone || '-', customer.address || '-', customer.branch,
        String(customer.event_count) + ' event', money(customer.outstanding_balance)
    ]));
}

function renderHistory(payments) {
    payments.forEach(payment => {
        const total = Number(payment.total_amount);
        const balance = Number(payment.balance);
        const progress = Number.isFinite(total) && total > 0
            ? Math.max(0, Math.min(100, Math.round(((total - balance) / total) * 100)))
            : null;
        const progressNote = progress === null ? '' : `Progres tagihan saat ini ${progress}% lunas`;
        const note = [payment.note, progressNote].filter(Boolean).join(' · ');
        addRow([
            payment.payment_date || 'Tanggal tidak tercatat', payment.payment_token, payment.customer, payment.branch,
            payment.event, payment.record_type === 'historical_balance' ? 'Saldo historis' : payment.record_type === 'demo_simulation' ? 'Simulasi (belum diverifikasi)' : payment.payment_method, money(payment.amount), note || '-'
        ]);
        if (page === 'history') {
            const cell = document.createElement('td');
            if (payment.cancelled_at) {
                cell.textContent = `DIBATALKAN · ${payment.cancelled_at} · ${payment.cancelled_by_role || 'akun'} #${payment.cancelled_by || '?'}${payment.cancellation_reason ? ` · ${payment.cancellation_reason}` : ''}`;
                cell.className = 'cancelled-payment';
            } else if (payment.can_cancel) {
                const button = document.createElement('button');
                button.type = 'button'; button.textContent = 'Batalkan'; button.className = 'cancel-payment-button';
                button.addEventListener('click', () => cancelPayment(payment, button));
                cell.append(button);
            } else cell.textContent = 'Aktif';
            tableBody.lastElementChild.append(cell);
        }
    });
}

async function cancelPayment(payment, button) {
    const reason = window.prompt(`Alasan pembatalan transaksi ${payment.payment_token}:`);
    if (reason === null) return;
    if (!reason.trim()) { setStatus('Alasan pembatalan wajib diisi.', true); return; }
    if (!window.confirm(`Batalkan Rp ${new Intl.NumberFormat('id-ID').format(Number(payment.amount) || 0)}? Saldo tagihan akan disesuaikan dan tindakan tercatat.`)) return;
    button.disabled = true;
    try {
        const response = await fetch('../api/payment-cancellations.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: payment.source, transaction_id: payment.transaction_id, reason: reason.trim() }) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Pembatalan gagal.');
        setStatus(data.message);
        await loadHistory();
    } catch (error) { setStatus(error.message, true); button.disabled = false; }
}

async function loadHistory() {
    lastPayments = [];
    lastHistoryWarnings = [];
    tableBody.replaceChildren();
    setStatus('Memuat riwayat pembayaran...');
    try {
        const branch = document.getElementById('historyBranchFilter')?.value || '';
        const month = document.getElementById('historyMonth')?.value || '';
        if (!month) throw new Error('Pilih bulan transaksi untuk memuat riwayat.');
        const params = new URLSearchParams();
        if (activeRole && ['admin_pusat', 'super_admin'].includes(activeRole) && branch) params.set('branch', branch);
        const suffix = params.size ? `?${params}` : '';
        const data = await jsonFetch(`../api/payment-history.php${suffix}`);
        const payments = (data.payments || []).filter(payment => !month || String(payment.payment_date || '').slice(0, 7) === month);
        lastPayments = payments;
        lastHistoryWarnings = data.warnings || [];
        renderHistory(payments);
        showEmpty(payments.length === 0);
        const warningText = (data.warnings || []).join(' ');
        setStatus(`${payments.length} transaksi ${month ? `pada ${month}` : ''} dimuat.${warningText ? ` ${warningText}` : ''}`, Boolean(warningText));
    } catch (error) { setStatus(error.message, true); }
}

function renderReport(report) {
    lastReport = report;
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
    document.getElementById('periodHeading').textContent = `Rekap ${new Date(`${report.period || `${report.year}-01`}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    const hasReportData = ['invoice_count', 'invoiced', 'collected', 'outstanding'].some(key => Number(summary[key]) !== 0);
    showEmpty(!hasReportData);
}

async function loadReport() {
    lastReport = null;
    tableBody.replaceChildren();
    document.getElementById('summaryGrid').replaceChildren();
    setStatus('Memuat laporan...');
    try {
        const month = document.getElementById('reportMonth').value;
        if (!month) throw new Error('Pilih bulan laporan.');
        const reportUrl = `../api/reports.php?month=${encodeURIComponent(month)}`;
        const report = await jsonFetch(reportUrl);
        renderReport(report);
        const warningText = (report.warnings || []).join(' ');
        setStatus(`Laporan ${report.period} berhasil dimuat.${warningText ? ` ${warningText}` : ''}`, Boolean(warningText));
    } catch (error) { setStatus(error.message, true); }
}

async function initialize() {
    try {
        const session = await jsonFetch('../api/session.php');
        if (!session.authenticated) return redirectToLogin();
        currentUser = session.user;
        await setScope(session.user);
        if (page === 'report') {
            if (session.user.role === 'pelanggan') {
                window.location.replace('../halaman.html');
                return;
            }
            document.getElementById('reportMonth').value = localMonth();
            document.getElementById('reportMonth').addEventListener('change', loadReport);
            await loadReport();
            return;
        }
        if (page === 'history') {
            document.getElementById('historyBranchFilter')?.addEventListener('change', loadHistory);
            document.getElementById('historyMonth').value = localMonth();
            document.getElementById('historyMonth').addEventListener('change', loadHistory);
            await loadHistory();
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

document.querySelectorAll('[data-export]').forEach(button => button.addEventListener('click', () => {
    const format = button.dataset.export;
    let payload;
    if (page === 'report' && lastReport) {
        const scopeLabel = currentUser?.role === 'admin_cabang'
            ? `Admin cabang · ${lastReport.by_branch.map(branch => branch.branch).join(', ') || 'cabang akun'}`
            : 'Admin pusat · semua cabang';
        const period = `${lastReport.period} · ${scopeLabel} · dibuat ${new Date().toLocaleString('id-ID')}`;
        const summary = lastReport.summary;
        const warningNote = (lastReport.warnings || []).length ? ` Peringatan kelengkapan data: ${lastReport.warnings.join(' ')}` : '';
        payload = { filename: 'laporan-bulanan', title: 'Laporan Bulanan Nusa Karsa Event', period, description: `Jumlah dan nilai invoice/event mengikuti tanggal invoice atau tanggal event. Dana masuk mengikuti tanggal transaksi pembayaran. Piutang adalah saldo invoice/event pada bulan laporan.${warningNote}`, headers: ['Cabang', 'Jumlah invoice/event', 'Nilai invoice/kontrak (IDR)', 'Dana masuk (IDR)', 'Piutang tersisa (IDR)'], rows: [
            ['TOTAL', summary.invoice_count, summary.invoiced, summary.collected, summary.outstanding],
            ...lastReport.by_branch.map(item => [item.branch, item.invoice_count, item.invoiced, item.collected, item.outstanding])
        ] };
    } else if (page === 'history') {
        const month = document.getElementById('historyMonth').value;
        const selectedBranch = currentUser?.role === 'admin_cabang'
            ? (document.getElementById('scopeBadge')?.textContent || 'Cabang akun')
            : (document.getElementById('historyBranchFilter')?.selectedOptions[0]?.textContent || 'Semua cabang');
        const roleLabel = currentUser?.role === 'admin_cabang' ? 'Admin cabang' : 'Admin pusat';
        const rows = lastPayments.map(item => [item.payment_date || '-', item.payment_token || '-', item.customer || '-', item.branch || '-', item.event || '-', item.record_type === 'historical_balance' ? 'Saldo historis' : item.record_type === 'demo_simulation' ? 'Simulasi (belum diverifikasi)' : item.payment_method || '-', Number(item.amount) || 0, item.note || '-', item.cancelled_at ? `DIBATALKAN (${item.cancelled_at}) oleh ${item.cancelled_by_role || 'akun'} #${item.cancelled_by || '?'} - ${item.cancellation_reason || ''}` : 'Aktif']);
        const activePayments = lastPayments.filter(item => !item.cancelled_at);
        rows.push(['TOTAL AKTIF', '', '', '', '', '', activePayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), `${activePayments.length} transaksi`, 'Tidak termasuk pembatalan']);
        const cancelledPayments = lastPayments.filter(item => item.cancelled_at);
        rows.push(['TOTAL DIBATALKAN', '', '', '', '', '', cancelledPayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), `${cancelledPayments.length} transaksi`, 'Nilai dibalik dari saldo tagihan']);
        const warningNote = lastHistoryWarnings.length ? ` Peringatan kelengkapan data: ${lastHistoryWarnings.join(' ')}` : '';
        payload = { filename: 'riwayat-pembayaran', title: 'Riwayat Pembayaran Nusa Karsa Event', period: `${month} · ${roleLabel} · ${selectedBranch} · dibuat ${new Date().toLocaleString('id-ID')}`, description: `Simulasi pelanggan ditandai sebagai belum diverifikasi dan bukan dana masuk terkonfirmasi.${warningNote}`, headers: ['Tanggal', 'Token', 'Pelanggan', 'Cabang', 'Event', 'Metode/jenis', 'Nominal (IDR)', 'Catatan', 'Status pembatalan'], rows };
    }
    if (!payload) { setStatus('Data belum siap untuk diekspor.', true); return; }
    try { window.NusaExports.exportFile(payload, format); }
    catch (error) { setStatus(`Ekspor gagal: ${error.message}`, true); }
}));
