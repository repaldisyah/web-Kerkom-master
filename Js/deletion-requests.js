const tableBody = document.getElementById('tableBody');
const statusBox = document.getElementById('status');
const emptyState = document.getElementById('emptyState');
const centralRoles = ['admin_pusat', 'super_admin'];
let currentRole = '';

function showStatus(message, error = false) {
    statusBox.textContent = message;
    statusBox.classList.toggle('error', error);
}

async function api(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store', ...options });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Permintaan tidak dapat diproses.');
    return data;
}

function cell(row, value) {
    const td = document.createElement('td');
    td.textContent = value || '—';
    row.append(td);
}

function render(items) {
    tableBody.replaceChildren();
    for (const item of items) {
        const row = document.createElement('tr');
        cell(row, item.created_at);
        cell(row, item.branch);
        cell(row, `${item.event_name} (${item.event_id})`);
        cell(row, `${item.requester || 'Admin cabang'}: ${item.reason}`);
        cell(row, item.status === 'pending' ? 'Menunggu' : item.status === 'approved' ? 'Disetujui' : 'Ditolak');
        cell(row, item.review_note);
        const action = document.createElement('td');
        if (currentRole === 'admin_pusat' || currentRole === 'super_admin') {
            if (item.status === 'pending') {
                for (const [decision, label] of [['approve', 'Setujui & hapus'], ['reject', 'Tolak']]) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.textContent = label;
                    button.dataset.id = item.id;
                    button.dataset.decision = decision;
                    action.append(button, document.createTextNode(' '));
                }
            } else action.textContent = 'Sudah diproses';
        } else action.textContent = 'Menunggu keputusan admin pusat';
        row.append(action);
        tableBody.append(row);
    }
    emptyState.classList.toggle('hidden', items.length !== 0);
    document.querySelector('.table-wrap').classList.toggle('hidden', items.length === 0);
}

async function load() {
    try {
        const data = await api('../api/deletion-requests.php');
        render(data.requests || []);
        showStatus(`${(data.requests || []).length} permintaan dimuat.`);
    } catch (error) { showStatus(error.message, true); }
}

async function initialize() {
    try {
        const session = await api('../api/session.php');
        if (!session.authenticated) { location.href = 'login.html'; return; }
        currentRole = session.user.role;
        if (!centralRoles.includes(currentRole) && currentRole !== 'admin_cabang') {
            showStatus('Halaman ini hanya tersedia untuk admin.', true);
            return;
        }
        document.getElementById('scopeBadge').textContent = centralRoles.includes(currentRole) ? 'Admin pusat' : 'Admin cabang';
        await load();
    } catch (error) { showStatus(error.message, true); }
}

tableBody.addEventListener('click', async event => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    const reviewNote = prompt(button.dataset.decision === 'approve' ? 'Catatan persetujuan (opsional):' : 'Alasan penolakan (opsional):', '') ?? null;
    if (reviewNote === null) return;
    if (button.dataset.decision === 'approve' && !confirm('Setujui permintaan dan hapus event ini?')) return;
    button.disabled = true;
    try {
        const result = await api('../api/deletion-requests.php', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: button.dataset.id, decision: button.dataset.decision, review_note: reviewNote })
        });
        showStatus(result.message);
        await load();
    } catch (error) { showStatus(error.message, true); button.disabled = false; }
});

initialize();
