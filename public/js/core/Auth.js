(function () {
  'use strict';
  if (window.__BloomAuth) return;

  function openModal() {
    var m = document.getElementById('authModal');
    if (m) m.classList.add('active');
  }

  function closeModal() {
    var m = document.getElementById('authModal');
    if (m) m.classList.remove('active');
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
      btn.onclick = openModal;
    }
  }

  async function checkAuth() {
    var token = localStorage.getItem('bloom_token');
    if (!token) { setAuthBtn(null); return; }
    try {
      var user = await Api.get('/auth/me');
      Store.set('user', user);
      setAuthBtn(user);
    } catch {
      localStorage.removeItem('bloom_token');
      Store.set('user', null);
      setAuthBtn(null);
    }
  }

  function bindAuthTabs() {
    document.querySelectorAll('.auth-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.auth-tab').forEach(function (t) {
          t.classList.remove('active');
          t.style.background = 'transparent';
          t.style.color = 'rgba(255,255,255,0.5)';
        });
        tab.classList.add('active');
        tab.style.background = 'rgba(232,67,147,0.15)';
        tab.style.color = '#e879a0';
        var target = tab.dataset.tab;
        document.getElementById('loginForm').style.display = target === 'login' ? 'block' : 'none';
        document.getElementById('registerForm').style.display = target === 'register' ? 'block' : 'none';
        document.getElementById('guestForm').style.display = target === 'guest' ? 'block' : 'none';
      });
    });
  }

  function bindLogin() {
    var btn = document.getElementById('loginSubmit');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var email = document.getElementById('loginEmail')?.value.trim();
      var password = document.getElementById('loginPassword')?.value;
      if (!email || !password) {
        showAuthToast('Please enter email and password', 'error');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Signing in...';
      try {
        var res = await Api.post('/auth/login', { email: email, password: password });
        localStorage.setItem('bloom_token', res.token);
        Store.set('user', res.user);
        setAuthBtn(res.user);
        closeModal();
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
    var btn = document.getElementById('registerSubmit');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var name = document.getElementById('regName')?.value.trim();
      var email = document.getElementById('regEmail')?.value.trim();
      var password = document.getElementById('regPassword')?.value;
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
        localStorage.setItem('bloom_token', res.token);
        Store.set('user', res.user);
        setAuthBtn(res.user);
        closeModal();
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
    var btn = document.getElementById('guestSubmit');
    if (!btn) return;
    btn.addEventListener('click', function () {
      closeModal();
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
    setTimeout(function () { t.remove(); }, 3500);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var authBtn = document.getElementById('authBtn');
    if (authBtn) authBtn.addEventListener('click', openModal);
    var closeBtn = document.getElementById('closeAuthModal');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    var overlay = document.getElementById('authModal');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
      });
    }
    bindAuthTabs();
    bindLogin();
    bindRegister();
    bindGuest();
    checkAuth();
  });

  window.__BloomAuth = { openModal: openModal, closeModal: closeModal, checkAuth: checkAuth };

})();