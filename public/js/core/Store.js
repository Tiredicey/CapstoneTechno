(function () {
  'use strict';
  if (window.Store) return;

  var state = {
    user: null,
    token: null,
    cart: null,
    cartCount: 0,
    sessionId: null,
    lang: 'en',
    occasionProfile: null,
    cartId: null,
    theme: 'dark',
    recentlyViewed: [],
    hasSeenExitIntent: false,
    rateLimitBackoffEnd: 0
  };

  var listeners = {};
  var _socket = null;
  var _bc = null;

  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
    return function () {
      listeners[event] = listeners[event].filter(function (f) { return f !== cb; });
    };
  }

  function emit(event, data) {
    (listeners[event] || []).forEach(function (cb) {
      try { cb(data); } catch (e) { console.warn('[Store] listener error:', e); }
    });
  }

  function set(key, value) {
    state[key] = value;
    emit(key, value);
    emit('change', state);
    if (key === 'token') {
      if (value) {
        localStorage.setItem('bloom_token', value);
        _joinUserRoom();
      } else {
        localStorage.removeItem('bloom_token');
      }
      _broadcast({ type: 'token', value: value });
    }
    if (key === 'user') {
      if (value) {
        try { localStorage.setItem('bloom_user', JSON.stringify(value)); } catch {}
      } else {
        localStorage.removeItem('bloom_user');
      }
      _broadcast({ type: 'user', value: value });
    }
    if (key === 'cartCount') {
      _broadcast({ type: 'cartCount', value: value });
    }
    if (key === 'theme') {
      try { localStorage.setItem('bloom_theme', value); } catch {}
      _applyTheme(value);
      _broadcast({ type: 'theme', value: value });
    }
  }

  function get(key) {
    return key ? state[key] : Object.assign({}, state);
  }

  function _persist() {
    try {
      localStorage.setItem('bloom_session', JSON.stringify({
        sessionId: state.sessionId,
        lang: state.lang,
        occasionProfile: state.occasionProfile,
        hasSeenExitIntent: state.hasSeenExitIntent
      }));
    } catch {}
  }

  function _applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function _initBroadcastChannel() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      _bc = new BroadcastChannel('bloom_sync');
      _bc.onmessage = function (e) {
        var msg = e.data;
        if (!msg || !msg.type) return;
        if (msg.type === 'token') {
          state.token = msg.value;
          if (msg.value) localStorage.setItem('bloom_token', msg.value);
          else localStorage.removeItem('bloom_token');
          emit('token', msg.value);
        }
        if (msg.type === 'user') {
          state.user = msg.value;
          if (msg.value) try { localStorage.setItem('bloom_user', JSON.stringify(msg.value)); } catch {}
          else localStorage.removeItem('bloom_user');
          emit('user', msg.value);
        }
        if (msg.type === 'cartCount') {
          state.cartCount = msg.value;
          emit('cartCount', msg.value);
          var badge = document.getElementById('cartBadge');
          if (badge) {
            badge.textContent = msg.value;
            badge.style.display = msg.value > 0 ? 'inline-flex' : 'none';
          }
        }
        if (msg.type === 'theme') {
          state.theme = msg.value;
          _applyTheme(msg.value);
          emit('theme', msg.value);
        }
        if (msg.type === 'logout') {
          state.token = null;
          state.user = null;
          localStorage.removeItem('bloom_token');
          localStorage.removeItem('bloom_user');
          emit('user', null);
          emit('token', null);
        }
      };
    } catch {}
  }

  function _broadcast(msg) {
    if (_bc) {
      try { _bc.postMessage(msg); } catch {}
    }
  }

  function _joinUserRoom() {
    if (!_socket) return;
    var token = state.token || localStorage.getItem('bloom_token');
    if (token) _socket.emit('join_user', token);
  }

  function initSocket() {
    if (typeof io === 'undefined') return;
    if (_socket) return _socket;

    var socketUrl = (window.BLOOM_CONFIG && window.BLOOM_CONFIG.SOCKET_URL)
      || window.location.origin;

    _socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    _socket.on('connect', function () {
      _joinUserRoom();
      var token = state.token || localStorage.getItem('bloom_token');
      if (token && _isAdmin()) {
        _socket.emit('join_admin', token);
      }
    });

    _socket.on('catalog_update', function (data) { emit('catalog_update', data); });
    _socket.on('banner_update', function (data) { emit('banner_update', data); });
    _socket.on('promo_update', function (data) { emit('promo_update', data); });
    _socket.on('content_update', function (data) { emit('content_update', data); });
    _socket.on('faq_update', function (data) { emit('faq_update', data); });
    _socket.on('order_update', function (data) { emit('order_update', data); });

    _socket.on('notification', function (data) {
      emit('notification', data);
      _showNotificationToast(data);
    });

    _socket.on('user_updated', function (data) {
      var current = state.user;
      if (current) {
        var updated = Object.assign({}, current, data);
        state.user = updated;
        try { localStorage.setItem('bloom_user', JSON.stringify(updated)); } catch {}
        emit('user', updated);
        emit('change', state);
      }
    });

    _socket.on('account_deleted', function () {
      localStorage.removeItem('bloom_token');
      localStorage.removeItem('bloom_user');
      state.token = null;
      state.user = null;
      emit('user', null);
      emit('account_deleted', {});
      _broadcast({ type: 'logout' });
      window.location.href = '/?reason=account_removed';
    });

    _socket.on('support_message', function (data) {
      emit('support_message', data);
    });

    window.__BloomSocket = _socket;
    return _socket;
  }

  function _isAdmin() {
    var user = state.user;
    if (user && user.role === 'admin') return true;
    try {
      var stored = JSON.parse(localStorage.getItem('bloom_user') || 'null');
      return stored && stored.role === 'admin';
    } catch { return false; }
  }

  function _showNotificationToast(data) {
    if (!data || !data.title) return;
    var existing = document.getElementById('_storeNotifToast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = '_storeNotifToast';
    el.style.cssText = 'position:fixed;top:24px;right:24px;z-index:999999;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:14px 20px;border-radius:14px;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:320px;cursor:pointer;';
    var safeTitle = String(data.title || '').replace(/[<>&"']/g, '');
    var safeBody = String(data.body || data.message || '').replace(/[<>&"']/g, '');
    el.innerHTML = '<div style="font-size:0.95rem;margin-bottom:2px;">' + safeTitle + '</div>' +
      '<div style="font-size:0.78rem;opacity:0.8;">' + safeBody + '</div>';
    el.addEventListener('click', function () { el.remove(); });
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 5000);
  }

  function init() {
    _initBroadcastChannel();

    try {
      var stored = localStorage.getItem('bloom_session');
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed.sessionId) state.sessionId = parsed.sessionId;
        if (parsed.lang) state.lang = parsed.lang;
        if (parsed.occasionProfile) state.occasionProfile = parsed.occasionProfile;
        if (parsed.hasSeenExitIntent) state.hasSeenExitIntent = true;
      }
    } catch {}

    if (!state.sessionId) {
      state.sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
      _persist();
    }

    var token = localStorage.getItem('bloom_token');
    if (token) {
      state.token = token;
    } else {
      try {
        var localCart = JSON.parse(localStorage.getItem('bloom_cart') || '[]');
        state.cartCount = localCart.reduce(function (s, i) { return s + (i.qty || i.quantity || 1); }, 0);
      } catch {}
    }

    try {
      var storedUser = JSON.parse(localStorage.getItem('bloom_user') || 'null');
      if (storedUser) state.user = storedUser;
    } catch {}

    try {
      state.theme = localStorage.getItem('bloom_theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    } catch { state.theme = 'dark'; }
    _applyTheme(state.theme);

    try {
      state.recentlyViewed = JSON.parse(localStorage.getItem('bloom_recently_viewed') || '[]');
    } catch { state.recentlyViewed = []; }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSocket);
    } else {
      initSocket();
    }
  }

  function setLang(lang) {
    set('lang', lang);
    _persist();
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar' || lang === 'he') ? 'rtl' : 'ltr';
    emit('langChange', lang);
  }

  function setOccasion(occ) {
    set('occasionProfile', occ);
    _persist();
  }

  function updateCartCount(count) {
    var n = Number(count) || 0;
    state.cartCount = n;
    emit('cartCount', n);
    var badge = document.getElementById('cartBadge');
    if (badge) {
      badge.textContent = n;
      badge.style.display = n > 0 ? 'inline-flex' : 'none';
    }
    _broadcast({ type: 'cartCount', value: n });
  }

  function toggleTheme() {
    set('theme', state.theme === 'dark' ? 'light' : 'dark');
  }

  function addRecentlyViewed(product) {
    if (!product || !product.id) return;
    state.recentlyViewed = state.recentlyViewed.filter(function (p) { return p.id !== product.id; });
    state.recentlyViewed.unshift({
      id: product.id,
      name: product.name,
      image: (product.images && product.images[0]) || product.image || '',
      price: product.base_price || product.price || 0
    });
    if (state.recentlyViewed.length > 10) state.recentlyViewed = state.recentlyViewed.slice(0, 10);
    try { localStorage.setItem('bloom_recently_viewed', JSON.stringify(state.recentlyViewed)); } catch {}
    emit('recentlyViewed', state.recentlyViewed);
  }

  function markExitIntent() {
    state.hasSeenExitIntent = true;
    _persist();
  }

  function setRateLimit(until) {
    state.rateLimitBackoffEnd = until;
    emit('rateLimit', until);
  }

  function joinOrderRoom(orderId) {
    if (_socket && orderId) _socket.emit('join_order', orderId);
  }

  function joinSupportRoom(ticketId) {
    if (_socket && ticketId) _socket.emit('join_support', ticketId);
  }

  function logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('bloom_token');
    localStorage.removeItem('bloom_user');
    emit('user', null);
    emit('token', null);
    _broadcast({ type: 'logout' });
    try { fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
  }

  var Store = {
    on: on,
    emit: emit,
    set: set,
    get: get,
    init: init,
    setLang: setLang,
    setOccasion: setOccasion,
    updateCartCount: updateCartCount,
    toggleTheme: toggleTheme,
    addRecentlyViewed: addRecentlyViewed,
    markExitIntent: markExitIntent,
    setRateLimit: setRateLimit,
    joinOrderRoom: joinOrderRoom,
    joinSupportRoom: joinSupportRoom,
    logout: logout,
    getSocket: function () { return _socket; },
    initSocket: initSocket
  };

  Store.init();
  window.Store = Store;
  window.__BloomStore = Store;
})();
