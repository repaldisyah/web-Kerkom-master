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
        ['pembayaran.html', 'Pembayaran', 'fa-credit-card'],
        ['laporan.html', 'Laporan', 'fa-chart-column']
    ];
    const fromHtmlDirectory = window.location.pathname.includes('/Html/');
    const hrefFor = file => file === 'halaman.html' ? (fromHtmlDirectory ? '../halaman.html' : file) : (fromHtmlDirectory ? file : `Html/${file}`);
    const branchFromPath = currentFile.toLowerCase() === 'cabangbandung.html' ? 'bandung' : currentFile.toLowerCase() === 'cabangbali.html' ? 'bali' : currentFile.toLowerCase() === 'cabangpalembang.html' ? 'palembang' : new URLSearchParams(window.location.search).get('branch') || document.body.dataset.branch;
    const branchMarkup = branchLinks.map(([file, label, icon, branch]) => `<a href="${hrefFor(file.split('?')[0])}${file.includes('?') ? '?branch=palembang' : ''}" class="nav-item nav-branch nav-branch-${branch}${branchFromPath === branch ? ' active' : ''}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('');
    const navMarkup = `${items.map(([file, label, icon]) => `<a href="${hrefFor(file)}" class="nav-item${file === currentFile && file !== 'cabang.html' ? ' active' : ''}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('')}<div class="nav-section-label">Cabang langsung</div>${branchMarkup}`;

    if (branchFromPath) document.body.dataset.branch = branchFromPath;

    async function applyRoleNavigation() {
        try {
            const sessionResponse = await fetch(fromHtmlDirectory ? '../api/session.php' : 'api/session.php', { cache: 'no-store' });
            const session = await sessionResponse.json();
            if (!sessionResponse.ok || !session.authenticated) return;

            const links = [...document.querySelectorAll('.nav-menu .nav-item')];
            if (['admin_pusat', 'super_admin'].includes(session.user.role)) {
                const accountLink = document.createElement('a');
                accountLink.className = 'nav-item';
                accountLink.href = hrefFor('admin-akun.html');
                accountLink.innerHTML = '<i class="fa-solid fa-user-plus"></i><span>Akun admin cabang</span>';
                document.querySelector('.nav-menu')?.append(accountLink);
            }
            if (session.user.role === 'pelanggan') {
                const restricted = /\/(cabang(?:palembang|bandung|bali)?|pelanggan|piutang|pembayaran|laporan|events-(?:bali|bandung))\.html$/i;
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
