(function () {
  'use strict';
  var GCASH_NUMBER = '09682976691';
  var GCASH_NAME = 'Bloombyus';
  var GCASH_QR_IMG = '/img/gcash-qr.png';

  window.BloomSupport = {
    renderSupportSection: renderSupportSection,
    renderFloatingButton: renderFloatingButton
  };

  function renderFloatingButton() {
    injectStyles();
    var fab = document.createElement('button');
    fab.className = 'gcash-fab';
    fab.setAttribute('aria-label', 'Support us via GCash');
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 6v6l4 2"/></svg><span>Support Us</span>';
    fab.addEventListener('click', function () {
      var el = document.getElementById('supportUs');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.body.appendChild(fab);
    setTimeout(function () { fab.classList.add('vis'); }, 2000);
  }

  function renderSupportSection(containerId) {
    var host = document.getElementById(containerId);
    if (!host || host.dataset.suInit) return;
    host.dataset.suInit = '1';
    injectStyles();

    var html = '<div class="su-wrap">';
    html += '<div class="su-glow" aria-hidden="true"></div>';
    html += '<div class="su-inner">';
    html += '<div class="su-content">';
    html += '<span class="su-eyebrow">Community Support</span>';
    html += '<h3 class="su-title">Love what we\u2019re building?</h3>';
    html += '<p class="su-desc">Bloom is an academic capstone project built with care by BSIT students at STI College Lipa. Your support helps us maintain servers, improve features, and keep the platform free for everyone.</p>';
    html += '<div class="su-gcash-card">';
    html += '<div class="su-gcash-header">';
    html += '<div class="su-gcash-logo">';
    html += '<svg viewBox="0 0 24 24" width="28" height="28" fill="none"><circle cx="12" cy="12" r="11" fill="#007DFE"/><text x="12" y="16" text-anchor="middle" fill="#fff" font-size="10" font-weight="900" font-family="Arial">G</text></svg>';
    html += '<div class="su-gcash-brand">';
    html += '<span class="su-gcash-label">GCash</span>';
    html += '<span class="su-gcash-sub">Send Money \u2022 Instant</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="su-gcash-verified">\u2713 Verified</div>';
    html += '</div>';
    html += '<div class="su-gcash-body">';
    html += '<div class="su-gcash-info">';
    html += '<div class="su-gcash-row">';
    html += '<span class="su-gcash-key">Mobile Number</span>';
    html += '<span class="su-gcash-val" id="gcashNum">' + GCASH_NUMBER + '</span>';
    html += '</div>';
    html += '<div class="su-gcash-row">';
    html += '<span class="su-gcash-key">Account Name</span>';
    html += '<span class="su-gcash-val">' + GCASH_NAME + '</span>';
    html += '</div>';
    html += '<button class="su-copy-btn" id="copyGcash" aria-label="Copy GCash number">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    html += '<span>Copy Number</span>';
    html += '</button>';
    html += '</div>';
    html += '<div class="su-gcash-qr">';
    html += '<div class="su-qr-frame">';
    html += '<img src="' + GCASH_QR_IMG + '" alt="GCash QR Code for ' + GCASH_NUMBER + '" width="160" height="160" loading="lazy" onerror="this.onerror=null;this.src=\'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent('GCash: ' + GCASH_NUMBER) + '\'">';
    html += '</div>';
    html += '<span class="su-qr-label">Scan to pay via GCash</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="su-note">100% of contributions go toward hosting, development tools, and academic resources. GCash transfers are instant and free within the Philippines.</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    host.innerHTML = html;

    var copyBtn = document.getElementById('copyGcash');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(GCASH_NUMBER).then(function () {
          copyBtn.querySelector('span').textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(function () {
            copyBtn.querySelector('span').textContent = 'Copy Number';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      });
    }

    animateIn(host);
  }

  function animateIn(host) {
    var wrap = host.querySelector('.su-wrap');
    if (!wrap) return;
    wrap.style.opacity = '0';
    wrap.style.transform = 'translateY(24px)';
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          wrap.style.transition = 'opacity .7s cubic-bezier(.23,1,.32,1), transform .7s cubic-bezier(.23,1,.32,1)';
          wrap.style.opacity = '1';
          wrap.style.transform = 'translateY(0)';
          io.disconnect();
        }
      });
    }, { threshold: 0.15 });
    io.observe(wrap);
  }

  function injectStyles() {
    if (document.getElementById('suStyles')) return;
    var s = document.createElement('style');
    s.id = 'suStyles';
    s.textContent =
      '.su-wrap{position:relative;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;background:linear-gradient(135deg,rgba(0,125,254,.03),rgba(255,255,255,.01));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}' +
      '.su-glow{position:absolute;top:-60px;right:-60px;width:300px;height:300px;background:radial-gradient(circle,rgba(0,125,254,.08),transparent 70%);pointer-events:none;filter:blur(50px);animation:suGlow 6s ease-in-out infinite alternate}' +
      '@keyframes suGlow{0%{opacity:.4;transform:scale(1)}100%{opacity:.7;transform:scale(1.2)}}' +
      '.su-inner{display:flex;flex-direction:column;gap:0;padding:clamp(28px,5vw,48px);position:relative;z-index:1}' +
      '.su-content{min-width:0}' +
      '.su-eyebrow{display:inline-block;font-family:var(--fc);font-style:italic;font-weight:900;font-size:.7rem;letter-spacing:.15em;text-transform:uppercase;color:rgba(0,125,254,.85);margin-bottom:12px;padding:4px 14px;background:rgba(0,125,254,.08);border:1px solid rgba(0,125,254,.2);border-radius:100px}' +
      '.su-title{font-family:var(--fd);font-size:clamp(1.4rem,3vw,2rem);font-weight:900;margin-bottom:12px;background:linear-gradient(135deg,#fff 30%,rgba(0,125,254,.9));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}' +
      '.su-desc{font-size:.9rem;color:rgba(255,255,255,.6);line-height:1.7;margin-bottom:28px;max-width:620px;text-wrap:pretty}' +
      '.su-gcash-card{background:linear-gradient(135deg,rgba(0,125,254,.06),rgba(255,255,255,.02));border:1px solid rgba(0,125,254,.15);border-radius:20px;overflow:hidden;margin-bottom:20px}' +
      '.su-gcash-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:linear-gradient(135deg,rgba(0,125,254,.1),rgba(0,125,254,.04));border-bottom:1px solid rgba(0,125,254,.1)}' +
      '.su-gcash-logo{display:flex;align-items:center;gap:12px}' +
      '.su-gcash-brand{display:flex;flex-direction:column}' +
      '.su-gcash-label{font-family:var(--fd);font-weight:900;font-size:1.1rem;color:#007DFE;letter-spacing:.02em}' +
      '.su-gcash-sub{font-size:.68rem;color:rgba(255,255,255,.4);letter-spacing:.05em}' +
      '.su-gcash-verified{font-size:.68rem;font-weight:700;color:#22c55e;background:rgba(34,197,94,.1);padding:4px 10px;border-radius:100px;border:1px solid rgba(34,197,94,.2)}' +
      '.su-gcash-body{display:grid;grid-template-columns:1fr auto;gap:24px;padding:24px;align-items:center}' +
      '.su-gcash-info{display:flex;flex-direction:column;gap:14px}' +
      '.su-gcash-row{display:flex;flex-direction:column;gap:2px}' +
      '.su-gcash-key{font-size:.68rem;color:rgba(255,255,255,.35);letter-spacing:.08em;text-transform:uppercase;font-weight:600}' +
      '.su-gcash-val{font-family:var(--fd);font-size:1.2rem;font-weight:700;color:#fff;letter-spacing:.06em}' +
      '.su-copy-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-size:.78rem;font-weight:700;background:linear-gradient(135deg,#007DFE,#0066D6);color:#fff;border:none;cursor:pointer;transition:transform .25s cubic-bezier(.23,1,.32,1),box-shadow .25s;font-family:inherit;margin-top:4px;align-self:flex-start}' +
      '.su-copy-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,125,254,.35)}' +
      '.su-copy-btn.copied{background:linear-gradient(135deg,#22c55e,#16a34a)}' +
      '.su-gcash-qr{display:flex;flex-direction:column;align-items:center;gap:8px;flex-shrink:0}' +
      '.su-qr-frame{background:#fff;border-radius:14px;padding:10px;box-shadow:0 4px 20px rgba(0,0,0,.2)}' +
      '.su-qr-frame img{display:block;border-radius:6px;width:160px;height:160px;object-fit:contain}' +
      '.su-qr-label{font-size:.65rem;color:rgba(255,255,255,.3);text-align:center;letter-spacing:.04em}' +
      '.su-note{font-size:.68rem;color:rgba(255,255,255,.28);font-style:italic;line-height:1.6}' +
      '.gcash-fab{position:fixed;bottom:86px;left:24px;display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:100px;background:linear-gradient(135deg,#007DFE,#0055CC);color:#fff;font-size:.82rem;font-weight:700;text-decoration:none;z-index:980;box-shadow:0 6px 28px rgba(0,125,254,.3);opacity:0;transform:translateY(16px);transition:opacity .5s cubic-bezier(.23,1,.32,1),transform .5s cubic-bezier(.23,1,.32,1);border:none;cursor:pointer;font-family:inherit}' +
      '.gcash-fab.vis{opacity:1;transform:translateY(0)}' +
      '.gcash-fab:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 12px 40px rgba(0,125,254,.45)}' +
      '.gcash-fab svg{flex-shrink:0}' +
      '[data-theme="light"] .su-wrap{background:linear-gradient(135deg,rgba(0,125,254,.04),rgba(0,0,0,.01));border-color:rgba(0,0,0,.08);backdrop-filter:none}' +
      '[data-theme="light"] .su-title{background:linear-gradient(135deg,var(--ink) 30%,rgba(0,100,200,.9));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}' +
      '[data-theme="light"] .su-desc{color:rgba(26,18,32,.6)}' +
      '[data-theme="light"] .su-note{color:rgba(26,18,32,.3)}' +
      '[data-theme="light"] .su-eyebrow{color:rgba(0,100,200,.9);background:rgba(0,125,254,.1);border-color:rgba(0,100,200,.25)}' +
      '[data-theme="light"] .su-gcash-val{color:var(--ink)}' +
      '[data-theme="light"] .su-gcash-key{color:rgba(26,18,32,.4)}' +
      '[data-theme="light"] .su-gcash-sub{color:rgba(26,18,32,.4)}' +
      '@media(max-width:640px){.su-gcash-body{grid-template-columns:1fr;text-align:center}.su-gcash-qr{margin-top:8px}.su-gcash-info{align-items:center}.su-copy-btn{align-self:center}.gcash-fab{left:auto;right:24px;bottom:86px}.gcash-fab span{display:none}.gcash-fab{padding:12px}}' +
      '@media(prefers-reduced-motion:reduce){.su-glow,.gcash-fab{animation:none!important}}';
    document.head.appendChild(s);
  }
})();
