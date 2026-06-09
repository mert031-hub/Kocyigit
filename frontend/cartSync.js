/**
 * LUXE BERLIN - CART SYNCHRONIZATION FIX (FINAL OVERRIDE)
 * Sorun: Logic çalışıyor ama UI elementler ve ürün gridi senkron olmuyor.
 * Çözüm: Anahtar ismi 'luxeCartArray' olarak senkronize edildi ve grid bekçisi eklendi.
 */

function refreshCartUI() {
    // 🛡️ SENIOR FIX: Anahtar ismi projenin geneliyle (luxeCartArray) uyumlu hale getirildi.
    const cart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

    // 1. Bilinen tüm profesyonel seçicileri tara
    const countSelectors = [
        '#cart-count', '#cart-badge', '.cart-badge', '.cart-count', '.badge-cart',
        '#header-cart-qty', '.floating-cart-count', '.count', '.qty'
    ];

    let countElements = Array.from(document.querySelectorAll(countSelectors.join(', ')));

    /**
     * 🛡️ MÜHENDİSLİK HAMLESİ: VAHŞİ TARAMA
     */
    const allSpans = document.querySelectorAll('span, div, small, b, i');
    allSpans.forEach(el => {
        const name = (el.className + el.id).toLowerCase();
        if (name.includes('cart') && (name.includes('count') || name.includes('qty') || name.includes('badge'))) {
            if (!countElements.includes(el)) countElements.push(el);
        }
    });

    // 2. Bulunan tüm elementleri güncelle
    countElements.forEach(el => {
        el.textContent = totalQty;

        if (totalQty === 0) {
            el.style.setProperty('display', 'none', 'important');
            el.innerHTML = "";
        } else {
            el.style.setProperty('display', 'flex', 'important');
        }
    });

    // 3. Floating Cart (Yüzen Sepet) Güncelleme
    const floatCart = document.getElementById('luxe-floating-cart') || document.querySelector('.floating-cart-pill');
    if (floatCart) {
        if (totalQty > 0) {
            floatCart.classList.add('active');
            const totalPriceEl = document.getElementById('float-total-amount') || floatCart.querySelector('.float-price-info span');
            if (totalPriceEl) {
                // Not: Ürün fiyatlarını çekmek için 'products' dizisi gereklidir, 
                // bu yüzden bu kısım main.js/updateCartUI ile el sıkışır.
                const totalAmount = cart.reduce((sum, item) => {
                    if (typeof products !== 'undefined') {
                        const p = products.find(x => x.id === item.id);
                        return sum + (p ? p.price * item.qty : 0);
                    }
                    return sum;
                }, 0);
                if (totalAmount > 0) {
                    const euroFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
                    totalPriceEl.innerText = euroFormatter.format(totalAmount);
                }
            }
        } else {
            floatCart.classList.remove('active');
        }
    }

    // 🛡️ SENIOR FIX: Eğer anasayfadaysak ürün gridini de tazele
    if (typeof renderProducts === 'function' && typeof products !== 'undefined' && products.length > 0) {
        renderProducts(products);
    }
}

/**
 * 🛡️ RENDER DÖNGÜSÜ
 */
function forceSyncLoop() {
    let start = null;
    function step(timestamp) {
        if (!start) start = timestamp;
        let progress = timestamp - start;
        refreshCartUI();
        if (progress < 1500) {
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
}

window.addEventListener('pageshow', (event) => {
    forceSyncLoop();
});

window.addEventListener('popstate', forceSyncLoop);
window.addEventListener('storage', (event) => {
    if (event.key === 'luxeCartArray') refreshCartUI();
});

document.addEventListener('DOMContentLoaded', refreshCartUI);