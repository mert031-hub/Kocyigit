/**
 * KOÇYİĞİT GmbH - ADVANCED TRACKING LOGIC (FULL & CANCEL-READY)
 * 🛡️ REBRANDING: LUXE BERLIN -> KOÇYİĞİT GmbH mühürlendi.
 * 🛡️ SECURITY FIX: Sert kilit ve spinner eklendi. (Race Condition Protected)
 * 🛡️ INVOICE UPDATE: E-Fatura indirme butonu linki bağlandı.
 * 🛡️ SHIPPING ENGINE: Mongoose schema fiyat eksikliği koruması eklendi.
 * 🛡️ CACHE BUSTING: Takip ekranında resimlerin önbellekten dolayı eski kalması sorunu çözüldü.
 */

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

const UPLOADS_URL = '';
const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
let currentLoadedOrderId = null;

async function trackOrder() {
    const rawInput = document.getElementById('orderIdInput').value.trim();
    const resultArea = document.getElementById('track-result');
    const itemsList = document.getElementById('order-items-list');
    const header = document.getElementById('status-header');
    const dynamicArea = document.getElementById('dynamic-info-area');
    const cancelSection = document.getElementById('cancel-section');

    let id;
    if (rawInput.length === 24) {
        id = rawInput;
    } else {
        id = rawInput.replace('#', '').replace('LB-', '').toUpperCase();
    }

    if (!id) return alert("Bitte geben Sie eine Bestellnummer ein!");

    try {
        const res = await fetch(`${API_URL}/orders/${id}`);
        const order = await res.json();

        if (res.ok && order) {
            currentLoadedOrderId = order._id;
            resultArea.classList.add('d-none');
            dynamicArea.innerHTML = "";

            if (order.status === 'Pending' || order.status === 'Processing') {
                cancelSection.classList.remove('d-none');
            } else {
                cancelSection.classList.add('d-none');
            }

            setTimeout(() => {
                resultArea.classList.remove('d-none');
                if (typeof AOS !== 'undefined') { AOS.refresh(); }
            }, 50);

            const displayId = order.shortId || `#LB-${id.slice(-6).toUpperCase()}`;
            header.innerHTML = `
                <h6 class="text-muted mb-1 small text-uppercase" style="letter-spacing:1px;">Bestellnummer: ${displayId}</h6>
                <h4 class="fw-bold">Status: <span style="color:#c5a059;">${translateStatus(order.status)}</span></h4>
            `;

            let subtotal = 0;

            if (order.items && order.items.length > 0) {
                itemsList.innerHTML = order.items.map((item, index) => {
                    let imgPath = item.productId?.image || item.image;
                    let prodName = item.productId?.name || item.name || "Produkt";
                    let finalImgSrc = 'https://via.placeholder.com/60';

                    if (imgPath) {
                        const baseImg = imgPath.startsWith('http') ? imgPath : `${UPLOADS_URL}/${imgPath}`;
                        // 🛡️ CACHE BUSTING EKLENTİSİ:
                        finalImgSrc = baseImg + (baseImg.includes('?') ? '&' : '?') + "cb=" + new Date().getTime();
                    }

                    const itemPrice = parseFloat(item.price || (item.productId && item.productId.price) || 0);
                    const itemQty = parseInt(item.qty || 1);
                    subtotal += (itemPrice * itemQty);

                    return `
                        <div class="product-item d-flex justify-content-between align-items-center py-3" 
                             style="animation: fadeInUp 0.5s ease forwards; animation-delay: ${index * 0.1 + 0.4}s; opacity: 0;">
                            <div class="d-flex align-items-center">
                                <img src="${finalImgSrc}" alt="${prodName}" class="product-thumb me-3 shadow-sm">
                                <div>
                                    <span class="fw-bold text-navy me-1">${itemQty}x</span> 
                                    <span class="small fw-semibold text-muted">${prodName}</span>
                                </div>
                            </div>
                            <div class="fw-bold text-navy">${euro.format(itemPrice * itemQty)}</div>
                        </div>`;
                }).join('');
            } else {
                itemsList.innerHTML = `<p class="text-muted small">Keine Produktdaten gefunden.</p>`;
            }

            document.getElementById('display-address').innerText = `📍 ${order.customer?.address || 'K.A.'}`;

            const subtotalEl = document.getElementById('display-subtotal');
            if (subtotalEl) subtotalEl.innerText = euro.format(subtotal);

            const totalAmount = parseFloat(order.totalAmount || 0);
            let shippingCost = totalAmount - subtotal;
            if (shippingCost < 0.05) shippingCost = 0;

            const shippingEl = document.getElementById('display-shipping');
            if (shippingEl) {
                if (shippingCost === 0) {
                    shippingEl.innerText = "GRATIS";
                    shippingEl.classList.add('text-success');
                } else {
                    shippingEl.innerText = euro.format(shippingCost);
                    shippingEl.classList.remove('text-success');
                }
            }

            document.getElementById('display-total').innerText = euro.format(totalAmount);

            const invoiceBtn = document.getElementById('invoiceDownloadBtn');
            if (invoiceBtn) {
                invoiceBtn.href = `${API_URL}/orders/${order._id}/invoice`;
            }

            updateProgressSteps(order.status || 'Pending');

            const footerNote = resultArea.querySelector('.mt-5.small.text-muted.italic');
            if (footerNote) {
                footerNote.innerHTML = `Vielen Dank für Ihr Vertrauen in KOÇYİĞİT Betrieb&Handel! ✨`;
            }

            setTimeout(() => {
                resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                if (typeof AOS !== 'undefined') { AOS.refresh(); }
            }, 300);

        } else {
            alert("Bestellung nicht gefunden!");
            resultArea.classList.add('d-none');
            cancelSection.classList.add('d-none');
        }
    } catch (err) {
        console.error("KOÇYİĞİT Betrieb&Handel - Tracking Error:", err);
        alert("Ein Fehler ist aufgetreten.");
    }
}

window.openCancelModal = function () {
    if (!currentLoadedOrderId) return;
    const sound = document.getElementById('notificationSound');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Ses çalınamadı"));
    }
    const myModal = new bootstrap.Modal(document.getElementById('cancelConfirmModal'));
    myModal.show();
}

window.executeCancellation = async function () {
    if (!currentLoadedOrderId) return;

    const modal = document.getElementById('cancelConfirmModal');
    const confirmBtn = document.getElementById('confirmCancelBtn') || modal.querySelector('.btn-danger');
    const secondaryBtns = modal.querySelectorAll('.btn-close, .btn-secondary');

    if (confirmBtn.disabled) return;

    confirmBtn.disabled = true;
    confirmBtn.style.pointerEvents = 'none';
    confirmBtn.style.opacity = '0.7';
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Bitte warten...';

    secondaryBtns.forEach(btn => btn.style.visibility = 'hidden');

    try {
        const res = await fetch(`${API_URL}/orders/${currentLoadedOrderId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();

        if (res.ok) {
            alert("Ihre Bestellung wurde erfolgreich storniert.");
            window.location.reload();
        } else {
            alert("Fehler: " + (data.message || "Stornierung fehlgeschlagen."));
            confirmBtn.disabled = false;
            confirmBtn.style.pointerEvents = 'auto';
            confirmBtn.style.opacity = '1';
            confirmBtn.innerText = "Ja, Stornieren";
            secondaryBtns.forEach(btn => btn.style.visibility = 'visible');
        }
    } catch (err) {
        console.error("Cancellation error:", err);
        alert("Ein technischer Fehler ist aufgetreten.");
        confirmBtn.disabled = false;
        confirmBtn.style.pointerEvents = 'auto';
        confirmBtn.style.opacity = '1';
        confirmBtn.innerText = "Ja, Stornieren";
        secondaryBtns.forEach(btn => btn.style.visibility = 'visible');
    }
}

function translateStatus(status) {
    const map = { 'Pending': 'Eingegangen', 'Processing': 'Verarbeitung', 'Shipped': 'Versandt', 'Delivered': 'Geliefert', 'Cancelled': 'Storniert' };
    return map[status] || 'Eingegangen';
}

function updateProgressSteps(status) {
    const steps = [
        document.getElementById('step-pending'),
        document.getElementById('step-processing'),
        document.getElementById('step-shipped'),
        document.getElementById('step-delivered')
    ];
    const progressLine = document.getElementById('progress-line');
    const container = document.getElementById('track-container');
    const dynamicArea = document.getElementById('dynamic-info-area');

    if (status === 'Cancelled') {
        container.classList.add('is-cancelled');
        if (progressLine) { progressLine.style.width = "0%"; progressLine.style.height = "0%"; }
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index === 0) {
                step.classList.add('cancelled-step');
                step.querySelector('.step-icon').innerHTML = "✕";
                step.querySelector('.step-text').innerText = "Storniert";
            }
        });
        dynamicArea.innerHTML = `<div class="cancel-notice shadow-sm" style="animation: fadeInUp 0.8s ease forwards;"><div class="me-3 fs-3">⚠️</div><div><strong class="d-block">Bestellung Storniert</strong><span class="small">Diese Bestellung wurde storniert.</span></div></div>`;
        return;
    }

    container.classList.remove('is-cancelled');
    const statusMap = { 'Pending': 0, 'Processing': 1, 'Shipped': 2, 'Delivered': 3 };
    const percentages = [0, 33.3, 66.6, 100];
    const currentIndex = statusMap[status] !== undefined ? statusMap[status] : 0;

    if (progressLine) {
        if (window.innerWidth < 768) {
            progressLine.style.width = "4px";
            progressLine.style.height = `${percentages[currentIndex]}%`;
        } else {
            progressLine.style.height = "4px";
            progressLine.style.width = `${percentages[currentIndex]}%`;
        }
    }

    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed', 'cancelled-step');
        if (index < currentIndex) { step.classList.add('completed'); }
        else if (index === currentIndex) { step.classList.add('active'); }
    });
}

window.addEventListener("load", function () {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add("preloader-hidden");
            setTimeout(() => {
                if (typeof AOS !== 'undefined') {
                    AOS.init({ duration: 1000, once: true, offset: 10, disableMutationObserver: false });
                    AOS.refresh();
                }
                window.dispatchEvent(new Event('scroll'));
                preloader.style.display = "none";
            }, 1000);
        }, 1200);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdFromUrl = urlParams.get('id');
    if (orderIdFromUrl) {
        document.getElementById('orderIdInput').value = orderIdFromUrl;
        setTimeout(() => { trackOrder(); }, 1500);
    }
});