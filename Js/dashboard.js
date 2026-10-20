// ================== FUNGSI UTAMA ==================

        // Tanggal dan jam otomatis
        const currentDate = document.getElementById("currentDate");
        const currentTime = document.getElementById("currentTime");

        function updateClock() {
            const now = new Date();
            const dateOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
            currentDate.textContent = now.toLocaleDateString("id-ID", dateOptions);
            const time = now.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });
            currentTime.textContent = time + " WIB";
        }
        updateClock();
        setInterval(updateClock, 1000);

        function navigateThroughLoading(destination) {
            window.location.href = "loading.html?next=" + encodeURIComponent(destination.href);
        }

        document.addEventListener("click", function(event) {
            const link = event.target.closest("a[href]");
            if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (link.target === "_blank" || link.hasAttribute("download") || link.getAttribute("href") === "#") return;

            const destination = new URL(link.href, window.location.href);
            if (destination.origin !== window.location.origin || /loading\.html$/i.test(destination.pathname) || destination.href === window.location.href) return;

            if (/\/cabang\.html$/i.test(destination.pathname)) {
                event.preventDefault();
                document.body.classList.add("is-branch-warping");
                destination.searchParams.set("loadingEntry", "1");
                window.setTimeout(() => { window.location.href = destination.href; }, 360);
                return;
            }

            event.preventDefault();
            navigateThroughLoading(destination);
        });

        // Efek aktif pada menu
        document.querySelectorAll(".nav-item").forEach(item => {
            item.addEventListener("click", function() {
                document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
                this.classList.add("active");
            });
        });

        // ================== LOGIKA LOGIN ==================
        const authArea = document.getElementById("authArea");
        const accountLink = document.getElementById("accountLink");
        const accountLinkText = document.getElementById("accountLinkText");

        function formatCurrency(value) {
            const amount = Number(value);
            return new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0
            }).format(Number.isFinite(amount) ? amount : 0);
        }

        function formatDate(value) {
            if (!value) return "-";
            const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
            return Number.isNaN(date.getTime())
                ? String(value)
                : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
        }

        function escapeHtml(value) {
            return String(value ?? "").replace(/[&<>'"]/g, character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                "\"": "&quot;"
            }[character]));
        }

        let dashboardData = null;
        let dashboardLoadPromise = null;

        function getBranchRoute(branchName) {
            const key = String(branchName ?? "").trim().toLowerCase().replace(/^cabang\s+/, "");
            const routes = {
                palembang: "Html/cabangPalembang.html",
                bali: "Html/cabangBali.html",
                bandung: "Html/cabangBandung.html"
            };
            return routes[key] || "Html/cabang.html";
        }

        function getSeeAllRoute(section) {
            if (section === "receivables") return "Html/piutang.html";
            if (dashboardData?.scope === "branch") {
                const branch = dashboardData.branches?.[0];
                if (branch?.name) return getBranchRoute(branch.name);
            }
            return "Html/cabang.html";
        }

        async function navigateSeeAll(event) {
            const section = event.currentTarget.dataset.seeAll;
            await isLoggedIn();
            if (!loggedIn) {
                const destination = new URL("Html/login.html", window.location.href);
                destination.searchParams.set("next", window.location.href);
                navigateThroughLoading(destination);
                return;
            }
            if (!dashboardData && dashboardLoadPromise) await dashboardLoadPromise;
            if (currentUser?.role === "pelanggan") {
                navigateThroughLoading(new URL("Html/history.html", window.location.href));
                return;
            }
            const destinationPath = getSeeAllRoute(section);
            navigateThroughLoading(new URL(destinationPath, window.location.href));
        }
        function parseDateOnly(value) {
            const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!match) return null;
            const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
            return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
        }

        let notificationReadStorageKey = "";
        let readNotificationKeys = new Set();
        let dashboardAlerts = [];

        function notificationReadKey(item) {
            return [item.branch, item.id, item.customer, item.event, item.due_date].map(value => String(value ?? "")).join("|");
        }

        function loadReadNotifications(userId) {
            const account = `${currentUser?.role || "unknown"}:${userId ?? "guest"}`;
            const storageKey = `nusaKarsa:readNotifications:${account}`;
            if (storageKey === notificationReadStorageKey) return;
            notificationReadStorageKey = storageKey;
            try {
                const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
                readNotificationKeys = new Set(Array.isArray(saved) ? saved : []);
            } catch (error) {
                readNotificationKeys = new Set();
            }
        }

        function renderNotifications(receivables, userId = null) {
            const badge = document.getElementById("notificationBadge");
            const list = document.getElementById("notificationList");
            const dueAlertsList = document.getElementById("dueAlertsList");
            if (!badge || !list || !dueAlertsList) return;
            loadReadNotifications(userId);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const alerts = receivables.flatMap(item => {
                const due = parseDateOnly(item.due_date);
                if (!due) return [];
                const days = Math.round((due - today) / 86400000);
                if (days < 0) return [{ ...item, days, kind: "overdue" }];
                if (days === 0) return [{ ...item, days, kind: "due_today" }];
                if (days <= 7) return [{ ...item, days, kind: "upcoming" }];
                return [];
            }).sort((a, b) => a.days - b.days || String(a.customer).localeCompare(String(b.customer), "id"));
            dashboardAlerts = alerts;

            const unreadCount = alerts.filter(item => !readNotificationKeys.has(notificationReadKey(item))).length;
            badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
            badge.hidden = unreadCount === 0;
            notificationToggle.setAttribute("aria-label", `Notifikasi, ${unreadCount} belum dibaca`);
            const notificationGroups = [
                { kind: "overdue", title: "Piutang lewat tenggat" },
                { kind: "due_today", title: "Piutang jatuh tempo hari ini" },
                { kind: "upcoming", title: "Piutang hampir jatuh tempo" }
            ];
            list.innerHTML = notificationGroups.map(group => {
                const groupAlerts = alerts
                    .map((item, index) => ({ item, index }))
                    .filter(({ item }) => item.kind === group.kind);
                if (!groupAlerts.length) return "";
                const unreadInGroup = groupAlerts.filter(({ item }) => !readNotificationKeys.has(notificationReadKey(item))).length;
                return `
                    <section class="notification-group" aria-label="${group.title}">
                        <h3>${group.title} (${unreadInGroup} belum dibaca)</h3>
                        ${groupAlerts.map(({ item, index }) => {
                            const isRead = readNotificationKeys.has(notificationReadKey(item));
                            return `
                            <article class="notification-item ${item.kind === "overdue" ? "is-overdue" : ""}">
                                <strong>${escapeHtml(item.customer)} - ${escapeHtml(item.event)}</strong>
                                <span>${item.kind === "overdue" ? "Lewat tenggat " + Math.abs(item.days) + " hari" : item.kind === "due_today" ? "Jatuh tempo hari ini" : "Jatuh tempo " + item.days + " hari lagi"} - ${formatCurrency(item.balance)} - ${escapeHtml(formatDate(item.due_date))}</span>
                                <small class="notification-read-status ${isRead ? "is-read" : ""}">${isRead ? "Sudah dibaca" : "Belum dibaca"}</small>
                                <button type="button" class="due-alert-check" data-check-alert="${index}">${isRead ? "Lihat piutang" : "Cek piutang"}</button>
                            </article>`;
                        }).join("")}
                    </section>`;
            }).join("") || '<p class="notification-empty">Tidak ada notifikasi jatuh tempo.</p>';

            document.getElementById("dueAlertCountAll").textContent = String(alerts.length);
            document.getElementById("dueAlertCountUpcoming").textContent = String(alerts.filter(item => item.kind === "upcoming").length);
            document.getElementById("dueAlertCountToday").textContent = String(alerts.filter(item => item.kind === "due_today").length);
            document.getElementById("dueAlertCountOverdue").textContent = String(alerts.filter(item => item.kind === "overdue").length);
            dueAlertsList.innerHTML = alerts.map((item, index) => {
                const isRead = readNotificationKeys.has(notificationReadKey(item));
                return `
                <article class="due-alert-row ${item.kind === "overdue" ? "is-overdue" : ""}" data-alert-kind="${item.kind}" id="due-alert-${index}" tabindex="-1">
                    <div><strong>${escapeHtml(item.customer)}</strong><span>${escapeHtml(item.branch)}</span></div>
                    <div><strong>${escapeHtml(item.event)}</strong><span>Sisa tagihan ${formatCurrency(item.balance)}</span></div>
                    <div><strong>${escapeHtml(formatDate(item.due_date))}</strong><span class="due-alert-status">${item.kind === "overdue" ? "Lewat tenggat " + Math.abs(item.days) + " hari" : item.kind === "due_today" ? "Jatuh tempo hari ini" : "Mendekati tempo - " + item.days + " hari lagi"}</span><span class="notification-read-status ${isRead ? "is-read" : ""}">${isRead ? "Sudah dibaca" : "Belum dibaca"}</span></div>
                    <button type="button" class="due-alert-check" data-check-alert="${index}">${isRead ? "Lihat" : "Cek"}</button>
                </article>`;
            }).join("") || '<p class="notification-empty">Tidak ada notifikasi jatuh tempo.</p>';
        }

        function applyRolePresentation() {
            if (!currentUser) return;
            const role = currentUser.role;
            const isCustomer = role === "pelanggan";
            document.getElementById("branchAccountAdminLink")?.classList.toggle("role-hidden", !["admin_pusat", "super_admin"].includes(role));
            const branchName = dashboardData?.branches?.[0]?.name;
            const roleLabels = {
                super_admin: "Admin Pusat",
                admin_pusat: "Admin Pusat",
                admin_cabang: branchName ? `Admin Cabang · ${branchName}` : "Admin Cabang",
                pelanggan: "Pelanggan"
            };
            authArea.querySelector(".admin-info span")?.replaceChildren(document.createTextNode(roleLabels[role] || "Pengguna"));
            document.getElementById("welcomeUserName").textContent = `${currentUser.name || roleLabels[role] || "Pengguna"}!`;

            document.querySelectorAll("#dashboardSidebar .nav-item").forEach(link => {
                const path = new URL(link.href, window.location.href).pathname.toLowerCase();
                const restrictedForCustomer = /\/html\/(cabang|pelanggan|pembayaran|laporan)\.html$/.test(path);
                link.classList.toggle("role-hidden", isCustomer && restrictedForCustomer);
                if (isCustomer && /\/html\/history\.html$/.test(path)) {
                    link.querySelector("span").textContent = "Riwayat Pembayaran";
                }
            });

            document.querySelector('[data-dashboard-section="branches"]')?.classList.toggle("role-hidden", isCustomer);
            document.querySelectorAll('[data-see-all="branches"]').forEach(button => button.classList.toggle("role-hidden", isCustomer));
            document.querySelectorAll('[data-see-all="receivables"]').forEach(button => button.classList.toggle("role-hidden", isCustomer));
            if (isCustomer) {
                document.querySelector('[data-activity-section="customers"]')?.classList.add("role-hidden");
                document.querySelector('[data-activity-section="payments"] .section-title').textContent = "Riwayat Pembayaran Saya";
                document.querySelector('[data-dashboard-section="receivables"] .section-title').textContent = "Piutang Saya";
                document.querySelector(".due-alerts-caption").textContent = "Notifikasi ini hanya menampilkan piutang yang terhubung dengan akun pelanggan Anda.";
                document.querySelector("#notificationPanel h2").textContent = "Notifikasi piutang saya";
                document.querySelector("#notificationPanel").setAttribute("aria-label", "Notifikasi piutang pelanggan");
                document.querySelector(".hero-text p").textContent = "Pantau sisa piutang, tenggat pembayaran, dan riwayat pembayaran milik Anda.";
            }
        }
        const notificationToggle = document.getElementById("notificationToggle");
        const notificationPanel = document.getElementById("notificationPanel");
        document.body.appendChild(notificationPanel);

        function positionNotificationPanel() {
            const anchor = notificationToggle.getBoundingClientRect();
            const panelWidth = notificationPanel.offsetWidth;
            const panelHeight = notificationPanel.offsetHeight;
            const margin = 12;
            const left = Math.min(Math.max(margin, anchor.right - panelWidth), window.innerWidth - panelWidth - margin);
            const top = Math.min(anchor.bottom + 8, window.innerHeight - panelHeight - margin);
            notificationPanel.style.left = `${Math.max(margin, left)}px`;
            notificationPanel.style.top = `${Math.max(margin, top)}px`;
        }

        function setNotificationPanelOpen(open) {
            notificationPanel.hidden = !open;
            notificationToggle.setAttribute("aria-expanded", String(open));
            if (open) positionNotificationPanel();
        }

        notificationToggle.addEventListener("click", event => {
            event.stopPropagation();
            setNotificationPanelOpen(notificationPanel.hidden);
        });
        document.addEventListener("click", event => {
            if (!notificationPanel.hidden && !notificationToggle.contains(event.target) && !notificationPanel.contains(event.target)) {
                setNotificationPanelOpen(false);
            }
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !notificationPanel.hidden) {
                setNotificationPanelOpen(false);
                notificationToggle.focus();
            }
        });
        window.addEventListener("resize", () => {
            if (!notificationPanel.hidden) positionNotificationPanel();
        });
        window.addEventListener("scroll", () => {
            if (!notificationPanel.hidden) positionNotificationPanel();
        }, true);

        function filterDueAlerts(kind) {
            const rows = [...document.querySelectorAll(".due-alert-row")];
            let visibleCount = 0;
            rows.forEach(row => {
                row.hidden = kind !== "all" && row.dataset.alertKind !== kind;
                if (!row.hidden) visibleCount++;
            });
            document.querySelectorAll("[data-due-filter]").forEach(button => {
                button.setAttribute("aria-pressed", String(button.dataset.dueFilter === kind));
            });
            const empty = document.getElementById("dueAlertsEmpty");
            empty.hidden = visibleCount > 0;
            empty.textContent = kind === "upcoming" ? "Tidak ada tagihan yang mendekati tempo." : kind === "due_today" ? "Tidak ada tagihan yang jatuh tempo hari ini." : kind === "overdue" ? "Tidak ada tagihan yang lewat tenggat." : "Tidak ada tagihan mendekati tempo, jatuh tempo hari ini, atau lewat tenggat.";
        }

        function showDueAlerts(kind) {
            setNotificationPanelOpen(false);
            filterDueAlerts(kind);
            const section = document.getElementById("dueAlertsSection");
            section.scrollIntoView({ behavior: "smooth", block: "start" });
            section.querySelector("[data-due-filter][data-due-filter='" + kind + "']")?.focus({ preventScroll: true });
        }
        function checkDueAlert(index) {
            const alertIndex = Number(index);
            const alertItem = dashboardAlerts[alertIndex];
            if (!alertItem) return;
            readNotificationKeys.add(notificationReadKey(alertItem));
            try {
                localStorage.setItem(notificationReadStorageKey, JSON.stringify([...readNotificationKeys]));
            } catch (error) {
                // Status tetap terbaca untuk sesi ini meskipun penyimpanan browser tidak tersedia.
            }
            if (dashboardData) renderNotifications(dashboardData.recent_receivables, dashboardData.user_id);
            filterDueAlerts("all");
            const target = document.getElementById(`due-alert-${alertIndex}`);
            if (!target) return;
            setNotificationPanelOpen(false);
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.focus({ preventScroll: true });
            target.classList.add("is-highlighted");
            window.setTimeout(() => target.classList.remove("is-highlighted"), 2200);
        }
        document.addEventListener("click", event => {
            const filterButton = event.target.closest("[data-due-filter]");
            if (filterButton) filterDueAlerts(filterButton.dataset.dueFilter);
            const viewButton = event.target.closest("[data-show-due-alerts]");
            if (viewButton) showDueAlerts(viewButton.dataset.showDueAlerts);
            const checkButton = event.target.closest("[data-check-alert]");
            if (checkButton) checkDueAlert(checkButton.dataset.checkAlert);
        });
        function clearDashboardData(message) {
            document.querySelectorAll("[data-summary]").forEach(element => {
                element.textContent = message;
            });
            document.querySelector(".branch-grid").innerHTML = `<p>${escapeHtml(message)}</p>`;
            document.querySelector("tbody").innerHTML = `<tr><td colspan="9">${escapeHtml(message)}</td></tr>`;
            renderNotifications([]);
        }

        function renderDashboardData(data) {
            if (!data.summary || !Array.isArray(data.branches) || !Array.isArray(data.recent_receivables)) {
                throw new Error("Format data dashboard dari server tidak valid.");
            }
            dashboardData = data;
            renderNotifications(data.recent_receivables, data.user_id);
            applyRolePresentation();

            document.querySelectorAll("[data-summary]").forEach(element => {
                const key = element.dataset.summary;
                const value = data.summary[key];
                if (value === undefined || !Number.isFinite(Number(value))) {
                    throw new Error(`Nilai ringkasan "${key}" tidak valid.`);
                }
                element.textContent = formatCurrency(value);
            });
            document.getElementById("unpaidSummaryCount").textContent = `${new Intl.NumberFormat("id-ID").format(Number(data.summary.unpaid_count) || 0)} tagihan belum menerima pembayaran`;
            document.getElementById("overdueSummaryCount").textContent = `${new Intl.NumberFormat("id-ID").format(Number(data.summary.overdue_count) || 0)} tagihan melewati tanggal jatuh tempo`;

            const branchColors = { palembang: "#26789d", bali: "#d39600", bandung: "#eb5b22" };
            const totalReceivables = data.branches.reduce((total, branch) => total + Math.max(0, Number(branch.receivables) || 0), 0);
            document.querySelector(".branch-grid").innerHTML = data.branches.map(branch => {
                const balance = Number(branch.receivables);
                const customerCount = Number(branch.customer_count);
                if (!branch.name || !Number.isFinite(balance) || !Number.isFinite(customerCount)) {
                    throw new Error("Data salah satu cabang tidak valid.");
                }
                const branchKey = String(branch.name).trim().toLowerCase().replace(/^cabang\s+/, "");
                const branchRoute = getBranchRoute(branch.name);
                const share = totalReceivables > 0 ? Math.max(0, balance) / totalReceivables * 100 : 0;
                const color = branchColors[branchKey] || "#246b95";
                const icon = branchKey === "bali" ? "fa-landmark" : "fa-building";
                return `
                <a class="branch-card" href="${branchRoute}" style="--branch-color: ${color}" aria-label="Buka data piutang cabang ${escapeHtml(branch.name)}">
                    <div class="branch-top">
                        <div class="branch-icon"><i class="fa-solid ${icon}"></i></div>
                        <div class="branch-info">
                            <strong>${escapeHtml(branch.name)}</strong>
                            <span>${formatCurrency(balance)}</span>
                            <small>${new Intl.NumberFormat("id-ID").format(customerCount)} pelanggan</small>
                        </div>
                    </div>
                    <div class="progress" role="img" aria-label="${escapeHtml(branch.name)}: ${share.toFixed(1)}% dari total piutang cabang">
                        <span style="width: ${share.toFixed(2)}%"></span>
                    </div>
                </a>`;
            }).join("") || "<p>Tidak ada data cabang.</p>";

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            document.querySelector("tbody").innerHTML = data.recent_receivables.map(receivable => {
                const total = Math.max(0, Number(receivable.total_amount) || 0);
                const balance = Math.max(0, Number(receivable.balance) || 0);
                const paid = Math.max(0, total - balance);
                const dueDate = parseDateOnly(receivable.due_date);
                let dueExplanation = "Tanggal jatuh tempo belum tercatat.";
                if (dueDate) {
                    const days = Math.round((dueDate - today) / 86400000);
                    dueExplanation = days < 0 ? `Terlambat ${Math.abs(days)} hari dari tenggat.` : days === 0 ? "Jatuh tempo hari ini." : `Jatuh tempo ${days} hari lagi.`;
                }
                return `
                <tr>
                    <td>${escapeHtml(receivable.customer)}</td>
                    <td>${currentUser?.role === "pelanggan" ? escapeHtml(receivable.branch) : `<a class="dashboard-branch-link" href="${getBranchRoute(receivable.branch)}">${escapeHtml(receivable.branch)}</a>`}</td>
                    <td>${escapeHtml(receivable.event)}</td>
                    <td>${escapeHtml(formatDate(receivable.invoice_date))}</td>
                    <td class="money">${formatCurrency(total)}</td>
                    <td class="money debt-warning">${formatCurrency(balance)}</td>
                    <td>${escapeHtml(formatDate(receivable.due_date))}</td>
                    <td><span class="status ${["paid", "unpaid", "partial"].includes(receivable.status) ? receivable.status : ""}">${({ paid: "Lunas", unpaid: "Belum Dibayar", partial: "Sebagian" })[receivable.status] || escapeHtml(receivable.status)}</span></td>
                    <td><span class="receivable-explanation">Nilai tagihan ${formatCurrency(total)}; sudah dibayar ${formatCurrency(paid)}; sisa piutang ${formatCurrency(balance)}. ${dueExplanation}</span></td>
                </tr>`;
            }).join("") || "<tr><td colspan=\"9\">Belum ada data piutang.</td></tr>";
            loadDashboardActivity();
        }

        async function loadDashboardActivity() {
            const paymentsList = document.getElementById("recentPaymentsList");
            const customersList = document.getElementById("recentCustomersList");
            try {
                const response = await fetch("api/dashboard-activity.php", { cache: "no-store" });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message || "Riwayat pembayaran tidak dapat dimuat.");
                paymentsList.innerHTML = (data.recent_payments || []).map(payment => `
                    <div class="activity-row">
                        <div><strong>${escapeHtml(payment.customer)} · ${escapeHtml(payment.event)}</strong><small>${escapeHtml(payment.branch)} · ${escapeHtml(formatDate(payment.payment_date))} · ${escapeHtml(payment.record_type === "demo_simulation" ? "SIMULASI - belum diverifikasi" : (payment.payment_method || "Manual"))}</small></div>
                        <span class="activity-amount">${formatCurrency(payment.amount)}</span>
                    </div>`).join("") || '<p class="activity-empty">Belum ada transaksi pembayaran tercatat.</p>';
                customersList.innerHTML = (data.recent_customers || []).map(customer => `
                    <div class="activity-row">
                        <div><strong>${escapeHtml(customer.customer)}</strong><small>${escapeHtml(customer.branch)} · ${customer.record_type === "historical_balance" ? "Saldo historis; tanggal transaksi tidak tersedia" : customer.record_type === "demo_simulation" ? "Simulasi pembayaran; belum diverifikasi" : `Terakhir membayar ${escapeHtml(formatDate(customer.last_payment_date))}`}</small></div>
                        <span class="activity-amount">${formatCurrency(customer.last_payment_amount)}</span>
                    </div>`).join("") || '<p class="activity-empty">Belum ada pelanggan yang memiliki pembayaran tercatat.</p>';
            } catch (error) {
                const message = error instanceof Error ? error.message : "Riwayat pembayaran tidak dapat dimuat.";
                paymentsList.innerHTML = `<p class="activity-empty">${escapeHtml(message)}</p>`;
                customersList.innerHTML = '<p class="activity-empty">Data pelanggan terbaru tidak tersedia.</p>';
            }
        }

        async function loadDashboardData() {
            clearDashboardData("Memuat...");
            try {
                const response = await fetch("api/dashboard.php", { cache: "no-store" });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || `Server mengembalikan status ${response.status}.`);
                }
                renderDashboardData(result);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Kesalahan tidak diketahui.";
                clearDashboardData(`Gagal memuat data: ${message}`);
            }
        }

        let loggedIn = false;
        let currentUser = null;

        async function isLoggedIn() {
            const response = await fetch("api/session.php");
            const result = await response.json();
            loggedIn = result.authenticated === true;
            currentUser = loggedIn ? result.user : null;
            return loggedIn;
        }

        async function renderAuthArea() {
            const authenticated = await isLoggedIn();
            if (authenticated) {
                const name = currentUser?.name || "Pengguna";
                const roleLabels = { super_admin: "Admin Pusat", admin_pusat: "Admin Pusat", admin_cabang: "Admin Cabang", pelanggan: "Pelanggan" };
                const role = roleLabels[currentUser?.role] || "Pengguna";
                accountLink.href = "#";
                accountLinkText.textContent = currentUser?.role === "pelanggan" ? "Akun Pelanggan" : "Akun Saya";
                authArea.innerHTML = `
                    <div class="account-section">
                        <button class="account-profile" id="accountProfileBtn"
                            type="button" aria-label="Informasi akun">
                            <div class="avatar">
                                <i class="fa-solid fa-user"></i>
                            </div>

                            <div class="admin-info">
                                <strong>${escapeHtml(name)}</strong>
                                <span>${escapeHtml(role)}</span>
                            </div>

                            <i class="fa-solid fa-chevron-down admin-chevron"></i>
                        </button>

                        <button class="top-logout-inline" id="logoutBtn" type="button">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            <span>Keluar</span>
                        </button>
                    </div>
                `;

                document.getElementById("accountProfileBtn").addEventListener("click", function() {
                    alert("Anda sedang login sebagai " + (currentUser?.name || "pengguna") + ".");
                });

                document.getElementById("logoutBtn").addEventListener("click", async function() {
                    try {
                        await fetch("api/logout.php", { method: "POST" });
                    } finally {
                        navigateThroughLoading(new URL("halaman.html", window.location.href));
                    }
                });
                applyRolePresentation();
            } else {
                accountLink.href = "Html/login.html?next=" + encodeURIComponent(window.location.href);
                accountLinkText.textContent = "Login Admin";
                authArea.innerHTML = `
                    <a href="Html/login.html" class="btn-login-top">
                        <i class="fa-solid fa-right-to-bracket"></i> Login
                    </a>
                `;
            }
        }
        document.querySelector(".sidebar-bottom .logout").addEventListener("click", async function() {
            if (!loggedIn) {
                const destination = new URL("Html/login.html", window.location.href);
                destination.searchParams.set("next", window.location.href);
                navigateThroughLoading(destination);
                return;
            }

            try {
                await fetch("api/logout.php", { method: "POST" });
            } finally {
                navigateThroughLoading(new URL("halaman.html", window.location.href));
            }
        });

        const menuToggle = document.getElementById("menuToggle");
        const sidebar = document.querySelector(".sidebar");
        function setMobileMenu(open) {
            document.body.classList.toggle("is-menu-open", open);
            sidebar.classList.toggle("is-open", open);
            menuToggle.setAttribute("aria-expanded", String(open));
        }
        menuToggle.addEventListener("click", () => setMobileMenu(!document.body.classList.contains("is-menu-open")));
        document.addEventListener("click", event => {
            if (document.body.classList.contains("is-menu-open") && !event.target.closest(".sidebar") && !event.target.closest("#menuToggle")) setMobileMenu(false);
        });
        document.addEventListener("keydown", event => { if (event.key === "Escape") setMobileMenu(false); });
        document.querySelectorAll("[data-see-all]").forEach(button => button.addEventListener("click", navigateSeeAll));
        renderAuthArea();
        dashboardLoadPromise = loadDashboardData();

        // Menu Akun membawa pengguna yang belum login ke halaman login.
        accountLink.addEventListener("click", function(event) {
            if (loggedIn) {
                event.preventDefault();
                alert("Anda sedang login sebagai " + (currentUser?.name || "pengguna") + ".");
            }
        });

        // Proteksi elemen yang memerlukan autentikasi
        document.querySelectorAll(".requires-auth:not([data-see-all])").forEach(el => {
            el.addEventListener("click", async function(e) {
                if (!loggedIn) {
                    e.preventDefault();
                    const destination = new URL("Html/login.html", window.location.href);
                    destination.searchParams.set("next", window.location.href);
                    navigateThroughLoading(destination);
                }
                // Jika sudah login, biarkan aksi default berjalan
            });
        });

        document.querySelectorAll(".nav-menu a[href]").forEach(link => {
            if (link.id === "accountLink") return;
            link.addEventListener("click", function(event) {
                if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                const destination = new URL(link.href, window.location.href);
                if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
                event.preventDefault();
                navigateThroughLoading(destination);
            });
        });
