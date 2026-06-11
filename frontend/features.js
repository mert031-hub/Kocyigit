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

  /* ================================================================
     N1. ANNOUNCEMENT BAR
     ================================================================ */
  (function () {
    var bar = qs('#k-ann-bar');
    var closeBtn = qs('#k-ann-close');
    if (!bar) return;
    if (localStorage.getItem('k_ann_v1')) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    document.body.classList.add('k-has-ann');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      bar.classList.add('k-ann-hiding');
      setTimeout(function () {
        bar.style.display = 'none';
        document.body.classList.remove('k-has-ann');
      }, 350);
      localStorage.setItem('k_ann_v1', '1');
    });
  })();

  /* ================================================================
     N2. SEARCH AUTOCOMPLETE
     ================================================================ */
  var acInput    = qs('#mainSearchInput');
  var acDropdown = qs('#k-ac-dropdown');
  var acIdx      = -1;

  function renderAC(term) {
    if (!acDropdown || !window.products) return;
    term = term.trim().toLowerCase();
    if (!term) { hideAC(); return; }
    var hits = window.products.filter(function (p) {
      return p.name.toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term);
    }).slice(0, 6);
    if (!hits.length) { hideAC(); return; }
    acIdx = -1;
    acDropdown.innerHTML = hits.map(function (p, i) {
      var hl = p.name.replace(new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
      return '<div class="k-ac-item" role="option" data-idx="' + i + '" data-id="' + p.id + '">' +
        '<img src="' + p.img + '" alt="" class="k-ac-img" loading="lazy">' +
        '<div class="k-ac-info"><span class="k-ac-name">' + hl + '</span>' +
        '<span class="k-ac-price">' + euro(p.price) + '</span></div>' +
        '</div>';
    }).join('');
    acDropdown.style.display = 'block';
    if (acInput) acInput.setAttribute('aria-expanded', 'true');
    qsa('.k-ac-item', acDropdown).forEach(function (item) {
      item.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var id = item.dataset.id;
        var prod = window.products.find(function (p) { return p.id === id; });
        if (prod && acInput) { acInput.value = prod.name; }
        hideAC();
        if (window.filterProducts) window.filterProducts();
      });
    });
  }

  function hideAC() {
    if (!acDropdown) return;
    acDropdown.style.display = 'none';
    acDropdown.innerHTML = '';
    acIdx = -1;
    if (acInput) acInput.setAttribute('aria-expanded', 'false');
  }

  function acKeyNav(e) {
    var items = qsa('.k-ac-item', acDropdown);
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      acIdx = Math.min(acIdx + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      acIdx = Math.max(acIdx - 1, -1);
    } else if (e.key === 'Enter' && acIdx >= 0) {
      e.preventDefault();
      items[acIdx].dispatchEvent(new MouseEvent('mousedown'));
      return;
    } else if (e.key === 'Escape') {
      hideAC(); return;
    }
    items.forEach(function (it, i) { it.classList.toggle('k-ac-focused', i === acIdx); });
    if (acIdx >= 0 && acInput) acInput.value = items[acIdx].querySelector('.k-ac-name').textContent;
  }

  if (acInput) {
    acInput.addEventListener('input', function () { renderAC(acInput.value); });
    acInput.addEventListener('keydown', acKeyNav);
    acInput.addEventListener('blur', function () { setTimeout(hideAC, 160); });
  }

  /* ================================================================
     N3. MODAL KEYBOARD NAVIGATION
     ================================================================ */
  function navigateModal(dir) {
    if (!window.products || !window._lastModalId) return;
    var idx = window.products.findIndex(function (p) { return p.id === window._lastModalId; });
    if (idx < 0) return;
    var next = idx + dir;
    if (next < 0) next = window.products.length - 1;
    if (next >= window.products.length) next = 0;
    var nextProd = window.products[next];
    if (!nextProd) return;
    window._lastModalId = nextProd.id;
    if (window.setupModal) window.setupModal(nextProd.id);
  }

  var modalPrevBtn = qs('#k-modal-prev');
  var modalNextBtn = qs('#k-modal-next');
  if (modalPrevBtn) modalPrevBtn.addEventListener('click', function () { navigateModal(-1); });
  if (modalNextBtn) modalNextBtn.addEventListener('click', function () { navigateModal(1); });

  /* Arrow key listener — only when modal is open */
  document.addEventListener('keydown', function (e) {
    var modal = qs('#luxeModal');
    if (!modal || !modal.classList.contains('show')) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); navigateModal(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigateModal(1); }
  });

  /* ================================================================
     N4. CONFETTI ON ADD TO CART
     ================================================================ */
  var confCanvas = qs('#k-confetti-canvas');
  var confCtx    = confCanvas ? confCanvas.getContext('2d') : null;
  var confParticles = [];
  var confRAF;

  function launchConfetti(originX, originY) {
    if (!confCanvas || !confCtx) return;
    confCanvas.width  = window.innerWidth;
    confCanvas.height = window.innerHeight;
    confCanvas.style.display = 'block';
    var COLORS = ['#c8a66a','#f5e096','#ffffff','#e8d5a0','#f0c060'];
    for (var i = 0; i < 48; i++) {
      var angle = (Math.random() * 360) * Math.PI / 180;
      var speed = Math.random() * 6 + 2;
      confParticles.push({
        x: originX, y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: Math.random() * 7 + 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 8,
        alpha: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }
    if (confRAF) cancelAnimationFrame(confRAF);
    tickConfetti();
  }

  function tickConfetti() {
    if (!confCtx) return;
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
    confParticles = confParticles.filter(function (p) { return p.alpha > 0.05; });
    confParticles.forEach(function (p) {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.18;
      p.vx *= 0.98;
      p.rot += p.rotV;
      p.alpha -= 0.018;
      confCtx.save();
      confCtx.globalAlpha = Math.max(0, p.alpha);
      confCtx.fillStyle = p.color;
      confCtx.translate(p.x, p.y);
      confCtx.rotate(p.rot * Math.PI / 180);
      if (p.shape === 'rect') confCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else { confCtx.beginPath(); confCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2); confCtx.fill(); }
      confCtx.restore();
    });
    if (confParticles.length > 0) {
      confRAF = requestAnimationFrame(tickConfetti);
    } else {
      confCanvas.style.display = 'none';
    }
  }

  /* Hook into add-to-cart events */
  function getCartBtnOrigin() {
    var btn = qs('#add-to-cart-btn');
    if (!btn) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var r = btn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top };
  }

  var _origAddToCart = window.addToCart;
  window.addToCart = function () {
    if (_origAddToCart) _origAddToCart.apply(this, arguments);
    var o = getCartBtnOrigin();
    launchConfetti(o.x, o.y);
    haptic([10]);
    setTimeout(refreshUpsell, 300);
  };

  /* Quick-add confetti */
  var _gridConfetti = gridEl;
  if (_gridConfetti) {
    _gridConfetti.addEventListener('click', function (e) {
      var qa = e.target.closest('.k-quick-add');
      if (!qa) return;
      var r = qa.getBoundingClientRect();
      launchConfetti(r.left + r.width / 2, r.top);
    });
  }

  /* ================================================================
     N5. HAPTIC FEEDBACK
     ================================================================ */
  function haptic(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  /* Delegate haptic to key interactions */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#wishlist-btn') || e.target.closest('.k-wish-card-btn')) haptic([15, 8, 15]);
    else if (e.target.closest('.k-cart-pill') || e.target.closest('#cart-open-btn')) haptic([8]);
    else if (e.target.closest('.k-compare-btn')) haptic([6]);
  });

  /* ================================================================
     N6. ABANDONED CART RECOVERY BANNER
     ================================================================ */
  (function () {
    var banner  = qs('#k-cart-recovery');
    var openBtn = qs('#k-cr-open');
    var closeBtn = qs('#k-cr-close');
    if (!banner) return;
    if (sessionStorage.getItem('k_cr_seen')) return;

    function showRecovery() {
      var cart = JSON.parse(localStorage.getItem('luxeCartArray') || '[]');
      if (!cart.length) return;
      sessionStorage.setItem('k_cr_seen', '1');
      var qty = cart.reduce(function (a, i) { return a + i.qty; }, 0);
      var titleEl = qs('#k-cr-title');
      var subEl   = qs('#k-cr-sub');
      if (titleEl) titleEl.textContent = qty + (qty === 1 ? ' Artikel' : ' Artikel') + ' warten auf dich';
      if (subEl) {
        var total = 0;
        if (window.products) {
          cart.forEach(function (ci) {
            var p = window.products.find(function (x) { return x.id === ci.id; });
            if (p) total += p.price * ci.qty;
          });
          subEl.textContent = 'Gesamt: ' + euro(total) + ' — Jetzt bestellen';
        } else {
          subEl.textContent = 'Schließe deine Bestellung ab';
        }
      }
      banner.style.display = 'flex';
      requestAnimationFrame(function () { banner.classList.add('k-cr-in'); });
    }

    if (openBtn) openBtn.addEventListener('click', function () {
      var cartBtn = qs('#cart-open-btn');
      if (cartBtn) cartBtn.click();
      banner.classList.remove('k-cr-in');
      setTimeout(function () { banner.style.display = 'none'; }, 380);
    });
    if (closeBtn) closeBtn.addEventListener('click', function () {
      banner.classList.remove('k-cr-in');
      setTimeout(function () { banner.style.display = 'none'; }, 380);
    });

    /* Show after 3s if page was loaded from cache / returning visit */
    setTimeout(showRecovery, 3000);
  })();

  /* ================================================================
     F1. ADVANCED FILTERS (price range + in-stock + sort)
     ================================================================ */
  var filterState = { minPrice: 0, maxPrice: 9999, inStockOnly: false, sort: '' };
  var filterActive = false;

  function waitForProducts(cb) {
    if (window.products && window.products.length) { cb(); return; }
    var t = setInterval(function () { if (window.products && window.products.length) { clearInterval(t); cb(); } }, 150);
  }

  function applyFilters() {
    if (!window.products || !window.products.length) return;
    var term = (qs('#mainSearchInput') || {}).value || '';
    term = term.toLowerCase();
    var list = window.products.filter(function (p) {
      if (term && !p.name.toLowerCase().includes(term) && !(p.description || '').toLowerCase().includes(term)) return false;
      if (p.price < filterState.minPrice || p.price > filterState.maxPrice) return false;
      if (filterState.inStockOnly && (p.stock || 0) <= 0) return false;
      return true;
    });
    if (filterState.sort === 'price-asc')  list = list.slice().sort(function (a,b) { return a.price - b.price; });
    if (filterState.sort === 'price-desc') list = list.slice().sort(function (a,b) { return b.price - a.price; });
    if (filterState.sort === 'name-asc')   list = list.slice().sort(function (a,b) { return a.name.localeCompare(b.name); });
    var countEl = qs('#k-filter-count');
    if (countEl) countEl.textContent = list.length + ' Produkt' + (list.length !== 1 ? 'e' : '');
    var resetBtn = qs('#k-filter-reset');
    filterActive = filterState.minPrice > 0 || filterState.maxPrice < 9999 || filterState.inStockOnly || filterState.sort;
    if (resetBtn) resetBtn.style.display = filterActive ? 'inline-flex' : 'none';
    if (window.renderProducts) window.renderProducts(list);
  }

  /* Override main.js filterProducts to include our filters */
  var _origFilter = window.filterProducts;
  window.filterProducts = function () {
    applyFilters();
  };

  waitForProducts(function () {
    var priceMin = qs('#k-price-min');
    var priceMax = qs('#k-price-max');
    /* Set realistic max based on actual products */
    var maxP = Math.ceil(Math.max.apply(null, window.products.map(function (p) { return p.price; })) / 10) * 10;
    if (priceMax) { priceMax.max = maxP; priceMax.value = maxP; }
    if (priceMin) { priceMin.max = maxP; }
    filterState.maxPrice = maxP;
    if (qs('#k-pmax-val')) qs('#k-pmax-val').textContent = maxP;
    applyFilters();
  });

  function onRangeChange() {
    var mn = qs('#k-price-min'), mx = qs('#k-price-max');
    if (!mn || !mx) return;
    var lo = parseInt(mn.value), hi = parseInt(mx.value);
    if (lo > hi) { mn.value = hi; lo = hi; }
    filterState.minPrice = lo;
    filterState.maxPrice = hi;
    if (qs('#k-pmin-val')) qs('#k-pmin-val').textContent = lo;
    if (qs('#k-pmax-val')) qs('#k-pmax-val').textContent = hi;
    applyFilters();
  }

  ['#k-price-min','#k-price-max'].forEach(function (sel) {
    var el = qs(sel);
    if (el) { el.addEventListener('input', onRangeChange); }
  });

  var instockEl = qs('#k-instock-only');
  if (instockEl) instockEl.addEventListener('change', function () {
    filterState.inStockOnly = instockEl.checked;
    applyFilters();
  });

  var sortEl = qs('#k-sort-select');
  if (sortEl) sortEl.addEventListener('change', function () {
    filterState.sort = sortEl.value;
    applyFilters();
  });

  var resetBtn = qs('#k-filter-reset');
  if (resetBtn) resetBtn.addEventListener('click', function () {
    filterState.minPrice = 0;
    filterState.inStockOnly = false;
    filterState.sort = '';
    var mn = qs('#k-price-min'), mx = qs('#k-price-max');
    if (mn) mn.value = 0;
    waitForProducts(function () {
      var maxP = Math.ceil(Math.max.apply(null, window.products.map(function (p) { return p.price; })) / 10) * 10;
      filterState.maxPrice = maxP;
      if (mx) mx.value = maxP;
      if (qs('#k-pmin-val')) qs('#k-pmin-val').textContent = 0;
      if (qs('#k-pmax-val')) qs('#k-pmax-val').textContent = maxP;
    });
    if (instockEl) instockEl.checked = false;
    if (sortEl) sortEl.value = '';
    applyFilters();
  });

  /* ================================================================
     F2. QUICK ADD TO CART
     ================================================================ */
  function quickAdd(productId) {
    var cart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];
    var item = cart.find(function (i) { return i.id === productId; });
    if (item) item.qty += 1;
    else cart.push({ id: productId, qty: 1 });
    localStorage.setItem('luxeCartArray', JSON.stringify(cart));
    if (window.updateCartUI) window.updateCartUI();
    if (window.renderCartDrawer) window.renderCartDrawer();
    showQuickAddFeedback(productId);
    refreshUpsell();
  }

  function showQuickAddFeedback(productId) {
    var btn = document.querySelector('[data-qa="' + productId + '"]');
    if (!btn) return;
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.classList.add('k-qa-done');
    setTimeout(function () {
      btn.innerHTML = '<i class="fas fa-bag-shopping"></i>';
      btn.classList.remove('k-qa-done');
    }, 1400);
  }

  function injectQuickAddBtns() {
    qsa('.product-card').forEach(function (card) {
      if (card.querySelector('.k-quick-add')) return;
      var onc = card.getAttribute('onclick') || '';
      var m   = onc.match(/setupModal\('([^']+)'\)/);
      if (!m) return;
      var pid = m[1];
      var info = card.querySelector('.product-info');
      if (!info) return;
      var btn = document.createElement('button');
      btn.className = 'k-quick-add';
      btn.setAttribute('data-qa', pid);
      btn.setAttribute('aria-label', 'Schnell in den Warenkorb');
      btn.innerHTML = '<i class="fas fa-bag-shopping"></i>';
      btn.addEventListener('click', function (e) { e.stopPropagation(); quickAdd(pid); });
      card.querySelector('.price-container').appendChild(btn);
    });
  }

  /* ================================================================
     F3. CART UPSELL
     ================================================================ */
  function refreshUpsell() {
    var upsellEl = qs('#k-cart-upsell');
    var upsellGrid = qs('#k-upsell-grid');
    if (!upsellEl || !upsellGrid) return;
    if (!window.products || !window.products.length) return;
    var cart = JSON.parse(localStorage.getItem('luxeCartArray')) || [];
    var cartIds = cart.map(function (i) { return i.id; });
    var available = window.products.filter(function (p) { return !cartIds.includes(p.id) && p.stock > 0; });
    if (!available.length) { upsellEl.style.display = 'none'; return; }
    /* shuffle + pick 3 */
    var picks = available.sort(function () { return 0.5 - Math.random(); }).slice(0, 3);
    upsellEl.style.display = 'block';
    upsellGrid.innerHTML = picks.map(function (p) {
      return '<div class="k-upsell-card" onclick="setupModal(\'' + p.id + '\')" data-bs-toggle="modal" data-bs-target="#luxeModal">' +
        '<img src="' + p.img + '" alt="' + p.name + '" class="k-upsell-img" loading="lazy">' +
        '<div class="k-upsell-info"><span class="k-upsell-name">' + p.name + '</span>' +
        '<span class="k-upsell-price">' + euro(p.price) + '</span></div>' +
        '<button class="k-upsell-add" onclick="event.stopPropagation();(function(id){var c=JSON.parse(localStorage.getItem(\'luxeCartArray\')||\'[]\');var it=c.find(function(x){return x.id===id});if(it)it.qty++;else c.push({id:id,qty:1});localStorage.setItem(\'luxeCartArray\',JSON.stringify(c));if(window.updateCartUI)window.updateCartUI();if(window.renderCartDrawer)window.renderCartDrawer();})(\'' + p.id + '\')" aria-label="Hinzufügen"><i class="fas fa-plus"></i></button>' +
        '</div>';
    }).join('');
  }

  /* Refresh upsell on cart open */
  var cartOpenBtn = qs('#cart-open-btn');
  if (cartOpenBtn) cartOpenBtn.addEventListener('click', function () { setTimeout(refreshUpsell, 80); });

  /* ================================================================
     F4. STOCK NOTIFICATION
     ================================================================ */
  var luxeModal = qs('#luxeModal');
  if (luxeModal) {
    luxeModal.addEventListener('shown.bs.modal', function () {
      var stockEl   = qs('#mStockStatus');
      var notifyEl  = qs('#k-notify-form');
      var cartBtn   = qs('#add-to-cart-btn');
      if (!notifyEl) return;
      var isOut = stockEl && stockEl.classList.contains('text-danger');
      if (!isOut) {
        /* check by text content */
        isOut = stockEl && stockEl.textContent.toLowerCase().includes('ausverkauft');
      }
      notifyEl.style.display = isOut ? 'block' : 'none';
      if (cartBtn) cartBtn.style.display = isOut ? 'none' : 'flex';

      var notifyForm = qs('#k-notify-inner');
      if (notifyForm && !notifyForm._bound) {
        notifyForm._bound = true;
        notifyForm.addEventListener('submit', function (e) {
          e.preventDefault();
          notifyEl.innerHTML = '<p class="k-notify-success"><i class="fas fa-check-circle"></i> Du wirst benachrichtigt!</p>';
        });
      }
    });
  }

  /* ================================================================
     F5. PRODUCT COMPARE
     ================================================================ */
  var compareList = [];
  var compareBar  = qs('#k-compare-bar');
  var compareGo   = qs('#k-compare-go');

  function updateCompareBar() {
    var bar = qs('#k-compare-bar');
    if (!bar) return;
    bar.style.display = compareList.length > 0 ? 'flex' : 'none';
    var countEl = qs('#k-compare-count');
    if (countEl) countEl.textContent = compareList.length;
    var goBtn = qs('#k-compare-go');
    if (goBtn) goBtn.disabled = compareList.length < 2;
    var slots = qs('#k-compare-slots');
    if (slots) {
      slots.innerHTML = compareList.map(function (p) {
        return '<span class="k-compare-chip"><img src="' + p.img + '" alt="' + p.name + '">' +
          p.name.split(' ')[0] +
          '<button class="k-compare-chip-rm" data-cid="' + p.id + '"><i class="fas fa-xmark"></i></button></span>';
      }).join('');
      qsa('.k-compare-chip-rm', slots).forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          compareList = compareList.filter(function (p) { return p.id !== btn.dataset.cid; });
          syncCompareButtons();
          updateCompareBar();
        });
      });
    }
    document.body.classList.toggle('k-has-compare', compareList.length > 0);
  }

  function syncCompareButtons() {
    qsa('.k-compare-btn').forEach(function (btn) {
      var pid = btn.dataset.cpid;
      var active = compareList.some(function (p) { return p.id === pid; });
      btn.classList.toggle('k-cmp-active', active);
      btn.setAttribute('aria-pressed', active);
    });
  }

  function injectCompareBtns() {
    qsa('.product-card').forEach(function (card) {
      if (card.querySelector('.k-compare-btn')) return;
      var onc = card.getAttribute('onclick') || '';
      var m   = onc.match(/setupModal\('([^']+)'\)/);
      if (!m) return;
      var pid  = m[1];
      var prod = (window.products || []).find(function (p) { return p.id === pid; });
      if (!prod) return;
      var btn = document.createElement('button');
      btn.className = 'k-compare-btn' + (compareList.some(function (p) { return p.id === pid; }) ? ' k-cmp-active' : '');
      btn.dataset.cpid = pid;
      btn.setAttribute('aria-label', 'Zum Vergleich hinzufügen');
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '<i class="fas fa-code-compare"></i>';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var exists = compareList.find(function (p) { return p.id === pid; });
        if (exists) {
          compareList = compareList.filter(function (p) { return p.id !== pid; });
        } else {
          if (compareList.length >= 3) { return; }
          compareList.push(prod);
        }
        syncCompareButtons();
        updateCompareBar();
      });
      var info = card.querySelector('.product-info');
      if (info) info.appendChild(btn);
    });
  }

  var compareClear = qs('#k-compare-clear');
  if (compareClear) compareClear.addEventListener('click', function () {
    compareList = [];
    syncCompareButtons();
    updateCompareBar();
  });

  if (compareGo) compareGo.addEventListener('click', openCompareModal);
  var cmClose = qs('#k-compare-modal-close');
  if (cmClose) cmClose.addEventListener('click', function () {
    qs('#k-compare-modal').classList.remove('open');
  });

  function openCompareModal() {
    var modal = qs('#k-compare-modal');
    if (!modal) return;
    var table = qs('#k-compare-table');
    var rows = [
      { label: 'Produkt', fn: function (p) { return '<img src="' + p.img + '" class="k-cmp-tbl-img" alt="' + p.name + '"><br>' + p.name; } },
      { label: 'Preis',   fn: function (p) { return '<strong>' + euro(p.price) + '</strong>'; } },
      { label: 'Lager',   fn: function (p) { return p.stock > 5 ? '<span class="k-stock-ok">Verfügbar</span>' : p.stock > 0 ? '<span class="k-stock-low">Noch ' + p.stock + '</span>' : '<span class="k-stock-out">Ausverkauft</span>'; } },
    ];
    table.innerHTML = rows.map(function (row) {
      return '<div class="k-cmp-row"><span class="k-cmp-row-label">' + row.label + '</span>' +
        compareList.map(function (p) { return '<div class="k-cmp-cell">' + row.fn(p) + '</div>'; }).join('') +
        '</div>';
    }).join('');
    modal.classList.add('open');
  }

  /* ================================================================
     F6. MODAL IMAGE GALLERY
     ================================================================ */
  function buildModalGallery(imgSrc) {
    var thumbs = qs('#k-modal-thumbs');
    if (!thumbs) return;
    thumbs.innerHTML = '<button class="k-thumb k-thumb-active"><img src="' + imgSrc + '" alt=""></button>';
    var zoomBtn = qs('#k-modal-zoom-btn');
    if (zoomBtn) {
      zoomBtn.onclick = function () { openLightbox(imgSrc, ''); };
    }
  }

  if (luxeModal) {
    luxeModal.addEventListener('shown.bs.modal', function () {
      var img = qs('#mImg');
      if (img && img.src) buildModalGallery(img.src);
    });
    /* Update gallery when image loads (src changes before shown event) */
    var mImg = qs('#mImg');
    if (mImg) {
      new MutationObserver(function () {
        if (mImg.src) buildModalGallery(mImg.src);
      }).observe(mImg, { attributes: true, attributeFilter: ['src'] });
    }
  }

  /* ================================================================
     F7. DARK MODE WAVE ANIMATION
     ================================================================ */
  var themeToggle = qs('#theme-toggle');
  var dmRipple    = qs('#k-dm-ripple');

  if (themeToggle && dmRipple) {
    themeToggle.addEventListener('click', function () {
      var rect = themeToggle.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top  + rect.height / 2;
      var maxR = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
      dmRipple.style.left = cx + 'px';
      dmRipple.style.top  = cy + 'px';
      dmRipple.style.setProperty('--dm-r', maxR + 'px');
      dmRipple.classList.remove('k-dm-run');
      void dmRipple.offsetWidth;
      dmRipple.classList.add('k-dm-run');
    });
  }

  /* ================================================================
     F8. ANIMATED SECTION DIVIDERS
     ================================================================ */
  function insertDividers() {
    var sections = qsa('#testimonials, #social, #besuch');
    sections.forEach(function (sec) {
      if (sec.querySelector('.k-line-divider')) return;
      var div = document.createElement('div');
      div.className = 'k-line-divider';
      div.innerHTML = '<svg viewBox="0 0 240 2" preserveAspectRatio="none"><line x1="0" y1="1" x2="240" y2="1" class="k-divider-line"/></svg>';
      sec.insertBefore(div, sec.firstChild);
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          div.classList.add('k-divider-draw');
        }
      }, { threshold: 0.3 }).observe(div);
    });
  }
  insertDividers();

  /* ================================================================
     F9. WHATSAPP PRODUCT INQUIRY + F12. SHARE
     ================================================================ */
  var WA_NUMBER = '4915125387018';

  function updateModalActions() {
    var waBtn    = qs('#k-modal-whatsapp');
    var shareBtn = qs('#k-modal-share');
    var title    = (qs('#mTitle') || {}).textContent || '';
    if (waBtn && title) {
      waBtn.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hallo, ich habe eine Frage zu: ' + title);
    }
    if (shareBtn) {
      shareBtn.onclick = function () {
        var data = { title: title, text: title + ' — KOÇYİĞİT Betrieb & Handel', url: window.location.href };
        if (navigator.share) {
          navigator.share(data).catch(function () {});
        } else {
          navigator.clipboard.writeText(window.location.href).then(function () {
            shareBtn.innerHTML = '<i class="fas fa-check"></i> Kopiert!';
            setTimeout(function () { shareBtn.innerHTML = '<i class="fas fa-share-nodes"></i> Teilen'; }, 2000);
          }).catch(function () {});
        }
      };
    }
  }

  if (luxeModal) luxeModal.addEventListener('shown.bs.modal', updateModalActions);

  /* ================================================================
     F10. ESTIMATED DELIVERY DATE
     ================================================================ */
  function getDeliveryText() {
    var now   = new Date();
    var hours = now.getHours();
    var cutoff = 18;
    var days = hours < cutoff ? 2 : 3;
    var d = new Date(now);
    var added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      var wd = d.getDay();
      if (wd !== 0 && wd !== 6) added++;
    }
    var DE_DAYS  = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    var DE_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    return (hours < cutoff
      ? 'Bestelle bis ' + cutoff + ':00 Uhr — '
      : 'Morgen bestellen — ') +
      'Lieferung: ' + DE_DAYS[d.getDay()] + ', ' + d.getDate() + '. ' + DE_MONTHS[d.getMonth()];
  }

  if (luxeModal) {
    luxeModal.addEventListener('shown.bs.modal', function () {
      var del = qs('#k-modal-delivery');
      if (!del) return;
      var stockEl = qs('#mStockStatus');
      var isOut = stockEl && (stockEl.classList.contains('text-danger') || stockEl.textContent.toLowerCase().includes('ausverkauft'));
      if (isOut) { del.style.display = 'none'; return; }
      del.style.display = 'flex';
      del.innerHTML = '<i class="fas fa-truck"></i><span>' + getDeliveryText() + '</span>';
    });
  }

  /* ================================================================
     F11. TRENDING BADGE
     ================================================================ */
  var VIEW_KEY = 'luxeViewCounts';
  function getViewCounts() { try { return JSON.parse(localStorage.getItem(VIEW_KEY)) || {}; } catch (e) { return {}; } }

  window.setupModal = (function (_orig) {
    return function (id) {
      /* track view */
      var counts = getViewCounts();
      counts[id] = (counts[id] || 0) + 1;
      localStorage.setItem(VIEW_KEY, JSON.stringify(counts));
      if (_orig) _orig.call(this, id);
    };
  })(window.setupModal);

  function injectTrendingBadges() {
    var counts = getViewCounts();
    qsa('.product-card').forEach(function (card) {
      if (card.querySelector('.k-trending-badge')) return;
      var onc = card.getAttribute('onclick') || '';
      var m   = onc.match(/setupModal\('([^']+)'\)/);
      if (!m) return;
      var views = counts[m[1]] || 0;
      if (views < 3) return;
      var badge = document.createElement('span');
      badge.className = 'k-trending-badge';
      badge.innerHTML = '<i class="fas fa-fire"></i> Trending';
      card.insertBefore(badge, card.firstChild);
    });
  }

  /* ================================================================
     MutationObserver: run all card injections on grid re-render
     ================================================================ */
  if (gridEl) {
    new MutationObserver(function () {
      injectWishBtns();
      updateWishlistUI();
      injectStockBadges();
      injectQuickAddBtns();
      injectCompareBtns();
      injectTrendingBadges();
      trackRecentlyViewed();
    }).observe(gridEl, { childList: true, subtree: true });
  }

})();

