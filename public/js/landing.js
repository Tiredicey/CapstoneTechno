const MOCK_REVIEWS = [
  { name: 'Valentina Cruz', rating: 5, body: "I ordered a custom arrangement for my mother's birthday and she cried happy tears. The silk wrap was exquisite and arrived perfectly on time.", occasion: 'Birthday' },
  { name: 'Hiroki Tanaka', rating: 5, body: 'The corporate order process was seamless — 40 branded bouquets for our product launch, every single one perfect. Repeat customer forever.', occasion: 'Corporate' },
  { name: 'Marisol Reyes', rating: 5, body: 'Ordered a surprise delivery for my wife on our anniversary. The evening slot worked perfectly. The photo proof on delivery was such a thoughtful touch.', occasion: 'Anniversary' }
];

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(100px)';
    t.style.transition = 'all 0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

function spawnParticles() {
  const field = document.getElementById('particles');
  if (!field) return;
  const colors = [
    'rgba(232,67,147,0.6)',
    'rgba(0,212,170,0.5)',
    'rgba(124,58,237,0.5)',
    'rgba(255,215,0,0.4)',
    'rgba(255,255,255,0.3)'
  ];
  const emojis = ['🌸', '✦', '·', '✿', '❋'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const useEmoji = Math.random() > 0.6;
    const size = Math.random() * 10 + 4;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${useEmoji ? 'auto' : size + 'px'};
      height: ${useEmoji ? 'auto' : size + 'px'};
      background: ${useEmoji ? 'transparent' : colors[Math.floor(Math.random() * colors.length)]};
      font-size: ${useEmoji ? Math.random() * 12 + 8 + 'px' : '0'};
      opacity: 0;
      animation-duration: ${Math.random() * 15 + 10}s;
      animation-delay: ${Math.random() * 12}s;
    `;
    if (useEmoji) p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    field.appendChild(p);
  }
}

function renderProductCard(p) {
  const image = Array.isArray(p.images) && p.images.length ? p.images[0] : '';
  const price = p.base_price || p.basePrice || 0;
  const rating = p.rating || 0;
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${i < Math.round(rating) ? '#FFD700' : 'rgba(255,255,255,0.2)'};">★</span>`
  ).join('');
  return `
    <div class="product-card" data-id="${p.id}" style="cursor:pointer;position:relative;">
      <button class="product-wishlist" aria-label="Add to wishlist" style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.4);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;z-index:2;">♡</button>
      <div style="height:200px;border-radius:12px;overflow:hidden;background:rgba(139,31,110,0.15);display:flex;align-items:center;justify-content:center;margin-bottom:12px;">
        ${image
          ? `<img src="${image}" style="width:100%;height:100%;object-fit:cover;" alt="${p.name}" loading="lazy">`
          : '<span style="font-size:3rem;">🌸</span>'
        }
      </div>
      <div style="font-weight:600;margin-bottom:4px;font-size:0.95rem;">${p.name}</div>
      <div style="font-size:0.78rem;color:rgba(255,255,255,0.4);margin-bottom:8px;">${p.category || ''}</div>
      <div style="display:flex;gap:2px;margin-bottom:10px;" aria-label="${rating} out of 5 stars">${stars}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-weight:700;color:#FFD700;font-size:1rem;">₱${Number(price).toFixed(2)}</div>
        <button class="add-to-cart-btn" data-id="${p.id}" style="background:linear-gradient(135deg,#e879a0,#c026d3);color:white;border:none;padding:6px 14px;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;">+ Cart</button>
      </div>
    </div>`;
}

async function loadFeatured(category = 'all') {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:rgba(255,255,255,0.3);">Loading...</div>';
  try {
    const params = category !== 'all' ? `?category=${encodeURIComponent(category)}&limit=8` : '?limit=8';
    const data = await Api.get(`/products${params}`);
    const products = data.products || data;
    if (!Array.isArray(products) || !products.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:rgba(255,255,255,0.3);">No products found.</div>';
      return;
    }
    grid.innerHTML = products.map(p => renderProductCard(p)).join('');
    grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await Api.post('/cart/items', { productId: btn.dataset.id, qty: 1 });
          const cart = await Api.get('/cart');
          Store.set('cart', cart);
          Store.updateCartCount(cart.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0);
          showToast('Added to cart 🌸', 'success');
        } catch {
          showToast('Could not add to cart. Please try again.', 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });
    });
    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button, a')) return;
        window.location.href = `/catalog.html?id=${card.dataset.id}`;
      });
    });
  } catch (err) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:rgba(255,107,107,0.7);padding:40px;">Failed to load products. Please refresh.</div>';
    console.error('loadFeatured error:', err);
  }
}

function renderReviews() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;
  grid.innerHTML = MOCK_REVIEWS.map(r => `
    <div class="glass-card float-card" style="padding:28px;">
      <div style="display:flex;gap:2px;margin-bottom:14px;" aria-label="${r.rating} out of 5 stars">
        ${Array.from({ length: 5 }, (_, i) =>
          `<span style="color:${i < r.rating ? '#FFD700' : 'rgba(255,255,255,0.2)'};">★</span>`
        ).join('')}
      </div>
      <p style="font-size:0.88rem;line-height:1.7;color:rgba(255,255,255,0.75);margin-bottom:16px;">"${r.body}"</p>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:600;font-size:0.85rem;">${r.name}</span>
        <span class="tag tag-primary">${r.occasion}</span>
      </div>
    </div>`).join('');
}

function animateStats() {
  const targets = {
    statOrders: { end: 12400, suffix: '+' },
    statCities: { end: 180, suffix: '+' },
    statRating: { end: 4.9, suffix: '★', decimal: true },
    statUptime: { end: 99.9, suffix: '%', decimal: true }
  };
  Object.entries(targets).forEach(([id, cfg]) => {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = () => {
      current += (cfg.end - current) * 0.1;
      el.textContent = (cfg.decimal ? current.toFixed(1) : Math.floor(current).toLocaleString()) + cfg.suffix;
      if (Math.abs(current - cfg.end) > 0.05) {
        requestAnimationFrame(step);
      } else {
        el.textContent = (cfg.decimal ? cfg.end.toFixed(1) : cfg.end.toLocaleString()) + cfg.suffix;
      }
    };
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { step(); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
  });
}

function bindCategoryTabs() {
  document.querySelectorAll('#categoryTabs .cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#categoryTabs .cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadFeatured(tab.dataset.cat || 'all');
    });
  });
}

function bindProfilingModal() {
  const modal = document.getElementById('profilingModal');
  if (!modal) return;
  document.getElementById('openProfilingBtn')?.addEventListener('click', () => modal.classList.add('active'));
  document.getElementById('closeProfilingModal')?.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
  document.querySelectorAll('.occasion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.occasion-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  document.getElementById('profilingSubmit')?.addEventListener('click', () => {
    const sel = document.querySelector('.occasion-btn.selected');
    if (!sel) {
      showToast('Please select an occasion first', 'info');
      return;
    }
    Store.setOccasion?.(sel.dataset.occ);
    modal.classList.remove('active');
    window.location.href = `/catalog.html?occasion=${sel.dataset.occ}`;
  });
}

function bindLangSwitcher() {
  const btn = document.getElementById('langBtn');
  const dropdown = document.getElementById('langDropdown');
  if (!btn || !dropdown) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.style.display !== 'none';
    dropdown.style.display = isOpen ? 'none' : 'block';
    btn.setAttribute('aria-expanded', String(!isOpen));
  });
  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('.lang-opt').forEach(opt => {
    opt.addEventListener('click', e => {
      e.stopPropagation();
      Store.setLang?.(opt.dataset.lang);
      const labels = { fil: 'PH', en: 'EN', es: 'ES', ja: 'JA' };
      btn.textContent = `🌐 ${labels[opt.dataset.lang] || opt.dataset.lang.toUpperCase()}`;
      dropdown.style.display = 'none';
      showToast(`Language set to ${opt.textContent.trim()}`, 'info');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  spawnParticles();
  loadFeatured();
  renderReviews();
  animateStats();
  bindCategoryTabs();
  bindProfilingModal();
  bindLangSwitcher();
});