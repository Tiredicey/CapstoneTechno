(function () {
  'use strict';

  const PHP_RATE = 56;
  const FREE_SHIP_THRESHOLD = 4200;
  const DEFAULT_SHIP_FEE = 560;

  function waitForGlobals(cb, tries = 0) {
    if (window.__BloomApi && window.__BloomAuth && window.__BloomStore) {
      cb();
    } else if (tries < 40) {
      setTimeout(() => waitForGlobals(cb, tries + 1), 50);
    } else {
      console.error('Bloom globals not available');
      const panel = document.getElementById('cartItemsPanel');
      if (panel) panel.innerHTML = `<div style="color:rgba(255,107,107,0.8);padding:48px;text-align:center;">
        <div style="font-size:2rem;margin-bottom:12px;">⚠️</div>
        <p>Could not initialize cart. Please refresh.</p>
      </div>`;
    }
  }

  function fmt(n) {
    return `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function phpFromUSD(usd) {
    return Math.round(Number(usd || 0) * PHP_RATE * 100) / 100;
  }

  let cartData = null;

  function showToast(msg, type) {
    window.__BloomToast?.show(msg, type);
  }

  function updateBadge(count) {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count; badge.style.display = 'inline-flex'; }
    else badge.style.display = 'none';
  }

  async function loadCart() {
    const Api   = window.__BloomApi;
    const Store = window.__BloomStore;
    const panel = document.getElementById('cartItemsPanel');
    if (!panel) return;

    try {
      const token = localStorage.getItem('bloom_token');
      if (token) {
        try {
          cartData = await Api.get('/cart');
          if (cartData?.items) {
            cartData.items = cartData.items.map(item => ({
              ...item,
              lineId: item.lineId || item.id || item.product_id,
              price:  item.price > 500 ? item.price : phpFromUSD(item.price),
              qty:    item.qty || item.quantity || 1,
              image:  item.image_url || item.image || '',
            }));
          }
          Store.set('cart', cartData);

          const local = JSON.parse(localStorage.getItem('bloom_cart') || '[]');
          if (local.length) {
            for (const li of local) {
              const exists = cartData.items?.find(i => i.lineId === li.id || i.lineId === li.lineId);
              if (!exists) {
                try {
                  await Api.post('/cart', { product_id: li.id, quantity: li.qty || 1 });
                } catch {}
              }
            }
            localStorage.removeItem('bloom_cart');
          }
        } catch {
          cartData = buildLocalCart();
        }
      } else {
        cartData = buildLocalCart();
      }

      renderCart();
      renderSummary();
      loadLoyaltyInfo();

      const count = cartData?.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0;
      updateBadge(count);
      Store.updateCartCount(count);
    } catch (err) {
      console.error('Cart load error:', err);
      panel.innerHTML = `<div style="color:rgba(255,107,107,0.8);padding:48px;text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div>
        <p style="margin-bottom:16px;">Failed to load cart.</p>
        <a href="/catalog.html" class="btn btn-primary">Browse Shop</a>
      </div>`;
    }
  }

  function buildLocalCart() {
    try {
      const raw = JSON.parse(localStorage.getItem('bloom_cart') || '[]');
      return {
        items: raw.map((item, idx) => ({
          lineId: item.lineId || item.id || String(idx),
          name:   item.name || 'Product',
          price:  item.price > 500 ? item.price : phpFromUSD(item.price || 0),
          qty:    item.qty || item.quantity || 1,
          image:  item.image || item.image_url || '',
          customization: item.customization || null,
        })),
        pricing: null,
      };
    } catch {
      return { items: [], pricing: null };
    }
  }

  function saveLocalCart() {
    const token = localStorage.getItem('bloom_token');
    if (!token) localStorage.setItem('bloom_cart', JSON.stringify(cartData?.items || []));
  }

  function renderCart() {
    const panel = document.getElementById('cartItemsPanel');
    if (!panel) return;
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (!cartData?.items?.length) {
      panel.innerHTML = `
        <div style="text-align:center;padding:64px 24px;">
          <div style="font-size:3.5rem;margin-bottom:16px;">🛒</div>
          <h2 style="font-size:1.4rem;font-weight:700;margin-bottom:10px;color:#fff;">Your Cart is Empty</h2>
          <p style="color:rgba(255,255,255,0.4);margin-bottom:24px;">Discover our beautiful arrangements.</p>
          <a href="/catalog.html" class="btn btn-primary">Browse Collection →</a>
        </div>`;
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      return;
    }

    if (checkoutBtn) checkoutBtn.style.display = 'flex';

    panel.innerHTML = cartData.items.map(item => {
      const linePrice = item.price * (item.qty || 1);
      const customText = item.customization
        ? (typeof item.customization === 'object'
            ? `✏️ ${Object.entries(item.customization).filter(([k,v]) => v && k !== 'priceDelta').slice(0,3).map(([k]) => k).join(', ')}`
            : `✏️ ${item.customization}`)
        : 'Standard arrangement';

      return `
        <div class="cart-item" data-line="${item.lineId}" style="
          display:flex;gap:16px;align-items:flex-start;
          padding:20px;border-bottom:1px solid rgba(255,255,255,0.06);
        ">
          <div style="
            width:80px;height:80px;border-radius:12px;flex-shrink:0;
            overflow:hidden;background:rgba(255,255,255,0.05);
            display:flex;align-items:center;justify-content:center;font-size:2rem;
          ">
            ${item.image
              ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">`
              : '🌺'}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;color:#fff;margin-bottom:4px;font-size:0.95rem;">${item.name}</div>
            <div style="font-size:0.77rem;color:rgba(255,255,255,0.32);margin-bottom:10px;">${customText}</div>
            <div style="display:flex;align-items:center;gap:10px;">
              <button class="qty-btn" data-action="dec" data-line="${item.lineId}" style="
                width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.18);
                background:rgba(255,255,255,0.06);color:#fff;cursor:pointer;font-size:1.1rem;
                display:flex;align-items:center;justify-content:center;transition:background 0.2s;
              ">−</button>
              <span style="color:#fff;font-weight:600;min-width:22px;text-align:center;">${item.qty || 1}</span>
              <button class="qty-btn" data-action="inc" data-line="${item.lineId}" style="
                width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.18);
                background:rgba(255,255,255,0.06);color:#fff;cursor:pointer;font-size:1.1rem;
                display:flex;align-items:center;justify-content:center;transition:background 0.2s;
              ">+</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
            <button class="cart-item-remove" data-line="${item.lineId}" style="
              background:none;border:none;color:rgba(255,100,100,0.55);
              cursor:pointer;font-size:1rem;padding:2px;transition:color 0.2s;
            " title="Remove">✕</button>
            <div style="color:var(--bloom-accent,#ff6b9d);font-weight:700;font-size:0.95rem;">${fmt(linePrice)}</div>
            <div style="font-size:0.74rem;color:rgba(255,255,255,0.3);">${fmt(item.price)} each</div>
          </div>
        </div>`;
    }).join('');

    panel.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const lineId = btn.dataset.line;
        const item   = cartData.items.find(i => i.lineId === lineId);
        if (!item) return;
        const delta  = btn.dataset.action === 'inc' ? 1 : -1;
        await updateItem(lineId, (item.qty || 1) + delta);
      });
    });

    panel.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => updateItem(btn.dataset.line, 0));
    });
  }

  async function updateItem(lineId, qty) {
    const Api   = window.__BloomApi;
    const Store = window.__BloomStore;
    const token = localStorage.getItem('bloom_token');

    try {
      if (token) {
        if (qty <= 0) {
          const result = await Api.delete(`/cart/items/${lineId}`).catch(() => null);
          if (result?.items !== undefined) cartData = result;
          else cartData.items = cartData.items.filter(i => i.lineId !== lineId);
        } else {
          const result = await Api.put(`/cart/items/${lineId}`, { qty }).catch(() => null);
          if (result?.items !== undefined) cartData = result;
          else { const it = cartData.items.find(i => i.lineId === lineId); if (it) it.qty = qty; }
        }
      } else {
        if (qty <= 0) cartData.items = cartData.items.filter(i => i.lineId !== lineId);
        else { const it = cartData.items.find(i => i.lineId === lineId); if (it) it.qty = qty; }
        saveLocalCart();
      }

      Store.set('cart', cartData);
      const count = cartData.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0;
      Store.updateCartCount(count);
      updateBadge(count);
      renderCart();
      renderSummary();
    } catch (e) {
      showToast(e.message || 'Error updating cart', 'error');
    }
  }

  function computeLocalPricing() {
    let subtotal = 0;
    for (const item of cartData?.items || []) subtotal += (item.price || 0) * (item.qty || 1);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIP_THRESHOLD ? 0 : DEFAULT_SHIP_FEE;
    const tax      = (subtotal + shipping) * 0.08;
    return { subtotal, customizationFee: 0, deliveryFee: shipping, promoDiscount: 0, tax, finalTotal: subtotal + shipping + tax };
  }

  function renderSummary() {
    const p   = cartData?.pricing || computeLocalPricing();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('summarySubtotal', fmt(p.subtotal));
    set('summaryCustom',   fmt(p.customizationFee || 0));
    set('summaryShipping', p.deliveryFee === 0 ? '🎉 FREE' : fmt(p.deliveryFee));
    set('summaryTax',      fmt(p.tax));
    set('summaryTotal',    fmt(p.finalTotal));

    const promoRow = document.getElementById('promoRow');
    if (p.promoDiscount > 0 && promoRow) {
      promoRow.style.display = 'flex';
      set('summaryPromo', `−${fmt(p.promoDiscount)}`);
    }

    const fill = document.getElementById('freeShipFill');
    const text = document.getElementById('freeShipText');
    const pct  = Math.min((p.subtotal / FREE_SHIP_THRESHOLD) * 100, 100);
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = p.deliveryFee === 0
      ? '🎉 You have free shipping!'
      : `Add ${fmt(FREE_SHIP_THRESHOLD - p.subtotal)} more for free shipping`;
  }

  function loadLoyaltyInfo() {
    const Store = window.__BloomStore;
    const user  = Store?.get('user');
    const panel = document.getElementById('loyaltyPanel');
    const bal   = document.getElementById('loyaltyBalance');
    if (panel && user && !user.isGuest && (user.loyalty_points || 0) > 0) {
      panel.style.display = 'block';
      if (bal) bal.textContent = user.loyalty_points;
    }
  }

  function bindEvents() {
    document.getElementById('applyPromo')?.addEventListener('click', async () => {
      const Api   = window.__BloomApi;
      const input = document.getElementById('promoInput');
      const code  = input?.value?.trim().toUpperCase();
      if (!code) { showToast('Enter a promo code', 'error'); return; }

      const LOCAL_CODES = {
        BLOOM10:   { type: 'percent',  value: 10,  label: '10% off' },
        BLOOM20:   { type: 'percent',  value: 20,  label: '20% off' },
        FREESHIP:  { type: 'shipping', value: 100, label: 'Free shipping' },
        WELCOME15: { type: 'percent',  value: 15,  label: '15% off' },
      };

      const token = localStorage.getItem('bloom_token');
      if (token) {
        try {
          const result = await Api.post('/cart/promo', { code });
          if (result?.pricing) cartData = result;
          const fb  = document.getElementById('promoFeedback');
          const lbl = document.getElementById('promoLabel');
          if (fb) fb.style.display = 'flex';
          if (lbl) lbl.textContent = result.pricing?.promoLabel || 'Code applied';
          renderSummary();
          showToast('Promo applied! 🎉', 'success');
          return;
        } catch {}
      }

      const promo = LOCAL_CODES[code];
      if (!promo) { showToast('Invalid promo code', 'error'); return; }
      const p = computeLocalPricing();
      if (promo.type === 'percent')  p.promoDiscount = p.subtotal * (promo.value / 100);
      if (promo.type === 'shipping') { p.deliveryFee = 0; p.promoDiscount = DEFAULT_SHIP_FEE; }
      p.finalTotal = Math.max(p.subtotal + p.deliveryFee + p.tax - (p.promoDiscount || 0), 0);
      if (!cartData) cartData = { items: [] };
      cartData.pricing = p;
      const fb  = document.getElementById('promoFeedback');
      const lbl = document.getElementById('promoLabel');
      if (fb) fb.style.display = 'flex';
      if (lbl) lbl.textContent = promo.label;
      renderSummary();
      showToast('Promo applied! 🎉', 'success');
    });

    document.getElementById('toggleLoyalty')?.addEventListener('click', () => {
      showToast('Loyalty discount applied! ⭐', 'success');
    });

    document.getElementById('checkoutBtn')?.addEventListener('click', () => {
      if (!cartData?.items?.length) { showToast('Your cart is empty', 'info'); return; }
      const token = localStorage.getItem('bloom_token');
      if (!token) {
        showToast('Please sign in to checkout', 'error');
        window.__BloomAuth?._openModal();
        return;
      }
      window.__BloomStore?.set('cartId', cartData.id);
      window.location.href = '/checkout.html';
    });
  }

  waitForGlobals(() => {
    bindEvents();
    loadCart();
  });

})();