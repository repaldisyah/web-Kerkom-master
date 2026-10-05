const branchThemes = {
    palembang: { name: "Palembang", description: "Ritme hangat di tepi Sungai Musi." },
    bandung: { name: "Bandung", description: "Ide kreatif dari dataran tinggi." },
    bali: { name: "Bali", description: "Energi terang untuk menyambut peluang." }
};

const currentFile = window.location.pathname.split("/").pop().toLowerCase();
const params = new URLSearchParams(window.location.search);
const selectedBranch = currentFile === "cabangbandung.html" ? "bandung"
    : currentFile === "cabangbali.html" ? "bali"
    : currentFile === "cabangpalembang.html" ? "palembang"
    : (branchThemes[params.get("branch")] ? params.get("branch") : "palembang");
const theme = branchThemes[selectedBranch];
document.body.dataset.branch = selectedBranch;
document.getElementById("activeBranch")?.replaceChildren(document.createTextNode(theme.name));
document.getElementById("activeDescription")?.replaceChildren(document.createTextNode(theme.description));

async function enforceBranchScope() {
    try {
        const sessionResponse = await fetch("../api/session.php", { cache: "no-store" });
        const session = await sessionResponse.json();
        if (!sessionResponse.ok || !session.authenticated) {
            const loginUrl = new URL("login.html", window.location.href);
            loginUrl.searchParams.set("next", window.location.href);
            window.location.replace(loginUrl.href);
            return;
        }

        const branchResponse = await fetch("../api/branches.php", { cache: "no-store" });
        const result = await branchResponse.json();
        if (!branchResponse.ok || !result.success) throw new Error(result.message || "Data cabang tidak dapat dimuat.");

        const ownBranch = (result.branches || []).find(branch => Number(branch.id) === Number(result.own_branch_id));
        const ownName = String(ownBranch?.name || '').toLowerCase();
        document.querySelectorAll(".branch-card").forEach(card => {
            const branchName = card.querySelector("h3")?.textContent.trim().toLowerCase();
            const branch = (result.branches || []).find(item => String(item.name).trim().toLowerCase() === branchName);
            if (result.scope === 'admin_cabang' && branch && branchName !== ownName) {
                const description = card.querySelector('.branch-copy p');
                if (description) description.textContent = `Ringkasan: ${branch.customer_count} pelanggan, ${branch.event_count} event, piutang ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(branch.receivables) || 0)}.`;
                card.removeAttribute('href');
                card.setAttribute('aria-disabled', 'true');
                card.classList.add('summary-only');
            }
            card.hidden = !branch;
        });
        if (result.scope === "admin_cabang") {
            const description = document.querySelector(".branch-hero p");
            if (description) description.textContent = "Rincian operasional hanya tersedia untuk cabang yang ditugaskan. Cabang lain ditampilkan sebagai ringkasan.";
        }
    } catch (error) {
        const status = document.getElementById("activeDescription");
        if (status) status.textContent = error.message || "Tidak dapat memeriksa akses cabang.";
    }
}

enforceBranchScope();
