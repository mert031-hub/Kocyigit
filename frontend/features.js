/* ================================================================
   FEATURES.JS — KOÇYİĞİT Extended Feature Engine
   ================================================================ */
(function () {
  'use strict';

  var API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

  /* ── Helpers ────────────────────────────────────────────────── */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }
  function euro(n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n); }

  /* ================================================================
     1. WISHLIST
     ================================================================ */
  var WISH_KEY = 'luxeWishlist';

  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch (e) { return []; }
  }
  function saveWishlist(arr) { localStorage.setItem(WISH_KEY, JSON.stringify(arr)); }

  function isWishlisted(id) { return getWishlist().includes(id); }

  function toggleWishlist(id) {
    var list = getWishlist();
    var idx  = list.indexOf(id);
    if (idx > -1) list.splice(idx, 1);
    else          list.push(id);
    saveWishlist(list);
    updateWishlistUI();
  }

  function updateWishlistUI() {
    var list  = getWishlist();
    var badge = qs('#wishlist-badge');
    var btn   = qs('#wishlist-btn');
    if (!badge || !btn) return;
    if (list.length > 0) {
      badge.textContent = list.length;
      badge.style.display = 'flex';
      btn.querySelector('i').className = 'fas fa-heart';
      btn.classList.add('k-wish-active');
    } else {
      badge.style.display = 'none';
      btn.querySelector('i').className = 'far fa-heart';
      btn.classList.remove('k-wish-active');
    }
    /* Sync heart buttons on cards */
    qsa('.k-wish-card-btn').forEach(function (b) {
      var pid = b.dataset.pid;
      b.classList.toggle('k-wish-card-active', isWishlisted(pid));
      b.querySelector('i').className = isWishlisted(pid) ? 'fas fa-heart' : 'far fa-heart';
    });
    /* Render wishlist drawer */
    renderWishlistDrawer();
  }

  function injectWishBtns() {
    qsa('.product-card').forEach(function (card) {
      if (card.querySelector('.k-wish-card-btn')) return; /* already injected */
      var onc = card.getAttribute('onclick') || '';
      var m   = onc.match(/setupModal\('([^']+)'\)/);
      if (!m) return;
      var pid = m[1];
      var box = card.querySelector('.product-img-box');
      if (!box) return;
      var btn = document.createElement('button');
      btn.className = 'k-wish-card-btn' + (isWishlisted(pid) ? ' k-wish-card-active' : '');
      btn.setAttribute('aria-label', 'Wunschliste');
      btn.dataset.pid = pid;
      btn.innerHTML = '<i class="' + (isWishlisted(pid) ? 'fas' : 'far') + ' fa-heart"></i>';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleWishlist(pid);
        btn.classList.toggle('k-wish-card-active', isWishlisted(pid));
        btn.querySelector('i').className = isWishlisted(pid) ? 'fas fa-heart' : 'far fa-heart';
        /* Pulse animation */
        btn.classList.add('k-wish-pulse');
        setTimeout(function () { btn.classList.remove('k-wish-pulse'); }, 400);
      });
      box.appendChild(btn);
    });
  }

  function renderWishlistDrawer() {
    var el = qs('#k-wl-items');
    if (!el) return;
    var list = getWishlist();
    if (!list.length) {
      el.innerHTML = '<p class="k-wl-empty"><i class="far fa-heart"></i><br>Deine Wunschliste ist leer.</p>';
      return;
    }
    /* Use global products array if available */
    var prods = (window.products || []).filter(function (p) { return list.includes(p.id); });
    if (!prods.length) {
      el.innerHTML = '<p class="k-wl-empty"><i class="far fa-heart"></i><br>Lade Wunschliste…</p>';
      return;
    }
    el.innerHTML = prods.map(function (p) {
      return '<div class="k-wl-item">' +
        '<img src="' + p.img + '" alt="' + p.name + '" class="k-wl-img">' +
        '<div class="k-wl-info"><span class="k-wl-name">' + p.name + '</span>' +
        '<span class="k-wl-price">' + euro(p.price) + '</span></div>' +
        '<button class="k-wl-remove" data-pid="' + p.id + '" aria-label="Entfernen"><i class="fas fa-xmark"></i></button>' +
        '</div>';
    }).join('');
    qsa('.k-wl-remove', el).forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleWishlist(btn.dataset.pid);
      });
    });
  }

  /* Wishlist drawer toggle */
  var wishBtn   = qs('#wishlist-btn');
  var wlDrawer  = qs('#k-wishlist-drawer');
  var wlOverlay = qs('#k-wl-overlay');
  var wlClose   = qs('#k-wl-close');

  function openWishlist()  { wlDrawer && wlDrawer.classList.add('open'); wlOverlay && wlOverlay.classList.add('open'); }
  function closeWishlist() { wlDrawer && wlDrawer.classList.remove('open'); wlOverlay && wlOverlay.classList.remove('open'); }

  if (wishBtn)   wishBtn.addEventListener('click', function () { openWishlist(); renderWishlistDrawer(); });
  if (wlClose)   wlClose.addEventListener('click', closeWishlist);
  if (wlOverlay) wlOverlay.addEventListener('click', closeWishlist);

  updateWishlistUI();

  /* MutationObserver: inject wish buttons whenever grid re-renders */
  var gridEl = qs('#product-grid-container');
  if (gridEl) {
    new MutationObserver(function () {
      injectWishBtns();
      updateWishlistUI();
      injectStockBadges();
      trackRecentlyViewed();
    }).observe(gridEl, { childList: true, subtree: true });
  }

  /* ================================================================
     2. RECENTLY VIEWED
     ================================================================ */
  var RV_KEY = 'luxeRecentlyViewed';

  function getRV() { try { return JSON.parse(localStorage.getItem(RV_KEY)) || []; } catch (e) { return []; } }
  function saveRV(arr) { localStorage.setItem(RV_KEY, JSON.stringify(arr)); }

  function addToRV(product) {
    var list = getRV().filter(function (p) { return p.id !== product.id; });
    list.unshift(product);
    if (list.length > 6) list = list.slice(0, 6);
    saveRV(list);
    renderRV();
  }

  function renderRV() {
    var section = qs('#k-recently-viewed');
    var grid    = qs('#k-rv-grid');
    if (!section || !grid) return;
    var list = getRV();
    if (list.length < 2) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    grid.innerHTML = list.map(function (p) {
      return '<div class="k-rv-card" onclick="setupModal(\'' + p.id + '\')" data-bs-toggle="modal" data-bs-target="#luxeModal">' +
        '<div class="k-rv-img-box"><img src="' + p.img + '" alt="' + p.name + '" loading="lazy"></div>' +
        '<div class="k-rv-info"><span class="k-rv-name">' + p.name + '</span>' +
        '<span class="k-rv-price">' + euro(p.price) + '</span></div>' +
        '</div>';
    }).join('');
  }

  function trackRecentlyViewed() {
    var modal = qs('#luxeModal');
    if (!modal || modal._rvTracked) return;
    modal._rvTracked = true;
    modal.addEventListener('show.bs.modal', function () {
      setTimeout(function () {
        var title = (qs('#mTitle') || {}).textContent;
        var price = parseFloat(((qs('#mPriceDisplay') || {}).textContent || '0').replace(/[^0-9,]/g, '').replace(',', '.'));
        var img   = (qs('#mImg') || {}).src;
        var id    = window._lastModalId;
        if (!id || !title) return;
        addToRV({ id: id, name: title, price: price, img: img });
      }, 120);
    });
  }

  /* Intercept setupModal to capture product ID */
  var _origSetupModal = window.setupModal;
  window.setupModal = function (id) {
    window._lastModalId = id;
    if (_origSetupModal) _origSetupModal.call(this, id);
  };

  renderRV();

  /* ================================================================
     3. LIVE STOCK BADGES
     ================================================================ */
  var stockData = {};

  fetch(API_URL + '/products')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      (Array.isArray(data) ? data : (data.products || [])).forEach(function (p) {
        stockData[p._id] = p.stock || 0;
      });
      injectStockBadges();
    })
    .catch(function () {});

  function injectStockBadges() {
    qsa('.product-card').forEach(function (card) {
      if (card.querySelector('.k-stock-badge')) return;
      var onc = card.getAttribute('onclick') || '';
      var m   = onc.match(/setupModal\('([^']+)'\)/);
      if (!m) return;
      var stock = stockData[m[1]];
      if (stock === undefined) return;
      var info = card.querySelector('.product-info');
      if (!info) return;
      var badge = document.createElement('div');
      badge.className = 'k-stock-badge';
      if (stock === 0) {
        badge.innerHTML = '<i class="fas fa-circle-xmark"></i> Ausverkauft';
        badge.classList.add('k-stock-out');
      } else if (stock <= 5) {
        badge.innerHTML = '<i class="fas fa-circle-exclamation"></i> Noch ' + stock + ' auf Lager';
        badge.classList.add('k-stock-low');
      } else {
        badge.innerHTML = '<i class="fas fa-circle-check"></i> Auf Lager';
        badge.classList.add('k-stock-ok');
      }
      info.appendChild(badge);
    });
  }

  /* ================================================================
     4. SOCIAL PROOF TOASTS
     ================================================================ */
  var SP_NAMES    = ['Lena','Max','Emma','Felix','Anna','Lukas','Sophie','Jonas','Marie','Tim','Laura','David'];
  var SP_CITIES   = ['Berlin','München','Hamburg','Frankfurt','Köln','Stuttgart','Düsseldorf','Leipzig','Dresden'];
  var SP_PRODUCTS = ['ein Reinigungsset','ein Premium-Produkt','ein Pflegeset','ein Haushaltsartikel','ein Spezialreiniger'];
  var spCount     = 0;

  function showSocialProof() {
    if (spCount >= 5) return;
    var container = qs('#k-social-proof-container');
    if (!container) return;
    var name    = SP_NAMES[Math.floor(Math.random() * SP_NAMES.length)];
    var city    = SP_CITIES[Math.floor(Math.random() * SP_CITIES.length)];
    var product = SP_PRODUCTS[Math.floor(Math.random() * SP_PRODUCTS.length)];
    var el = document.createElement('div');
    el.className = 'k-sp-toast';
    el.innerHTML =
      '<div class="k-sp-avatar"><i class="fas fa-user"></i></div>' +
      '<div class="k-sp-text"><strong>' + name + ' aus ' + city + '</strong><span>hat gerade ' + product + ' bestellt</span></div>' +
      '<button class="k-sp-close" aria-label="Schließen"><i class="fas fa-xmark"></i></button>';
    el.querySelector('.k-sp-close').addEventListener('click', function () { dismissSP(el); });
    container.appendChild(el);
    spCount++;
    requestAnimationFrame(function () { el.classList.add('k-sp-in'); });
    setTimeout(function () { dismissSP(el); }, 5500);
  }

  function dismissSP(el) {
    el.classList.remove('k-sp-in');
    el.classList.add('k-sp-out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
  }

  setTimeout(function () { showSocialProof(); }, 9000);
  setInterval(function () { showSocialProof(); }, 32000 + Math.random() * 12000);

  /* ================================================================
     5. EXIT INTENT
     ================================================================ */
  var exitShown = sessionStorage.getItem('k_exit_shown');
  var exitModal = qs('#k-exit-modal');

  if (!exitShown && exitModal) {
    document.addEventListener('mouseleave', function handler(e) {
      if (e.clientY > 10) return;
      sessionStorage.setItem('k_exit_shown', '1');
      document.removeEventListener('mouseleave', handler);
      setTimeout(function () { exitModal.classList.add('open'); }, 300);
    });

    var exitClose = qs('#k-exit-close');
    if (exitClose) exitClose.addEventListener('click', function () { exitModal.classList.remove('open'); });
    exitModal.addEventListener('click', function (e) { if (e.target === exitModal) exitModal.classList.remove('open'); });

    var exitForm = qs('#k-exit-form');
    if (exitForm) {
      exitForm.addEventListener('submit', function (e) {
        e.preventDefault();
        exitModal.classList.remove('open');
      });
    }
  }

  /* ================================================================
     6. SCROLL PROGRESS RING (back-to-top)
     ================================================================ */
  var ringCircle = qs('#k-ring-circle');
  var CIRCUMF    = 2 * Math.PI * 15; /* r=15 */

  if (ringCircle) {
    ringCircle.style.strokeDasharray  = CIRCUMF;
    ringCircle.style.strokeDashoffset = CIRCUMF;

    window.addEventListener('scroll', function () {
      var doc    = document.documentElement;
      var total  = doc.scrollHeight - doc.clientHeight;
      var pct    = total > 0 ? window.scrollY / total : 0;
      var offset = CIRCUMF * (1 - pct);
      ringCircle.style.strokeDashoffset = offset;
    }, { passive: true });
  }

  /* ================================================================
     7. PAGE TRANSITION
     ================================================================ */
  var pageOverlay = qs('#k-page-overlay');

  /* Fade in on arrival */
  if (pageOverlay) {
    pageOverlay.classList.add('k-po-in');
    setTimeout(function () { pageOverlay.classList.remove('k-po-in'); }, 600);
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('mailto') || href.startsWith('tel') || link.target === '_blank') return;
    e.preventDefault();
    if (pageOverlay) pageOverlay.classList.add('k-po-out');
    setTimeout(function () { window.location.href = href; }, 380);
  });

  /* ================================================================
     8. LIGHTBOX
     ================================================================ */
  var lightbox    = qs('#k-lightbox');
  var lightboxImg = qs('#k-lightbox-img');
  var lbClose     = qs('#k-lightbox-close');

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (lbClose)   lbClose.addEventListener('click', closeLightbox);
  if (lightbox)  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });

  /* Modal product image click → lightbox */
  var modalImg = qs('#mImg');
  if (modalImg) {
    modalImg.style.cursor = 'zoom-in';
    modalImg.addEventListener('click', function () { openLightbox(modalImg.src, modalImg.alt); });
  }

  /* Keyboard ESC */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeLightbox(); if (exitModal) exitModal.classList.remove('open'); }
  });

  /* ================================================================
     9. LAZY LOAD BLUR-UP
     ================================================================ */
  function setupBlurUp(img) {
    if (img._blurSetup) return;
    img._blurSetup = true;
    if (img.complete && img.naturalWidth > 0) return; /* already loaded */
    img.style.filter    = 'blur(10px)';
    img.style.transform = 'scale(1.06)';
    img.style.transition = 'filter 0.55s ease, transform 0.55s ease';
    img.addEventListener('load', function () {
      img.style.filter    = '';
      img.style.transform = '';
    }, { once: true });
  }

  /* Apply to product images whenever grid re-renders */
  function applyBlurUp() {
    qsa('.product-img-box img, .k-rv-img-box img').forEach(setupBlurUp);
  }
  applyBlurUp();

  if (gridEl) {
    var blurObserver = new MutationObserver(applyBlurUp);
    blurObserver.observe(gridEl, { childList: true, subtree: true });
  }

  /* ================================================================
     10. COUNTDOWN TIMER
     ================================================================ */
  var COUNTDOWN_KEY = 'k_countdown_end';
  var countdownStrip = qs('#k-countdown-strip');
  var countdownNum   = qs('#k-countdown-timer');
  var cdClose        = qs('#k-countdown-close');

  function startCountdown() {
    if (!countdownStrip || !countdownNum) return;
    var stored = localStorage.getItem(COUNTDOWN_KEY);
    var endTime;
    if (stored && parseInt(stored) > Date.now()) {
      endTime = parseInt(stored);
    } else {
      /* 8 hours countdown */
      endTime = Date.now() + 8 * 60 * 60 * 1000;
      localStorage.setItem(COUNTDOWN_KEY, endTime);
    }
    if (sessionStorage.getItem('k_cd_closed')) return;
    setTimeout(function () {
      countdownStrip.style.display = 'flex';
      document.body.classList.add('k-has-countdown');
    }, 3000);

    function tick() {
      var rem = endTime - Date.now();
      if (rem <= 0) {
        countdownStrip.style.display = 'none';
        document.body.classList.remove('k-has-countdown');
        localStorage.removeItem(COUNTDOWN_KEY);
        return;
      }
      var h = Math.floor(rem / 3600000);
      var m = Math.floor((rem % 3600000) / 60000);
      var s = Math.floor((rem % 60000) / 1000);
      countdownNum.textContent =
        String(h).padStart(2, '0') + ':' +
        String(m).padStart(2, '0') + ':' +
        String(s).padStart(2, '0');
    }
    tick();
    setInterval(tick, 1000);
  }

  if (cdClose) {
    cdClose.addEventListener('click', function () {
      sessionStorage.setItem('k_cd_closed', '1');
      if (countdownStrip) countdownStrip.style.display = 'none';
      document.body.classList.remove('k-has-countdown');
    });
  }
  startCountdown();

  /* ================================================================
     12. COOKIE BANNER (already in HTML, just style hook)
     ================================================================ */
  /* Logic already in inline script — nothing to add here */

  /* ================================================================
     13. SEARCH ENHANCEMENT (blur overlay)
     ================================================================ */
  var searchInput   = qs('#mainSearchInput');
  var searchOverlay = document.createElement('div');
  searchOverlay.id  = 'k-search-overlay';
  searchOverlay.className = 'k-search-overlay';
  document.body.appendChild(searchOverlay);

  if (searchInput) {
    searchInput.addEventListener('focus', function () {
      searchOverlay.classList.add('active');
      searchInput.closest('.k-search-wrap') && searchInput.closest('.k-search-wrap').classList.add('k-search-focused');
    });
    searchInput.addEventListener('blur', function () {
      setTimeout(function () {
        searchOverlay.classList.remove('active');
        searchInput.closest('.k-search-wrap') && searchInput.closest('.k-search-wrap').classList.remove('k-search-focused');
      }, 150);
    });
    searchOverlay.addEventListener('click', function () {
      searchInput.blur();
    });
  }

  /* ================================================================
     PWA: Register service worker
     ================================================================ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

})();
