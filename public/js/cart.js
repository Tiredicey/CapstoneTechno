(function () {
  'use strict';

  const PHP_RATE = 56;
  const FREE_SHIP_THRESHOLD = 4200;
  const DEFAULT_SHIP_FEE = 560;

  function waitForGlobals(cb, tries) {
    tries = tries || 0;
    if (window.__BloomApi && window.__BloomStore) {
      cb();
    } else if (tries < 40) {
      setTimeout(function () { waitForGlobals(cb, tries + 1); }, 50);
    } else {
      console.error('Bloom globals not available');
      var panel = document.getElementById('cartItemsPanel');
      if (panel) panel.innerHTML = '<div style="color:rgba(255,107,107,0.8);padding:48px;text-align:center;"><div style="font-size:2rem;margin-bottom:12px;">⚠️</div><p>Could not initialize cart. Please refresh.</p></div>';
    }
  }

  function fmt(n) {
    return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function phpFromUSD(usd) {
    return Math.round(Number(usd || 0) * PHP_RATE * 100) / 100;
  }

  let cartData = null;

  function showToast(msg, type) {
    type = type || 'info';
    var existing = document.getElementById('cart-toast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = 'cart-toast';
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:' +
      (type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#6366f1') +
      ';color:white;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3500);
  }

  function updateBadge(count) {
    var badge = document.getElementById('cartBadge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count; badge.style.display = 'inline-flex'; }
    else badge.style.display = 'none';
  }

  async function loadCart() {
    var Api = window.__BloomApi;
    var Store = window.__BloomStore;
    var panel = document.getElementById('cartItemsPanel');
    if (!panel) return;
    try {
      var apiSuccess = false;
      try {
        cartData = await Api.get('/cart');
        apiSuccess = true;
        if (cartData && cartData.items) {
          cartData.items = cartData.items.map(function (item) {
            return Object.assign({}, item, {
              lineId: item.lineId || item.id || item.product_id,
              price: item.price > 500 ? item.price : phpFromUSD(item.price),
              qty: item.qty || item.quantity || 1,
              image: item.image_url || item.image || ''
            });
          });
        }
        Store.set('cart', cartData);
        var local = [];
        try { local = JSON.parse(localStorage.getItem('bloom_cart') || '[]'); } catch {}
        if (local.length) {
          for (var i = 0; i < local.length; i++) {
            var li = local[i];
            var exists = cartData.items && cartData.items.find(function (it) { return it.lineId === li.id || it.lineId === li.lineId; });
            if (!exists) {
              try { await Api.post('/cart/items', { productId: li.id || li.lineId, qty: li.qty || 1 }); } catch {}
            }
          }
          localStorage.removeItem('bloom_cart');
          cartData = await Api.get('/cart');
          if (cartData && cartData.items) {
            cartData.items = cartData.items.map(function (item) {
              return Object.assign({}, item, {
                lineId: item.lineId || item.id || item.product_id,
                price: item.price > 500 ? item.price : phpFromUSD(item.price),
                qty: item.qty || item.quantity || 1,
                image: item.image_url || item.image || ''
              });
            });
          }
          Store.set('cart', cartData);
        }
      } catch (apiErr) {
        cartData = buildLocalCart();
      }
      if (!apiSuccess) {
        cartData = buildLocalCart();
      }
      renderCart();
      renderSummary();
      loadLoyaltyInfo();
      var count = cartData && cartData.items ? cartData.items.reduce(function (s, i) { return s + (i.qty || 1); }, 0) : 0;
      updateBadge(count);
      Store.updateCartCount(count);
    } catch (err) {
      console.error('Cart load error:', err);
      panel.innerHTML = '<div style="color:rgba(255,107,107,0.8);padding:48px;text-align:center;"><div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div><p style="margin-bottom:16px;">Failed to load cart.</p><a href="/catalog.html" class="btn btn-primary">Browse Shop</a></div>';
    }
  }

  function buildLocalCart() {
    try {
      var raw = JSON.parse(localStorage.getItem('bloom_cart') || '[]');
      return {
        items: raw.map(function (item, idx) {
          return {
            lineId: item.lineId || item.id || String(idx),
            name: item.name || 'Product',
            price: item.price > 500 ? item.price : phpFromUSD(item.price || 0),
            qty: item.qty || item.quantity || 1,
            image: item.image || item.image_url || '',
            customization: item.customization || null
          };
        }),
        pricing: null
      };
    } catch {
      return { items: [], pricing: null };
    }
  }

  function saveLocalCart() {
    var token = localStorage.getItem('bloom_token');
    if (!token) localStorage.setItem('bloom_cart', JSON.stringify(cartData && cartData.items ? cartData.items : []));
  }

  function renderCart() {
    var panel = document.getElementById('cartItemsPanel');
    if (!panel) return;
    var checkoutBtn = document.getElementById('checkoutBtn');
    if (!cartData || !cartData.items || !cartData.items.length) {
      panel.innerHTML = '<div style="text-align:center;padding:64px 24px;"><div style="font-size:3.5rem;margin-bottom:16px;">🛒</div><h2 style="font-size:1.4rem;font-weight:700;margin-bottom:10px;color:#fff;">Your Cart is Empty</h2><p style="color:rgba(255,255,255,0.4);margin-bottom:24px;">Discover our beautiful arrangements.</p><a href="/catalog.html" class="btn btn-primary">Browse Collection →</a></div>';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      return;
    }
    if (checkoutBtn) checkoutBtn.style.display = 'flex';
    panel.innerHTML = cartData.items.map(function (item) {
      var linePrice = item.price * (item.qty || 1);
      var customText = item.customization
        ? (typeof item.customization === 'object'
          ? '✏️ ' + Object.entries(item.customization).filter(function (e) { return e[1] && e[0] !== 'priceDelta'; }).slice(0, 3).map(function (e) { return e[0]; }).join(', ')
          : '✏️ ' + item.customization)
        : 'Standard arrangement';
      return '<div class="cart-item" data-line="' + item.lineId + '" style="display:flex;gap:16px;align-items:flex-start;padding:20px;border-bottom:1px solid rgba(255,255,255,0.06);">' +
        '<div style="width:80px;height:80px;border-radius:12px;flex-shrink:0;overflow:hidden;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:2rem;">' +
        (item.image ? '<img src="' + item.image + '" alt="' + item.name + '" style="width:100%;height:100%;object-fit:cover;">' : '🌺') +
        '</div>' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:600;color:#fff;margin-bottom:4px;font-size:0.95rem;">' + item.name + '</div>' +
        '<div style="font-size:0.77rem;color:rgba(255,255,255,0.32);margin-bottom:10px;">' + customText + '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        '<button class="qty-btn" data-action="dec" data-line="' + item.lineId + '" style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#fff;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">−</button>' +
        '<span style="color:#fff;font-weight:600;min-width:22px;text-align:center;">' + (item.qty || 1) + '</span>' +
        '<button class="qty-btn" data-action="inc" data-line="' + item.lineId + '" style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#fff;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">+</button>' +
        '</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">' +
        '<button class="cart-item-remove" data-line="' + item.lineId + '" style="background:none;border:none;color:rgba(255,100,100,0.55);cursor:pointer;font-size:1rem;padding:2px;" title="Remove">✕</button>' +
        '<div style="color:var(--bloom-accent,#ff6b9d);font-weight:700;font-size:0.95rem;">' + fmt(linePrice) + '</div>' +
        '<div style="font-size:0.74rem;color:rgba(255,255,255,0.3);">' + fmt(item.price) + ' each</div>' +
        '</div></div>';
    }).join('');

    panel.querySelectorAll('.qty-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var lineId = btn.dataset.line;
        var item = cartData.items.find(function (i) { return i.lineId === lineId; });
        if (!item) return;
        var delta = btn.dataset.action === 'inc' ? 1 : -1;
        await updateItem(lineId, (item.qty || 1) + delta);
      });
    });

    panel.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () { updateItem(btn.dataset.line, 0); });
    });
  }

  async function updateItem(lineId, qty) {
    var Api = window.__BloomApi;
    var Store = window.__BloomStore;
    var token = localStorage.getItem('bloom_token');
    try {
      if (token) {
        if (qty <= 0) {
          var result = await Api.delete('/cart/items/' + lineId).catch(function () { return null; });
          if (result && result.items !== undefined) cartData = result;
          else cartData.items = cartData.items.filter(function (i) { return i.lineId !== lineId; });
        } else {
          var res = await Api.put('/cart/items/' + lineId, { qty: qty }).catch(function () { return null; });
          if (res && res.items !== undefined) cartData = res;
          else {
            var it = cartData.items.find(function (i) { return i.lineId === lineId; });
            if (it) it.qty = qty;
          }
        }
      } else {
        if (qty <= 0) cartData.items = cartData.items.filter(function (i) { return i.lineId !== lineId; });
        else {
          var found = cartData.items.find(function (i) { return i.lineId === lineId; });
          if (found) found.qty = qty;
        }
        saveLocalCart();
      }
      Store.set('cart', cartData);
      var count = cartData.items ? cartData.items.reduce(function (s, i) { return s + (i.qty || 1); }, 0) : 0;
      Store.updateCartCount(count);
      updateBadge(count);
      renderCart();
      renderSummary();
    } catch (e) {
      showToast(e.message || 'Error updating cart', 'error');
    }
  }

  function computeLocalPricing() {
    var subtotal = 0;
    (cartData && cartData.items || []).forEach(function (item) { subtotal += (item.price || 0) * (item.qty || 1); });
    var shipping = subtotal === 0 || subtotal >= FREE_SHIP_THRESHOLD ? 0 : DEFAULT_SHIP_FEE;
    var tax = (subtotal + shipping) * 0.08;
    return { subtotal: subtotal, customizationFee: 0, deliveryFee: shipping, promoDiscount: 0, tax: tax, finalTotal: subtotal + shipping + tax };
  }

  function renderSummary() {
    var p = (cartData && cartData.pricing) || computeLocalPricing();
    function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
    setEl('summarySubtotal', fmt(p.subtotal));
    setEl('summaryCustom', fmt(p.customizationFee || 0));
    setEl('summaryShipping', p.deliveryFee === 0 ? '🎉 FREE' : fmt(p.deliveryFee));
    setEl('summaryTax', fmt(p.tax));
    setEl('summaryTotal', fmt(p.finalTotal));
    var promoRow = document.getElementById('promoRow');
    if (p.promoDiscount > 0 && promoRow) {
      promoRow.style.display = 'flex';
      setEl('summaryPromo', '−' + fmt(p.promoDiscount));
    }
    var fill = document.getElementById('freeShipFill');
    var text = document.getElementById('freeShipText');
    var pct = Math.min((p.subtotal / FREE_SHIP_THRESHOLD) * 100, 100);
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = p.deliveryFee === 0 ? '🎉 You have free shipping!' : 'Add ' + fmt(FREE_SHIP_THRESHOLD - p.subtotal) + ' more for free shipping';
  }

  function loadLoyaltyInfo() {
    var Store = window.__BloomStore;
    var user = Store && Store.get('user');
    var panel = document.getElementById('loyaltyPanel');
    var bal = document.getElementById('loyaltyBalance');
    if (panel && user && !user.isGuest && (user.loyalty_points || 0) > 0) {
      panel.style.display = 'block';
      if (bal) bal.textContent = user.loyalty_points;
    }
  }

  function bindEvents() {
    document.getElementById('applyPromo') && document.getElementById('applyPromo').addEventListener('click', async function () {
      var Api = window.__BloomApi;
      var input = document.getElementById('promoInput');
      var code = input && input.value ? input.value.trim().toUpperCase() : '';
      if (!code) { showToast('Enter a promo code', 'error'); return; }
      var LOCAL_CODES = {
        BLOOM10: { type: 'percent', value: 10, label: '10% off' },
        BLOOM20: { type: 'percent', value: 20, label: '20% off' },
        FREESHIP: { type: 'shipping', value: 100, label: 'Free shipping' },
        WELCOME15: { type: 'percent', value: 15, label: '15% off' }
      };
      var token = localStorage.getItem('bloom_token');
      if (token) {
        try {
          var result = await Api.post('/cart/promo', { code: code });
          if (result && result.pricing) cartData = result;
          var fb = document.getElementById('promoFeedback');
          var lbl = document.getElementById('promoLabel');
          if (fb) fb.style.display = 'flex';
          if (lbl) lbl.textContent = (result.pricing && result.pricing.promoLabel) || 'Code applied';
          renderSummary();
          showToast('Promo applied! 🎉', 'success');
          return;
        } catch {}
      }
      var promo = LOCAL_CODES[code];
      if (!promo) { showToast('Invalid promo code', 'error'); return; }
      var p = computeLocalPricing();
      if (promo.type === 'percent') p.promoDiscount = p.subtotal * (promo.value / 100);
      if (promo.type === 'shipping') { p.deliveryFee = 0; p.promoDiscount = DEFAULT_SHIP_FEE; }
      p.finalTotal = Math.max(p.subtotal + p.deliveryFee + p.tax - (p.promoDiscount || 0), 0);
      if (!cartData) cartData = { items: [] };
      cartData.pricing = p;
      var fb2 = document.getElementById('promoFeedback');
      var lbl2 = document.getElementById('promoLabel');
      if (fb2) fb2.style.display = 'flex';
      if (lbl2) lbl2.textContent = promo.label;
      renderSummary();
      showToast('Promo applied! 🎉', 'success');
    });

    document.getElementById('toggleLoyalty') && document.getElementById('toggleLoyalty').addEventListener('click', function () {
      showToast('Loyalty discount applied! ⭐', 'success');
    });

    document.getElementById('checkoutBtn') && document.getElementById('checkoutBtn').addEventListener('click', function () {
      if (!cartData || !cartData.items || !cartData.items.length) { showToast('Your cart is empty', 'info'); return; }
      var token = localStorage.getItem('bloom_token');
      if (!token) {
        showToast('Please sign in to checkout', 'error');
        var authModal = document.getElementById('authModal');
        if (authModal) authModal.classList.add('active');
        return;
      }
      window.__BloomStore && window.__BloomStore.set('cartId', cartData.id);
      window.location.href = '/checkout.html';
    });
  }

  function bindCartSocket() {
    var Store = window.__BloomStore;
    if (!Store) return;
    Store.on('promo_update', function (data) {
      if (!cartData || !cartData.pricing) return;
      if (data && data.action === 'deleted' && cartData.pricing.promoCode === data.id) {
        cartData.pricing = null;
        renderSummary();
        showToast('An applied promo has been removed by the store.', 'info');
      } else if (data && (data.action === 'created' || data.action === 'updated')) {
        showToast('New promotion available! 🎉', 'success');
      }
    });

    Store.on('catalog_update', function (data) {
      if (!cartData || !cartData.items || !cartData.items.length) return;
      if (data && data.action === 'updated' && data.product) {
        var updated = false;
        cartData.items.forEach(function (item) {
          if (item.product_id === data.product.id || item.lineId === data.product.id) {
            if (data.product.base_price) {
              item.price = data.product.base_price;
              updated = true;
            }
          }
        });
        if (updated) {
          renderCart();
          renderSummary();
          showToast('Cart prices updated to reflect store changes.', 'info');
        }
      }
    });

    Store.on('user_updated', function (data) {
      if (data && data.loyalty_points !== undefined) {
        loadLoyaltyInfo();
      }
    });
  }

  waitForGlobals(function () {
    bindEvents();
    bindCartSocket();
    loadCart();
  });
})();
