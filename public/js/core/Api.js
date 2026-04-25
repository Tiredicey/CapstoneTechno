(function () {
  'use strict';
  if (window.Api) return;

  var BASE = ((window.BLOOM_CONFIG && window.BLOOM_CONFIG.API_URL) || window.__BLOOM_API_URL || '/api').replace(/\/+$/, '');
  var _csrfToken = null;
  var _csrfFetching = false;

  function getSocketUrl() {
    if (window.BLOOM_CONFIG && window.BLOOM_CONFIG.SOCKET_URL) return window.BLOOM_CONFIG.SOCKET_URL;
    if (BASE.startsWith('http')) {
      try {
        var u = new URL(BASE);
        return u.origin;
      } catch {}
    }
    return window.location.origin;
  }

  function getHeaders(extra) {
    var h = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    try {
      var token = (window.Store && window.Store.get('token')) || localStorage.getItem('bloom_token');
      if (token) h['Authorization'] = 'Bearer ' + token;
      var session = window.Store && window.Store.get('sessionId');
      if (session) h['X-Session-Id'] = session;
    } catch {}
    return h;
  }

  function buildUrl(rawPath) {
    var clean = rawPath.replace(/^\/api\//, '/').replace(/^\//, '');
    return BASE + '/' + clean;
  }

  async function ensureCsrf() {
    if (_csrfToken) return _csrfToken;
    if (_csrfFetching) {
      await new Promise(function (r) { setTimeout(r, 200); });
      return _csrfToken;
    }
    _csrfFetching = true;
    try {
      var res = await fetch(BASE + '/auth/csrf-token', { credentials: 'include' });
      var data = await res.json();
      _csrfToken = data.csrfToken || null;
    } catch {}
    _csrfFetching = false;
    return _csrfToken;
  }

  function isRateLimited() {
    if (window.Store) {
      var end = window.Store.get('rateLimitBackoffEnd');
      if (end && Date.now() < end) return true;
    }
    return false;
  }

  async function request(method, path, body, opts) {
    opts = opts || {};

    if (isRateLimited()) {
      var err429 = new Error('Rate limited — please wait');
      err429.status = 429;
      throw err429;
    }

    var url = buildUrl(path);
    var headers = getHeaders(opts.headers || {});

    if (method !== 'GET' && method !== 'HEAD') {
      var csrf = await ensureCsrf();
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }

    var options = { method: method, headers: headers, credentials: 'include' };
    if (body !== undefined && body !== null) options.body = JSON.stringify(body);

    try {
      var res = await fetch(url, options);
      var data;
      try { data = await res.json(); } catch { data = {}; }

      if (!res.ok) {
        if (res.status === 401) {
          try {
            localStorage.removeItem('bloom_token');
            localStorage.removeItem('bloom_user');
            if (window.Store) {
              window.Store.set('token', null);
              window.Store.set('user', null);
            }
          } catch {}
        }

        if (res.status === 429) {
          var retryAfter = res.headers.get('Retry-After');
          var backoffMs = (parseInt(retryAfter, 10) || 60) * 1000;
          var until = Date.now() + backoffMs;
          if (window.Store) window.Store.setRateLimit(until);
        }

        if (res.status === 403 && data && data.error && data.error.indexOf('CSRF') !== -1) {
          _csrfToken = null;
        }

        var errMsg = (data && (data.error || data.message)) || res.statusText || ('HTTP ' + res.status);
        var err = new Error(errMsg);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (e) {
      if (!navigator.onLine && method !== 'GET') {
        _queueOfflineMutation(url, method, body);
      }
      throw e;
    }
  }

  function _queueOfflineMutation(url, method, body) {
    try {
      var req = indexedDB.open('bloom_offline', 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains('offline_queue')) {
          req.result.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function () {
        var db = req.result;
        var tx = db.transaction('offline_queue', 'readwrite');
        tx.objectStore('offline_queue').add({
          url: url,
          method: method,
          body: body,
          timestamp: Date.now()
        });
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(function (reg) {
            if (reg.sync) reg.sync.register('bloom-sync');
          });
        }
      };
    } catch {}
  }

  async function upload(path, formData, method) {
    method = method || 'POST';
    var h = {};
    try {
      var token = (window.Store && window.Store.get('token')) || localStorage.getItem('bloom_token');
      if (token) h['Authorization'] = 'Bearer ' + token;
      var session = window.Store && window.Store.get('sessionId');
      if (session) h['X-Session-Id'] = session;
      var csrf = await ensureCsrf();
      if (csrf) h['X-CSRF-Token'] = csrf;
    } catch {}
    var res = await fetch(buildUrl(path), { method: method, headers: h, body: formData, credentials: 'include' });
    if (!res.ok) {
      var errData = await res.json().catch(function () { return {}; });
      throw new Error(errData.error || 'Upload failed');
    }
    return res.json();
  }

  window.Api = {
    get: function (path, opts) { return request('GET', path, null, opts); },
    post: function (path, body, opts) { return request('POST', path, body, opts); },
    put: function (path, body, opts) { return request('PUT', path, body, opts); },
    patch: function (path, body, opts) { return request('PATCH', path, body, opts); },
    delete: function (path, opts) { return request('DELETE', path, null, opts); },
    upload: upload,
    getSocketUrl: getSocketUrl,
    baseUrl: BASE,
    clearCsrf: function () { _csrfToken = null; }
  };

  window.__BloomApi = window.Api;
})();
