(function () {
  'use strict';
  if (window.__BloomAuth) return;

  var _previousFocus = null;

  function trapFocus(container) {
    var focusable = container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    container._trapHandler = function (e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    container.addEventListener('keydown', container._trapHandler);
    first.focus();
  }

  function releaseFocus(container) {
    if (container._trapHandler) {
      container.removeEventListener('keydown', container._trapHandler);
      delete container._trapHandler;
    }
    if (_previousFocus && _previousFocus.focus) {
      _previousFocus.focus();
      _previousFocus = null;
    }
  }

  function openModal(modalId) {
    var id = modalId || 'authMod';
    var m = document.getElementById(id);
    if (!m) return;
    _previousFocus = document.activeElement;
    m.classList.add('active');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    var inner = m.querySelector('.modal');
    if (inner) trapFocus(inner);
    m._escHandler = function (e) { if (e.key === 'Escape') closeModal(id); };
    document.addEventListener('keydown', m._escHandler);
  }

  function closeModal(modalId) {
    var id = modalId || 'authMod';
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('active');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    var inner = m.querySelector('.modal');
    if (inner) releaseFocus(inner);
    if (m._escHandler) {
      document.removeEventListener('keydown', m._escHandler);
      delete m._escHandler;
    }
  }

  function setAuthBtn(user) {
    var btn = document.getElementById('authBtn');
    if (!btn) return;
    if (user) {
      btn.textContent = user.name ? user.name.split(' ')[0] : 'Account';
      btn.onclick = function () {
        window.location.href = '/account.html';
      };
    } else {
      btn.textContent = 'Sign In';
      btn.onclick = function () { openModal('authMod'); };
    }
  }

  async function checkAuth() {
    var token = (window.Store && window.Store.get('token')) || localStorage.getItem('bloom_token');
    if (!token) { setAuthBtn(null); return; }
    try {
      var user = await Api.get('/auth/me');
      Store.set('user', user);
      setAuthBtn(user);
    } catch {
      Store.set('token', null);
      Store.set('user', null);
      setAuthBtn(null);
    }
  }

  function bindAuthTabs() {
    var tabs = document.querySelectorAll('.a-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        var target = tab.dataset.ftab;
        var loginF = document.getElementById('loginF');
        var registerF = document.getElementById('registerF');
        var guestF = document.getElementById('guestF');
        if (loginF) loginF.style.display = target === 'login' ? 'block' : 'none';
        if (registerF) registerF.style.display = target === 'register' ? 'block' : 'none';
        if (guestF) guestF.style.display = target === 'guest' ? 'block' : 'none';
      });
    });
  }

  function bindLogin() {
    var btn = document.getElementById('lSubmit');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var emailEl = document.getElementById('lEmail');
      var passEl = document.getElementById('lPass');
      var email = emailEl ? emailEl.value.trim() : '';
      var password = passEl ? passEl.value : '';
      if (!email || !password) {
        showAuthToast('Please enter email and password', 'error');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Signing in...';
      try {
        var res = await Api.post('/auth/login', { email: email, password: password });
        if (res.token) Store.set('token', res.token);
        Store.set('user', res.user);
        setAuthBtn(res.user);
        closeModal('authMod');
        showAuthToast('Welcome back, ' + (res.user.name || 'friend') + '! 🌸', 'success');
      } catch (e) {
        showAuthToast(e.message || 'Login failed', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In →';
      }
    });
  }

  function bindRegister() {
    var btn = document.getElementById('rSubmit');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var nameEl = document.getElementById('rName');
      var emailEl = document.getElementById('rEmail');
      var passEl = document.getElementById('rPass');
      var name = nameEl ? nameEl.value.trim() : '';
      var email = emailEl ? emailEl.value.trim() : '';
      var password = passEl ? passEl.value : '';
      if (!name || !email || !password) {
        showAuthToast('Please fill all fields', 'error');
        return;
      }
      if (password.length < 8) {
        showAuthToast('Password must be at least 8 characters', 'error');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Creating account...';
      try {
        var res = await Api.post('/auth/register', { name: name, email: email, password: password });
        if (res.token) Store.set('token', res.token);
        Store.set('user', res.user);
        setAuthBtn(res.user);
        closeModal('authMod');
        showAuthToast('Welcome to Bloom, ' + (res.user.name || 'friend') + '! 🌸', 'success');
      } catch (e) {
        showAuthToast(e.message || 'Registration failed', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account →';
      }
    });
  }

  function bindGuest() {
    var btn = document.getElementById('gSubmit');
    if (!btn) return;
    btn.addEventListener('click', function () {
      closeModal('authMod');
      showAuthToast('Continuing as guest 👤', 'info');
    });
  }

  function showAuthToast(msg, type) {
    if (window.showToast) { window.showToast(msg, type); return; }
    var existing = document.getElementById('auth-toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.id = 'auth-toast';
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:' +
      (type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#6366f1') +
      ';color:white;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 3500);
  }

  function bindPasswordToggles() {
    document.querySelectorAll('.pw-tog').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.dataset.for);
        if (!target) return;
        var isPassword = target.type === 'password';
        target.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? 'hide' : 'show';
      });
    });
  }

  function bindPasswordStrength() {
    var passInput = document.getElementById('rPass');
    var fill = document.getElementById('strFill');
    var lbl = document.getElementById('strLbl');
    if (!passInput || !fill) return;
    passInput.addEventListener('input', function () {
      var v = passInput.value;
      var score = 0;
      if (v.length >= 8) score++;
      if (v.length >= 12) score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      var pct = Math.min(score * 20, 100);
      var color = pct <= 20 ? '#ef4444' : pct <= 40 ? '#f97316' : pct <= 60 ? '#eab308' : pct <= 80 ? '#22c55e' : '#10b981';
      fill.style.width = pct + '%';
      fill.style.background = color;
      if (lbl) lbl.textContent = pct <= 20 ? 'Weak' : pct <= 40 ? 'Fair' : pct <= 60 ? 'Good' : pct <= 80 ? 'Strong' : 'Excellent';
    });
  }

  function bindModals() {
    var pairs = [
      ['authBtn', 'authMod', 'closeAuth'],
      ['fplBtn', 'fplMod', 'closeFpl']
    ];
    pairs.forEach(function (p) {
      var trigger = document.getElementById(p[0]);
      var close = document.getElementById(p[2]);
      var overlay = document.getElementById(p[1]);
      if (trigger && overlay) trigger.addEventListener('click', function () { openModal(p[1]); });
      if (close) close.addEventListener('click', function () { closeModal(p[1]); });
      if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(p[1]); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindModals();
    bindAuthTabs();
    bindLogin();
    bindRegister();
    bindGuest();
    bindPasswordToggles();
    bindPasswordStrength();
    checkAuth();

    if (window.Store) {
      Store.on('user', function (user) { setAuthBtn(user); });
    }
  });

  window.__BloomAuth = {
    openModal: openModal,
    closeModal: closeModal,
    checkAuth: checkAuth,
    trapFocus: trapFocus,
    releaseFocus: releaseFocus
  };

})();
