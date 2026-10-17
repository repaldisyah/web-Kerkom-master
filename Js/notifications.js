const list = document.getElementById('notificationList');
const status = document.getElementById('notificationStatus');
const empty = document.getElementById('notificationEmpty');
const count = document.getElementById('notificationCount');
const api = '../api/notifications.php';

function setNotificationStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle('error', error);
}

function escapeText(value) {
    return String(value ?? '');
}

function formatDate(value) {
    if (!value) return 'Waktu tidak tercatat';
    const parsed = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('id-ID');
}

async function request(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...options });
    const data = await response.json();
    if (response.status === 401) {
        const login = new URL('login.html', window.location.href);
        login.searchParams.set('next', window.location.href);
        window.location.replace(login.href);
        throw new Error('Sesi login berakhir.');
    }
    if (!response.ok || !data.success) throw new Error(data.message || 'Notifikasi tidak dapat dimuat.');
    return data;
}

function render(items, unreadCount) {
    list.replaceChildren();
    count.textContent = `${unreadCount} belum dibaca · ${items.length} notifikasi terbaru`;
    empty.classList.toggle('hidden', items.length > 0);
    for (const item of items) {
        const article = document.createElement('article');
        article.className = `notification-item${item.read_at ? '' : ' unread'}`;
        const dot = document.createElement('span'); dot.className = 'notification-dot'; dot.setAttribute('aria-hidden', 'true');
        const content = document.createElement('div');
        const heading = document.createElement('h3'); heading.textContent = escapeText(item.title);
        const message = document.createElement('p'); message.textContent = escapeText(item.message);
        const meta = document.createElement('span'); meta.className = 'notification-meta'; meta.textContent = `${formatDate(item.created_at)} · Jatuh tempo ${formatDate(item.due_date)}`;
        content.append(heading, message, meta);
        const actions = document.createElement('div'); actions.className = 'notification-links';
        const link = document.createElement('a'); link.href = item.target_url || 'piutang.html'; link.textContent = 'Lihat tagihan';
        actions.append(link);
        if (!item.read_at) {
            const read = document.createElement('button'); read.type = 'button'; read.textContent = 'Tandai dibaca';
            read.addEventListener('click', async () => {
                try { await request(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) }); await loadNotifications(); }
                catch (error) { setNotificationStatus(error.message, true); }
            });
            actions.append(read);
        }
        article.append(dot, content, actions);
        list.append(article);
    }
}

async function loadNotifications() {
    try {
        const data = await request(api);
        render(data.notifications || [], Number(data.unread_count) || 0);
        setNotificationStatus('Notifikasi diperbarui.');
    } catch (error) { setNotificationStatus(error.message, true); }
}

document.getElementById('markAllRead').addEventListener('click', async () => {
    try {
        await request(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mark_all: true }) });
        await loadNotifications();
    } catch (error) { setNotificationStatus(error.message, true); }
});

loadNotifications();
window.setInterval(() => { if (!document.hidden) loadNotifications(); }, 5 * 60 * 1000);
