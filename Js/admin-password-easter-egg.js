(() => {
  const secret = 'karsa';
  let typed = '';
  let opening = false;

  document.addEventListener('keydown', async event => {
    if (opening || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || event.target?.isContentEditable) return;

    const key = event.key.toLowerCase();
    // Allow the user to type the sequence with or without separators.
    if (!/^[a-z]$/.test(key)) return;
    typed = (typed + key).slice(-secret.length);
    if (typed !== secret) return;

    opening = true;
    try {
      const response = await fetch('api/session.php', { credentials: 'same-origin', cache: 'no-store' });
      const session = await response.json();
      if (response.ok && session.authenticated && ['admin_pusat', 'super_admin'].includes(session.user?.role)) {
        window.location.assign('Html/akses-akun-rahasia.html');
      } else {
        window.alert('Pintasan pengaturan password ini hanya tersedia untuk admin pusat.');
        opening = false;
      }
    } catch {
      window.alert('Sesi belum dapat diperiksa. Muat ulang halaman lalu coba lagi.');
      opening = false;
    }
    typed = '';
  });
})();
