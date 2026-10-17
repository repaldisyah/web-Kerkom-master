(() => {
  const apiBase = '../api';
  const form = document.getElementById('changePasswordForm');
  const message = document.getElementById('formMessage');
  const button = form.querySelector('button[type="submit"]');
  let csrfToken = '';

  async function initialize() {
    try {
      const response = await fetch(`${apiBase}/change-password.php`, { credentials: 'same-origin', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Sesi login tidak ditemukan.');
      csrfToken = result.csrf_token;
      const adminOnlyPage = location.pathname.endsWith('akses-akun-rahasia.html');
      const isAdmin = ['admin_pusat', 'super_admin'].includes(result.role);
      if ((adminOnlyPage && !isAdmin) || (!adminOnlyPage && isAdmin)) {
        location.replace('../halaman.html');
      }
    } catch (error) {
      message.textContent = error.message;
      button.disabled = true;
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.className = 'form-message';
    message.textContent = '';
    button.disabled = true;
    const payload = Object.fromEntries(new FormData(form));
    payload.csrf_token = csrfToken;
    try {
      const response = await fetch(`${apiBase}/change-password.php`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Password belum dapat diperbarui.');
      message.className = 'form-message success';
      message.textContent = result.message;
      form.reset();
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  initialize();
})();
