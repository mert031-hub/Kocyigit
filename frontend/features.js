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

  /* gridEl — used by the consolidated MutationObserver at end of file */
  var gridEl = qs('#product-grid-container');

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
     3. LIVE STOCK BADGES  +  window.products bootstrap
     ================================================================ */
  var stockData = {};

  fetch(API_URL + '/products')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var raw = Array.isArray(data) ? data : (data.products || []);
      /* ── Populate window.products so all features work ── */
      if (!window.products || !window.products.length) {
        window.products = raw
          .filter(function (p) { return p.isDeleted !== true; })
          .map(function (p) {
            return {
              id:          p._id,
              name:        p.name        || '',
              description: p.description || p.desc || '',
              price:       p.price       || 0,
              oldPrice:    p.oldPrice    || p.originalPrice || 0,
              img:         p.img         || p.image         || '',
              image:       p.img         || p.image         || '',
              stock:       p.stock       || 0,
              tag:         p.tag         || ''
            };
          });
        document.dispatchEvent(new CustomEvent('productsLoaded'));
      }
      /* ── Stock data map ── */
      raw.forEach(function (p) { stockData[p._id] = p.stock || 0; });
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
    updateRangeFill();
    applyFilters();
  });

  function updateRangeFill() {
    var mn = qs('#k-price-min'), mx = qs('#k-price-max');
    if (!mn || !mx) return;
    var minV = parseInt(mn.min) || 0;
    var maxV = parseInt(mn.max) || 200;
    var range = maxV - minV || 1;
    var lo = ((parseInt(mn.value) - minV) / range) * 100;
    var hi = ((parseInt(mx.value) - minV) / range) * 100;
    var track = 'rgba(255,255,255,0.12)';
    var fill = 'var(--gold)';
    mx.style.background = 'linear-gradient(to right,' + track + ' ' + lo + '%,' + fill + ' ' + lo + '%,' + fill + ' ' + hi + '%,' + track + ' ' + hi + '%)';
  }

  function onRangeChange() {
    var mn = qs('#k-price-min'), mx = qs('#k-price-max');
    if (!mn || !mx) return;
    var lo = parseInt(mn.value), hi = parseInt(mx.value);
    if (lo > hi) { mn.value = hi; lo = hi; }
    filterState.minPrice = lo;
    filterState.maxPrice = hi;
    if (qs('#k-pmin-val')) qs('#k-pmin-val').textContent = lo;
    if (qs('#k-pmax-val')) qs('#k-pmax-val').textContent = hi;
    updateRangeFill();
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
      updateRangeFill();
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
      var priceBox = card.querySelector('.price-container') || card.querySelector('.product-info');
      if (priceBox) priceBox.appendChild(btn);
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
  var themeToggle    = qs('#theme-toggle');
  var themeToggleMob = qs('#k-theme-toggle-mob');
  var dmRipple       = qs('#k-dm-ripple');

  function triggerThemeRipple(cx, cy) {
    if (!dmRipple) return;
    var maxR = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
    dmRipple.style.left = cx + 'px';
    dmRipple.style.top  = cy + 'px';
    dmRipple.style.setProperty('--dm-r', maxR + 'px');
    dmRipple.classList.remove('k-dm-run');
    void dmRipple.offsetWidth;
    dmRipple.classList.add('k-dm-run');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var rect = themeToggle.getBoundingClientRect();
      triggerThemeRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  }

  /* Mobile menu theme toggle */
  if (themeToggleMob) {
    themeToggleMob.addEventListener('click', function () {
      triggerThemeRipple(window.innerWidth / 2, window.innerHeight / 2);
      /* close mobile menu after toggle */
      var mob = qs('#k-mobile-nav');
      var ov  = qs('#k-mobile-overlay');
      if (mob) mob.classList.remove('open');
      if (ov)  ov.classList.remove('open');
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
      injectSavingsBadges();
    }).observe(gridEl, { childList: true, subtree: true });
  }

  /* ================================================================
     C1. CART FLY ANIMATION
     ================================================================ */
  var flyEl = qs('#k-fly-img');

  function cartFlyFrom(srcEl) {
    if (!flyEl || !srcEl) return;
    var cartIcon = qs('#cart-open-btn') || qs('[data-bs-target="#floatingCart"]') || qs('.k-cart-pill');
    if (!cartIcon) return;
    var from = srcEl.getBoundingClientRect();
    var to   = cartIcon.getBoundingClientRect();
    var imgSrc = '';
    var img = srcEl.closest('.product-card') && srcEl.closest('.product-card').querySelector('img');
    if (img) imgSrc = img.src;
    flyEl.style.cssText = [
      'display:block',
      'left:' + (from.left + from.width / 2 - 24) + 'px',
      'top:' + (from.top + from.height / 2 - 24) + 'px',
      'background-image:url(' + imgSrc + ')',
      'transform:translate(0,0) scale(1)',
      'opacity:1',
      'transition:none'
    ].join(';');
    flyEl.offsetWidth; /* reflow */
    var dx = (to.left + to.width / 2 - 24) - (from.left + from.width / 2 - 24);
    var dy = (to.top  + to.height / 2 - 24) - (from.top  + from.height / 2 - 24);
    flyEl.style.transition = 'transform 0.65s var(--ease), opacity 0.65s var(--ease)';
    flyEl.style.transform  = 'translate(' + dx + 'px,' + dy + 'px) scale(0.25)';
    flyEl.style.opacity    = '0';
    setTimeout(function () { flyEl.style.display = 'none'; }, 680);
  }

  /* hook quick-add and card click on add-to-cart */
  document.addEventListener('click', function (e) {
    var qa = e.target.closest('.k-quick-add');
    if (qa) { cartFlyFrom(qa); return; }
    var atcBtn = e.target.closest('#add-to-cart-btn');
    if (atcBtn) {
      var modalImg = qs('#mImg');
      if (modalImg) cartFlyFrom(modalImg);
    }
  }, true);

  /* ================================================================
     C2. GIFT WRAPPING TOGGLE
     ================================================================ */
  var GIFT_KEY = 'k_gift_wrap';
  var giftCheck = qs('#k-gift-wrap-check');
  var giftRow   = qs('#k-gift-wrap-row');

  function isGiftWrap() { return localStorage.getItem(GIFT_KEY) === '1'; }

  function updateGiftWrapUI() {
    if (!giftCheck) return;
    giftCheck.checked = isGiftWrap();
  }

  if (giftCheck) {
    updateGiftWrapUI();
    giftCheck.addEventListener('change', function () {
      localStorage.setItem(GIFT_KEY, this.checked ? '1' : '0');
    });
  }

  /* show gift row only when cart has items */
  document.addEventListener('cartUpdated', function () {
    if (!giftRow) return;
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem('luxeCartArray')) || []; } catch (e) {}
    giftRow.style.display = cart.length ? 'flex' : 'none';
  });
  if (giftRow) giftRow.style.display = 'none'; /* hidden until cart has items */

  /* ================================================================
     C3. SAVINGS BADGE
     ================================================================ */
  function injectSavingsBadges() {
    if (!window.products) return;
    qsa('.product-card').forEach(function (card) {
      if (card.querySelector('.k-savings-badge')) return;
      var onc = card.getAttribute('onclick') || '';
      var m   = onc.match(/setupModal\('([^']+)'\)/);
      if (!m) return;
      var prod = window.products.find(function (p) { return p.id === m[1]; });
      if (!prod || !prod.originalPrice || prod.originalPrice <= prod.price) return;
      var save = (prod.originalPrice - prod.price).toFixed(2).replace('.', ',');
      var badge = document.createElement('span');
      badge.className = 'k-savings-badge';
      badge.textContent = '-' + save + ' €';
      card.appendChild(badge);
    });
  }

  /* ================================================================
     C4. BUNDLE CROSS-SELL (in cart drawer)
     ================================================================ */
  var bundleEl = qs('#k-cart-upsell');

  /* reuse existing refreshUpsell (defined earlier in features.js) and
     add a "bundle" label when ≥2 items are in the cart */
  document.addEventListener('cartUpdated', function () {
    if (!bundleEl) return;
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem('luxeCartArray')) || []; } catch (e) {}
    if (cart.length >= 2) {
      var lbl = bundleEl.querySelector('.k-upsell-label');
      if (lbl) lbl.textContent = 'Wird oft zusammen gekauft';
    }
  });

  /* ================================================================
     U1. SWIPE GESTURE ON MODAL IMAGE
     ================================================================ */
  var modalImgWrap = qs('.k-modal-img-wrap');
  if (modalImgWrap) {
    var _swipeX = null;
    modalImgWrap.addEventListener('touchstart', function (e) {
      _swipeX = e.touches[0].clientX;
    }, { passive: true });
    modalImgWrap.addEventListener('touchend', function (e) {
      if (_swipeX === null) return;
      var dx = e.changedTouches[0].clientX - _swipeX;
      _swipeX = null;
      if (Math.abs(dx) < 40) return;
      navigateModal(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ================================================================
     U2. STICKY HEADER MORPH
     ================================================================ */
  var siteNav = qs('.k-nav') || qs('nav.navbar') || qs('header');
  if (siteNav) {
    var _morphed = false;
    window.addEventListener('scroll', function () {
      var should = window.scrollY > 60;
      if (should === _morphed) return;
      _morphed = should;
      siteNav.classList.toggle('k-nav-scrolled', should);
    }, { passive: true });
  }

  /* ================================================================
     U3. URL STATE SYNC FOR FILTERS
     ================================================================ */
  function filtersToURL() {
    var params = new URLSearchParams();
    var minEl = qs('#k-price-min'), maxEl = qs('#k-price-max');
    var stEl  = qs('#k-instock-only'), sortEl = qs('#k-sort-select');
    var kw    = qs('#search-input') || qs('.k-search-input');
    if (minEl  && minEl.value)   params.set('pmin',  minEl.value);
    if (maxEl  && maxEl.value)   params.set('pmax',  maxEl.value);
    if (stEl   && stEl.checked)  params.set('stock', '1');
    if (sortEl && sortEl.value)  params.set('sort',  sortEl.value);
    if (kw     && kw.value.trim()) params.set('q', kw.value.trim());
    var str = params.toString();
    history.replaceState(null, '', str ? '?' + str : location.pathname);
  }

  function urlToFilters() {
    var params = new URLSearchParams(location.search);
    var minEl  = qs('#k-price-min'), maxEl = qs('#k-price-max');
    var stEl   = qs('#k-instock-only'), sortEl = qs('#k-sort-select');
    var kw     = qs('#search-input') || qs('.k-search-input');
    if (params.has('pmin') && minEl)  { minEl.value  = params.get('pmin');  }
    if (params.has('pmax') && maxEl)  { maxEl.value  = params.get('pmax');  }
    if (params.has('stock') && stEl)  { stEl.checked = true; }
    if (params.has('sort') && sortEl) { sortEl.value = params.get('sort'); }
    if (params.has('q') && kw)        { kw.value     = params.get('q'); }
    if (params.toString()) {
      setTimeout(function () {
        if (window.filterProducts) window.filterProducts();
      }, 500);
    }
  }

  /* attach to filter events */
  ['#k-price-min','#k-price-max','#k-instock-only','#k-sort-select'].forEach(function (sel) {
    var el = qs(sel);
    if (el) el.addEventListener('change', filtersToURL);
  });
  urlToFilters();

  /* ================================================================
     U4. KEYBOARD SHORTCUTS PANEL
     ================================================================ */
  var shortcutsPanel   = qs('#k-shortcuts-panel');
  var shortcutsOverlay = qs('#k-shortcuts-overlay');
  var shortcutsClose   = qs('#k-shortcuts-close');

  function openShortcuts() {
    if (!shortcutsPanel) return;
    shortcutsPanel.style.display   = 'flex';
    shortcutsOverlay.style.display = 'block';
    shortcutsPanel.classList.add('k-shortcuts-in');
  }
  function closeShortcuts() {
    if (!shortcutsPanel) return;
    shortcutsPanel.classList.remove('k-shortcuts-in');
    setTimeout(function () {
      shortcutsPanel.style.display   = 'none';
      shortcutsOverlay.style.display = 'none';
    }, 250);
  }

  if (shortcutsClose)   shortcutsClose.addEventListener('click', closeShortcuts);
  if (shortcutsOverlay) shortcutsOverlay.addEventListener('click', closeShortcuts);

  /* extend existing keydown handler */
  document.addEventListener('keydown', function (e) {
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (e.key === '?') { openShortcuts(); return; }
    if (e.key === 'Escape') { closeShortcuts(); return; }
    /* shortcut: W → wishlist, C → cart */
    if (e.key === 'w' || e.key === 'W') {
      var wBtn = qs('#wishlist-btn') || qs('.k-wishlist-nav');
      if (wBtn) wBtn.click();
    }
    if (e.key === 'c' || e.key === 'C') {
      var cartBtn = qs('#cart-open-btn') || qs('[data-bs-target="#floatingCart"]');
      if (cartBtn) cartBtn.click();
    }
  });

  /* ================================================================
     V1. ANIMATED STAT COUNTERS
     ================================================================ */
  function animateCounter(el) {
    var target = parseFloat(el.dataset.count || el.textContent.replace(/[^0-9.]/g, ''));
    if (isNaN(target)) return;
    var suffix = el.dataset.suffix || el.textContent.replace(/[\d.]/g, '').trim();
    var duration = 1600;
    var start = null;
    var isFloat = target % 1 !== 0;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = isFloat ? (target * ease).toFixed(1) : Math.round(target * ease);
      el.textContent = current + (suffix ? ' ' + suffix : '');
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var statEls = qsa('[data-count], .k-stat-number, .testimonial-stat-value');
    statEls.forEach(function (el) {
      if (el.dataset.counted) return;
      var num = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
      if (isNaN(num) || num < 10) return;
      el.dataset.count  = num;
      el.dataset.suffix = el.textContent.replace(/[\d.,]/g, '').trim();
      el.dataset.counted = '1';
      var obs = new IntersectionObserver(function (entries, o) {
        if (!entries[0].isIntersecting) return;
        o.disconnect();
        animateCounter(el);
      }, { threshold: 0.6 });
      obs.observe(el);
    });
  }
  initCounters();

  /* ================================================================
     V2. PRODUCT MAGNIFIER
     ================================================================ */
  var MAGNIFIER_ZOOM = 2.5;

  function initMagnifier(imgEl) {
    if (!imgEl || imgEl._magInit) return;
    imgEl._magInit = true;
    var glass = document.createElement('div');
    glass.className = 'k-magnifier';
    glass.style.display = 'none';
    imgEl.parentNode.style.position = 'relative';
    imgEl.parentNode.appendChild(glass);

    function onMove(e) {
      if (!imgEl.complete || !imgEl.naturalWidth) return;
      var rect  = imgEl.getBoundingClientRect();
      var x     = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      var y     = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) { glass.style.display = 'none'; return; }
      var gw = glass.offsetWidth  || 120;
      var gh = glass.offsetHeight || 120;
      glass.style.display    = 'block';
      glass.style.left       = (x - gw / 2) + 'px';
      glass.style.top        = (y - gh / 2) + 'px';
      glass.style.backgroundImage = 'url(' + imgEl.src + ')';
      glass.style.backgroundSize  = (rect.width * MAGNIFIER_ZOOM) + 'px ' + (rect.height * MAGNIFIER_ZOOM) + 'px';
      glass.style.backgroundPositionX = (-x * MAGNIFIER_ZOOM + gw / 2) + 'px';
      glass.style.backgroundPositionY = (-y * MAGNIFIER_ZOOM + gh / 2) + 'px';
    }

    imgEl.addEventListener('mousemove', onMove);
    imgEl.addEventListener('mouseleave', function () { glass.style.display = 'none'; });
  }

  /* init on modal open */
  var luxeModal = qs('#luxeModal');
  if (luxeModal) {
    luxeModal.addEventListener('shown.bs.modal', function () {
      var modalImg = qs('#mImg');
      if (modalImg) initMagnifier(modalImg);
    });
  }

  /* ================================================================
     V3. DYNAMIC PAGE TITLE
     ================================================================ */
  var _origTitle = document.title;

  window.setupModal = (function (_prev) {
    return function (id) {
      if (_prev) _prev.call(this, id);
      window._lastModalId = id;
      /* update title after modal renders (~100ms) */
      setTimeout(function () {
        var titleEl = qs('#mTitle');
        if (titleEl && titleEl.textContent.trim()) {
          document.title = titleEl.textContent.trim() + ' · KOÇYİĞİT';
        }
      }, 120);
    };
  })(window.setupModal);

  if (luxeModal) {
    luxeModal.addEventListener('hidden.bs.modal', function () {
      document.title = _origTitle;
    });
  }

  /* ================================================================
     V4. OFFLINE BANNER
     ================================================================ */
  var offlineBar = qs('#k-offline-bar');

  function updateOnlineStatus() {
    if (!offlineBar) return;
    if (navigator.onLine) {
      offlineBar.classList.remove('k-offline-visible');
      setTimeout(function () { offlineBar.style.display = 'none'; }, 350);
    } else {
      offlineBar.style.display = 'flex';
      requestAnimationFrame(function () { offlineBar.classList.add('k-offline-visible'); });
    }
  }

  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  /* ================================================================
     P1. HOVER PREFETCH — preload product image on card hover
     ================================================================ */
  document.addEventListener('mouseover', function (e) {
    var card = e.target.closest && e.target.closest('.product-card');
    if (!card || card._prefetched) return;
    card._prefetched = true;
    var img = card.querySelector('img[data-src]') || card.querySelector('img');
    if (!img) return;
    var src = img.dataset.src || img.src;
    if (!src || src.startsWith('data:')) return;
    var link = document.createElement('link');
    link.rel  = 'prefetch';
    link.as   = 'image';
    link.href = src;
    document.head.appendChild(link);
  }, { passive: true });

  /* ================================================================
     P2. IMAGE ERROR FALLBACK
     ================================================================ */
  var PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%230d0d0d' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-family='serif' font-size='48' fill='%23c8a66a' text-anchor='middle' dominant-baseline='middle'%3EK%3C/text%3E%3C/svg%3E";

  function attachImgFallback(img) {
    if (img._fbAttached) return;
    img._fbAttached = true;
    img.addEventListener('error', function () {
      if (this.src !== PLACEHOLDER_SVG) this.src = PLACEHOLDER_SVG;
    });
  }

  /* attach to all current images and watch for new ones */
  qsa('img').forEach(attachImgFallback);
  new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.tagName === 'IMG') attachImgFallback(node);
        if (node.querySelectorAll) node.querySelectorAll('img').forEach(attachImgFallback);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  /* ================================================================
     A3. CART COUNT ARIA LIVE
     ================================================================ */
  var cartAriaLive = qs('#k-cart-aria-live');

  function announceCartChange(count) {
    if (!cartAriaLive) return;
    cartAriaLive.textContent = '';
    setTimeout(function () {
      cartAriaLive.textContent = count === 0
        ? 'Warenkorb ist leer'
        : count + (count === 1 ? ' Artikel' : ' Artikel') + ' im Warenkorb';
    }, 50);
  }

  document.addEventListener('cartUpdated', function () {
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem('luxeCartArray')) || []; } catch (e) {}
    var total = cart.reduce(function (s, i) { return s + (i.qty || 1); }, 0);
    announceCartChange(total);
  });

  /* ================================================================
     B1. TRUST BADGE — show/hide with modal
     ================================================================ */
  /* always visible via CSS; modal shows it automatically */

  /* ================================================================
     B2. PRICE DROP NOTIFICATION
     ================================================================ */
  var PRICE_ALERTS_KEY = 'k_price_alerts';

  function getPriceAlerts() {
    try { return JSON.parse(localStorage.getItem(PRICE_ALERTS_KEY)) || {}; } catch (e) { return {}; }
  }

  function setPriceAlert(productId, email, price) {
    var alerts = getPriceAlerts();
    alerts[productId] = { email: email, price: price, date: Date.now() };
    localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(alerts));
  }

  var pricedropForm = qs('#k-pricedrop-inner');
  var pricedropPanel = qs('#k-price-drop-form');

  if (pricedropForm) {
    pricedropForm.addEventListener('submit', function () {
      var emailEl = qs('#k-pricedrop-email');
      var email   = emailEl && emailEl.value.trim();
      if (!email || !window._lastModalId) return;
      var prod = window.products && window.products.find(function (p) { return p.id === window._lastModalId; });
      if (!prod) return;
      setPriceAlert(window._lastModalId, email, prod.price);
      pricedropForm.innerHTML = '<p style="color:var(--gold);font-family:var(--sans);font-size:0.7rem;text-align:center;margin:0"><i class="fas fa-check-circle"></i> Preisalarm aktiv!</p>';
    });
  }

  /* show price-drop panel in modal when product is in-stock */
  var luxeModalEl = qs('#luxeModal');
  if (luxeModalEl) {
    luxeModalEl.addEventListener('shown.bs.modal', function () {
      if (!pricedropPanel) return;
      var isOut = (function () {
        var st = qs('#mStockStatus');
        return st && (st.classList.contains('text-danger') || st.textContent.toLowerCase().includes('ausverkauft'));
      })();
      /* show price-drop only when in-stock (out-of-stock already has notify form) */
      pricedropPanel.style.display = isOut ? 'none' : 'block';
      /* reset form if it was submitted */
      var inner = qs('#k-pricedrop-inner');
      if (!inner) return;
      var btn = inner.querySelector('button');
      if (!btn) return; /* already replaced by success message — leave as-is */
    });
  }

  /* ================================================================
     B3. RECENT SEARCH HISTORY
     ================================================================ */
  var SEARCH_HIST_KEY = 'k_search_history';
  var MAX_HIST = 6;

  function getSearchHistory() {
    try { return JSON.parse(localStorage.getItem(SEARCH_HIST_KEY)) || []; } catch (e) { return []; }
  }

  function addToSearchHistory(term) {
    if (!term || term.length < 2) return;
    var hist = getSearchHistory().filter(function (t) { return t !== term; });
    hist.unshift(term);
    if (hist.length > MAX_HIST) hist = hist.slice(0, MAX_HIST);
    localStorage.setItem(SEARCH_HIST_KEY, JSON.stringify(hist));
  }

  function showSearchHistory(inputEl, dropdownEl) {
    var hist = getSearchHistory();
    if (!hist.length) return;
    dropdownEl.innerHTML = hist.map(function (t) {
      return '<div class="k-ac-item k-ac-hist" data-term="' + t.replace(/"/g, '&quot;') + '">' +
        '<i class="fas fa-clock-rotate-left k-ac-hist-icon"></i>' +
        '<div class="k-ac-info"><div class="k-ac-name">' + t + '</div></div>' +
        '</div>';
    }).join('');
    dropdownEl.style.display = 'block';

    dropdownEl.querySelectorAll('.k-ac-hist').forEach(function (item) {
      item.addEventListener('mousedown', function (e) {
        e.preventDefault();
        inputEl.value = this.dataset.term;
        dropdownEl.style.display = 'none';
        inputEl.dispatchEvent(new Event('input'));
      });
    });
  }

  /* hook into existing search input */
  var searchInputEl = qs('#search-input') || qs('.k-search-input');
  var acDropEl      = qs('#k-ac-dropdown');

  if (searchInputEl && acDropEl) {
    searchInputEl.addEventListener('focus', function () {
      if (!this.value.trim()) showSearchHistory(this, acDropEl);
    });
    /* save term when user picks a result or presses Enter */
    searchInputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && this.value.trim()) {
        addToSearchHistory(this.value.trim());
      }
    });
  }

  /* save history when autocomplete item is clicked */
  if (acDropEl) {
    acDropEl.addEventListener('mousedown', function (e) {
      var item = e.target.closest('.k-ac-item:not(.k-ac-hist)');
      if (!item) return;
      var nameEl = item.querySelector('.k-ac-name');
      if (nameEl) addToSearchHistory(nameEl.textContent.trim());
    });
  }

  /* ================================================================
     E1. KONAMI CODE EASTER EGG
     ================================================================ */
  var KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  var _konamiIdx = 0;

  document.addEventListener('keydown', function (e) {
    if (e.key === KONAMI[_konamiIdx]) {
      _konamiIdx++;
      if (_konamiIdx === KONAMI.length) {
        _konamiIdx = 0;
        triggerEasterEgg();
      }
    } else {
      _konamiIdx = (e.key === KONAMI[0]) ? 1 : 0;
    }
  });

  function triggerEasterEgg() {
    /* rain confetti for 3 seconds + show a toast */
    var canvas = qs('#k-confetti-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    var COLORS = ['#c8a66a','#f5e096','#ffffff','#e8d5a0','#f0c060','#ffd700'];
    var particles = [];
    for (var i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height * 0.5,
        r: 5 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        alpha: 1,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.15
      });
    }
    var end = Date.now() + 3000;
    function tick() {
      if (Date.now() > end) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.rot += p.rotV;
        p.alpha = Math.max(0, p.alpha - 0.004);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.5);
        ctx.restore();
        if (p.y > canvas.height + 10) { p.y = -10; p.x = Math.random() * canvas.width; }
      });
      requestAnimationFrame(tick);
    }
    tick();
    /* toast */
    var tc = qs('#luxe-toast-container');
    if (tc) {
      var t = document.createElement('div');
      t.className = 'luxe-toast show';
      t.innerHTML = '<i class="fas fa-star"></i> Du hast den Geheimcode gefunden! ✨';
      tc.appendChild(t);
      setTimeout(function () { t.remove(); }, 4000);
    }
  }

  /* ================================================================
     S1. JSON-LD STRUCTURED DATA
     ================================================================ */
  var jsonldEl = qs('#k-jsonld');

  function updateJsonLD(prod) {
    if (!jsonldEl || !prod) return;
    var data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: prod.name || prod.title || '',
      description: prod.description || prod.desc || '',
      image: prod.image || prod.img || '',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        price: (prod.price || 0).toFixed(2),
        availability: prod.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: 'KOÇYİĞİT Betrieb & Handel' }
      }
    };
    jsonldEl.textContent = JSON.stringify(data);
  }

  /* hook into setupModal to update JSON-LD */
  window.setupModal = (function (_prev) {
    return function (id) {
      if (_prev) _prev.call(this, id);
      if (window.products) {
        var p = window.products.find(function (x) { return x.id === id; });
        if (p) updateJsonLD(p);
      }
    };
  })(window.setupModal);

  /* ================================================================
     S2. SCROLL POSITION MEMORY
     ================================================================ */
  var SCROLL_KEY = 'k_scroll_y';

  window.addEventListener('beforeunload', function () {
    sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY)));
  });

  (function restoreScroll() {
    var saved = sessionStorage.getItem(SCROLL_KEY);
    if (!saved) return;
    sessionStorage.removeItem(SCROLL_KEY);
    var y = parseInt(saved, 10);
    if (y > 0) {
      /* wait for images/layout, then restore */
      window.addEventListener('load', function () {
        setTimeout(function () { window.scrollTo({ top: y, behavior: 'instant' }); }, 80);
      });
    }
  })();

  /* ================================================================
     S3. EMPTY STATE
     ================================================================ */
  function showEmptyState(container) {
    if (!container) return;
    var existing = qs('#k-empty-state');
    if (existing) return;
    var div = document.createElement('div');
    div.id = 'k-empty-state';
    div.className = 'k-empty-state';
    div.innerHTML =
      '<div class="k-es-icon"><i class="fas fa-magnifying-glass"></i></div>' +
      '<h3 class="k-es-title">Keine Produkte gefunden</h3>' +
      '<p class="k-es-sub">Versuche andere Filter oder setze sie zurück.</p>' +
      '<button class="k-es-reset k-btn k-btn-outline" id="k-es-reset-btn">Filter zurücksetzen</button>';
    container.appendChild(div);
    var resetBtn = div.querySelector('#k-es-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        /* reset all filter inputs */
        ['#k-price-min','#k-price-max','#k-instock-only','#k-sort-select'].forEach(function (sel) {
          var el = qs(sel);
          if (!el) return;
          if (el.type === 'checkbox') el.checked = false;
          else if (el.tagName === 'SELECT') el.value = '';
          else el.value = '';
          el.dispatchEvent(new Event('change'));
        });
        if (window.filterProducts) window.filterProducts();
        div.remove();
      });
    }
  }

  function removeEmptyState() {
    var el = qs('#k-empty-state');
    if (el) el.remove();
  }

  /* watch grid for empty state */
  if (gridEl) {
    new MutationObserver(function () {
      var cards = gridEl.querySelectorAll('.product-card');
      var skels = gridEl.querySelectorAll('.k-skel-col');
      if (cards.length === 0 && skels.length === 0) showEmptyState(gridEl);
      else removeEmptyState();
    }).observe(gridEl, { childList: true });
  }

  /* ================================================================
     K1. CART HOVER PREVIEW
     ================================================================ */
  var cartHoverPrev = qs('#k-cart-hover-preview');
  var cartOpenBtn   = qs('#cart-open-btn') || qs('#cart-pill');
  var _chpTimeout   = null;

  function buildCartPreview() {
    if (!cartHoverPrev) return;
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem('luxeCartArray')) || []; } catch (e) {}
    var itemsEl = qs('#k-chp-items');
    var totalEl = qs('#k-chp-total');
    if (!itemsEl || !totalEl) return;
    if (!cart.length) {
      itemsEl.innerHTML = '<p class="k-chp-empty">Warenkorb ist leer</p>';
      totalEl.textContent = '0,00 €';
      return;
    }
    var total = 0;
    itemsEl.innerHTML = cart.slice(0, 4).map(function (item) {
      var prod = window.products && window.products.find(function (p) { return p.id === item.id; });
      if (!prod) return '';
      var price = (prod.price || 0) * (item.qty || 1);
      total += price;
      return '<div class="k-chp-item">' +
        '<img src="' + (prod.image || prod.img || '') + '" alt="" class="k-chp-img">' +
        '<div class="k-chp-info">' +
          '<span class="k-chp-name">' + (prod.name || prod.title || '') + '</span>' +
          '<span class="k-chp-price">' + euro(price) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
    if (cart.length > 4) {
      itemsEl.innerHTML += '<p class="k-chp-more">+ ' + (cart.length - 4) + ' weitere Artikel</p>';
    }
    /* full total including all items */
    var fullTotal = cart.reduce(function (s, item) {
      var prod = window.products && window.products.find(function (p) { return p.id === item.id; });
      return s + (prod ? (prod.price || 0) * (item.qty || 1) : 0);
    }, 0);
    totalEl.textContent = euro(fullTotal);
  }

  if (cartOpenBtn && cartHoverPrev) {
    cartOpenBtn.addEventListener('mouseenter', function () {
      clearTimeout(_chpTimeout);
      buildCartPreview();
      cartHoverPrev.style.display = 'block';
      requestAnimationFrame(function () { cartHoverPrev.classList.add('k-chp-in'); });
    });
    cartOpenBtn.addEventListener('mouseleave', function () {
      _chpTimeout = setTimeout(function () {
        cartHoverPrev.classList.remove('k-chp-in');
        setTimeout(function () { cartHoverPrev.style.display = 'none'; }, 250);
      }, 200);
    });
    cartHoverPrev.addEventListener('mouseenter', function () { clearTimeout(_chpTimeout); });
    cartHoverPrev.addEventListener('mouseleave', function () {
      cartHoverPrev.classList.remove('k-chp-in');
      setTimeout(function () { cartHoverPrev.style.display = 'none'; }, 250);
    });
  }

  /* ================================================================
     K2. COUPON CODE
     ================================================================ */
  var COUPON_KEY  = 'k_coupon';
  var COUPONS     = { 'WELCOME10': 10, 'SOMMER15': 15, 'VIP20': 20 };
  var couponForm  = qs('#k-coupon-form');
  var couponRow   = qs('#k-coupon-row');
  var couponMsg   = qs('#k-coupon-msg');

  function applyCoupon(code) {
    var upper = code.trim().toUpperCase();
    var disc  = COUPONS[upper];
    if (!disc) {
      if (couponMsg) { couponMsg.textContent = 'Ungültiger Code'; couponMsg.className = 'k-coupon-msg k-coupon-err'; }
      return;
    }
    localStorage.setItem(COUPON_KEY, JSON.stringify({ code: upper, discount: disc }));
    if (couponMsg) {
      couponMsg.textContent = upper + ' — ' + disc + '% Rabatt aktiviert!';
      couponMsg.className   = 'k-coupon-msg k-coupon-ok';
    }
    var inp = qs('#k-coupon-input');
    if (inp) inp.value = '';
  }

  if (couponForm) {
    couponForm.addEventListener('submit', function () {
      var inp = qs('#k-coupon-input');
      if (inp && inp.value.trim()) applyCoupon(inp.value);
    });
  }

  /* show coupon row when cart has items */
  document.addEventListener('cartUpdated', function () {
    if (!couponRow) return;
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem('luxeCartArray')) || []; } catch (e) {}
    couponRow.style.display = cart.length ? 'block' : 'none';
  });

  /* ================================================================
     K3. SMART RECOMMENDATION ENGINE
     ================================================================ */
  var smartRecsSection = qs('#k-smart-recs');
  var smartRecsGrid    = qs('#k-smart-recs-grid');

  function buildSmartRecs() {
    if (!smartRecsSection || !smartRecsGrid || !window.products) return;
    var rv = [];
    try { rv = JSON.parse(localStorage.getItem('luxeRecentlyViewed')) || []; } catch (e) {}
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem('luxeCartArray')) || []; } catch (e) {}
    var cartIds = cart.map(function (i) { return i.id; });
    var rvIds   = rv.slice(0, 5).map(function (p) { return p.id || p; });

    /* recommend products not in cart and not the exact same as recently viewed */
    var candidates = window.products.filter(function (p) {
      return cartIds.indexOf(p.id) < 0 && rvIds.indexOf(p.id) < 0;
    });

    /* shuffle and pick 4 */
    candidates = candidates.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 4);

    if (!candidates.length) return;

    smartRecsGrid.innerHTML = candidates.map(function (p) {
      var imgSrc = p.image || p.img || '';
      var price  = euro(p.price || 0);
      return '<div class="k-rec-card" onclick="setupModal(\'' + p.id + '\')">' +
        '<div class="k-rec-img-wrap"><img src="' + imgSrc + '" alt="' + (p.name || '') + '" loading="lazy" class="k-rec-img"></div>' +
        '<div class="k-rec-info">' +
          '<p class="k-rec-name">' + (p.name || p.title || '') + '</p>' +
          '<p class="k-rec-price">' + price + '</p>' +
        '</div>' +
      '</div>';
    }).join('');

    smartRecsSection.style.display = 'block';
  }

  /* build once products are ready */
  if (window.products && window.products.length) {
    buildSmartRecs();
  } else {
    document.addEventListener('productsLoaded', buildSmartRecs);
    /* fallback: watch for window.products to appear */
    var _recInterval = setInterval(function () {
      if (window.products && window.products.length) {
        clearInterval(_recInterval);
        buildSmartRecs();
      }
    }, 600);
  }

  /* ================================================================
     X1. LIVE VISITOR COUNTER (simulated)
     ================================================================ */
  var vcEl     = qs('#k-visitor-count');
  var vcTextEl = qs('#k-vc-text');

  function getVisitorCount(productId) {
    /* deterministic-looking random based on product id + time bucket */
    var seed = 0;
    if (productId) for (var i = 0; i < productId.length; i++) seed += productId.charCodeAt(i);
    var bucket = Math.floor(Date.now() / 180000); /* changes every 3 min */
    var pseudo = ((seed * 1103515245 + bucket * 12345) & 0x7fffffff) % 100;
    return 3 + (pseudo % 22); /* 3–24 visitors */
  }

  var _vcInterval = null;

  function startVisitorCounter(productId) {
    if (!vcEl || !vcTextEl) return;
    clearInterval(_vcInterval);
    var count = getVisitorCount(productId);
    vcTextEl.textContent = count + ' Personen schauen sich das gerade an';
    vcEl.style.display   = 'flex';
    /* occasionally fluctuate */
    _vcInterval = setInterval(function () {
      var delta = Math.random() < 0.5 ? 1 : -1;
      count = Math.max(2, Math.min(30, count + delta));
      vcTextEl.textContent = count + ' Personen schauen sich das gerade an';
    }, 8000);
  }

  window.setupModal = (function (_prev) {
    return function (id) {
      if (_prev) _prev.call(this, id);
      startVisitorCounter(id);
    };
  })(window.setupModal);

  var modalForVC = qs('#luxeModal');
  if (modalForVC) {
    modalForVC.addEventListener('hidden.bs.modal', function () {
      clearInterval(_vcInterval);
      if (vcEl) vcEl.style.display = 'none';
    });
  }

  /* ================================================================
     X2. FONT SIZE SWITCHER  +  X3. HIGH CONTRAST  (accessibility panel)
     ================================================================ */
  var a11yBtn   = qs('#k-a11y-btn');
  var a11yPanel = qs('#k-a11y-panel');

  function toggleA11yPanel() {
    if (!a11yPanel) return;
    var open = a11yPanel.style.display !== 'none';
    a11yPanel.style.display = open ? 'none' : 'flex';
    if (a11yBtn) a11yBtn.classList.toggle('k-icon-btn-active', !open);
  }

  if (a11yBtn) a11yBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleA11yPanel(); });

  document.addEventListener('click', function (e) {
    if (a11yPanel && a11yPanel.style.display !== 'none' && !a11yPanel.contains(e.target) && e.target !== a11yBtn) {
      a11yPanel.style.display = 'none';
      if (a11yBtn) a11yBtn.classList.remove('k-icon-btn-active');
    }
  });

  var FS_KEY     = 'k_font_size';
  var FS_CLASSES = { normal: '', large: 'k-fs-large', xlarge: 'k-fs-xlarge' };
  var fsBtns     = qsa('.k-fs-btn');

  function applyFontSize(size) {
    Object.values(FS_CLASSES).forEach(function (c) { if (c) document.body.classList.remove(c); });
    if (FS_CLASSES[size]) document.body.classList.add(FS_CLASSES[size]);
    fsBtns.forEach(function (b) { b.classList.toggle('k-fs-active', b.dataset.size === size); });
    localStorage.setItem(FS_KEY, size);
  }

  fsBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { applyFontSize(this.dataset.size); });
  });

  applyFontSize(localStorage.getItem(FS_KEY) || 'normal');

  var HC_KEY = 'k_high_contrast';
  var hcBtn  = qs('#k-contrast-btn');

  function applyHighContrast(on) {
    document.body.classList.toggle('k-high-contrast', on);
    localStorage.setItem(HC_KEY, on ? '1' : '0');
    if (hcBtn) {
      hcBtn.setAttribute('aria-pressed', String(on));
      hcBtn.classList.toggle('k-contrast-active', on);
    }
  }

  if (hcBtn) {
    hcBtn.addEventListener('click', function () {
      applyHighContrast(!document.body.classList.contains('k-high-contrast'));
    });
  }

  applyHighContrast(localStorage.getItem(HC_KEY) === '1');

  /* ================================================================
     X4. SCROLL SNAP BETWEEN SECTIONS
     ================================================================ */
  /* Applied via CSS only — no JS needed */

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
      injectSavingsBadges();
    }).observe(gridEl, { childList: true, subtree: true });
  }

})();

