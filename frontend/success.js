/**
 * KOÇYİĞİT GmbH - SUCCESS PAGE LOGIC (STRIPE LIVE READY)
 * FIX: Sipariş özetine ürün görselleri eklendi.
 * NEW: Stripe session doğrulama ve otomatik sepet temizleme mühürlendi.
 * NEW: E-Fatura indirme butonu entegrasyonu sağlandı.
 * 🛡️ SHIPPING ENGINE: Kargo ücreti ve ara toplam güvenli matematik motoru eklendi.
 * 🛡️ CACHE BUSTING: Başarı ekranında sipariş resimlerinin hep taze çekilmesi sağlandı.
 */

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

const UPLOADS_URL = '';

async function loadOrderSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const fullOrderId = urlParams.get('orderId');
    const shortDisplayId = urlParams.get('displayId');
    const stripeSessionId = urlParams.get('session_id');

    if (!fullOrderId && !shortDisplayId && !stripeSessionId) {
        window.location.href = 'index.html';
        return;
    }

    localStorage.removeItem('luxeCartArray');
    const orderIdElement = document.getElementById('orderIdText');

    if (stripeSessionId) {
        try {
            const res = await fetch(`${API_URL}/orders/by-session/${stripeSessionId}`);
            const order = await res.json();

            if (res.ok && order) {
                renderOrderDetails(order);
                if (orderIdElement) orderIdElement.innerText = order.shortId || "KOÇYİĞİT-SUCCESS";
                const trackBtn = document.getElementById('trackBtn');
                if (trackBtn) trackBtn.href = `track.html?id=${order.shortId || order._id}`;
            } else {
                console.warn("Sipariş henüz oluşturulmamış olabilir (Webhook gecikmesi).");
                if (orderIdElement) orderIdElement.innerText = "Processing...";
            }
        } catch (err) {
            console.error("Stripe sipariş verisi yüklenemedi:", err);
        }
    }
    else if (fullOrderId) {
        if (orderIdElement) orderIdElement.innerText = shortDisplayId || "LB-XXXXXX";
        const trackBtn = document.getElementById('trackBtn');
        if (trackBtn) trackBtn.href = `track.html?id=${shortDisplayId || fullOrderId}`;

        try {
            const res = await fetch(`${API_URL}/orders/${fullOrderId}`);
            const order = await res.json();
            if (res.ok) renderOrderDetails(order);
        } catch (err) {
            console.error("Sipariş verisi yüklenemedi:", err);
        }
    }
}

function renderOrderDetails(order) {
    const list = document.getElementById('summary-list');
    let subtotal = 0;

    if (list && order.items) {
        list.innerHTML = order.items.map(item => {
            const imgPath = item.productId?.image || item.image || 'https://via.placeholder.com/50';

            // 🛡️ CACHE BUSTING KORUMASI:
            let finalImg = imgPath.startsWith('http') ? imgPath : `${UPLOADS_URL}/${imgPath}`;
            finalImg += (finalImg.includes('?') ? '&' : '?') + "cb=" + new Date().getTime();

            const itemPrice = parseFloat(item.price || (item.productId && item.productId.price) || 0);
            const itemQty = parseInt(item.qty || 1);
            subtotal += (itemPrice * itemQty);

            return `
                <div class="summary-item d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex align-items-center">
                        <img src="${finalImg}" width="45" height="45" class="me-3 rounded shadow-sm" style="object-fit: cover; border: 1px solid rgba(0,0,0,0.05);">
                        <div class="d-flex flex-column">
                            <span class="small fw-bold text-dark">${item.productId?.name || item.name || 'Produkt'}</span>
                            <span class="text-muted" style="font-size: 0.75rem;">Menge: ${itemQty}</span>
                        </div>
                    </div>
                    <span class="small fw-bold text-navy">${euro.format(itemPrice * itemQty)}</span>
                </div>
            `;
        }).join('');
    }

    const subtotalEl = document.getElementById('subtotalAmountText');
    if (subtotalEl) subtotalEl.innerText = euro.format(subtotal);

    const totalAmount = parseFloat(order.totalAmount || 0);
    let shippingCost = totalAmount - subtotal;
    if (shippingCost < 0.05) shippingCost = 0;

    const shippingEl = document.getElementById('shippingAmountText');
    if (shippingEl) {
        if (shippingCost === 0) {
            shippingEl.innerText = "GRATIS";
            shippingEl.classList.add('text-success');
        } else {
            shippingEl.innerText = euro.format(shippingCost);
            shippingEl.classList.remove('text-success');
        }
    }

    const totalEl = document.getElementById('totalAmountText');
    if (totalEl) totalEl.innerText = euro.format(totalAmount);

    const addressEl = document.getElementById('addressText');
    if (addressEl) {
        addressEl.innerText = `${order.customer.firstName} ${order.customer.lastName}, ${order.customer.address}`;
    }

    const invoiceBtn = document.getElementById('invoiceDownloadBtn');
    if (invoiceBtn && order._id) {
        invoiceBtn.href = `${API_URL}/orders/${order._id}/invoice`;
        invoiceBtn.classList.remove('d-none');
    }

    localStorage.setItem('luxeHasOrdered', 'true');
    localStorage.setItem('luxeReviewSentCount', '0');

    if (typeof AOS !== 'undefined') {
        setTimeout(() => { AOS.refresh(); }, 500);
    }
}

function copyOrderId() {
    const orderIdText = document.getElementById('orderIdText');
    const idBox = document.getElementById('idBox');
    const orderId = orderIdText?.innerText;

    if (!orderId || orderId === "Laden...") return;

    navigator.clipboard.writeText(orderId).then(() => {
        idBox.classList.add('copied');
        setTimeout(() => { idBox.classList.remove('copied'); }, 2000);
    }).catch(err => { console.error('Kopyalama hatası:', err); });
}

document.addEventListener('DOMContentLoaded', loadOrderSuccess);

window.addEventListener("load", function () {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add("preloader-hidden");
            setTimeout(() => {
                if (typeof AOS !== 'undefined') {
                    AOS.init({ duration: 1000, once: true, offset: 50, disableMutationObserver: false });
                    AOS.refresh();
                }
                window.dispatchEvent(new Event('scroll'));
                preloader.style.display = "none";
            }, 1000);
        }, 1200);
    }
});