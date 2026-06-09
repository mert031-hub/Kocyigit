/**
 * KOÇYİĞİT GmbH - MASTER ADMIN JAVASCRIPT (V20 ULTIMATE - MÜHÜRLÜ)
 * ---------------------------------------------------------------
 * - HARDENED SECURITY: HttpOnly Cookie tabanlı oturum yönetimi.
 * - ARCHIVE SYSTEM: Soft-Delete & Restore (Geri Getirme) entegre edildi.
 * - ANALYTICS V2: Çift eksenli (Umsatz & Volumen) Çizgi Grafik.
 * - OPERATIONAL INTEL: Sipariş Durum Pastası (Doughnut Chart) + Datalabels (% ve Adet) + Ortada Toplam Sayı.
 * - INVENTORY RADAR: Kritik Stok Uyarı Sistemi.
 * - SALES ENGINE: Top-Seller ürün analizi ve AOV hesaplama.
 * - REORDER ENGINE: SortableJS ile kalıcı veritabanı sıralaması.
 * - 🛡️ SMART IMAGE RESOLVER: Tüm 404 resim hatalarını çözen akıllı URL sistemi eklendi.
 * - 🛡️ INVOICE ENGINE: Admin sipariş detaylarına PDF fatura indirme butonu entegre edildi.
 * - 🛡️ DYNAMIC GALLERY ENGINE: Instagram vitrin resimleri artık doğrudan PC'den yüklenebilir!
 */

// 🛡️ GÜVENLİK KALKANI: Eklenti yüklenemezse bile Admin Paneli ÇÖKMEZ!
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
} else {
    console.warn("⚠️ Uyarı: ChartDataLabels eklentisi yüklenemedi ama sistem çalışmaya devam ediyor.");
}

// --- GLOBAL DEĞİŞKENLER ---
let currentUser = "Admin";
let salesChart = null;
let statusChart = null;
let allOrdersData = [];
let allProductsData = [];
let currentChartMode = 'monthly';
let pendingUpdate = { id: null, status: null, selectEl: null };

// --- GLOBAL YAPILANDIRMA ---
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://kocyigit-trade.com/api';

const API = API_URL;

const UPLOADS_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/uploads'
    : 'https://kocyigit-trade.com/uploads';

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

// 🛡️ AKILLI RESİM ÇÖZÜCÜ (SMART IMAGE RESOLVER)
function getImageUrl(imagePath) {
    if (!imagePath) return 'https://placehold.co/150?text=No+Image'; // Resim yoksa
    if (imagePath.startsWith('http')) return imagePath; // Harici bir URL ise
    let cleanPath = imagePath.replace(/^\/?(uploads\/)+/, '');
    return `${UPLOADS_URL}/${cleanPath}`;
}

// --- 1. OTURUM KONTROLÜ (GÜVENLİ YÖNTEM) ---
async function checkInitialAuth() {
    try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        if (res.ok) {
            const user = await res.json();
            currentUser = user.username;
        } else {
            window.location.href = 'login.html';
        }
    } catch (err) {
        window.location.href = 'login.html';
    }
}

// --- 💡 LUXE TOAST BİLDİRİM SİSTEMİ ---
function showLuxeAlert(message, type = 'success') {
    let container = document.getElementById('luxe-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'luxe-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `luxe-toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">KOÇYİĞİT Betrieb&Handel Admin</div>
            <div class="toast-msg">${message}</div>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

const handleAuthError = (res) => {
    if (res && res.status === 401) {
        showLuxeAlert("Sitzung abgelaufen. Bitte erneut anmelden.", "error");
        setTimeout(() => window.logout(), 2000);
        return null;
    }
    return res;
};

function startAuthWatcher() {
    setInterval(async () => {
        try {
            const res = await fetch(`${API_URL}/auth/status`, { credentials: 'include' });
            if (res.status === 401) window.logout();
        } catch (e) {
            console.error("Session check failed");
        }
    }, 60000);
}

// --- 🛡️ KALICI LOG SİSTEMİ ---
window.loadLogs = async () => {
    try {
        const res = await fetch(`${API_URL}/logs`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const logs = await res.json();
        const list = document.getElementById('admin-activity-logs');
        if (!list) return;

        list.innerHTML = "";
        logs.forEach(log => {
            const row = `
                <tr class="log-row">
                    <td class="log-date">${new Date(log.timestamp).toLocaleString('de-DE')}</td>
                    <td class="log-action">${log.action}</td>
                    <td class="log-user fw-bold">${log.user}</td>
                    <td><span class="badge ${log.status === 'Success' ? 'bg-success' : (log.status === 'Deleted' ? 'bg-danger' : 'bg-primary')}">
                        ${log.status === 'Success' ? 'Erfolg' : (log.status === 'Deleted' ? 'Gelöscht' : log.status)}
                    </span></td>
                </tr>`;
            list.innerHTML += row;
        });
    } catch (err) { console.error("Loglar yüklenemedi:", err); }
};

// 🛡️ DASHBOARD VE İSTATİSTİK YÖNETİMİ
async function loadDashboard() {
    await window.loadLogs();
    if (typeof window.loadOrders === 'function') await window.loadOrders();
    if (typeof window.loadProducts === 'function') await window.loadProducts();
    if (typeof window.loadAdmins === 'function') await window.loadAdmins();
    if (typeof window.loadArchivedProducts === 'function') await window.loadArchivedProducts();
    if (typeof window.loadReviews === 'function') await window.loadReviews();

    try {
        const res = await fetch(`${API_URL}/admin/stats`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const data = await res.json();
        if (data.success) {
            if (data.salesChart) { renderSalesChart(allOrdersData, currentChartMode, data.salesChart); }
        }
    } catch (e) { console.error("Dashboard Stats loading failed:", e); }
    window.logActivity("Dashboard erfolgreich geladen", currentUser, "Success");
}

// --- 🛡️ 1. ANALİTİK MOTORU ---
function renderSalesChart(orders, mode = 'monthly', backendChartData = null) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    currentChartMode = mode;

    let labels = [];
    let revenueData = [];
    let orderCountData = [];

    const validOrders = orders.filter(o => o.status !== 'Cancelled' && !o.isArchived);
    const now = new Date();

    if (backendChartData && backendChartData.length > 0) {
        labels = backendChartData.map(d => `${d._id.month}/${d._id.year}`);
        revenueData = backendChartData.map(d => d.total);
        orderCountData = backendChartData.map(d => d.count || 0);
    } else {
        if (mode === 'daily') {
            labels = [...Array(7)].map((_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                return d.toLocaleDateString('de-DE', { weekday: 'short' });
            });
            revenueData = labels.map((_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                const ds = d.toLocaleDateString('de-DE');
                return validOrders.filter(o => new Date(o.date).toLocaleDateString('de-DE') === ds).reduce((s, o) => s + o.totalAmount, 0);
            });
            orderCountData = labels.map((_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                const ds = d.toLocaleDateString('de-DE');
                return validOrders.filter(o => new Date(o.date).toLocaleDateString('de-DE') === ds).length;
            });
        } else if (mode === 'weekly') {
            labels = ["4. Woche", "3. Woche", "2. Woche", "Diese Woche"];
            revenueData = [3, 2, 1, 0].map(w => {
                const start = new Date(); start.setDate(now.getDate() - (w * 7 + 7));
                const end = new Date(); end.setDate(now.getDate() - (w * 7));
                return validOrders.filter(o => { const d = new Date(o.date); return d >= start && d < end; }).reduce((s, o) => s + o.totalAmount, 0);
            });
            orderCountData = [3, 2, 1, 0].map(w => {
                const start = new Date(); start.setDate(now.getDate() - (w * 7 + 7));
                const end = new Date(); end.setDate(now.getDate() - (w * 7));
                return validOrders.filter(o => { const d = new Date(o.date); return d >= start && d < end; }).length;
            });
        } else {
            labels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
            revenueData = labels.map((_, i) => validOrders.filter(o => new Date(o.date).getMonth() === i && new Date(o.date).getFullYear() === now.getFullYear()).reduce((s, o) => s + o.totalAmount, 0));
            orderCountData = labels.map((_, i) => validOrders.filter(o => new Date(o.date).getMonth() === i && new Date(o.date).getFullYear() === now.getFullYear()).length);
        }
    }

    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Umsatz (€)', data: revenueData, borderColor: '#c5a059', backgroundColor: 'rgba(197, 160, 89, 0.1)', borderWidth: 3, fill: true, tension: 0.4, yAxisID: 'y' },
                { label: 'Bestellungen', data: orderCountData, borderColor: '#1c2541', borderDash: [5, 5], borderWidth: 2, fill: false, tension: 0.4, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, position: 'top' },
                datalabels: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label.includes('Umsatz')) return label + ': ' + euro.format(context.parsed.y);
                            return label + ': ' + context.parsed.y + ' Stück';
                        }
                    }
                }
            },
            scales: {
                y: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: true, text: 'Euro (€)' } },
                y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Bestellungen' } }
            }
        }
    });
}

// --- 🛡️ 2. OPERASYONEL PANEL ---
function renderStatusChart(orders) {
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const statusCounts = {
        'Delivered': orders.filter(o => o.status === 'Delivered' && !o.isArchived).length,
        'Pending': orders.filter(o => (o.status === 'Pending' || o.status === 'Processing') && !o.isArchived).length,
        'Shipped': orders.filter(o => o.status === 'Shipped' && !o.isArchived).length,
        'Cancelled': orders.filter(o => o.status === 'Cancelled' && !o.isArchived).length
    };

    const totalOrders = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    if (statusChart) statusChart.destroy();
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Geliefert', 'In Arbeit', 'Versandt', 'Storniert'],
            datasets: [{
                data: [statusCounts.Delivered, statusCounts.Pending, statusCounts.Shipped, statusCounts.Cancelled],
                backgroundColor: ['#198754', '#ffc107', '#0dcaf0', '#dc3545'],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { family: "'Montserrat', sans-serif", size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(28, 37, 65, 0.9)',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 8
                },
                datalabels: {
                    display: function (context) { return context.dataset.data[context.dataIndex] > 0; },
                    color: '#ffffff',
                    font: { family: "'Montserrat', sans-serif", weight: 'bold', size: 13 },
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowBlur: 4,
                    textAlign: 'center',
                    formatter: (value, ctx) => {
                        let percentage = (value * 100 / totalOrders).toFixed(0) + "%";
                        return value + "\n" + percentage;
                    }
                }
            },
            elements: { center: { text: totalOrders.toString(), color: '#1c2541', fontStyle: 'Montserrat', sidePadding: 20, minFontSize: 20, lineHeight: 25 } }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: function (chart) {
                if (chart.config.options.elements.center) {
                    var ctx = chart.ctx;
                    var centerConfig = chart.config.options.elements.center;
                    var fontStyle = centerConfig.fontStyle || 'Arial';
                    var txt = centerConfig.text;
                    var color = centerConfig.color || '#000';
                    var maxFontSize = centerConfig.maxFontSize || 40;
                    var sidePadding = centerConfig.sidePadding || 20;
                    var sidePaddingCalculated = (sidePadding / 100) * (chart.innerRadius * 2);

                    ctx.font = "30px " + fontStyle;
                    var stringWidth = ctx.measureText(txt).width;
                    var elementWidth = (chart.innerRadius * 2) - sidePaddingCalculated;
                    var widthRatio = elementWidth / stringWidth;
                    var newFontSize = Math.floor(30 * widthRatio);
                    var fontSizeToUse = Math.min(newFontSize, maxFontSize, centerConfig.minFontSize || maxFontSize);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    var centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
                    var centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2) - 10;
                    ctx.font = "bold " + fontSizeToUse + "px " + fontStyle;
                    ctx.fillStyle = color;
                    ctx.fillText(txt, centerX, centerY);
                }
            }
        }]
    });
}

// --- 🛡️ 3. ZEKÂ KATMANI: STOK RADARI & TOP-SELLER ---
function updateInventoryAlerts(products) {
    const lowStock = products.filter(p => p.stock <= 5 && !p.isDeleted);
    const alertDiv = document.getElementById('critical-stock-alert');
    const listText = document.getElementById('low-stock-list');
    if (lowStock.length > 0) {
        alertDiv.classList.remove('d-none');
        listText.innerText = lowStock.map(p => `${p.name} (${p.stock} adet kaldı)`).join(', ');
    } else { alertDiv.classList.add('d-none'); }
}

function calculateTopSellers(orders) {
    const productCounts = {};
    const validOrders = orders.filter(o => o.status !== 'Cancelled' && !o.isArchived);
    validOrders.forEach(order => {
        order.items.forEach(item => { productCounts[item.name] = (productCounts[item.name] || 0) + item.qty; });
    });
    const topSellers = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const listContainer = document.getElementById('top-products-list');
    if (!listContainer) return;
    listContainer.innerHTML = topSellers.map(([name, qty], index) => `
        <tr>
            <td width="40"><span class="fw-bold text-muted">#${index + 1}</span></td>
            <td><div class="fw-bold text-navy">${name}</div></td>
            <td class="text-end text-muted small">${qty} Verkauft</td>
            <td class="text-end"><div class="progress" style="height: 6px; width: 60px; margin-left: auto;">
                <div class="progress-bar bg-gold" style="width: ${100 - (index * 15)}%"></div>
            </div></td>
        </tr>`).join('');
}

// 🛡️ DATA EXPORT SİSTEMİ
window.exportOrdersToCSV = () => {
    if (allOrdersData.length === 0) return showLuxeAlert("Keine Daten zum Exportieren.", "error");
    let csv = "Datum;Kunde;Betrag;Status;Zahlung\n";
    allOrdersData.forEach(o => {
        const row = `${new Date(o.date).toLocaleDateString()};${o.customer.firstName} ${o.customer.lastName};${o.totalAmount};${o.status};${o.paymentMethod}`;
        csv += row + "\n";
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Kocyigit_Gmbh_Orders_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.changeChartMode = (mode) => {
    document.querySelectorAll('.btn-chart-toggle').forEach(btn => btn.classList.remove('active'));
    event?.target.classList.add('active');
    renderSalesChart(allOrdersData, mode);
};

// --- 🛡️ 4. SİPARİŞ YÖNETİMİ ---
window.loadOrders = async () => {
    try {
        const res = await fetch(`${API_URL}/orders`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const orders = await res.json();
        allOrdersData = orders;

        const list = document.getElementById('admin-order-list');
        const archivedList = document.getElementById('admin-archived-order-list');

        if (!list) return;
        list.innerHTML = "";
        if (archivedList) archivedList.innerHTML = "";

        orders.forEach(o => {
            const rawMethod = o.paymentMethod ? o.paymentMethod.toUpperCase() : "K.A.";
            const payIcon = rawMethod.includes('KARTE') ? '💳' : (rawMethod.includes('PAYPAL') ? '🅿️' : '❓');

            const rowHTML = `
                <tr class="order-row ${o.isArchived ? 'opacity-50 grayscale' : ''}">
                    <td class="small text-muted">${new Date(o.date).toLocaleDateString('de-DE')}</td>
                    <td><strong class="customer-name">${o.customer.firstName} ${o.customer.lastName}</strong></td>
                    <td><button class="btn btn-sm btn-link p-0 fw-bold shadow-none" onclick="viewDetails('${o._id}')">Details</button></td>
                    <td><span class="badge bg-light text-dark border">${payIcon} ${rawMethod}</span></td>
                    <td class="fw-bold">${euro.format(o.totalAmount)}</td>
                    <td>
                        <select class="form-select form-select-sm rounded-pill status-select" data-current="${o.status}" onchange="openStatusConfirmModal('${o._id}', this)" ${o.isArchived ? 'disabled' : ''}>
                            <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>⏳ Ausstehend</option>
                            <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>⚙️ Bearbeitung</option>
                            <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>🚚 Versandt</option>
                            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>✅ Geliefert</option>
                            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>❌ Storniert</option>
                        </select>
                    </td>
                    <td class="text-end pe-4">
                        ${o.isArchived
                    ? `<button class="btn btn-sm btn-outline-success border-0" onclick="restoreOrder('${o._id}')" title="Wiederherstellen"><i class="fas fa-undo"></i></button>`
                    : `<button class="btn-delete" onclick="deleteOrder('${o._id}')" title="Archivieren">✕</button>`
                }
                    </td>
                </tr>`;

            if (o.isArchived) {
                if (archivedList) archivedList.innerHTML += rowHTML;
            } else {
                list.innerHTML += rowHTML;
            }
        });

        calculateStats(orders);
        renderSalesChart(orders, currentChartMode);
        renderStatusChart(orders);
        calculateTopSellers(orders);

        const todayStr = new Date().toLocaleDateString();
        const todayCountEl = document.getElementById('today-order-count');
        if (todayCountEl) todayCountEl.innerText = orders.filter(o => new Date(o.date).toLocaleDateString() === todayStr && !o.isArchived).length;
    } catch (err) { console.error("Sipariş Yükleme Hatası:", err); }
};

window.openStatusConfirmModal = (id, selectElement) => {
    const oldStatus = selectElement.getAttribute('data-current');
    const newStatus = selectElement.value;
    const labels = { 'Pending': 'Ausstehend', 'Processing': 'Bearbeitung', 'Shipped': 'Versandt', 'Delivered': 'Geliefert', 'Cancelled': 'Storniert' };
    if (oldStatus === newStatus) return;
    pendingUpdate = { id, status: newStatus, selectEl: selectElement };
    document.getElementById('modal-old-status').innerText = labels[oldStatus] || oldStatus;
    document.getElementById('modal-new-status').innerText = labels[newStatus] || newStatus;
    new bootstrap.Modal(document.getElementById('statusConfirmModal')).show();
};

document.getElementById('statusConfirmModal')?.addEventListener('hidden.bs.modal', function () {
    if (pendingUpdate.id && pendingUpdate.selectEl) {
        pendingUpdate.selectEl.value = pendingUpdate.selectEl.getAttribute('data-current');
        pendingUpdate = { id: null, status: null, selectEl: null };
    }
});

document.getElementById('confirmStatusBtn')?.addEventListener('click', async () => {
    const { id, status, selectEl } = pendingUpdate;
    if (!id) return;
    try {
        const res = await fetch(`${API_URL}/orders/${id}/status`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ status })
        }).then(handleAuthError);
        if (res && res.ok) {
            selectEl.setAttribute('data-current', status);
            pendingUpdate = { id: null, status: null, selectEl: null };
            bootstrap.Modal.getInstance(document.getElementById('statusConfirmModal')).hide();
            await loadDashboard();
            showLuxeAlert(`Status auf ${status} aktualisiert`, "success");
            window.logActivity(`Status-Update: ${status}`, currentUser, "Success");
        }
    } catch (err) { console.error("Update Hatası:", err); }
});

window.deleteOrder = async (id) => {
    if (confirm("Möchten Sie diese Bestellung wirklich ins Archiv verschieben?")) {
        try {
            const res = await fetch(`${API_URL}/orders/${id}`, { method: 'DELETE', credentials: 'include' }).then(handleAuthError);
            if (res && res.ok) {
                showLuxeAlert("Bestellung archiviert", "success");
                window.logActivity(`Bestellung archiviert`, currentUser, "Deleted");
                await window.loadOrders();
            }
        } catch (err) { console.error(err); }
    }
};

window.restoreOrder = async (id) => {
    try {
        const res = await fetch(`${API_URL}/orders/${id}/restore`, { method: 'POST', credentials: 'include' }).then(handleAuthError);
        if (res && res.ok) {
            showLuxeAlert("Bestellung wiederhergestellt", "success");
            window.logActivity(`Bestellung wiederhergestellt`, currentUser, "Success");
            await window.loadOrders();
        }
    } catch (err) { console.error(err); }
};

window.viewDetails = async (id) => {
    const o = allOrdersData.find(item => item._id === id);
    if (!o) return;
    const modalArea = document.getElementById('modal-content-area');
    if (modalArea) {
        modalArea.innerHTML = `
            <div class="mb-4 p-3 rounded-3 text-center" style="background: rgba(197, 160, 89, 0.05); border: 1px dashed var(--gold);">
                <span class="small text-uppercase fw-bold text-muted d-block mb-1">Bestell-ID</span>
                <h4 class="fw-bold mb-0 text-navy" style="letter-spacing: 1px;">${o.shortId || '#LB-' + o._id.slice(-6).toUpperCase()}</h4>
            </div>
            <div class="row mb-3">
                <div class="col-md-4 mb-3 mb-md-0">
                    <label class="small fw-bold text-muted d-block mb-1">Zahlungsart</label>
                    <div class="p-2 bg-white rounded border h-100">💰 ${o.paymentMethod || 'Unbekannt'}</div>
                </div>
                <div class="col-md-8">
                    <label class="small fw-bold text-muted d-block mb-1">Kontaktinformationen</label>
                    <div class="p-2 bg-white rounded border small">
                        📧 <strong>Email:</strong> ${o.customer.email}<br>
                        📞 <strong>Telefon:</strong> ${o.customer.phone || 'Nicht angegeben'}
                    </div>
                </div>
            </div>
            <div class="mb-4">
                <label class="small fw-bold text-muted d-block mb-1">Lieferadresse</label>
                <div class="p-3 bg-light rounded-3 border">📍 ${o.customer.address}</div>
            </div>
            <div>
                <label class="small fw-bold text-muted d-block mb-1">Produkte</label>
                <div class="table-responsive">
                    ${o.items.map(i => `<div class="d-flex justify-content-between align-items-center border-bottom py-2 small"><span>${i.qty}x ${i.name}</span><strong class="text-navy">${euro.format(i.price * i.qty)}</strong></div>`).join('')}
                </div>
                <div class="d-flex justify-content-between mt-3 fw-bold fs-5 pt-2 border-top">
                    <span>Gesamtbetrag:</span><span class="text-primary">${euro.format(o.totalAmount)}</span>
                </div>
            </div>
            
            <div class="mt-4 pt-3 border-top text-center">
                <a href="${API_URL}/orders/${o._id}/invoice" target="_blank" class="btn btn-outline-dark rounded-pill px-4 py-2 fw-bold shadow-sm w-100">
                    <i class="fas fa-file-pdf me-2 text-danger"></i> Rechnung Herunterladen
                </a>
            </div>`;

        new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
    }
};

// --- 🛡️ 5. ÜRÜN YÖNETİMİ & AKILLI RESİM ÇÖZÜCÜ ---
window.loadProducts = async () => {
    try {
        const res = await fetch(`${API_URL}/products`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const products = await res.json();
        allProductsData = products;
        const list = document.getElementById('admin-product-list');
        if (!list) return;
        list.innerHTML = "";

        products.filter(p => p.isDeleted !== true).forEach(p => {
            let imgSrc = getImageUrl(p.image);
            let priceDisplay = p.oldPrice
                ? `<div class="text-decoration-line-through text-muted small">${euro.format(p.oldPrice)}</div><div class="fw-bold text-gold">${euro.format(p.price)}</div>`
                : `<div class="fw-bold">${euro.format(p.price)}</div>`;

            list.innerHTML += `
                <tr class="product-row" data-id="${p._id}">
                    <td><div class="drag-handle"><i class="fas fa-grip-vertical"></i></div></td>
                    <td>
                        <div class="product-img-box-small">
                            <img src="${imgSrc}" onerror="this.src='https://placehold.co/150?text=404+Error'">
                        </div>
                    </td>
                    <td><strong class="product-name">${p.name}</strong></td>
                    <td>${priceDisplay}</td>
                    <td><span class="badge ${p.stock <= 5 ? 'bg-danger' : 'bg-light text-dark'}">${p.stock}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary border-0 me-2" onclick="editProduct('${p._id}')">✎</button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteProduct('${p._id}')">🗑️</button>
                    </td>
                </tr>`;
        });
        updateInventoryAlerts(products);
        initSortable();
    } catch (err) { console.error(err); }
    window.loadArchivedProducts();
};

function initSortable() {
    const el = document.getElementById('admin-product-list');
    if (!el) return;

    Sortable.create(el, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: async function () {
            const rows = document.querySelectorAll('#admin-product-list tr');
            const newOrder = Array.from(rows).map((row, index) => ({
                id: row.getAttribute('data-id'),
                index: index
            }));

            const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
            const finalEndpoint = `${base}/products/reorder/update-order`;

            try {
                const response = await fetch(finalEndpoint, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newOrder }),
                    credentials: 'include'
                });
                if (response.ok) {
                    showLuxeAlert("Reihenfolge dauerhaft gespeichert!", "success");
                }
            } catch (err) {
                console.error("Sıralama Kayıt Hatası:", err);
                showLuxeAlert("Fehler beim Speichern der Reihenfolge", "error");
            }
        }
    });
}

window.loadArchivedProducts = async () => {
    try {
        const res = await fetch(`${API_URL}/products?includeDeleted=true`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const allProducts = await res.json();
        const archived = allProducts.filter(p => p.isDeleted === true);
        const archivedList = document.getElementById('admin-archived-list');
        if (!archivedList) return;

        if (archived.length === 0) {
            archivedList.innerHTML = "<tr><td class='text-muted small text-center p-3'>Keine Archiv vorhanden.</td></tr>";
            return;
        }

        archivedList.innerHTML = "";
        archived.forEach(p => {
            let imgSrc = getImageUrl(p.image);
            archivedList.innerHTML += `
                <tr>
                    <td><img src="${imgSrc}" width="30" height="30" style="object-fit: cover;" class="grayscale rounded shadow-sm" onerror="this.src='https://placehold.co/150?text=404'"></td>
                    <td class="small text-muted ps-3">${p.name}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-success border-0 py-0" title="Wiederherstellen" onclick="restoreProduct('${p._id}')">♻️</button>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error("Arşiv Yükleme Hatası:", err); }
};

window.restoreProduct = async (id) => {
    await fetch(`${API_URL}/products/restore/${id}`, { method: 'PUT', credentials: 'include' }).then(handleAuthError);
    showLuxeAlert("Produkt reaktiviert", "success");
    await loadDashboard();
};

window.deleteProduct = async (id) => {
    if (confirm("Produkt archivieren?")) {
        await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', credentials: 'include' }).then(handleAuthError);
        showLuxeAlert("Produkt archiviert", "success");
        await loadDashboard();
    }
};

document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('productSubmitBtn');
    const originalBtnText = submitBtn.innerHTML;
    const id = document.getElementById('pId').value;
    const fileInput = document.getElementById('pImageFile');

    if (fileInput.files[0] && fileInput.files[0].size > 4 * 1024 * 1024) { showLuxeAlert("Datei zu groß!", "error"); return; }

    const formData = new FormData();
    formData.append('name', document.getElementById('pName').value);
    formData.append('price', document.getElementById('pPrice').value);
    const oldPriceVal = document.getElementById('pOldPrice')?.value || "";
    formData.append('oldPrice', oldPriceVal);
    formData.append('stock', document.getElementById('pStock').value);
    formData.append('description', document.getElementById('pDesc').value);
    if (fileInput && fileInput.files[0]) formData.append('image', fileInput.files[0]);

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Wird hochgeladen...';
        const res = await fetch(id ? `${API_URL}/products/${id}` : `${API_URL}/products`, { method: id ? 'PUT' : 'POST', body: formData, credentials: 'include' });
        if (!res.ok) { throw new Error("Serverfehler"); }
        showLuxeAlert(id ? "Aktualisiert!" : "Produkt erstellt!", "success");
        window.resetProductForm();
        await loadDashboard();
    } catch (err) { showLuxeAlert("Fehler: " + err.message, "error"); }
    finally { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnText; }
});

window.editProduct = async (id) => {
    const res = await fetch(`${API_URL}/products`, { credentials: 'include' }).then(handleAuthError);
    if (!res) return;
    const products = await res.json();
    const p = products.find(i => i._id === id);
    if (!p) return;

    document.getElementById('pId').value = p._id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pPrice').value = p.price;
    const oldPriceInput = document.getElementById('pOldPrice');
    if (oldPriceInput) oldPriceInput.value = p.oldPrice || "";
    document.getElementById('pStock').value = p.stock;
    document.getElementById('pDesc').value = p.description || "";

    const preview = document.getElementById('imagePreview');
    if (preview && p.image) {
        preview.classList.remove('d-none');
        document.getElementById('previewImg').src = getImageUrl(p.image);
    }
    document.getElementById('productFormTitle').innerText = "Produkt bearbeiten";
    document.getElementById('productSubmitBtn').innerText = "Aktualisieren";
    document.getElementById('cancelEditBtn').classList.remove('d-none');
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
};

window.resetProductForm = () => {
    document.getElementById('productForm').reset();
    document.getElementById('pId').value = "";
    document.getElementById('imagePreview').classList.add('d-none');
    document.getElementById('productFormTitle').innerText = "Produkt hinzufügen";
    document.getElementById('productSubmitBtn').innerText = "Speichern";
    document.getElementById('cancelEditBtn').classList.add('d-none');
};

function calculateStats(orders) {
    const valid = orders.filter(o => o.status !== 'Cancelled' && !o.isArchived);
    const totalRev = valid.reduce((s, o) => s + o.totalAmount, 0);
    const aov = valid.length > 0 ? totalRev / valid.length : 0;

    const countEl = document.getElementById('stat-count');
    const revEl = document.getElementById('stat-revenue');
    const custEl = document.getElementById('stat-customers');
    const aovEl = document.getElementById('stat-aov');

    if (countEl) countEl.innerText = valid.length;
    if (revEl) revEl.innerText = euro.format(totalRev);
    if (custEl) custEl.innerText = new Set(valid.map(o => o.customer.email)).size;
    if (aovEl) aovEl.innerText = euro.format(aov);
}

// --- 🛡️ 6. YORUM YÖNETİMİ ---
window.loadReviews = async () => {
    try {
        const res = await fetch(`${API_URL}/reviews`, { credentials: 'include' }).then(handleAuthError);
        if (!res) return;
        const reviews = await res.json();
        const list = document.getElementById('admin-review-list');
        if (!list) return;
        list.innerHTML = "";
        reviews.forEach(r => {
            list.innerHTML += `
                <tr class="review-row">
                    <td class="small text-muted">${new Date(r.createdAt).toLocaleDateString('de-DE')}</td>
                    <td class="reviewer-name fw-bold">${r.name}</td>
                    <td>${"⭐".repeat(r.rating || r.stars)}</td>
                    <td class="review-text small" style="max-width: 250px;">${r.text}</td>
                    <td>${r.adminReply ? `<span class="admin-reply-badge">✓</span>` : `<span class="badge bg-light text-muted border">Keine Antwort</span>`}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-gold me-2" onclick="openReplyModal('${r._id}', '${r.adminReply || ''}')">💬</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteReview('${r._id}')">🗑️</button>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
};

window.openReplyModal = (id, existingReply) => {
    const idField = document.getElementById('replyReviewId');
    const textField = document.getElementById('adminReplyText');
    if (idField) idField.value = id;
    if (textField) textField.value = (existingReply !== 'undefined' && existingReply !== 'null') ? existingReply : "";
    const modalEl = document.getElementById('replyModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
};

window.submitReply = async () => {
    const id = document.getElementById('replyReviewId').value;
    const replyText = document.getElementById('adminReplyText').value;
    const res = await fetch(`${API_URL}/reviews/reply/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ replyText })
    }).then(handleAuthError);
    if (res && res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('replyModal')).hide();
        window.loadReviews();
        showLuxeAlert("Antwort erfolgreich gespeichert", "success");
    }
};

window.deleteReview = async (id) => {
    if (confirm("Möchten Sie diese Rezension gerçekten löschen?")) {
        await fetch(`${API_URL}/reviews/${id}`, { method: 'DELETE', credentials: 'include' }).then(handleAuthError);
        showLuxeAlert("Rezension gelöscht", "success");
        window.loadReviews();
    }
};

// --- 🛡️ 7. ADMIN & LOG YÖNETİMİ ---
window.loadAdmins = async () => {
    const res = await fetch(`${API_URL}/auth/users`, { credentials: 'include' }).then(handleAuthError);
    if (!res) return;
    const users = await res.json();
    const list = document.getElementById('admin-list-body');
    if (!list) return;
    list.innerHTML = "";
    users.forEach(u => {
        list.innerHTML += `<tr><td class="fw-bold text-navy">${u.username}</td><td class="text-end"><button class="btn btn-sm btn-outline-danger border-0" onclick="deleteAdmin('${u._id}')">Entfernen</button></td></tr>`;
    });
};

window.deleteAdmin = async (id) => {
    if (confirm("Administrator entfernen?")) {
        try {
            const res = await fetch(`${API_URL}/auth/users/${id}`, { method: 'DELETE', credentials: 'include' }).then(handleAuthError);
            if (res && res.ok) { showLuxeAlert("Admin entfernt", "success"); await window.loadAdmins(); }
        } catch (err) { console.error("Admin Error:", err); }
    }
};

document.getElementById('addAdminForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('newAdminUser')?.value;
    const password = document.getElementById('newAdminPass')?.value;
    const res = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ username, password }) }).then(handleAuthError);
    if (res && res.ok) { showLuxeAlert("Erfolgreich registriert!", "success"); document.getElementById('addAdminForm').reset(); window.loadAdmins(); }
});

window.logActivity = async (action, user, status) => {
    try {
        await fetch(`${API_URL}/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ action, user, status }) });
        await window.loadLogs();
    } catch (err) { console.error("Log error"); }
};

// --- 🛡️ 8. FİLTRE MOTORLARI ---
document.getElementById('logSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('.log-row');
    rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none"; });
});

document.getElementById('orderSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.order-row').forEach(row => {
        const name = row.querySelector('.customer-name').innerText.toLowerCase();
        row.style.display = name.includes(term) ? "" : "none";
    });
});

document.getElementById('productSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.product-row').forEach(row => {
        const name = row.querySelector('.product-name').innerText.toLowerCase();
        row.style.display = name.includes(term) ? "" : "none";
    });
});

document.getElementById('reviewSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.review-row').forEach(row => { row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none"; });
});

window.logout = async () => {
    try { await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); }
    finally { window.location.href = 'login.html'; }
};

// --- 🛡️ 10. KARGO VE GALERİ AYARLARI MOTORU ---
window.loadSettings = async () => {
    try {
        // 🛡️ CACHE BUSTING: Tarayıcının 50€'yu veya eski resimleri hafızadan getirmesini yasaklıyoruz!
        const res = await fetch(`${API_URL}/settings?cb=${new Date().getTime()}`);
        if (res && res.ok) {
            const data = await res.json();
            document.getElementById('setShippingCost').value = data.shippingCost.toFixed(2);
            document.getElementById('setFreeShippingThreshold').value = data.freeShippingThreshold.toFixed(2);

            // 🛡️ Admin yüklenirken mevcut Instagram resimlerini alanlara doldur (Görsel Önizleme)
            if (data.socialImages && data.socialImages.length > 0) {
                if (data.socialImages[0]) document.getElementById('previewInsta1').src = getImageUrl(data.socialImages[0]);
                if (data.socialImages[1]) document.getElementById('previewInsta2').src = getImageUrl(data.socialImages[1]);
                if (data.socialImages[2]) document.getElementById('previewInsta3').src = getImageUrl(data.socialImages[2]);
                if (data.socialImages[3]) document.getElementById('previewInsta4').src = getImageUrl(data.socialImages[3]);
            }
        }
    } catch (err) { console.error("Ayarlar yüklenemedi:", err); }
};

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveSettingsBtn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Speichern...';

    // 🛡️ FormData oluştur (Hem yazılar hem dosyalar için)
    const formData = new FormData();

    // 🛡️ GÜÇLÜ FORMAT: Virgül kullansan bile noktaya çevirip backend'in kafasını karıştırmayacak
    let shippingVal = document.getElementById('setShippingCost').value.replace(',', '.');
    let thresholdVal = document.getElementById('setFreeShippingThreshold').value.replace(',', '.');

    formData.append('shippingCost', shippingVal);
    formData.append('freeShippingThreshold', thresholdVal);

    // 🛡️ Dosyaları yakala (Eğer seçildiyse FormData'ya ekle)
    const img1 = document.getElementById('setInstaImg1').files[0];
    const img2 = document.getElementById('setInstaImg2').files[0];
    const img3 = document.getElementById('setInstaImg3').files[0];
    const img4 = document.getElementById('setInstaImg4').files[0];

    if (img1) formData.append('instaImg1', img1);
    if (img2) formData.append('instaImg2', img2);
    if (img3) formData.append('instaImg3', img3);
    if (img4) formData.append('instaImg4', img4);

    try {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        }).then(handleAuthError);

        if (res && res.ok) {
            showLuxeAlert("Einstellungen & Galerie aktualisiert!", "success");
            window.logActivity("Systemeinstellungen & Galerie geändert", currentUser, "Success");

            // Önizlemeleri yenilemek için formu resetleyip ayarları baştan çekiyoruz
            document.getElementById('setInstaImg1').value = "";
            document.getElementById('setInstaImg2').value = "";
            document.getElementById('setInstaImg3').value = "";
            document.getElementById('setInstaImg4').value = "";
            window.loadSettings();
        }
    } catch (err) {
        showLuxeAlert("Fehler beim Speichern", "error");
    } finally {
        btn.innerHTML = origText;
    }
});

// --- 🛡️ 9. BAŞLATICI ---
document.addEventListener('DOMContentLoaded', async () => {
    await checkInitialAuth();
    loadDashboard();
    await loadSettings(); // Ayarları ve Instagram resimlerini yükle
    startAuthWatcher();
});

window.addEventListener("load", function () {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add("preloader-hidden");
            setTimeout(() => {
                if (typeof AOS !== 'undefined') { AOS.init({ duration: 1000, once: true }); }
                const content = document.getElementById('adminMainContent');
                if (content) content.classList.remove('d-none');
                preloader.style.display = "none";
            }, 1000);
        }, 1200);
    }
});