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
        window.location.href = '/profile.html';
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

  function injectAuthModal() {
    if (document.getElementById('authMod')) return;
    var modalHtml = '<div class="overlay" id="authMod" role="dialog" aria-modal="true" aria-labelledby="authTitle" aria-hidden="true">' +
      '<div class="modal">' +
      '<div class="m-hd">' +
      '<h2 id="authTitle" style="font-family:var(--fd);font-size:1.5rem;font-weight:700">Welcome to Bloom</h2>' +
      '<button class="m-cls" id="closeAuth" aria-label="Close dialog">✕</button>' +
      '</div>' +
      '<div class="a-tabs" role="tablist">' +
      '<button class="a-tab active" data-ftab="login" role="tab" aria-selected="true">Sign In</button>' +
      '<button class="a-tab" data-ftab="register" role="tab" aria-selected="false">Register</button>' +
      '<button class="a-tab" data-ftab="guest" role="tab" aria-selected="false">Guest</button>' +
      '</div>' +
      '<div class="err-summary" id="loginErrSum" role="alert" aria-live="assertive" style="display:none">' +
      '<h4>Please fix the following:</h4><ul></ul>' +
      '</div>' +
      '<form id="loginF" onsubmit="event.preventDefault();">' +
      '<button class="btn btn-g sl-btn" id="gBtn">' +
      '<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>' +
      'Continue with Google</button>' +
      '<div class="div-lbl">or sign in with email</div>' +
      '<div class="fi">' +
      '<label class="fi-lbl" for="lEmail">Email</label>' +
      '<div class="fi-wrap"><input type="email" class="fi-inp" id="lEmail" placeholder="you@example.com" autocomplete="email" required></div>' +
      '</div>' +
      '<div class="fi">' +
      '<label class="fi-lbl" for="lPass">Password</label>' +
      '<div class="fi-wrap">' +
      '<input type="password" class="fi-inp" id="lPass" placeholder="••••••••" autocomplete="current-password" required>' +
      '<button type="button" class="pw-tog" data-for="lPass">show</button>' +
      '</div>' +
      '</div>' +
      '<button type="button" class="fpl-btn" id="fplBtn">Forgot password?</button>' +
      '<button class="btn btn-p" style="width:100%;justify-content:center;margin-top:6px" id="lSubmit">Sign In →</button>' +
      '</form>' +
      '<form id="registerF" style="display:none" onsubmit="event.preventDefault();">' +
      '<div class="fi">' +
      '<label class="fi-lbl" for="rName">Name</label>' +
      '<div class="fi-wrap"><input type="text" class="fi-inp" id="rName" placeholder="Your name" autocomplete="name" required></div>' +
      '</div>' +
      '<div class="fi">' +
      '<label class="fi-lbl" for="rEmail">Email</label>' +
      '<div class="fi-wrap"><input type="email" class="fi-inp" id="rEmail" placeholder="you@example.com" autocomplete="email" required></div>' +
      '</div>' +
      '<div class="fi">' +
      '<label class="fi-lbl" for="rPass">Password</label>' +
      '<div class="fi-wrap">' +
      '<input type="password" class="fi-inp" id="rPass" placeholder="Min 8 characters" autocomplete="new-password" required minlength="8">' +
      '<button type="button" class="pw-tog" data-for="rPass">show</button>' +
      '</div>' +
      '<div id="rStrE" aria-live="polite"><div class="str-bar"><div class="str-fill" id="strFill"></div></div><span class="str-lbl" id="strLbl"></span></div>' +
      '</div>' +
      '<button class="btn btn-p" style="width:100%;justify-content:center;margin-top:6px" id="rSubmit">Create Account →</button>' +
      '</form>' +
      '<div id="guestF" style="display:none;text-align:center;padding:14px 0">' +
      '<p class="m-sub">Browse and pre-order without an account.</p>' +
      '<button class="btn btn-p" style="width:100%;justify-content:center" id="gSubmit">Continue as Guest →</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="overlay" id="fplMod" role="dialog" aria-modal="true" aria-labelledby="fplTitle" aria-hidden="true">' +
      '<div class="modal">' +
      '<div class="m-hd">' +
      '<h2 id="fplTitle" style="font-family:var(--fd);font-size:1.35rem;font-weight:700">Reset Password</h2>' +
      '<button class="m-cls" id="closeFpl" aria-label="Close dialog">✕</button>' +
      '</div>' +
      '<p class="m-sub">Enter your email. We\'ll send a secure reset link within 60 seconds.</p>' +
      '<div class="fi">' +
      '<label class="fi-lbl" for="fplEmail">Email</label>' +
      '<div class="fi-wrap"><input type="email" class="fi-inp" id="fplEmail" placeholder="you@example.com" required></div>' +
      '</div>' +
      '<button class="btn btn-p" style="width:100%;justify-content:center" id="fplSubmit">Send Reset Link →</button>' +
      '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectAuthModal();
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
