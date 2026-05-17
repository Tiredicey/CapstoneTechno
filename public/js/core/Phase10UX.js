(function () {
  'use strict';
  if (window.__BloomPhase10) return;

  var PAGE_MAP = {
    '/': 'Home',
    '/index.html': 'Home',
    '/catalog.html': 'Shop',
    '/customize.html': 'Create',
    '/cart.html': 'Cart',
    '/checkout.html': 'Checkout',
    '/tracking.html': 'Track',
    '/support.html': 'Support',
    '/profile.html': 'Profile',
    '/about.html': 'About',
    '/blog.html': 'Journal',
    '/contact.html': 'Contact',
    '/shipping.html': 'Shipping',
    '/returns.html': 'Returns',
    '/privacy.html': 'Privacy'
  };

  function injectBreadcrumb() {
    var path = window.location.pathname;
    if (path === '/' || path === '/index.html') return;
    var label = PAGE_MAP[path] || path.replace(/\//g, '').replace('.html', '');
    label = label.charAt(0).toUpperCase() + label.slice(1);
    var nav = document.createElement('nav');
    nav.className = 'breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.innerHTML = '<a href="/">Home</a><span class="bc-sep" aria-hidden="true">\u203A</span><span class="bc-current" aria-current="page">' + label + '</span>';
    var target = document.querySelector('main .con, main .container, .catalog-page .container, .page-content .container, .page-content .con');
    if (!target) target = document.querySelector('.cart-layout, .checkout-layout, .tracking-layout, .profile-layout');
    if (!target) target = document.querySelector('main');
    if (!target) target = document.querySelector('.catalog-page, .page-content, [class*="-page"], [class*="-layout"]');
    if (!target) return;
    var wrapper = target.firstElementChild;
    if (wrapper && !wrapper.classList.contains('breadcrumb')) {
      var anchor = wrapper.querySelector('.tag, .section-title, h1, .checkout-steps') || wrapper.firstChild;
      if (anchor && anchor.parentNode === wrapper) {
        wrapper.insertBefore(nav, anchor);
      } else {
        wrapper.insertBefore(nav, wrapper.firstChild);
      }
    } else {
      target.insertBefore(nav, target.firstChild);
    }
  }

  function highlightActiveNav() {
    var path = window.location.pathname;
    document.querySelectorAll('.n-links a, .mob-menu a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var isActive = href === path || (path === '/' && href === '/index.html') || (href !== '/' && href !== '/#shop' && href !== '/#subs' && href !== '/#corp' && href !== '/#features' && path.startsWith(href));
      if (isActive) {
        a.classList.add('is-active');
        a.style.color = 'var(--p5l, #FF3B3B)';
        a.style.borderBottom = '2px solid var(--p5, #E61A1A)';
        a.style.paddingBottom = '4px';
      }
    });
  }

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        var search = document.getElementById('searchInput') || document.getElementById('srchInp');
        if (search) { search.focus(); search.select(); }
      }
    });
    var searchBtns = document.querySelectorAll('[data-label="search"], .srch-btn');
    searchBtns.forEach(function (btn) {
      if (!btn.getAttribute('title')) btn.setAttribute('title', 'Search (Ctrl+K)');
    });
  }

  function enhanceToastAccessibility() {
    var original = window.showToast;
    if (!original) return;
    window.showToast = function (msg, type) {
      original(msg, type);
      setTimeout(function () {
        var toasts = document.querySelectorAll('.toast, [id$="-toast"]');
        toasts.forEach(function (t) {
          if (!t.getAttribute('role')) t.setAttribute('role', 'status');
        });
      }, 10);
    };
  }

  function enableSwipeDismissToasts() {
    document.addEventListener('touchstart', function (e) {
      var toast = e.target.closest('.toast, [id$="-toast"]');
      if (!toast) return;
      var startX = e.touches[0].clientX;
      var startTime = Date.now();
      toast.classList.add('swiping');
      function onMove(ev) {
        var dx = ev.touches[0].clientX - startX;
        toast.style.transform = 'translateX(' + dx + 'px)';
        toast.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 200));
      }
      function onEnd(ev) {
        toast.classList.remove('swiping');
        var dx = (ev.changedTouches[0].clientX - startX);
        var elapsed = Date.now() - startTime;
        var velocity = Math.abs(dx) / elapsed;
        if (Math.abs(dx) > 80 || velocity > 0.5) {
          toast.style.transform = 'translateX(' + (dx > 0 ? '120%' : '-120%') + ')';
          toast.style.opacity = '0';
          setTimeout(function () { toast.remove(); }, 200);
        } else {
          toast.style.transform = '';
          toast.style.opacity = '';
        }
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      }
      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('touchend', onEnd);
    }, { passive: true });
  }

  function patchCartBadgeOptimistic() {
    var origUpdateCartCount = window.__BloomStore && window.__BloomStore.updateCartCount;
    if (!origUpdateCartCount) return;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.add-to-cart-btn');
      if (!btn) return;
      var badge = document.getElementById('cartBadge');
      if (badge) {
        var current = parseInt(badge.textContent) || 0;
        badge.textContent = current + 1;
        badge.style.display = 'inline-flex';
      }
    }, true);
  }

  function bindInlineValidation() {
    setTimeout(function () {
      var emailInputs = document.querySelectorAll('#lEmail, #rEmail, #fplEmail');
      emailInputs.forEach(function (inp) {
        inp.addEventListener('input', function () {
          var val = inp.value.trim();
          var fi = inp.closest('.fi');
          var existing = fi && fi.querySelector('.fi-hint');
          if (!val) {
            inp.classList.remove('fi-error', 'fi-valid');
            if (existing) existing.remove();
            return;
          }
          var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
          inp.classList.toggle('fi-error', !valid);
          inp.classList.toggle('fi-valid', valid);
          if (!fi) return;
          if (!existing) {
            existing = document.createElement('div');
            existing.className = 'fi-hint';
            fi.appendChild(existing);
          }
          if (valid) {
            existing.className = 'fi-hint fi-hint-ok';
            existing.textContent = '\u2714 Valid email';
          } else {
            existing.className = 'fi-hint fi-hint-error';
            existing.textContent = 'Enter a valid email address';
          }
        });
      });

      var passInputs = document.querySelectorAll('#lPass');
      passInputs.forEach(function (inp) {
        inp.addEventListener('input', function () {
          var v = inp.value;
          var fi = inp.closest('.fi');
          inp.classList.remove('fi-error', 'fi-valid');
          if (!v) return;
          if (v.length < 8) {
            inp.classList.add('fi-error');
          } else {
            inp.classList.add('fi-valid');
          }
        });
      });
    }, 1000);
  }

  function enableCheckoutAutoSave() {
    if (window.location.pathname !== '/checkout.html') return;
    var DRAFT_KEY = 'bloom_checkout_draft';
    setTimeout(function () {
      var fields = ['recFirstName', 'recLastName', 'recPhone', 'recAddress', 'recCity', 'recZip', 'specialInstructions', 'email', 'phone'];
      try {
        var saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
        fields.forEach(function (id) {
          var el = document.getElementById(id);
          if (el && saved[id] && !el.value) el.value = saved[id];
        });
      } catch (e) {}
      fields.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('blur', function () {
          try {
            var draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
            draft[id] = el.value;
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
          } catch (e) {}
        });
      });
      var placeBtn = document.getElementById('placeOrder');
      if (placeBtn) {
        placeBtn.addEventListener('click', function () {
          sessionStorage.removeItem(DRAFT_KEY);
        });
      }
    }, 500);
  }

  function enhanceWishlistFeedback() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.product-wishlist');
      if (!btn) return;
      btn.classList.add('heart-pulse');
      setTimeout(function () { btn.classList.remove('heart-pulse'); }, 400);
    });
  }

  function addButtonLoadingStates() {
    var selectors = [
      '#lSubmit', '#rSubmit', '#placeOrder', '#submitTicket',
      '#saveProduct', '#saveFaq', '#savePromo', '#saveBanner',
      '#saveContent', '#sendBroadcast', '#fplSubmit'
    ];
    selectors.forEach(function (sel) {
      var btn = document.getElementById(sel.replace('#', ''));
      if (!btn) return;
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.attributeName === 'disabled') {
            if (btn.disabled && !btn.classList.contains('btn-loading')) {
              btn.classList.add('btn-loading');
              btn.dataset.origText = btn.textContent;
            } else if (!btn.disabled) {
              btn.classList.remove('btn-loading');
            }
          }
        });
      });
      observer.observe(btn, { attributes: true });
    });
  }

  function renderSkeletons(container, count) {
    if (!container) return;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="skeleton-card"><div class="skeleton-img skeleton-pulse"></div><div class="skeleton-line medium skeleton-pulse"></div><div class="skeleton-line short skeleton-pulse"></div><div class="skeleton-line tiny skeleton-pulse"></div></div>';
    }
    container.innerHTML = html;
  }

  function patchCatalogSkeletons() {
    var grid = document.getElementById('productsGrid') || document.getElementById('featuredGrid');
    if (!grid) return;
    var observer = new MutationObserver(function () {
      var text = grid.textContent || '';
      if (text.indexOf('Loading') !== -1) {
        renderSkeletons(grid, 8);
      }
    });
    observer.observe(grid, { childList: true });
  }

  function setupMobileFilterSheet() {
    if (window.innerWidth > 768) return;
    var catTabs = document.getElementById('catTabs');
    var sortSelect = document.getElementById('sortSelect');
    var tagFilter = document.getElementById('tagFilter');
    if (!catTabs && !sortSelect) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'filter-sheet-backdrop';
    var sheet = document.createElement('div');
    sheet.className = 'filter-sheet';
    sheet.innerHTML = '<div class="filter-sheet-handle"></div><div class="filter-sheet-title">Filter & Sort</div><div id="sheetFilters"></div>';
    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);

    var inner = sheet.querySelector('#sheetFilters');
    if (catTabs) {
      var cats = catTabs.querySelectorAll('.cat-tab');
      var catHtml = '<div class="filter-sheet-group"><div class="filter-sheet-label">Category</div><div class="filter-sheet-options">';
      cats.forEach(function (tab) {
        catHtml += '<button class="filter-chip' + (tab.classList.contains('active') ? ' active' : '') + '" data-cat="' + (tab.dataset.cat || 'all') + '">' + tab.textContent.trim() + '</button>';
      });
      catHtml += '</div></div>';
      inner.insertAdjacentHTML('beforeend', catHtml);
    }

    if (sortSelect) {
      var sortHtml = '<div class="filter-sheet-group"><div class="filter-sheet-label">Sort By</div><div class="filter-sheet-options">';
      Array.from(sortSelect.options).forEach(function (opt) {
        sortHtml += '<button class="filter-chip' + (opt.selected ? ' active' : '') + '" data-sort="' + opt.value + '">' + opt.textContent + '</button>';
      });
      sortHtml += '</div></div>';
      inner.insertAdjacentHTML('beforeend', sortHtml);
    }

    inner.querySelectorAll('[data-cat]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        inner.querySelectorAll('[data-cat]').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        var tab = catTabs.querySelector('[data-cat="' + chip.dataset.cat + '"]');
        if (tab) tab.click();
        closeSheet();
      });
    });

    inner.querySelectorAll('[data-sort]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        inner.querySelectorAll('[data-sort]').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        if (sortSelect) { sortSelect.value = chip.dataset.sort; sortSelect.dispatchEvent(new Event('change')); }
        closeSheet();
      });
    });

    function closeSheet() {
      sheet.classList.remove('active');
      backdrop.classList.remove('active');
    }
    backdrop.addEventListener('click', closeSheet);

    var trigger = document.createElement('button');
    trigger.className = 'btn btn-ghost mob-filter-trigger';
    trigger.setAttribute('aria-label', 'Open filters');
    trigger.textContent = '\u2630 Filter';
    trigger.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9990;background:var(--bloom-primary);color:#fff;border:none;padding:10px 18px;border-radius:100px;font-weight:600;font-size:.82rem;box-shadow:0 8px 24px rgba(139,31,110,.4);cursor:pointer;';
    trigger.addEventListener('click', function () {
      sheet.classList.add('active');
      backdrop.classList.add('active');
    });
    document.body.appendChild(trigger);
  }

  function patchSearchEmptyState() {
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    var observer = new MutationObserver(function () {
      var text = grid.textContent || '';
      if (text.indexOf('No arrangements found') !== -1 || text.indexOf('No products found') !== -1) {
        grid.innerHTML = '<div class="search-empty"><div class="search-empty-icon">\uD83D\uDD0D</div><div class="search-empty-text">No bouquets match your search</div><div class="search-empty-hint">Try \u201Croses\u201D, \u201Cwedding\u201D, or \u201Cbouquet\u201D</div></div>';
      }
    });
    observer.observe(grid, { childList: true });
  }

  function enablePullToRefresh() {
    if (window.location.pathname !== '/catalog.html') return;
    if (window.innerWidth > 768) return;
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    var startY = 0;
    var pulling = false;
    var indicator = document.createElement('div');
    indicator.id = 'ptr-indicator';
    indicator.style.cssText = 'position:fixed;top:68px;left:50%;transform:translateX(-50%) translateY(-60px);z-index:9000;background:var(--bg2,#1a0d24);border:1px solid var(--glb,rgba(255,255,255,.09));border-radius:100px;padding:8px 18px;font-size:.75rem;font-weight:600;color:rgba(255,255,255,.5);transition:transform .3s,opacity .3s;opacity:0;pointer-events:none;';
    indicator.textContent = '\u2193 Pull to refresh';
    document.body.appendChild(indicator);
    grid.addEventListener('touchstart', function (e) {
      if (window.scrollY > 10) return;
      startY = e.touches[0].clientY;
      pulling = true;
    }, { passive: true });
    grid.addEventListener('touchmove', function (e) {
      if (!pulling) return;
      var dy = e.touches[0].clientY - startY;
      if (dy < 0) { pulling = false; return; }
      if (dy > 20) {
        var pct = Math.min(dy / 120, 1);
        indicator.style.transform = 'translateX(-50%) translateY(' + (pct * 40 - 60) + 'px)';
        indicator.style.opacity = String(pct);
        indicator.textContent = pct >= 1 ? '\u21BB Release to refresh' : '\u2193 Pull to refresh';
      }
    }, { passive: true });
    grid.addEventListener('touchend', function (e) {
      if (!pulling) return;
      pulling = false;
      var dy = e.changedTouches[0].clientY - startY;
      indicator.style.transform = 'translateX(-50%) translateY(-60px)';
      indicator.style.opacity = '0';
      if (dy >= 120 && window.scrollY <= 5) {
        indicator.textContent = '\u27F3 Refreshing\u2026';
        indicator.style.transform = 'translateX(-50%) translateY(0px)';
        indicator.style.opacity = '1';
        setTimeout(function () {
          if (typeof window.loadProducts === 'function') {
            window.loadProducts();
          } else {
            window.location.reload();
          }
          setTimeout(function () {
            indicator.style.transform = 'translateX(-50%) translateY(-60px)';
            indicator.style.opacity = '0';
          }, 800);
        }, 400);
      }
    }, { passive: true });
  }

  function patchAdminConfirmDialogs() {
    if (window.location.pathname !== '/admin.html') return;
    var origConfirm = window.confirm;
    window.confirm = function (message) {
      return new Promise(function (resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.id = 'bloomConfirmOverlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(6,2,14,.82);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:20px;';
        overlay.innerHTML =
          '<div class="modal" style="max-width:400px;padding:32px;background:linear-gradient(180deg,var(--bg2,#1a0d24),var(--bg,#0B0516));border:1px solid var(--glb,rgba(255,255,255,.09));border-radius:20px;animation:mpop .32s var(--spring,cubic-bezier(.34,1.56,.64,1));">' +
          '<div style="text-align:center;font-size:2.5rem;margin-bottom:16px;">\u26A0\uFE0F</div>' +
          '<h3 style="font-family:var(--fd);font-size:1.15rem;font-weight:700;text-align:center;margin-bottom:12px;">Confirm Action</h3>' +
          '<p style="font-size:.88rem;color:rgba(255,255,255,.6);text-align:center;line-height:1.6;margin-bottom:24px;">' + (message || 'Are you sure?') + '</p>' +
          '<div style="display:flex;gap:10px;">' +
          '<button id="bloomConfirmNo" class="btn btn-g" style="flex:1;justify-content:center;">Cancel</button>' +
          '<button id="bloomConfirmYes" class="btn btn-p" style="flex:1;justify-content:center;">Confirm</button>' +
          '</div></div>';
        document.body.appendChild(overlay);
        document.body.classList.add('modal-open');
        overlay.querySelector('#bloomConfirmYes').addEventListener('click', function () {
          overlay.remove();
          document.body.classList.remove('modal-open');
          resolve(true);
        });
        overlay.querySelector('#bloomConfirmNo').addEventListener('click', function () {
          overlay.remove();
          document.body.classList.remove('modal-open');
          resolve(false);
        });
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) {
            overlay.remove();
            document.body.classList.remove('modal-open');
            resolve(false);
          }
        });
        document.addEventListener('keydown', function handler(e) {
          if (e.key === 'Escape') {
            overlay.remove();
            document.body.classList.remove('modal-open');
            resolve(false);
            document.removeEventListener('keydown', handler);
          }
        });
      });
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    highlightActiveNav();
    injectBreadcrumb();
    bindKeyboardShortcuts();
    enhanceToastAccessibility();
    enableSwipeDismissToasts();
    patchCartBadgeOptimistic();
    bindInlineValidation();
    enableCheckoutAutoSave();
    enhanceWishlistFeedback();
    addButtonLoadingStates();
    patchCatalogSkeletons();
    patchSearchEmptyState();
    setupMobileFilterSheet();
    enablePullToRefresh();
    patchAdminConfirmDialogs();
  });

  window.__BloomPhase10 = {
    renderSkeletons: renderSkeletons
  };
})();
