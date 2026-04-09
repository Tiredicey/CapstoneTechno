(function () {
  'use strict';
  if (window.Store) return;

  const state = {
    user: null,
    cart: null,
    cartCount: 0,
    sessionId: null,
    lang: 'en',
    occasionProfile: null
  };

  const listeners = {};

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
    if (!token) {
      try {
        const localCart = JSON.parse(localStorage.getItem('bloom_cart') || '[]');
        const count = localCart.reduce(function (s, i) { return s + (i.qty || i.quantity || 1); }, 0);
        state.cartCount = count;
      } catch {}
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

  var Store = {
    on: on,
    emit: emit,
    set: set,
    get: get,
    init: init,
    setLang: setLang,
    setOccasion: setOccasion,
    updateCartCount: updateCartCount
  };

  Store.init();
  window.Store = Store;
  window.__BloomStore = Store;

})();