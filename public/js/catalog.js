var Api = window.Api;
var Store = window.Store;

let currentPage = 0;
const PAGE_SIZE = 12;
let currentCat = 'all';
let searchTimer = null;
let currentSearch = '';
let currentSort = 'rating';
let currentTag = '';

function fmt(n) {
  return '₱' + Number(n || 0).toFixed(2);
}

function showToast(msg, type) {
  type = type || 'info';
  var existing = document.getElementById('catalog-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'catalog-toast';
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:' +
    (type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#6366f1') +
    ';color:white;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
  document.body.appendChild(toast);
  setTimeout(function () { toast.remove(); }, 3500);
}

window.showToast = showToast;

function resolveImage(raw) {
  if (!raw) return '';
  var imgs = raw;
  if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch (e) { return raw; } }
  if (!Array.isArray(imgs) || !imgs.length) return '';
  var img = imgs.flat(Infinity)[0];
  if (typeof img !== 'string') return '';
  var clean = img.replace(/[\[\]"\\]/g, '/');
  var parts = clean.split('/');
  var filename = parts[parts.length - 1];
  return filename && filename !== 'null' ? '/uploads/products/' + filename : '';
}

function renderProductCard(p) {
  var image = resolveImage(p.images);
  var price = p.base_price || p.basePrice || 0;
  var stars = Array.from({ length: 5 }, function (_, i) {
    return '<span style="color:' + (i < Math.round(p.rating || 0) ? '#FFD700' : 'rgba(255,255,255,0.2)') + ';">★</span>';
  }).join('');
  return '<div class="product-card" data-id="' + p.id + '" style="cursor:pointer;position:relative;">' +
    '<button class="product-wishlist" style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.4);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;z-index:2;">♡</button>' +
    '<div style="height:200px;border-radius:12px;overflow:hidden;background:rgba(139,31,110,0.15);display:flex;align-items:center;justify-content:center;margin-bottom:12px;">' +
    (image ? '<img src="' + image + '" style="width:100%;height:100%;object-fit:cover;" alt="' + p.name + '" loading="lazy">' : '<span style="font-size:3rem;">🌸</span>') +
    '</div>' +
    '<div style="font-weight:600;margin-bottom:4px;font-size:0.95rem;">' + p.name + '</div>' +
    '<div style="font-size:0.78rem;color:rgba(255,255,255,0.4);margin-bottom:8px;">' + (p.category || '') + '</div>' +
    '<div style="display:flex;gap:2px;margin-bottom:10px;">' + stars + '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
    '<div style="font-weight:700;color:#FFD700;font-size:1rem;">' + fmt(price) + '</div>' +
    '<button class="add-to-cart-btn" data-id="' + p.id + '" style="background:linear-gradient(135deg,#e879a0,#c026d3);color:white;border:none;padding:6px 14px;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;">+ Cart</button>' +
    '</div></div>';
}

async function loadProducts(append) {
  append = append || false;
  var grid = document.getElementById('productsGrid');
  if (!grid) return;
  if (!append) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:rgba(255,255,255,0.3);">Loading arrangements...</div>';
    currentPage = 0;
  }
  var params = new URLSearchParams({ limit: PAGE_SIZE, offset: currentPage * PAGE_SIZE });
  if (currentCat !== 'all') params.set('category', currentCat);
  if (currentSearch) params.set('search', currentSearch);
  if (currentTag) params.set('tags', currentTag);
  try {
    var data = await Api.get('/products?' + params.toString());
    var products = data.products || data;
    if (!Array.isArray(products)) products = [];
    if (currentSort === 'price_asc') products.sort(function (a, b) { return (a.base_price || 0) - (b.base_price || 0); });
    else if (currentSort === 'price_desc') products.sort(function (a, b) { return (b.base_price || 0) - (a.base_price || 0); });
    if (!append) grid.innerHTML = '';
    if (!products.length && !append) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:rgba(255,255,255,0.4);">No arrangements found.</div>';
    } else {
      grid.insertAdjacentHTML('beforeend', products.map(renderProductCard).join(''));
      bindCardEvents(grid);
    }
    renderPagination(products.length);
  } catch (err) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:rgba(255,107,107,0.7);padding:60px;">Failed to load products.</div>';
    console.error('loadProducts error:', err);
  }
}

function bindCardEvents(container) {
  container.querySelectorAll('.add-to-cart-btn:not([data-bound])').forEach(function (btn) {
    btn.dataset.bound = '1';
    btn.addEventListener('click', async function (e) {
      e.stopPropagation();
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await Api.post('/cart/items', { productId: btn.dataset.id, qty: 1 });
        var updated = await Api.get('/cart');
        Store.set('cart', updated);
        var count = (updated.items || []).reduce(function (s, i) { return s + (i.qty || 1); }, 0);
        Store.updateCartCount(count);
        showToast('Added to cart 🌸', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to add to cart', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '+ Cart';
      }
    });
  });

  container.querySelectorAll('.product-card:not([data-bound])').forEach(function (card) {
    card.dataset.bound = '1';
    card.addEventListener('click', async function (e) {
      if (e.target.closest('button, a')) return;
      await openProductModal(card.dataset.id);
    });
  });

  container.querySelectorAll('.product-wishlist:not([data-bound])').forEach(function (btn) {
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      btn.classList.toggle('active');
      btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
      showToast(btn.classList.contains('active') ? 'Saved to wishlist ♥' : 'Removed from wishlist', 'info');
    });
  });
}

async function openProductModal(id) {
  var modal = document.getElementById('productModal');
  var nameEl = document.getElementById('modalProductName');
  var body = document.getElementById('modalProductBody');
  if (!modal || !body) return;
  modal.classList.add('active');
  body.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.3);">Loading...</div>';
  try {
    var p = await Api.get('/products/' + id);
    if (nameEl) nameEl.textContent = p.name;
    var stars = Array.from({ length: 5 }, function (_, i) {
      return '<span style="color:' + (i < Math.round(p.rating || 0) ? '#FFD700' : 'rgba(255,255,255,0.2)') + ';">★</span>';
    }).join('');
    var price = p.base_price || p.basePrice || 0;
    var modalImg = resolveImage(p.images);
    body.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">' +
      '<div style="border-radius:16px;overflow:hidden;background:rgba(139,31,110,0.15);height:280px;display:flex;align-items:center;justify-content:center;font-size:5rem;">' +
      (modalImg ? '<img src="' + modalImg + '" style="width:100%;height:100%;object-fit:cover;" alt="' + p.name + '">' : '🌸') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;">' +
      '<div style="font-size:0.75rem;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;">' + (p.category || '') + '</div>' +
      '<div style="font-size:2rem;font-weight:700;color:#FFD700;">' + fmt(price) + '</div>' +
      '<div style="display:flex;gap:4px;">' + stars + '<span style="font-size:0.8rem;color:rgba(255,255,255,0.4);margin-left:6px;">(' + (p.review_count || 0) + ' reviews)</span></div>' +
      '<p style="font-size:0.88rem;color:rgba(255,255,255,0.65);line-height:1.6;">' + (p.description || '') + '</p>' +
      '<div style="font-size:0.78rem;color:rgba(255,255,255,0.4);">⏱ ' + (p.lead_time_days || 2) + '-day lead time · ' +
      (p.inventory > 0 ? p.inventory + ' in stock' : '<span style="color:#FF6B6B">Low stock</span>') + '</div>' +
      '<div style="display:flex;gap:10px;margin-top:auto;">' +
      (p.customizable ? '<a href="/customize.html?id=' + p.id + '" class="btn btn-ghost" style="flex:1;text-align:center;">✏️ Customize</a>' : '') +
      '<button class="modal-add-cart" data-id="' + p.id + '" style="flex:2;background:linear-gradient(135deg,#e879a0,#c026d3);color:white;border:none;padding:12px 20px;border-radius:12px;font-weight:600;cursor:pointer;">🛒 Add to Cart</button>' +
      '</div></div></div>' +
      '<div id="modalReviews" style="margin-top:24px;display:flex;flex-direction:column;gap:12px;"></div>';

    body.querySelector('.modal-add-cart').addEventListener('click', async function () {
      try {
        await Api.post('/cart/items', { productId: p.id, qty: 1 });
        var cart = await Api.get('/cart');
        Store.set('cart', cart);
        var count = (cart.items || []).reduce(function (s, i) { return s + (i.qty || 1); }, 0);
        Store.updateCartCount(count);
        showToast('Added to cart 🌸', 'success');
        modal.classList.remove('active');
      } catch (e) {
        showToast(e.message || 'Failed to add to cart', 'error');
      }
    });

    try {
      var reviews = await Api.get('/products/' + id + '/reviews?limit=3');
      var rEl = body.querySelector('#modalReviews');
      if (rEl && Array.isArray(reviews) && reviews.length) {
        rEl.innerHTML = reviews.map(function (r) {
          return '<div style="padding:14px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);">' +
            '<div style="display:flex;gap:2px;margin-bottom:6px;">' +
            Array.from({ length: 5 }, function (_, i) {
              return '<span style="color:' + (i < r.rating ? '#FFD700' : 'rgba(255,255,255,0.2)') + ';">★</span>';
            }).join('') +
            '</div>' +
            '<p style="font-size:0.83rem;color:rgba(255,255,255,0.65);line-height:1.5;">' + (r.body || '') + '</p>' +
            '<div style="font-size:0.75rem;color:rgba(255,255,255,0.35);margin-top:8px;">' + (r.user_name || 'Customer') + '</div>' +
            '</div>';
        }).join('');
      }
    } catch (_) {}
  } catch (err) {
    body.innerHTML = '<div style="color:rgba(255,107,107,0.7);padding:20px;">Failed to load product details.</div>';
    console.error('openProductModal error:', err);
  }
}

async function loadRecs() {
  var scroll = document.getElementById('recScroll');
  if (!scroll) return;
  try {
    var data = await Api.get('/products/recommendations');
    var recs = data.products || data;
    if (!Array.isArray(recs) || !recs.length) return;
    var emojiMap = { fresh: '🌷', dried: '🌿', branded: '🏢', bundled: '🎁', merchandise: '✨', bouquets: '💐', arrangements: '🌸' };
    scroll.innerHTML = recs.map(function (p) {
      return '<div class="rec-chip" data-id="' + p.id + '" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:12px;min-width:180px;flex-shrink:0;">' +
        '<span style="font-size:1.4rem;">' + (emojiMap[p.category] || '🌸') + '</span>' +
        '<div><div style="font-weight:600;font-size:0.82rem;">' + p.name + '</div>' +
        '<div style="font-size:0.72rem;color:rgba(255,255,255,0.4);">' + fmt(p.base_price || 0) + '</div></div></div>';
    }).join('');
    scroll.querySelectorAll('.rec-chip').forEach(function (chip) {
      chip.addEventListener('click', function () { openProductModal(chip.dataset.id); });
    });
  } catch (_) {}
}

function renderPagination(count) {
  var pg = document.getElementById('pagination');
  if (!pg) return;
  pg.innerHTML = '';
  if (currentPage > 0) {
    var prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.textContent = '←';
    prev.addEventListener('click', function () { currentPage--; loadProducts(); });
    pg.appendChild(prev);
  }
  for (var i = Math.max(0, currentPage - 2); i <= currentPage + 2; i++) {
    (function (page) {
      var b = document.createElement('button');
      b.className = 'page-btn' + (page === currentPage ? ' active' : '');
      b.textContent = page + 1;
      b.addEventListener('click', function () { currentPage = page; loadProducts(); });
      pg.appendChild(b);
    })(i);
  }
  if (count >= PAGE_SIZE) {
    var next = document.createElement('button');
    next.className = 'page-btn';
    next.textContent = '→';
    next.addEventListener('click', function () { currentPage++; loadProducts(); });
    pg.appendChild(next);
  }
}

document.getElementById('searchInput') && document.getElementById('searchInput').addEventListener('input', function (e) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function () { currentSearch = e.target.value.trim(); currentPage = 0; loadProducts(); }, 380);
});

document.getElementById('sortSelect') && document.getElementById('sortSelect').addEventListener('change', function (e) {
  currentSort = e.target.value; loadProducts();
});

document.getElementById('tagFilter') && document.getElementById('tagFilter').addEventListener('change', function (e) {
  currentTag = e.target.value; loadProducts();
});

document.querySelectorAll('#catTabs .cat-tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('#catTabs .cat-tab').forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');
    currentCat = tab.dataset.cat || 'all';
    currentPage = 0;
    loadProducts();
  });
});

document.getElementById('closeProductModal') && document.getElementById('closeProductModal').addEventListener('click', function () {
  var m = document.getElementById('productModal');
  if (m) m.classList.remove('active');
});

document.getElementById('productModal') && document.getElementById('productModal').addEventListener('click', function (e) {
  if (e.target === document.getElementById('productModal')) {
    document.getElementById('productModal').classList.remove('active');
  }
});

var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('cat')) {
  currentCat = urlParams.get('cat');
  var catTab = document.querySelector('[data-cat="' + currentCat + '"]');
  if (catTab) catTab.click();
}
if (urlParams.get('occasion')) currentTag = urlParams.get('occasion');
if (urlParams.get('id')) openProductModal(urlParams.get('id'));

loadProducts();
loadRecs();

Store.on('catalog_update', function (data) {
  if (data && data.action === 'deleted') {
    var card = document.querySelector('.product-card[data-id="' + data.id + '"]');
    if (card) card.remove();
  } else {
    loadProducts();
    loadRecs();
  }
});

Store.on('promo_update', function () {
  showToast('New promotions available! 🎉', 'info');
});
