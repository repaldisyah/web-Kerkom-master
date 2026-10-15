const receivableSelect = document.getElementById("receivableSelect");
const invoiceSummary = document.getElementById("invoiceSummary");
const amountInput = document.getElementById("amount");
const amountHint = document.getElementById("amountHint");
const paymentDateInput = document.getElementById("paymentDate");
const noteInput = document.getElementById("note");
const methodDetails = document.getElementById("methodDetails");
const submitButton = document.getElementById("submitPayment");
const alertBox = document.getElementById("alert");
const receipt = document.getElementById("receipt");
const printReceiptButton = document.getElementById("printReceipt");
const downloadReceiptButton = document.getElementById("downloadReceipt");
const sessionStatus = document.getElementById("sessionStatus");
const shareReceiptButton = document.getElementById("shareReceipt");
const copyReceiptTokenButton = document.getElementById("copyReceiptToken");
const whatsappReceiptLink = document.getElementById("whatsappReceipt");
const paymentParams = new URLSearchParams(window.location.search);
const isPalembangPayment = paymentParams.get("source") === "palembang";
const eventPaymentBranch = paymentParams.get("source") === "event" ? paymentParams.get("branch") : "";
const isBranchEventPayment = ["bali", "bandung"].includes(eventPaymentBranch);
let requestedEventId = paymentParams.get("event_id");
let receivables = [];
let selectedMethod = "";
let latestReceipt = null;
let currentUserRole = "";

const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
 const todayLocal = new Date();
paymentDateInput.value = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, "0")}-${String(todayLocal.getDate()).padStart(2, "0")}`;
paymentDateInput.disabled = !isBranchEventPayment;

const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
})[character]);

async function readJson(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        throw new Error("Server PHP belum dijalankan. Buka proyek melalui Apache di localhost, bukan sebagai file lokal.");
    }
    return response.json();
}

function showAlert(message, success = false) {
    alertBox.textContent = message;
    alertBox.hidden = false;
    alertBox.classList.toggle("success", success);
}

function selectedReceivable() {
    return receivables.find(item => String(item.id) === receivableSelect.value);
}

function renderReceivableOptions() {
    if (!receivables.length) {
        receivableSelect.innerHTML = '<option value="">Tidak ada piutang aktif</option>';
        return;
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Pilih tagihan...";
    receivableSelect.replaceChildren(placeholder);
    receivables.forEach(item => {
        const option = document.createElement("option");
        option.value = String(item.id);
        option.textContent = `${item.customer} ${String.fromCharCode(183)} ${money(item.balance)} tersisa`;
        receivableSelect.append(option);
    });
}

function redirectToLogin() {
    const loginUrl = new URL("login.html", window.location.href);
    loginUrl.searchParams.set("next", window.location.href);
    window.location.replace(loginUrl.href);
}

async function ensureAuthenticated() {
    const response = await fetch("../api/session.php", { cache: "no-store" });
    const result = await readJson(response);
    if (!response.ok || !result.authenticated) {
        redirectToLogin();
        return false;
    }

    currentUserRole = result.user.role || "";
    sessionStatus.textContent = `Masuk sebagai ${result.user.name}`;
    const isCustomerDemo = currentUserRole === "pelanggan";
    document.getElementById("paymentPageSubtitle").textContent = isCustomerDemo
        ? "Simulasikan pembayaran, perbarui saldo demo, lalu cetak atau unduh struk."
        : "Catat pembayaran yang telah diterima dan buat struk transaksi.";
    document.getElementById("paymentMethodHint").textContent = isCustomerDemo
        ? "Pilih metode untuk simulasi demo. Dana tidak diproses."
        : "Pilih metode yang digunakan untuk pembayaran yang sudah diterima.";
    document.querySelectorAll(".method-caption").forEach(label => {
        label.textContent = isCustomerDemo ? "Metode simulasi" : "Metode tercatat";
    });
    const footnote = document.getElementById("paymentFootnote");
    if (footnote && currentUserRole !== "pelanggan") footnote.textContent = "Form ini untuk pencatatan admin. Pastikan dana sudah diterima sebelum menyimpan.";
    return true;
}

function updateSubmitState() {
    const receivable = selectedReceivable();
    const amount = Number(amountInput.value);
    submitButton.disabled = !receivable || !selectedMethod || !Number.isFinite(amount) || amount <= 0 || amount > Number(receivable.balance);
    const buttonLabel = currentUserRole === "pelanggan" ? "Simulasikan pembayaran" : "Catat pembayaran";
    if (!submitButton.disabled) submitButton.querySelector("span").textContent = buttonLabel;
}

function renderInvoice() {
    const receivable = selectedReceivable();
    if (!receivable) {
        invoiceSummary.className = "invoice-summary empty-state";
        invoiceSummary.innerHTML = '<i class="fa-regular fa-hand-pointer"></i><p>Pilih tagihan untuk melanjutkan pembayaran.</p>';
        amountInput.value = "";
        amountInput.disabled = true;
        paymentDateInput.disabled = true;
        noteInput.disabled = true;
        amountHint.textContent = "Maksimal sesuai sisa tagihan.";
        updateSubmitState();
        return;
    }
    invoiceSummary.className = "invoice-summary";
    invoiceSummary.innerHTML = `<strong>${escapeHtml(receivable.customer)}</strong><span>${escapeHtml(receivable.branch)} · ${escapeHtml(receivable.event)}</span><span>Jatuh tempo ${escapeHtml(receivable.due_date)}</span><span class="balance">Sisa ${money(receivable.balance)}</span>`;
    amountInput.disabled = false;
    paymentDateInput.disabled = !isBranchEventPayment;
    noteInput.disabled = false;
    amountInput.max = receivable.balance;
    amountInput.value = receivable.balance;
    amountHint.textContent = `Maksimal ${money(receivable.balance)}.`;
    updateSubmitState();
}

function renderMethodDetails(method) {
    if (currentUserRole === "pelanggan") {
        methodDetails.textContent = method ? `${method} dipilih untuk simulasi demo. Tidak ada dana yang diproses.` : "";
        methodDetails.hidden = !method;
        return;
    }
    const labels = { QRIS: 'QRIS', BRI: 'Bank BRI', BCA: 'Bank BCA', SEABANK: 'SeaBank', PAYPAL: 'PayPal' };
    if (method === 'QRIS') {
        methodDetails.innerHTML = '<div class="qris-payment-guide"><strong>Bayar melalui QRIS</strong><p>Scan kode ini menggunakan aplikasi pembayaran Anda. Catat pembayaran setelah dana diterima.</p><img src="../assets/QRIS.jpeg" alt="Kode QRIS pembayaran Nusa Karsa"></div>';
    } else {
        methodDetails.textContent = method ? `${labels[method] || method} dipilih. Pastikan dana sudah diterima sebelum mencatat pembayaran.` : '';
    }
    methodDetails.hidden = !method;
}
function renderReceipt(data) {
    latestReceipt = data;
    const isSimulation = Boolean(data.simulated);
    document.getElementById("receiptDemoMark").hidden = !isSimulation;
    document.getElementById("receiptTitle").textContent = isSimulation ? "Simulasi pembayaran selesai" : "Pembayaran berhasil";
    document.getElementById("receiptValidity").innerHTML = isSimulation ? "<i class=\"fa-solid fa-circle-info\"></i> Struk simulasi untuk keperluan demo. Tidak membuktikan adanya dana yang diterima." : "<i class=\"fa-solid fa-shield-halved\"></i> Transaksi telah dicatat oleh sistem.";
    document.getElementById("receiptToken").textContent = data.token;
    document.getElementById("receiptCustomer").textContent = data.customer;
    document.getElementById("receiptEvent").textContent = data.event;
    document.getElementById("receiptBranch").textContent = data.branch;
    document.getElementById("receiptMethod").textContent = data.payment_method;
    document.getElementById("receiptDate").textContent = data.payment_date;
    document.getElementById("receiptNote").textContent = data.note || "-";
    document.getElementById("receiptAmount").textContent = money(data.amount);
    document.getElementById("receiptBalance").textContent = money(data.balance);
    whatsappReceiptLink.href = `https://wa.me/?text=${encodeURIComponent(receiptText(data))}`;
    receipt.hidden = false;
    receipt.scrollIntoView({ behavior: "smooth", block: "start" });
}

function receiptText(data = latestReceipt) {
    if (!data) return "";
    return [
        latestReceipt.simulated ? "STRUK SIMULASI - BUKAN BUKTI PEMBAYARAN" : "STRUK PEMBAYARAN - NUSA KARSA EVENT",
        `Token: ${data.token}`,
        `Pelanggan: ${data.customer}`,
        `Acara: ${data.event}`,
        `Cabang: ${data.branch}`,
        `Metode: ${data.payment_method}`,
        `Tanggal: ${data.payment_date}`,
        `Total dibayar: ${money(data.amount)}`,
        `Sisa piutang: ${money(data.balance)}`,
        data.note ? `Catatan: ${data.note}` : "",
        data.simulated ? "SIMULASI: struk ini bukan bukti pembayaran." : "Simpan token ini sebagai bukti pembayaran."
    ].filter(Boolean).join("\n");
}

async function copyReceiptToken() {
    if (!latestReceipt) return;
    try {
        await navigator.clipboard.writeText(latestReceipt.token);
    } catch (error) {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = latestReceipt.token;
        temporaryInput.style.position = "fixed";
        temporaryInput.style.opacity = "0";
        document.body.append(temporaryInput);
        temporaryInput.select();
        document.execCommand("copy");
        temporaryInput.remove();
    }
    showAlert("Token transaksi telah disalin.", true);
}

async function shareReceipt() {
    if (!latestReceipt) return;
    const shareData = { title: "Struk Pembayaran Nusa Karsa Event", text: receiptText() };
    if (navigator.share) {
        try {
            await navigator.share(shareData);
            return;
        } catch (error) {
            if (error.name === "AbortError") return;
        }
    }

    try {
        await navigator.clipboard.writeText(shareData.text);
        showAlert("Detail struk telah disalin. Tempelkan ke platform tujuan Anda.", true);
    } catch (error) {
        showAlert("Bagikan melalui WhatsApp atau salin token transaksi secara manual.");
    }
}

async function loadReceivables() {
    try {
        if (isBranchEventPayment) {
            if (!requestedEventId) throw new Error("Event pembayaran tidak ditentukan.");
            const endpoint = eventPaymentBranch === "bali" ? "../api/events.php" : "../api/events-bandung.php";
            const response = await fetch(`${endpoint}?id=${encodeURIComponent(requestedEventId)}`, { cache: "no-store" });
            const result = await readJson(response);
            if (response.status === 401) { redirectToLogin(); return; }
            if (!response.ok || !result.success || !result.event) throw new Error(result.message || "Event tidak dapat dimuat.");
            const item = result.event;
            receivables = Number(item.piutang) > 0 ? [{ id: item.id, customer: item.pelanggan, branch: eventPaymentBranch === "bali" ? "Bali" : "Bandung", event: item.nama_event, due_date: item.tgl_jatuh_tempo, total_amount: item.nilai_kontrak, balance: item.piutang }] : [];
            renderReceivableOptions();
            if (receivables.length) {
                receivableSelect.value = String(item.id);
                renderInvoice();
                noteInput.value = `Pembayaran event ${item.id}`;
            } else showAlert("Event ini sudah lunas atau tidak memiliki sisa tagihan.");
            return;
        }
        const endpoint = isPalembangPayment ? "../api/palembang-events.php" : "../api/receivables.php";
        const response = await fetch(endpoint, { cache: "no-store" });
        const result = await readJson(response);
        if (response.status === 401) {
            redirectToLogin();
            return;
        }
        if (!response.ok || !result.success) throw new Error(result.message || "Tagihan tidak dapat dimuat.");
        receivables = isPalembangPayment
            ? (result.events || []).filter(item => Number(item.piutang) > 0).map(item => ({ id: item.id, customer: item.pelanggan, branch: "Palembang", event: item.nama_event, due_date: item.tgl_jatuh_tempo, total_amount: item.nilai_kontrak, balance: item.piutang }))
            : result.receivables;
        renderReceivableOptions();
        if (requestedEventId) {
            const requested = receivables.find(item => String(item.id) === requestedEventId);
            if (requested) {
                receivableSelect.value = String(requested.id);
                renderInvoice();
                noteInput.value = `Pembayaran piutang ${requested.id}`;
            } else {
                showAlert("Tagihan ini sudah lunas atau tidak tersedia pada akun Anda.");
            }
        }
    } catch (error) {
        receivableSelect.innerHTML = '<option value="">Gagal memuat tagihan</option>';
        showAlert(error.message);
    }
}

receivableSelect.addEventListener("change", renderInvoice);
amountInput.addEventListener("input", updateSubmitState);
document.querySelectorAll(".method-card").forEach(button => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
        document.querySelectorAll(".method-card").forEach(item => {
            item.classList.remove("selected");
            item.setAttribute("aria-pressed", "false");
        });
        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
        selectedMethod = button.dataset.method;
        renderMethodDetails(selectedMethod);
        updateSubmitState();
    });
});

submitButton.addEventListener("click", async () => {
    const receivable = selectedReceivable();
    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = currentUserRole === "pelanggan" ? "Menyiapkan struk demo..." : "Menyimpan pembayaran...";
    try {
        if (currentUserRole === "pelanggan") {
            const response = await fetch("../api/customer-demo-payments.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source: receivable.source, record_id: receivable.id, amount: Number(amountInput.value), payment_method: selectedMethod, note: noteInput.value.trim() })
            });
            const result = await readJson(response);
            if (response.status === 401) { redirectToLogin(); return; }
            if (!response.ok || !result.success) throw new Error(result.message || "Simulasi pembayaran gagal disimpan.");
            showAlert("Simulasi tersimpan. Sisa piutang database berkurang; transaksi ini tetap ditandai belum diverifikasi.", true);
            renderReceipt(result.receipt);
            await loadReceivables();
            renderReceivableOptions();
            receivableSelect.value = receivables.some(item => String(item.id) === String(receivable.id) && item.source === receivable.source) ? String(receivable.id) : "";
            renderInvoice();
            return;
        }        const endpoint = isBranchEventPayment ? `../api/event-payments.php?branch=${encodeURIComponent(eventPaymentBranch)}` : isPalembangPayment ? "../api/palembang-events.php" : "../api/payments.php";
        const body = isBranchEventPayment
            ? { event_id: receivable.id, amount: Number(amountInput.value), payment_date: paymentDateInput.value, payment_method: selectedMethod, note: noteInput.value.trim() }
            : isPalembangPayment
                ? { event_id: receivable.id, amount: Number(amountInput.value), payment_method: selectedMethod, note: noteInput.value.trim() }
                : { receivable_id: receivable.id, amount: Number(amountInput.value), payment_method: selectedMethod, note: noteInput.value.trim() };
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const result = await readJson(response);
        if (response.status === 401) {
            redirectToLogin();
            return;
        }
        if (!response.ok || !result.success) throw new Error(result.message || "Pembayaran gagal disimpan.");
        showAlert("Pembayaran berhasil dicatat dan saldo piutang telah diperbarui.", true);
        const receiptData = result.receipt || (result.payment ? { ...result.payment, token: result.payment.payment_token } : null);
        renderReceipt(receiptData);
        if (isPalembangPayment && requestedEventId) {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete("event_id");
            requestedEventId = null;
            window.history.replaceState({}, document.title, currentUrl.href);
        }
        await loadReceivables();
        renderReceivableOptions();
        if (isBranchEventPayment && receivables.length) receivableSelect.value = String(receivables[0].id);
        else receivableSelect.value = "";
        renderInvoice();
    } catch (error) {
        showAlert(error.message);
    } finally {
        submitButton.querySelector("span").textContent = currentUserRole === "pelanggan" ? "Simulasikan pembayaran" : "Catat pembayaran";
        updateSubmitState();
    }
});

printReceiptButton.addEventListener("click", () => window.print());
async function downloadReceipt() {
    if (!latestReceipt) return;
    const data = latestReceipt;
    let logo = "";
    try { const response = await fetch("../assets/logo3.0.png"); const blob = await response.blob(); logo = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }); } catch (error) {}
    const rows = [["Pelanggan",data.customer],["Acara",data.event],["Cabang",data.branch],["Metode",data.payment_method],["Tanggal",data.payment_date],["Sisa piutang",money(data.balance)],["Catatan",data.note || "-"]].map(([label,value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
    const html = `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Struk ${escapeHtml(data.token)}</title><style>body{font:14px Arial,sans-serif;background:#f3f5f7;color:#172b3b;padding:24px}.receipt{max-width:420px;margin:auto;background:white;padding:24px;border:1px solid #ddd;border-radius:12px}.brand{text-align:center;border-bottom:1px dashed #aaa;padding-bottom:16px}.brand img{width:76px;height:76px;object-fit:contain}.brand strong,.brand span{display:block}.stamp{color:#b42318;font-weight:bold;border:2px solid #b42318;padding:5px;display:inline-block;margin:10px}.token{background:#f3f8fa;padding:12px;text-align:center;font-weight:bold;letter-spacing:1px}section{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:20px 0}section span{display:block;color:#687887;font-size:12px}section strong{display:block;margin-top:4px}.total{border-top:1px dashed #aaa;padding-top:14px;font-size:18px;font-weight:bold;text-align:right}.foot{text-align:center;color:#687887;font-size:12px;margin-top:18px}@media print{body{padding:0;background:white}.receipt{border:0}}</style><article class="receipt"><header class="brand">${logo ? `<img src="${logo}" alt="Nusa Karsa">` : ""}<strong>NUSA KARSA EVENT</strong><span>Bukti transaksi pelanggan</span>${data.simulated ? "<div class=\"stamp\">SIMULASI - BUKAN PEMBAYARAN ASLI</div>" : ""}</header><p class="token">${escapeHtml(data.token)}</p><section>${rows}</section><div class="total">TOTAL DIBAYAR<br>${escapeHtml(money(data.amount))}</div><p class="foot">${data.simulated ? "Struk simulasi demo. Tidak membuktikan dana diterima." : "Terima kasih atas pembayaran Anda."}</p></article></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `struk-${data.token}.html`; link.click(); URL.revokeObjectURL(url);
}

copyReceiptTokenButton.addEventListener("click", copyReceiptToken);
downloadReceiptButton.addEventListener("click", downloadReceipt);
shareReceiptButton.addEventListener("click", shareReceipt);

(async function initializePaymentPage() {
    try {
        if (await ensureAuthenticated()) await loadReceivables();

    } catch (error) {
        sessionStatus.textContent = "Sesi tidak dapat diperiksa";
        showAlert(error.message || "Tidak dapat menghubungi server.");
    }
})();
