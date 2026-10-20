(() => {
  const panel = document.getElementById('customerInsights');
  if (!panel) return;
  const content = document.getElementById('customerInsightsContent');
  const title = document.getElementById('customerInsightsTitle');
  const subtitle = document.getElementById('customerInsightsSubtitle');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const table = (headers, rows) => `<div class="table-wrap customer-insights-table"><table class="data-table"><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}">Belum ada data sejak 2022.</td></tr>`}</tbody></table></div>`;
  const metrics = row => `<td>${Number(row.customer_count) || 0}</td><td>${Number(row.event_count) || 0}</td><td>${money(row.contract_total)}</td><td>${money(row.paid_total)}</td><td>${money(row.outstanding)}</td>`;
  async function load() {
    try {
      const sessionResponse = await fetch('api/session.php', { cache: 'no-store' });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || !session.authenticated) return;
      const response = await fetch('api/customer-summary.php', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Ringkasan pelanggan tidak dapat dimuat.');
      panel.hidden = false;
      if (result.scope === 'central') {
        title.textContent = 'Ringkasan pelanggan tahunan';
        subtitle.textContent = 'Rekap semua cabang sejak 2022, berdasarkan tahun event.';
        const annualRows = result.annual.map(row => `<tr><td>${row.year}</td>${metrics(row)}</tr>`).join('');
        const branchRows = result.by_branch.map(row => `<tr><td>${row.year}</td><td>${escapeHtml(row.branch)}</td>${metrics(row)}</tr>`).join('');
        content.innerHTML = `<h3>Semua cabang per tahun</h3>${table(['Tahun','Pelanggan','Event','Nilai kontrak','Terbayar','Piutang'], annualRows)}<h3>Rincian cabang per tahun</h3>${table(['Tahun','Cabang','Pelanggan','Event','Nilai kontrak','Terbayar','Piutang'], branchRows)}`;
      } else if (result.scope === 'branch') {
        title.textContent = `Ringkasan pelanggan · ${result.branch}`;
        subtitle.textContent = `${Number(result.customer_count) || 0} pelanggan terdaftar pada event sejak 2022.`;
        const rows = result.customers.map(row => `<tr><td>${escapeHtml(row.customer)}</td><td>${row.event_count}</td><td>${row.last_year || '-'}</td><td>${money(row.contract_total)}</td><td>${money(row.paid_total)}</td><td>${money(row.outstanding)}</td></tr>`).join('');
        content.innerHTML = table(['Pelanggan','Event','Aktif terakhir','Nilai kontrak','Terbayar','Piutang'], rows);
      } else {
        title.textContent = 'Ringkasan aktivitas tahunan akun';
        subtitle.textContent = 'Hanya event yang terhubung ke akun pelanggan ini.';
        const rows = result.annual.map(row => `<tr><td>${row.year}</td><td>${row.event_count}</td><td>${money(row.contract_total)}</td><td>${money(row.paid_total)}</td><td>${money(row.outstanding)}</td></tr>`).join('');
        content.innerHTML = table(['Tahun','Event','Nilai kontrak','Terbayar','Piutang'], rows);
      }
    } catch (error) {
      panel.hidden = false;
      content.innerHTML = `<p class="activity-empty">${escapeHtml(error.message || 'Ringkasan pelanggan tidak dapat dimuat.')}</p>`;
    }
  }
  load();
})();
