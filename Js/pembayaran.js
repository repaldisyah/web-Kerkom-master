const receivableSelect = document.getElementById("receivableSelect");
const invoiceSummary = document.getElementById("invoiceSummary");
const amountInput = document.getElementById("amount");
const amountHint = document.getElementById("amountHint");
const noteInput = document.getElementById("note");
const methodDetails = document.getElementById("methodDetails");
const submitButton = document.getElementById("submitPayment");
const alertBox = document.getElementById("alert");
const receipt = document.getElementById("receipt");
const printReceiptButton = document.getElementById("printReceipt");
const sessionStatus = document.getElementById("sessionStatus");
const shareReceiptButton = document.getElementById("shareReceipt");
const copyReceiptTokenButton = document.getElementById("copyReceiptToken");
const whatsappReceiptLink = document.getElementById("whatsappReceipt");
let receivables = [];
let selectedMethod = "";
let latestReceipt = null;

const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);

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
        throw new Error("Server PHP belum dijalankan. Buka web melalui http://localhost/web-Kerkom/.");
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
    if (!receivables.length) return;

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

    sessionStatus.textContent = `Masuk sebagai ${result.user.name}`;
    return true;
}

function updateSubmitState() {
    const receivable = selectedReceivable();
    const amount = Number(amountInput.value);
    submitButton.disabled = !receivable || !selectedMethod || !Number.isFinite(amount) || amount <= 0 || amount > Number(receivable.balance);
}

function renderInvoice() {
    const receivable = selectedReceivable();
    if (!receivable) {
        invoiceSummary.className = "invoice-summary empty-state";
        invoiceSummary.innerHTML = '<i class="fa-regular fa-hand-pointer"></i><p>Pilih tagihan untuk melanjutkan pembayaran.</p>';
        amountInput.value = "";
        amountInput.disabled = true;
        noteInput.disabled = true;
        amountHint.textContent = "Maksimal sesuai sisa tagihan.";
        updateSubmitState();
        return;
    }
    invoiceSummary.className = "invoice-summary";
    invoiceSummary.innerHTML = `<strong>${receivable.customer}</strong><span>${receivable.branch} · ${receivable.event}</span><span>Jatuh tempo ${receivable.due_date}</span><span class="balance">Sisa ${money(receivable.balance)}</span>`;
    amountInput.disabled = false;
    noteInput.disabled = false;
    amountInput.max = receivable.balance;
    amountInput.value = receivable.balance;
    amountHint.textContent = `Maksimal ${money(receivable.balance)}.`;
    updateSubmitState();
}

function renderMethodDetails(method) {
    const details = {
        QRIS: '<strong>Scan QRIS Nusa Karsa</strong><div class="qr-preview" aria-label="Kode QRIS simulasi">' + "<span></span>".repeat(81) + '</div><span>Buka aplikasi pembayaran Anda dan scan kode QR di atas.</span>',
        BRI: '<strong>Bank BRI</strong>Transfer ke rekening <b>1234 5678 9012</b> a.n. Nusa Karsa Event.',
        BCA: '<strong>Bank BCA</strong>Transfer ke rekening <b>8123 456 789</b> a.n. Nusa Karsa Event.',
        SEABANK: '<strong>SeaBank</strong>Transfer ke rekening <b>9012 3456 789</b> a.n. Nusa Karsa Event.',
        PAYPAL: '<strong>PayPal</strong>Kirim pembayaran ke <b>billing@nusakarsa.com</b>. Pastikan mata uang sesuai instruksi invoice.'
    };
    methodDetails.innerHTML = details[method] || "";
    methodDetails.hidden = !method;
}

function renderReceipt(data) {
    latestReceipt = data;
    document.getElementById("receiptToken").textContent = data.token;
    document.getElementById("receiptCustomer").textContent = data.customer;
    document.getElementById("receiptEvent").textContent = data.event;
    document.getElementById("receiptBranch").textContent = data.branch;
    document.getElementById("receiptMethod").textContent = data.payment_method;
    document.getElementById("receiptDate").textContent = data.payment_date;
    document.getElementById("receiptNote").textContent = data.note || "-";
    document.getElementById("receiptAmount").textContent = money(data.amount);
    whatsappReceiptLink.href = `https://wa.me/?text=${encodeURIComponent(receiptText(data))}`;
    receipt.hidden = false;
    receipt.scrollIntoView({ behavior: "smooth", block: "start" });
}

function receiptText(data = latestReceipt) {
    if (!data) return "";
    return [
        "STRUK DIGITAL PEMBAYARAN - NUSA KARSA EVENT",
        `Token: ${data.token}`,
        `Pelanggan: ${data.customer}`,
        `Acara: ${data.event}`,
        `Cabang: ${data.branch}`,
        `Metode: ${data.payment_method}`,
        `Tanggal: ${data.payment_date}`,
        `Total: ${money(data.amount)}`,
        data.note ? `Catatan: ${data.note}` : "",
        "Simpan token ini sebagai bukti pembayaran."
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
        const response = await fetch("../api/receivables.php", { cache: "no-store" });
        const result = await readJson(response);
        if (response.status === 401) {
            redirectToLogin();
            return;
        }
        if (!response.ok || !result.success) throw new Error(result.message || "Tagihan tidak dapat dimuat.");
        receivables = result.receivables;
        receivableSelect.innerHTML = receivables.length
            ? '<option value="">Pilih tagihan...</option>' + receivables.map(item => `<option value="${item.id}">${item.customer} · ${money(item.balance)} tersisa</option>`).join("")
            : '<option value="">Tidak ada piutang aktif</option>';
        renderReceivableOptions();
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
    submitButton.querySelector("span").textContent = "Menyimpan pembayaran...";
    try {
        const response = await fetch("../api/payments.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receivable_id: receivable.id, amount: Number(amountInput.value), payment_method: selectedMethod, note: noteInput.value.trim() })
        });
        const result = await readJson(response);
        if (response.status === 401) {
            redirectToLogin();
            return;
        }
        if (!response.ok || !result.success) throw new Error(result.message || "Pembayaran gagal disimpan.");
        showAlert("Pembayaran berhasil dicatat dan saldo piutang telah diperbarui.", true);
        renderReceipt(result.receipt);
        await loadReceivables();
        renderReceivableOptions();
        receivableSelect.value = "";
        renderInvoice();
    } catch (error) {
        showAlert(error.message);
    } finally {
        submitButton.querySelector("span").textContent = "Konfirmasi pembayaran";
        updateSubmitState();
    }
});

printReceiptButton.addEventListener("click", () => window.print());
copyReceiptTokenButton.addEventListener("click", copyReceiptToken);
shareReceiptButton.addEventListener("click", shareReceipt);

(async function initializePaymentPage() {
    try {
        if (await ensureAuthenticated()) await loadReceivables();
        if (false && receivables.length) {
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Pilih tagihan...";
            receivableSelect.replaceChildren(placeholder);
            receivables.forEach(item => {
                const option = document.createElement("option");
                option.value = String(item.id);
                option.textContent = `${item.customer} · ${money(item.balance)} tersisa`;
                receivableSelect.append(option);
            });
        }
    } catch (error) {
        sessionStatus.textContent = "Sesi tidak dapat diperiksa";
        showAlert(error.message || "Tidak dapat menghubungi server.");
    }
})();
