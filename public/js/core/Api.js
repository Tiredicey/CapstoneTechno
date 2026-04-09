(function () {
  'use strict';
  if (window.Api) return;

  const BASE = ((window.BLOOM_CONFIG && window.BLOOM_CONFIG.API_URL) || window.__BLOOM_API_URL || '/api').replace(/\/+$/, '');

  function getSocketUrl() {
    if (window.BLOOM_CONFIG && window.BLOOM_CONFIG.SOCKET_URL) return window.BLOOM_CONFIG.SOCKET_URL;
    if (BASE.startsWith('http')) {
      try {
        const u = new URL(BASE);
        return u.origin;
      } catch {}
    }
    return window.location.origin;
  }

  function getHeaders(extra) {
    const h = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    try {
      const token = (window.Store && window.Store.get('token')) || localStorage.getItem('bloom_token');
      if (token) h['Authorization'] = 'Bearer ' + token;
      const session = window.Store && window.Store.get('sessionId');
      if (session) h['X-Session-Id'] = session;
    } catch {}
    return h;
  }

  function buildUrl(rawPath) {
    const clean = rawPath.replace(/^\/api\//, '/').replace(/^\//, '');
    return BASE + '/' + clean;
  }

  async function request(method, path, body, opts) {
    opts = opts || {};
    const url = buildUrl(path);
    const options = { method, headers: getHeaders(opts.headers || {}) };
    if (body !== undefined && body !== null) options.body = JSON.stringify(body);
    try {
      const res = await fetch(url, options);
      let data;
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
        const err = new Error((data && (data.error || data.message)) || res.statusText || ('HTTP ' + res.status));
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (e) {
      throw e;
    }
  }

  async function upload(path, formData, method) {
    method = method || 'POST';
    const h = {};
    try {
      const token = (window.Store && window.Store.get('token')) || localStorage.getItem('bloom_token');
      if (token) h['Authorization'] = 'Bearer ' + token;
      const session = window.Store && window.Store.get('sessionId');
      if (session) h['X-Session-Id'] = session;
    } catch {}
    const res = await fetch(buildUrl(path), { method, headers: h, body: formData });
    if (!res.ok) {
      const errData = await res.json().catch(function () { return {}; });
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
    baseUrl: BASE
  };

  window.__BloomApi = window.Api;
})();
