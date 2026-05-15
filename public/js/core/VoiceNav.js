(function () {
  'use strict';
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;
  var recognition = null;
  var listening = false;
  var fab = null;
  var panel = null;
  var transcript = null;
  var statusEl = null;
  var ROUTES = [
    { patterns: ['home', 'main', 'landing'], url: '/', label: 'Home' },
    { patterns: ['shop', 'browse', 'catalog', 'catalogue', 'flowers', 'bouquets'], url: '/catalog.html', label: 'Catalog' },
    { patterns: ['cart', 'bag', 'basket'], url: '/cart.html', label: 'Cart' },
    { patterns: ['checkout', 'check out', 'pay'], url: '/checkout.html', label: 'Checkout' },
    { patterns: ['customize', 'custom', 'design', 'studio', 'create'], url: '/customize.html', label: 'Customize Studio' },
    { patterns: ['track', 'tracking', 'order status', 'where is'], url: '/tracking.html', label: 'Order Tracking' },
    { patterns: ['support', 'help', 'contact', 'ticket'], url: '/support.html', label: 'Support' },
    { patterns: ['about', 'about us', 'story'], url: '/about.html', label: 'About' },
    { patterns: ['privacy', 'policy'], url: '/privacy.html', label: 'Privacy' },
    { patterns: ['shipping', 'delivery'], url: '/shipping.html', label: 'Shipping' },
    { patterns: ['returns', 'refund'], url: '/returns.html', label: 'Returns' },
    { patterns: ['profile', 'account', 'settings'], url: '/profile.html', label: 'Profile' },
    { patterns: ['subscribe', 'subscription'], url: '/#subs', label: 'Subscriptions' }
  ];
  var ACTIONS = [
    { patterns: ['scroll down', 'go down'], action: function () { window.scrollBy({ top: 400, behavior: 'smooth' }); return 'Scrolling down'; } },
    { patterns: ['scroll up', 'go up', 'top'], action: function () { window.scrollTo({ top: 0, behavior: 'smooth' }); return 'Scrolling to top'; } },
    { patterns: ['dark mode', 'dark theme'], action: function () { document.documentElement.setAttribute('data-theme', 'dark'); return 'Dark mode activated'; } },
    { patterns: ['light mode', 'light theme'], action: function () { document.documentElement.setAttribute('data-theme', 'light'); return 'Light mode activated'; } },
    { patterns: ['search'], action: function (text) { var q = text.replace(/search\s*/i, '').trim(); if (q) { window.location.href = '/catalog.html?search=' + encodeURIComponent(q); return 'Searching for ' + q; } return 'What would you like to search for?'; } },
    { patterns: ['sign in', 'log in', 'login'], action: function () { var btn = document.querySelector('#signInBtn, [data-auth="login"]'); if (btn) btn.click(); return 'Opening sign-in'; } },
    { patterns: ['close', 'stop', 'cancel', 'nevermind'], action: function () { stopListening(); return 'Voice navigation closed'; } }
  ];
  function matchCommand(text) {
    var lower = text.toLowerCase().trim();
    for (var i = 0; i < ACTIONS.length; i++) {
      for (var j = 0; j < ACTIONS[i].patterns.length; j++) {
        if (lower.indexOf(ACTIONS[i].patterns[j]) !== -1) {
          return { type: 'action', item: ACTIONS[i], text: lower };
        }
      }
    }
    for (var k = 0; k < ROUTES.length; k++) {
      for (var m = 0; m < ROUTES[k].patterns.length; m++) {
        if (lower.indexOf(ROUTES[k].patterns[m]) !== -1) {
          return { type: 'route', item: ROUTES[k] };
        }
      }
    }
    return null;
  }
  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'vn-status vn-status-' + (type || 'info');
  }
  function setTranscript(text) {
    if (transcript) transcript.textContent = text || '\u2026';
  }
  function showToast(msg) {
    if (window.showToast) window.showToast(msg, 'info');
  }
  function startListening() {
    if (listening) return;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; 
    recognition.maxAlternatives = 1;
    recognition.onstart = function () {
      listening = true;
      fab.classList.add('vn-active');
      var navBtn = document.getElementById('voiceNavBtn');
      if (navBtn) {
        navBtn.classList.add('listening');
        navBtn.setAttribute('aria-pressed', 'true');
      }
      panel.classList.add('vn-panel-open');
      setStatus('Listening\u2026', 'listening');
      setTranscript('');
    };
    recognition.onresult = function (e) {
      var interim = '';
      var final = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
      if (final) processCommand(final);
    };
    recognition.onerror = function (e) {
      var err = e.error || 'unknown';
      if (err === 'no-speech') {
        setStatus('No speech detected', 'warn');
      } else if (err === 'not-allowed') {
        setStatus('Microphone access denied', 'error');
      } else if (err === 'network') {
        setStatus('Network error. Speech API unavailable in this browser.', 'error');
      } else {
        setStatus('Error: ' + err, 'error');
      }
      setTimeout(stopListening, 2000);
    };
    recognition.onend = function () {
      listening = false;
      fab.classList.remove('vn-active');
      var navBtn = document.getElementById('voiceNavBtn');
      if (navBtn) {
        navBtn.classList.remove('listening');
        navBtn.setAttribute('aria-pressed', 'false');
      }
      setTimeout(function () {
        if (!listening) {
          panel.classList.remove('vn-panel-open');
        }
      }, 3000);
    };
    recognition.start();
  }
  function stopListening() {
    if (recognition) {
      try { recognition.stop(); } catch (_) {}
    }
    listening = false;
    fab.classList.remove('vn-active');
    var navBtn = document.getElementById('voiceNavBtn');
    if (navBtn) {
      navBtn.classList.remove('listening');
      navBtn.setAttribute('aria-pressed', 'false');
    }
    panel.classList.remove('vn-panel-open');
  }
  function processCommand(text) {
    var match = matchCommand(text);
    if (!match) {
      setStatus('Command not recognized', 'warn');
      showToast('\uD83C\uDF99\uFE0F "' + text + '" \u2014 try: shop, cart, customize, track, support');
      return;
    }
    if (match.type === 'route') {
      setStatus('Navigating to ' + match.item.label + '\u2026', 'success');
      showToast('\uD83C\uDF99\uFE0F Navigating to ' + match.item.label);
      setTimeout(function () { window.location.href = match.item.url; }, 600);
    } else if (match.type === 'action') {
      var result = match.item.action(text);
      setStatus(result, 'success');
      showToast('\uD83C\uDF99\uFE0F ' + result);
    }
  }
  function createUI() {
    fab = document.createElement('button');
    fab.id = 'voiceNavFab';
    fab.className = 'vn-fab';
    fab.setAttribute('aria-label', 'Voice navigation');
    fab.setAttribute('title', 'Voice navigation \u2014 W3C Web Speech API');
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    panel = document.createElement('div');
    panel.className = 'vn-panel';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML =
      '<div class="vn-panel-hd">' +
        '<span class="vn-panel-title">\uD83C\uDF99\uFE0F Voice Navigation</span>' +
        '<span class="vn-api-tag">W3C Web Speech API</span>' +
      '</div>' +
      '<div class="vn-transcript" id="vnTranscript">\u2026</div>' +
      '<div class="vn-status" id="vnStatus">Tap mic to start</div>' +
      '<div class="vn-cmds">' +
        '<span>shop</span><span>cart</span><span>customize</span><span>track</span><span>support</span><span>search \u2026</span><span>dark mode</span><span>scroll up</span>' +
      '</div>';
    document.body.appendChild(panel);
    document.body.appendChild(fab);
    transcript = document.getElementById('vnTranscript');
    statusEl = document.getElementById('vnStatus');
    fab.addEventListener('click', function () {
      if (listening) { stopListening(); } else { startListening(); }
    });
    var navBtn = document.getElementById('voiceNavBtn');
    if (navBtn) {
      navBtn.hidden = false;
      navBtn.addEventListener('click', function () {
        if (listening) { stopListening(); } else { startListening(); }
      });
    }
  }
  function injectStyles() {
    var s = document.createElement('style');
    s.textContent =
      '.vn-fab{position:fixed;bottom:88px;right:28px;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--p5d,#A81010),var(--p5,#E61A1A));color:#fff;border:none;display:flex;align-items:center;justify-content:center;z-index:999;box-shadow:0 6px 24px rgba(230,26,26,.35);transition:all .3s cubic-bezier(.23,1,.32,1);cursor:pointer}' +
      '.vn-fab svg{width:22px;height:22px}' +
      '.vn-fab:hover{transform:translateY(-3px);box-shadow:0 10px 32px rgba(230,26,26,.5)}' +
      '.vn-fab.vn-active{background:linear-gradient(135deg,#ff3b3b,#e61a1a);animation:vn-pulse 1.2s ease-in-out infinite}' +
      '@keyframes vn-pulse{0%,100%{box-shadow:0 0 0 0 rgba(230,26,26,.5)}50%{box-shadow:0 0 0 14px rgba(230,26,26,0)}}' +
      '.vn-panel{position:fixed;bottom:148px;right:28px;width:280px;background:rgba(11,5,22,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;z-index:998;opacity:0;transform:translateY(12px) scale(.95);pointer-events:none;transition:all .3s cubic-bezier(.23,1,.32,1)}' +
      '.vn-panel-open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}' +
      '.vn-panel-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}' +
      '.vn-panel-title{font-weight:700;font-size:.82rem;color:#fff}' +
      '.vn-api-tag{font-size:.58rem;padding:2px 7px;border-radius:4px;background:rgba(0,212,170,.1);border:1px solid rgba(0,212,170,.2);color:rgba(0,212,170,.8);font-weight:600;letter-spacing:.04em}' +
      '.vn-transcript{font-size:1rem;font-weight:600;color:#fff;min-height:28px;margin-bottom:8px;word-break:break-word}' +
      '.vn-status{font-size:.72rem;margin-bottom:10px;transition:color .2s}' +
      '.vn-status-info{color:rgba(255,255,255,.45)}' +
      '.vn-status-listening{color:rgba(230,26,26,.9)}' +
      '.vn-status-success{color:rgba(0,212,170,.9)}' +
      '.vn-status-warn{color:rgba(255,215,0,.8)}' +
      '.vn-status-error{color:rgba(255,59,59,.9)}' +
      '.vn-cmds{display:flex;flex-wrap:wrap;gap:4px}' +
      '.vn-cmds span{font-size:.62rem;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.45);letter-spacing:.03em}' +
      '[data-theme="light"] .vn-panel{background:rgba(255,255,255,.95);border-color:rgba(0,0,0,.1)}' +
      '[data-theme="light"] .vn-panel-title{color:#1A1220}' +
      '[data-theme="light"] .vn-transcript{color:#1A1220}' +
      '[data-theme="light"] .vn-cmds span{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.08);color:rgba(26,18,32,.5)}' +
      '@media(max-width:480px){.vn-panel{right:12px;left:12px;width:auto;bottom:140px}.vn-fab{bottom:80px;right:16px;width:44px;height:44px}}';
    document.head.appendChild(s);
  }
  document.addEventListener('DOMContentLoaded', function () {
    injectStyles();
    createUI();
  });
})();
