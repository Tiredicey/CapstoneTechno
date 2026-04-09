(function () {
  'use strict';
  if (window.Api) return;
  const BASE = ((window.BLOOM_CONFIG && window.BLOOM_CONFIG.API_URL) || window.__BLOOM_API_URL || '/api').replace(/\/+$/, '');

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
    return BASE + '/' + rawPath.replace(/^\/api\//, '/').replace(/^\//, '');
  }

  async function request(method, path, body, opts = {}) {
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
            if (window.Store) { window.Store.set('token', null); window.Store.set('user', null); }
          } catch {}
        }
        const err = new Error((data && (data.error || data.message)) || res.statusText || ('HTTP ' + res.status));
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (networkErr) {
      throw networkErr;
    }
  }

  async function upload(path, formData) {
    const h = {};
    try {
      const token = (window.Store && window.Store.get('token')) || localStorage.getItem('bloom_token');
      if (token) h['Authorization'] = 'Bearer ' + token;
      const session = window.Store && window.Store.get('sessionId');
      if (session) h['X-Session-Id'] = session;
    } catch {}
    const res = await fetch(buildUrl(path), { method: 'POST', headers: h, body: formData });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Upload failed');
    }
    return res.json();
  }

  window.Api = {
    get: (path, opts) => request('GET', path, null, opts),
    post: (path, body, opts) => request('POST', path, body, opts),
    put: (path, body, opts) => request('PUT', path, body, opts),
    patch: (path, body, opts) => request('PATCH', path, body, opts),
    delete: (path, opts) => request('DELETE', path, null, opts),
    upload,
    getSocketUrl: () => (window.BLOOM_CONFIG && window.BLOOM_CONFIG.SOCKET_URL) || BASE.replace(/\/api$/, '') || window.location.origin,
    baseUrl: BASE
  };
  window.__BloomApi = window.Api;
})();
