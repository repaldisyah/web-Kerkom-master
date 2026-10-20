(() => {
  const identityForm = document.getElementById('identityForm');
  const resetForm = document.getElementById('resetForm');
  const notice = document.getElementById('notice');
  const verificationStep = document.getElementById('verificationStep');
  const setNotice = (message, error = false) => { notice.textContent = message; notice.hidden = false; notice.classList.toggle('error', error); };
  async function request(data) {
    const response = await fetch('../api/forgot-password.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Permintaan tidak dapat diproses.');
    return result;
  }
  identityForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = identityForm.querySelector('button'); button.disabled = true;
    try {
      const result = await request({ action: 'start', account_type: document.getElementById('accountType').value, login: document.getElementById('loginId').value.trim() });
      document.getElementById('demoCode').textContent = result.demo_code;
      verificationStep.hidden = false;
      setNotice('Akun ditemukan. Masukkan kode simulasi dan password baru pada langkah kedua.');
    } catch (error) { setNotice(error.message, true); }
    finally { button.disabled = false; }
  });
  resetForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = resetForm.querySelector('button'); button.disabled = true;
    try {
      await request({ action: 'verify', code: document.getElementById('verificationCode').value.trim(), new_password: document.getElementById('newPassword').value, confirm_password: document.getElementById('confirmPassword').value });
      setNotice('Password berhasil diganti. Silakan masuk menggunakan password baru.');
      identityForm.hidden = true; verificationStep.hidden = true;
    } catch (error) { setNotice(error.message, true); }
    finally { button.disabled = false; }
  });
})();
