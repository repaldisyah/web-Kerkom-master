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

        const allowedNames = new Set((result.branches || []).map(branch => String(branch.name).toLowerCase()));
        document.querySelectorAll(".branch-card").forEach(card => {
            const branchName = card.querySelector("h3")?.textContent.trim().toLowerCase();
            card.hidden = !allowedNames.has(branchName);
        });
        if (result.scope === "admin_cabang") {
            const description = document.querySelector(".branch-hero p");
            if (description) description.textContent = "Akun cabang hanya dapat membuka ruang operasional cabang yang ditugaskan.";
        }
    } catch (error) {
        const status = document.getElementById("activeDescription");
        if (status) status.textContent = error.message || "Tidak dapat memeriksa akses cabang.";
    }
}

enforceBranchScope();