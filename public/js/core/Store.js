(function () {
  'use strict';
  if (window.Store) return;

  const state = {
    user: null,
    token: null,
    cart: null,
    cartCount: 0,
    sessionId: null,
    lang: 'en',
    occasionProfile: null,
    cartId: null
  };

  const listeners = {};
  let _socket = null;

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
    }
    if (key === 'user' && value) {
      try { localStorage.setItem('bloom_user', JSON.stringify(value)); } catch {}
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
        occasionProfile: state.occasionProfile
      }));
    } catch {}
  }

  function _joinUserRoom() {
    if (!_socket) return;
    const token = state.token || localStorage.getItem('bloom_token');
    if (token) _socket.emit('join_user', token);
  }

  function initSocket() {
    if (typeof io === 'undefined') return;
    if (_socket) return _socket;

    const socketUrl = (window.BLOOM_CONFIG && window.BLOOM_CONFIG.SOCKET_URL)
      || window.location.origin;

    _socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    _socket.on('connect', function () {
      _joinUserRoom();
      const token = state.token || localStorage.getItem('bloom_token');
      if (token && _isAdmin()) {
        _socket.emit('join_admin', token);
      }
    });

    _socket.on('catalog_update', function (data) {
      emit('catalog_update', data);
    });

    _socket.on('banner_update', function (data) {
      emit('banner_update', data);
    });

    _socket.on('promo_update', function (data) {
      emit('promo_update', data);
    });

    _socket.on('content_update', function (data) {
      emit('content_update', data);
    });

    _socket.on('faq_update', function (data) {
      emit('faq_update', data);
    });

    _socket.on('order_update', function (data) {
      emit('order_update', data);
    });

    _socket.on('notification', function (data) {
      emit('notification', data);
      _showNotificationToast(data);
    });

    _socket.on('user_updated', function (data) {
      const current = state.user;
      if (current) {
        const updated = Object.assign({}, current, data);
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
      window.location.href = '/?reason=account_removed';
    });

    _socket.on('support_message', function (data) {
      emit('support_message', data);
    });

    window.__BloomSocket = _socket;
    return _socket;
  }

  function _isAdmin() {
    const user = state.user;
    if (user && user.role === 'admin') return true;
    try {
      const stored = JSON.parse(localStorage.getItem('bloom_user') || 'null');
      return stored?.role === 'admin';
    } catch { return false; }
  }

  function _showNotificationToast(data) {
    if (!data || !data.title) return;
    const existing = document.getElementById('_storeNotifToast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = '_storeNotifToast';
    el.style.cssText = 'position:fixed;top:24px;right:24px;z-index:999999;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:14px 20px;border-radius:14px;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:320px;cursor:pointer;';
    el.innerHTML = '<div style="font-size:0.95rem;margin-bottom:2px;">' + (data.title || '') + '</div>' +
      '<div style="font-size:0.78rem;opacity:0.8;">' + (data.body || data.message || '') + '</div>';
    el.addEventListener('click', function () { el.remove(); });
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 5000);
  }

  function init() {
    try {
      const stored = localStorage.getItem('bloom_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.sessionId) state.sessionId = parsed.sessionId;
        if (parsed.lang) state.lang = parsed.lang;
        if (parsed.occasionProfile) state.occasionProfile = parsed.occasionProfile;
      }
    } catch {}

    if (!state.sessionId) {
      state.sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
      _persist();
    }

    const token = localStorage.getItem('bloom_token');
    if (token) {
      state.token = token;
    } else {
      try {
        const localCart = JSON.parse(localStorage.getItem('bloom_cart') || '[]');
        state.cartCount = localCart.reduce(function (s, i) { return s + (i.qty || i.quantity || 1); }, 0);
      } catch {}
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('bloom_user') || 'null');
      if (storedUser) state.user = storedUser;
    } catch {}

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSocket);
    } else {
      initSocket();
    }
  }

  function setLang(lang) {
    set('lang', lang);
    _persist();
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
  }

  function joinOrderRoom(orderId) {
    if (_socket && orderId) _socket.emit('join_order', orderId);
  }

  function joinSupportRoom(ticketId) {
    if (_socket && ticketId) _socket.emit('join_support', ticketId);
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
    joinOrderRoom: joinOrderRoom,
    joinSupportRoom: joinSupportRoom,
    getSocket: function () { return _socket; },
    initSocket: initSocket
  };

  Store.init();
  window.Store = Store;
  window.__BloomStore = Store;
})();
