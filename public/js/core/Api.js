(function () {
  'use strict';
  if (window.Api) return;

  var BASE = '/api';

  function getHeaders(extra) {
    var h = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    try {
      var token = (window.Store && window.Store.get('token')) || localStorage.getItem('bloom_token');
      if (token) h['Authorization'] = 'Bearer ' + token;
    } catch {}
    try {
      var session = window.Store && window.Store.get('sessionId');
      if (session) h['X-Session-Id'] = session;
    } catch {}
    return h;
  }

  async function request(method, path, body, opts) {
    opts = opts || {};
    var fullPath = path.startsWith('/api/') ? path.replace('/api/', '/') : path;
    var url = BASE + (fullPath.startsWith('/') ? fullPath : '/' + fullPath);
    var options = {
      method: method,
      headers: getHeaders(opts.headers || {})
    };
    if (body !== undefined && body !== null) {
      options.body = JSON.stringify(body);
    }
    var res;
    try {
      res = await fetch(url, options);
    } catch (networkErr) {
      throw new Error('Network error — check your connection');
    }
    var data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      var msg = (data && (data.error || data.message)) || res.statusText || ('HTTP ' + res.status);
      if (res.status === 401) {
        try {
          localStorage.removeItem('bloom_token');
          localStorage.removeItem('bloom_user');
          if (window.Store) { window.Store.set('token', null); window.Store.set('user', null); }
        } catch {}
      }
      var err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function upload(path, formData) {
    var h = {};
    try {
      var token = (window.Store && window.Store.get('token')) || localStorage.getItem('bloom_token');
      if (token) h['Authorization'] = 'Bearer ' + token;
    } catch {}
    try {
      var session = window.Store && window.Store.get('sessionId');
      if (session) h['X-Session-Id'] = session;
    } catch {}
    var fullPath = path.startsWith('/api/') ? path.replace('/api/', '/') : path;
    var url = BASE + (fullPath.startsWith('/') ? fullPath : '/' + fullPath);
    var res;
    try {
      res = await fetch(url, { method: 'POST', headers: h, body: formData });
    } catch {
      throw new Error('Upload network error');
    }
    if (!res.ok) {
      var errData = await res.json().catch(function () { return {}; });
      throw new Error(errData.error || 'Upload failed');
    }
    return res.json();
  }

  window.Api = {
    get:    function (path, opts)       { return request('GET',    path, null, opts); },
    post:   function (path, body, opts) { return request('POST',   path, body, opts); },
    put:    function (path, body, opts) { return request('PUT',    path, body, opts); },
    patch:  function (path, body, opts) { return request('PATCH',  path, body, opts); },
    delete: function (path, opts)       { return request('DELETE', path, null, opts); },
    upload: upload
  };

  window.__BloomApi = window.Api;

})();