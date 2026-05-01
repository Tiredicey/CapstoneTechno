
(function () {
  'use strict';
  if (window.Wishlist) return;

  var STORAGE_KEY = 'bloom_wishlist';
  var _items = [];



  function _load() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      _items = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(_items)) _items = [];
    } catch (e) { _items = []; }
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_items));
    } catch (e) {}
    _emitUpdate();
  }

  function _emitUpdate() {
    if (window.Store) {
      Store.emit('wishlist', _items);
    }
    _updateBadge();
    _renderDrawer();
  }



  function add(product) {
    if (!product || !product.id) return;
    // Deduplicate
    if (_items.some(function (p) { return String(p.id) === String(product.id); })) return;
    _items.unshift({
      id: product.id,
      name: product.name || product.product_name || 'Product',
      image: _resolveImage(product),
      price: product.base_price || product.price || 0,
      category: product.category || '',
      addedAt: Date.now()
    });
    _save();
  
    _serverAdd(product.id);
  }

  function remove(productId) {
    var before = _items.length;
    _items = _items.filter(function (p) { return String(p.id) !== String(productId); });
    if (_items.length !== before) {
      _save();
      _serverRemove(productId);
    }
  }

  function toggle(product) {
    if (has(product.id)) {
      remove(product.id);
      return false;
    } else {
      add(product);
      return true;
    }
  }

  function has(productId) {
    return _items.some(function (p) { return String(p.id) === String(productId); });
  }

  function getAll() {
    return _items.slice();
  }

  function count() {
    return _items.length;
  }

  function clear() {
    _items = [];
    _save();
  }



  async function _serverAdd(productId) {
    if (!window.Store || !Store.get('user') || !window.Api) return;
    try {
      await Api.post('/products/' + productId + '/wishlist', {});
    } catch (e) { /* silent — localStorage is primary */ }
  }

  async function _serverRemove(productId) {
    if (!window.Store || !Store.get('user') || !window.Api) return;
    try {
      await Api.delete('/products/' + productId + '/wishlist');
    } catch (e) { /* silent */ }
  }

  async function syncFromServer() {
    if (!window.Store || !Store.get('user') || !window.Api) return;
    try {
      var data = await Api.get('/wishlist');
      var serverItems = Array.isArray(data) ? data : (data.items || []);
      if (!serverItems.length) return;
      // Merge server items into local (server wins for items not locally present)
      var localIds = new Set(_items.map(function (p) { return String(p.id); }));
      serverItems.forEach(function (sp) {
        if (!localIds.has(String(sp.product_id || sp.id))) {
          _items.push({
            id: sp.product_id || sp.id,
            name: sp.name || sp.product_name || 'Product',
            image: sp.image || '',
            price: sp.price || sp.base_price || 0,
            category: sp.category || '',
            addedAt: sp.added_at ? new Date(sp.added_at).getTime() : Date.now()
          });
        }
      });
      _save();
    } catch (e) { /* server not available, use local */ }
  }



  function _resolveImage(product) {
    var imgs = product.images || product.image || '';
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch (e) { return imgs; }
    }
    if (Array.isArray(imgs) && imgs.length) {
      var flat = imgs.flat(Infinity);
      return typeof flat[0] === 'string' ? flat[0] : '';
    }
    return '';
  }



  function _updateBadge() {
    var badge = document.getElementById('wlCount');
    if (badge) {
      badge.textContent = _items.length;
      badge.style.display = _items.length > 0 ? 'inline-flex' : 'none';
    }
  }

  /* ─── Drawer Rendering ─── */

  function _renderDrawer() {
    var body = document.querySelector('.wl-drawer-body');
    if (!body) return;

    if (!_items.length) {
      body.innerHTML =
        '<div class="wl-empty">' +
        '<div class="wl-empty-ico">♡</div>' +
        '<div style="font-weight:600;margin-bottom:6px;">Your wishlist is empty</div>' +
        '<div style="font-size:.82rem;color:rgba(255,255,255,.5)">Save items you love by tapping the heart icon</div>' +
        '</div>';
      return;
    }

    var fmt = function (n) { return '₱' + Number(n || 0).toFixed(2); };
    body.innerHTML = _items.map(function (p) {
      var safeName = String(p.name || '').replace(/[<>&"']/g, '');
      var safeImg = String(p.image || '').replace(/[<>"]/g, '');
      return '<div class="wl-row" data-id="' + p.id + '">' +
        '<div class="wl-row-img">' +
        (safeImg ? '<img src="' + safeImg + '" alt="' + safeName + '" loading="lazy" onerror="this.onerror=null;this.style.display=\'none\'">' : '') +
        '</div>' +
        '<div class="wl-row-body">' +
        '<div class="wl-row-name">' + safeName + '</div>' +
        '<div class="wl-row-price">' + fmt(p.price) + '</div>' +
        '</div>' +
        '<button class="wl-row-x" data-remove="' + p.id + '" aria-label="Remove ' + safeName + ' from wishlist">✕</button>' +
        '</div>';
    }).join('');

  
    body.querySelectorAll('.wl-row-x').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        remove(btn.dataset.remove);
      });
    });

  
    body.querySelectorAll('.wl-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('.wl-row-x')) return;
        window.location.href = '/catalog.html?id=' + row.dataset.id;
      });
    });
  }



  function openDrawer() {
    var drawer = document.querySelector('.wl-drawer');
    if (drawer) {
      drawer.classList.add('open');
      document.body.classList.add('modal-open');
      _renderDrawer();
    }
  }

  function closeDrawer() {
    var drawer = document.querySelector('.wl-drawer');
    if (drawer) {
      drawer.classList.remove('open');
      document.body.classList.remove('modal-open');
    }
  }



  function init() {
    _load();
    _updateBadge();


    var openBtn = document.getElementById('wlBtnNav');
    var closeBtn = document.querySelector('.wl-drawer-cls');

    if (openBtn) openBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);


    if (window.Store) {
      Store.on('user', function (user) {
        if (user) syncFromServer();
      });
   
      if (Store.get('user')) syncFromServer();
    }
  }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Wishlist = {
    add: add,
    remove: remove,
    toggle: toggle,
    has: has,
    getAll: getAll,
    count: count,
    clear: clear,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    syncFromServer: syncFromServer
  };
  window.__BloomWishlist = window.Wishlist;
})();
