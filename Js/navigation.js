(() => {
    const currentFile = window.location.pathname.split('/').pop() || 'halaman.html';
    const branchLinks = [
        ['cabangPalembang.html', 'Palembang', 'fa-water', 'palembang'],
        ['cabangBandung.html', 'Bandung', 'fa-mountain-sun', 'bandung'],
        ['cabangBali.html', 'Bali', 'fa-sun', 'bali']
    ];
    const items = [
        ['halaman.html', 'Dashboard', 'fa-house'],
        ['login.html', 'Akun', 'fa-user'],
        ['cabang.html', 'Cabang', 'fa-code-branch'],
        ['piutang.html', 'Piutang', 'fa-file-invoice-dollar'],
        ['pelanggan.html', 'Pelanggan', 'fa-users'],
        ['history.html', 'Riwayat', 'fa-clock-rotate-left'],
        ['notifications.html', 'Notifikasi', 'fa-bell'],
        ['pembayaran.html', 'Pembayaran', 'fa-credit-card'],
        ['laporan.html', 'Laporan', 'fa-chart-column']
    ];
    const fromHtmlDirectory = window.location.pathname.includes('/Html/');
    const hrefFor = file => file === 'halaman.html' ? (fromHtmlDirectory ? '../halaman.html' : file) : (fromHtmlDirectory ? file : `Html/${file}`);
    const branchFromPath = currentFile.toLowerCase() === 'cabangbandung.html' ? 'bandung' : currentFile.toLowerCase() === 'cabangbali.html' ? 'bali' : currentFile.toLowerCase() === 'cabangpalembang.html' ? 'palembang' : new URLSearchParams(window.location.search).get('branch') || document.body.dataset.branch;
    const branchMarkup = branchLinks.map(([file, label, icon, branch]) => `<a href="${hrefFor(file.split('?')[0])}${file.includes('?') ? '?branch=palembang' : ''}" class="nav-item nav-branch nav-branch-${branch}${branchFromPath === branch ? ' active' : ''}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('');
    const navMarkup = `${items.map(([file, label, icon]) => `<a href="${hrefFor(file)}" class="nav-item${file === currentFile && file !== 'cabang.html' ? ' active' : ''}"><i class="fa-solid ${icon}"></i><span>${label}</span>${file === 'notifications.html' ? '<small id="notificationBadge" hidden></small>' : ''}</a>`).join('')}<div class="nav-section-label">Cabang langsung</div>${branchMarkup}`;

    if (branchFromPath) document.body.dataset.branch = branchFromPath;

    let lastNotificationId = 0;
    let soundContext = null;
    const notificationEndpoint = fromHtmlDirectory ? '../api/notifications.php' : 'api/notifications.php';
    const workerUrl = fromHtmlDirectory ? '../service-worker.js' : 'service-worker.js';

    async function setupDeviceNotifications() {
        if (!('serviceWorker' in navigator)) return null;
        try { await navigator.serviceWorker.register(workerUrl);
            return await navigator.serviceWorker.ready; }
        catch (error) { console.warn('Notifikasi perangkat tidak dapat diaktifkan.', error); return null; }
    }

    function ringNotification() {
        if (localStorage.getItem('nusaNotificationSound') !== 'on') return;
        try {
            soundContext ||= new (window.AudioContext || window.webkitAudioContext)();
            if (soundContext.state === 'suspended') soundContext.resume();
            const now = soundContext.currentTime;
            [0, 0.22].forEach(offset => {
                const oscillator = soundContext.createOscillator();
                const gain = soundContext.createGain();
                oscillator.type = 'sine'; oscillator.frequency.value = 880;
                gain.gain.setValueAtTime(0.0001, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);
                oscillator.connect(gain); gain.connect(soundContext.destination);
                oscillator.start(now + offset); oscillator.stop(now + offset + 0.15);
            });
        } catch (error) { console.debug('Suara notifikasi diblokir browser.', error); }
    }

    window.NusaNotificationAlerts = {
        async enable() {
            if (!('Notification' in window)) throw new Error('Browser ini tidak mendukung notifikasi perangkat.');
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') throw new Error('Izin notifikasi belum diberikan. Ubah izin situs pada pengaturan browser.');
            const registration = await setupDeviceNotifications();
            if (!registration) throw new Error('Service worker tidak dapat dijalankan. Gunakan localhost atau HTTPS.');
            soundContext ||= new (window.AudioContext || window.webkitAudioContext)();
            await soundContext.resume();
            localStorage.setItem('nusaNotificationSound', 'on');
            ringNotification();
            return 'Notifikasi perangkat dan bunyi aktif selama aplikasi terbuka.';
        },
        disableSound() { localStorage.setItem('nusaNotificationSound', 'off'); }
    };

    async function pollNewNotifications() {
        try {
            const response = await fetch(notificationEndpoint, { cache: 'no-store', credentials: 'same-origin' });
            if (!response.ok) return;
            const data = await response.json();
            const items = data.notifications || [];
            if (!lastNotificationId) {
                lastNotificationId = Math.max(0, ...items.map(item => Number(item.id) || 0));
                return;
            }
            const fresh = items.filter(item => Number(item.id) > lastNotificationId).sort((a,b) => Number(a.id)-Number(b.id));
            if (!fresh.length) return;
            lastNotificationId = Math.max(lastNotificationId, ...fresh.map(item => Number(item.id) || 0));
            const registration = await setupDeviceNotifications();
            for (const item of fresh) {
                if (registration && 'Notification' in window && Notification.permission === 'granted') {
                    registration.active?.postMessage({ type: 'nusa-notification', id: item.id, title: item.title, body: item.message, url: item.target_url || 'Html/notifications.html' });
                }
                if (!document.hidden) ringNotification();
            }
        } catch (error) { /* Polling is best-effort; the inbox remains available. */ }
    }

    async function applyRoleNavigation() {
        try {
            const sessionResponse = await fetch(fromHtmlDirectory ? '../api/session.php' : 'api/session.php', { cache: 'no-store' });
            const session = await sessionResponse.json();
            if (!sessionResponse.ok || !session.authenticated) return;

            const links = [...document.querySelectorAll('.nav-menu .nav-item')];
            const notificationBadge = document.getElementById('notificationBadge');
            if (notificationBadge) {
                notificationBadge.closest('.nav-item')?.style.setProperty('position', 'relative');
                notificationBadge.style.cssText = 'position:absolute;top:4px;right:6px;min-width:20px;padding:2px 6px;border-radius:99px;background:#ef6b45;color:#fff;text-align:center;font-size:.68rem;font-weight:800';
                const updateNotificationBadge = async () => {
                    try {
                        const notificationResponse = await fetch(fromHtmlDirectory ? '../api/notifications.php' : 'api/notifications.php', { cache: 'no-store' });
                        const notificationData = await notificationResponse.json();
                        const unread = Number(notificationData.unread_count) || 0;
                        notificationBadge.textContent = unread > 99 ? '99+' : String(unread);
                        notificationBadge.hidden = !unread;
                    } catch (error) { notificationBadge.hidden = true; }
                };
                await updateNotificationBadge();
                window.setInterval(updateNotificationBadge, 30 * 1000);
                await pollNewNotifications();
                window.setInterval(pollNewNotifications, 20 * 1000);
            }
            if (['admin_cabang', 'pelanggan'].includes(session.user.role)) {
                const passwordLink = document.createElement('a');
                passwordLink.className = 'nav-item';
                passwordLink.href = hrefFor('ganti-password.html');
                passwordLink.innerHTML = '<i class="fa-solid fa-key"></i><span>Ganti password</span>';
                document.querySelector('.nav-menu')?.append(passwordLink);
            }
            if (['admin_pusat', 'super_admin'].includes(session.user.role)) {
                const accountLink = document.createElement('a');
                accountLink.className = 'nav-item';
                accountLink.href = hrefFor('admin-akun.html');
                accountLink.innerHTML = '<i class="fa-solid fa-user-plus"></i><span>Akun admin cabang</span>';
                document.querySelector('.nav-menu')?.append(accountLink);
            }
            if (['admin_pusat', 'super_admin', 'admin_cabang'].includes(session.user.role)) {
                const requestLink = document.createElement('a');
                requestLink.className = 'nav-item';
                requestLink.href = hrefFor('deletion-requests.html');
                requestLink.innerHTML = '<i class="fa-solid fa-clipboard-check"></i><span>Permintaan hapus</span>';
                document.querySelector('.nav-menu')?.append(requestLink);
            }
            if (session.user.role === 'pelanggan') {
                const restricted = /\/(cabang(?:palembang|bandung|bali)?|laporan|events-(?:bali|bandung))\.html$/i;
                links.forEach(link => {
                    if (restricted.test(new URL(link.href, window.location.href).pathname)) link.hidden = true;
                    if (/\/history\.html$/i.test(new URL(link.href, window.location.href).pathname)) {
                        const label = link.querySelector('span');
                        if (label) label.textContent = 'Riwayat Pembayaran';
                    }
                });
                document.querySelectorAll('.nav-section-label').forEach(label => { label.hidden = true; });
                return;
            }

            if (session.user.role !== 'admin_cabang') return;
            const branchResponse = await fetch(fromHtmlDirectory ? '../api/branches.php' : 'api/branches.php', { cache: 'no-store' });
            const branchData = await branchResponse.json();
            if (!branchResponse.ok || !branchData.success) throw new Error(branchData.message || 'Hak akses cabang tidak dapat dimuat.');
            const ownBranch = branchData.branches.find(branch => Number(branch.id) === Number(branchData.own_branch_id));
            const allowedBranches = new Set(ownBranch ? [String(ownBranch.name).trim().toLowerCase().replace(/^cabang\s+/, '')] : []);
            links.filter(link => link.classList.contains('nav-branch')).forEach(link => {
                const branch = link.className.match(/\bnav-branch-(palembang|bandung|bali)\b/)?.[1];
                link.hidden = !allowedBranches.has(branch);
            });
        } catch (error) {
            console.error('Navigasi belum dapat disesuaikan dengan hak akses akun.', error);
        }
    }

    if (!document.getElementById('accountLink')) {
        const existingMenu = document.querySelector('.sidebar .nav-menu');
        if (existingMenu) {
            existingMenu.innerHTML = navMarkup;
        } else {
            const sidebar = document.createElement('aside');
            sidebar.className = 'app-sidebar';
            sidebar.innerHTML = `<a class="app-brand" href="${hrefFor('halaman.html')}" aria-label="Dashboard Nusa Karsa"><img src="../assets/logo3.0.png" alt="Logo Nusa Karsa Event"></a><nav class="nav-menu" aria-label="Navigasi utama">${navMarkup}</nav><div class="sidebar-bottom"><a href="${hrefFor('halaman.html')}"><i class="fa-solid fa-arrow-left"></i> Kembali ke dashboard</a></div>`;
            document.body.prepend(sidebar);
            document.querySelector('.portal-nav')?.remove();
        }
    }

    applyRoleNavigation();
})();
