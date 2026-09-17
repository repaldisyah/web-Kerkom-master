const branchThemes = {
    palembang: {
        name: "Palembang",
        description: "Ritme hangat di tepi Sungai Musi."
    },
    bandung: {
        name: "Bandung",
        description: "Ide kreatif dari dataran tinggi."
    },
    bali: {
        name: "Bali",
        description: "Energi terang untuk menyambut peluang."
    }
};

const params = new URLSearchParams(window.location.search);
const selectedBranch = branchThemes[params.get("branch")] ? params.get("branch") : "palembang";
const theme = branchThemes[selectedBranch];
document.body.dataset.branch = selectedBranch;
document.getElementById("activeBranch").textContent = theme.name;
document.getElementById("activeDescription").textContent = theme.description;

document.querySelectorAll("a[href]").forEach(link => {
    link.addEventListener("click", event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === "_blank") return;
        const destination = new URL(link.href, window.location.href);
        if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
        event.preventDefault();
        document.body.classList.add("is-warping");
        destination.searchParams.set("loadingEntry", "1");
        window.setTimeout(() => { window.location.href = destination.href; }, 360);
    });
});

async function enforceBranchScope() {
    try {
        const sessionResponse = await fetch("../api/session.php", { cache: "no-store" });
        const session = await sessionResponse.json();
        if (!session.authenticated) {
            const loginUrl = new URL("login.html", window.location.href);
            loginUrl.searchParams.set("next", window.location.href);
            window.location.replace(loginUrl.href);
            return;
        }

        const branchResponse = await fetch("../api/branches.php", { cache: "no-store" });
        const result = await branchResponse.json();
        if (!branchResponse.ok || !result.success) throw new Error(result.message || "Data cabang tidak dapat dimuat.");

        const allowedNames = new Set(result.branches.map(branch => branch.name.toLowerCase()));
        document.querySelectorAll(".branch-card").forEach(card => {
            const branchName = card.querySelector("h3")?.textContent.toLowerCase();
            card.hidden = !allowedNames.has(branchName);
        });
        if (result.scope === "admin_cabang") {
            document.querySelector(".branch-hero p").textContent = "Akun cabang hanya dapat membuka ruang operasional cabang yang ditugaskan.";
        }
    } catch (error) {
        document.getElementById("activeDescription").textContent = error.message;
    }
}

enforceBranchScope();
