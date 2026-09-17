(() => {
    const currentFile = window.location.pathname.split('/').pop() || 'halaman.html';
    const branchLinks = [
        ['cabang.html?branch=palembang', 'Palembang', 'fa-water', 'palembang'],
        ['cabangBandung.html', 'Bandung', 'fa-mountain-sun', 'bandung'],
        ['cabangBali.html', 'Bali', 'fa-sun', 'bali']
    ];
    const items = [
        ['halaman.html', 'Dashboard', 'fa-house'],
        ['login.html', 'Akun', 'fa-user'],
        ['cabang.html', 'Cabang', 'fa-code-branch'],
        ['pelanggan.html', 'Pelanggan', 'fa-users'],
        ['history.html', 'Riwayat', 'fa-clock-rotate-left'],
        ['pembayaran.html', 'Pembayaran', 'fa-credit-card'],
        ['laporan.html', 'Laporan', 'fa-chart-column']
    ];
    const fromHtmlDirectory = window.location.pathname.includes('/Html/');
    const hrefFor = file => file === 'halaman.html' ? (fromHtmlDirectory ? '../halaman.html' : file) : (fromHtmlDirectory ? file : `Html/${file}`);
    const branchFromPath = currentFile === 'cabangBandung.html' ? 'bandung' : currentFile === 'cabangBali.html' ? 'bali' : new URLSearchParams(window.location.search).get('branch') || document.body.dataset.branch;
    const branchMarkup = branchLinks.map(([file, label, icon, branch]) => `<a href="${hrefFor(file.split('?')[0])}${file.includes('?') ? '?branch=palembang' : ''}" class="nav-item nav-branch nav-branch-${branch}${branchFromPath === branch ? ' active' : ''}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('');
    const navMarkup = `${items.map(([file, label, icon]) => `<a href="${hrefFor(file)}" class="nav-item${file === currentFile && file !== 'cabang.html' ? ' active' : ''}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('')}<div class="nav-section-label">Cabang langsung</div>${branchMarkup}`;

    if (branchFromPath) document.body.dataset.branch = branchFromPath;

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

    document.querySelectorAll('.nav-menu a[href], .app-brand').forEach(link => {
        link.addEventListener('click', event => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const destination = new URL(link.href, window.location.href);
            if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
            event.preventDefault();
            document.body.classList.add('is-navigating');
            const loading = new URL(fromHtmlDirectory ? '../loading.html' : 'loading.html', window.location.href);
            loading.searchParams.set('next', destination.href);
            window.setTimeout(() => { window.location.href = loading.href; }, 160);
        });
    });
})();
