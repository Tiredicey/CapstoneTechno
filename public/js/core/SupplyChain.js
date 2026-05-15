(function () {
  'use strict';
  var QR_API = 'https://api.qrserver.com/v1/create-qr-code/';
  var CHAIN_STAGES = [
    { id: 'harvest', icon: '\uD83C\uDF3F', label: 'Farm Harvest', location: 'Tagaytay Highlands, Cavite', desc: 'Hand-picked at optimal bloom stage', temp: '18\u00b0C ambient', time: '-48h', verifier: 'Grower cooperative log' },
    { id: 'qc', icon: '\uD83D\uDD2C', label: 'Quality Inspection', location: 'Bloom Processing Hub, Lipa City', desc: 'Stem hydration test, petal integrity check', temp: '4\u00b0C cold room', time: '-36h', verifier: 'QC station sensor' },
    { id: 'arrange', icon: '\u2702\uFE0F', label: 'Arrangement', location: 'Bloom Studio, Lipa City', desc: 'Hand-arranged by trained florist', temp: '8\u00b0C workspace', time: '-12h', verifier: 'Florist workstation ID' },
    { id: 'pack', icon: '\uD83D\uDCE6', label: 'Packaging', location: 'Bloom Fulfillment, Lipa City', desc: 'Insulated box, gel pack, moisture seal', temp: '4\u00b0C staging', time: '-4h', verifier: 'Pack station barcode' },
    { id: 'transit', icon: '\uD83D\uDE9A', label: 'In Transit', location: 'Route to delivery area', desc: 'Temperature-monitored vehicle', temp: '2-6\u00b0C vehicle', time: '-2h', verifier: 'Vehicle GPS + temp logger' },
    { id: 'deliver', icon: '\uD83C\uDF38', label: 'Delivered', location: 'Recipient address', desc: 'Photo proof captured, signature confirmed', temp: 'Ambient', time: '0h', verifier: 'Delivery photo timestamp' }
  ];
  var FARM_FEEDS = [
    { name: 'Tagaytay Rose Garden', crop: 'Ecuadorian Roses', altitude: '700m', status: 'Active growing season', thumb: null },
    { name: 'Benguet Highland Nursery', crop: 'Chrysanthemums, Lilies', altitude: '1,500m', status: 'Peak harvest', thumb: null },
    { name: 'Bukidnon Orchid Farm', crop: 'Dendrobium Orchids', altitude: '600m', status: 'Controlled greenhouse', thumb: null }
  ];
  window.BloomSupplyChain = {
    renderTraceability: renderTraceability,
    generateQR: generateQR
  };
  function generateQR(data, size) {
    size = size || 180;
    return QR_API + '?size=' + size + 'x' + size + '&margin=6&data=' + encodeURIComponent(data);
  }
  function buildTraceabilityURL(productId) {
    return window.location.origin + '/tracking.html?trace=' + (productId || 'BLOOM-DEMO') + '&chain=full';
  }
  async function renderTraceability(containerId, productId) {
    var host = document.getElementById(containerId);
    if (!host || host.dataset.scInit) return;
    host.dataset.scInit = '1';
    injectStyles();
    var traceUrl = buildTraceabilityURL(productId);
    var qrUrl = generateQR(traceUrl, 180);
    var now = new Date();
    var hashData = (productId || 'BLOOM') + now.toISOString();
    var realHash = await generateIntegrityHash(hashData);
    var html = '<div class="sc-wrap">' +
      '<div class="sc-hd">' +
        '<div>' +
          '<div class="sc-title">\uD83D\uDD17 Supply Chain Traceability</div>' +
        '</div>' +
        '<div class="sc-qr-wrap">' +
          '<img src="' + qrUrl + '" alt="QR code linking to supply chain trace" class="sc-qr" width="80" height="80" loading="lazy">' +
          '<span class="sc-qr-label">Scan to verify</span>' +
        '</div>' +
      '</div>' +
      '<div class="sc-timeline">';
    for (var i = 0; i < CHAIN_STAGES.length; i++) {
      var stage = CHAIN_STAGES[i];
      var stageTime = new Date(now.getTime() + (parseInt(stage.time) * 3600000));
      var timeStr = stageTime.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      var isLast = i === CHAIN_STAGES.length - 1;
      html += '<div class="sc-stage' + (isLast ? ' sc-stage-last' : '') + '" data-stage="' + stage.id + '">' +
        '<div class="sc-stage-line"><div class="sc-stage-dot">' + stage.icon + '</div></div>' +
        '<div class="sc-stage-body">' +
          '<div class="sc-stage-label">' + stage.label + '</div>' +
          '<div class="sc-stage-meta">' +
            '<span>\uD83D\uDCCD ' + stage.location + '</span>' +
            '<span>\uD83C\uDF21\uFE0F ' + stage.temp + '</span>' +
            '<span>\uD83D\uDD52 ' + timeStr + '</span>' +
          '</div>' +
          '<div class="sc-stage-desc">' + stage.desc + '</div>' +
          '<div class="sc-stage-verifier">Verified by: ' + stage.verifier + '</div>' +
        '</div>' +
      '</div>';
    }
    html += '</div>' +
      '<div class="sc-footer">' +
        '<div class="sc-hash">Chain hash: <code>' + realHash + '</code></div>' +
        '<div class="sc-note">Integrity verification modeled on blockchain hash-chain principles.</div>' +
      '</div>' +
    '</div>';
    host.innerHTML = html;
    animateTimeline(host);
  }
  async function generateIntegrityHash(dataStr) {
    if (window.crypto && window.crypto.subtle) {
      try {
        var encoder = new TextEncoder();
        var data = encoder.encode(dataStr);
        var hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        var hashHex = hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
        return '0x' + hashHex.substring(0, 16) + '\u2026';
      } catch (e) { }
    }
    var hash = 0;
    for (var i = 0; i < dataStr.length; i++) {
      hash = ((hash << 5) - hash) + dataStr.charCodeAt(i);
      hash |= 0;
    }
    return '0x' + Math.abs(hash).toString(16) + '\u2026';
  }
  function animateTimeline(host) {
    var stages = host.querySelectorAll('.sc-stage');
    stages.forEach(function (s, i) {
      s.style.opacity = '0';
      s.style.transform = 'translateX(-16px)';
      setTimeout(function () {
        s.style.transition = 'opacity .5s cubic-bezier(.23,1,.32,1), transform .5s cubic-bezier(.23,1,.32,1)';
        s.style.opacity = '1';
        s.style.transform = 'translateX(0)';
      }, 120 * i);
    });
  }
  function injectStyles() {
    if (document.getElementById('scStyles')) return;
    var s = document.createElement('style');
    s.id = 'scStyles';
    s.textContent =
      '.sc-wrap{border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.02)}' +
      '.sc-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 20px 16px;border-bottom:1px solid rgba(255,255,255,.06)}' +
      '.sc-title{font-family:var(--fd);font-weight:700;font-size:1.1rem;margin-bottom:6px}' +
      '.sc-demo-tag{font-size:.66rem;padding:3px 10px;border-radius:6px;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.15);color:rgba(124,58,237,.7);display:inline-flex;align-items:center;gap:4px;font-weight:600}' +
      '.sc-qr-wrap{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0}' +
      '.sc-qr{border-radius:8px;border:2px solid rgba(255,255,255,.08);background:#fff;padding:4px}' +
      '.sc-qr-label{font-size:.6rem;color:rgba(255,255,255,.35);letter-spacing:.06em;text-transform:uppercase}' +
      '.sc-timeline{padding:20px;position:relative}' +
      '.sc-stage{display:flex;gap:16px;position:relative;padding-bottom:24px}' +
      '.sc-stage-last{padding-bottom:0}' +
      '.sc-stage-line{display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:36px}' +
      '.sc-stage-dot{width:36px;height:36px;border-radius:50%;background:rgba(230,26,26,.1);border:2px solid rgba(230,26,26,.3);display:flex;align-items:center;justify-content:center;font-size:.9rem;position:relative;z-index:1}' +
      '.sc-stage:not(.sc-stage-last) .sc-stage-line::after{content:"";flex:1;width:2px;background:linear-gradient(180deg,rgba(230,26,26,.3),rgba(230,26,26,.08));margin-top:4px}' +
      '.sc-stage-body{flex:1;min-width:0}' +
      '.sc-stage-label{font-weight:700;font-size:.88rem;margin-bottom:4px}' +
      '.sc-stage-meta{display:flex;flex-wrap:wrap;gap:8px;font-size:.7rem;color:rgba(255,255,255,.45);margin-bottom:6px}' +
      '.sc-stage-desc{font-size:.78rem;color:rgba(255,255,255,.6);line-height:1.5;margin-bottom:4px}' +
      '.sc-stage-verifier{font-size:.62rem;color:rgba(255,255,255,.3);font-style:italic}' +
      '.sc-footer{padding:14px 20px;border-top:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;gap:6px}' +
      '.sc-hash{font-size:.68rem;color:rgba(255,255,255,.35)}' +
      '.sc-hash code{background:rgba(255,255,255,.05);padding:2px 6px;border-radius:4px;font-family:monospace;color:rgba(0,212,170,.7)}' +
      '.sc-note{font-size:.62rem;color:rgba(255,255,255,.25);line-height:1.5;font-style:italic}' +
      '.ff-wrap{border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.02)}' +
      '.ff-hd{padding:20px 20px 16px;border-bottom:1px solid rgba(255,255,255,.06)}' +
      '.ff-title{font-family:var(--fd);font-weight:700;font-size:1.05rem;margin-bottom:6px}' +
      '.ff-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1px;background:rgba(255,255,255,.04)}' +
      '.ff-card{background:var(--bg,#0B0516);overflow:hidden}' +
      '.ff-cam{aspect-ratio:16/9;position:relative;overflow:hidden;background:#000}' +
      '.ff-cam-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,rgba(11,5,22,.9),rgba(21,10,40,.9))}' +
      '.ff-cam-badge{font-size:.6rem;font-weight:700;padding:2px 8px;border-radius:4px;background:rgba(230,26,26,.15);color:rgba(230,26,26,.9);border:1px solid rgba(230,26,26,.25);animation:vm-blink 1.5s ease-in-out infinite}' +
      '.ff-info{padding:12px 16px}' +
      '.ff-farm-name{font-weight:700;font-size:.85rem;margin-bottom:4px}' +
      '.ff-farm-meta{display:flex;flex-wrap:wrap;gap:8px;font-size:.7rem;color:rgba(255,255,255,.45);margin-bottom:6px}' +
      '.ff-farm-status{display:flex;align-items:center;gap:5px;font-size:.7rem;color:rgba(0,212,170,.7)}' +
      '.ff-status-dot{width:6px;height:6px;border-radius:50%;background:rgba(0,212,170,.8);animation:vm-blink 2s ease-in-out infinite}' +
      '[data-theme="light"] .sc-wrap,[data-theme="light"] .ff-wrap{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.08)}' +
      '[data-theme="light"] .sc-hd,[data-theme="light"] .ff-hd{border-bottom-color:rgba(0,0,0,.06)}' +
      '[data-theme="light"] .sc-stage-meta,[data-theme="light"] .ff-farm-meta{color:rgba(26,18,32,.45)}' +
      '[data-theme="light"] .sc-stage-desc{color:rgba(26,18,32,.6)}' +
      '[data-theme="light"] .sc-stage-verifier{color:rgba(26,18,32,.35)}' +
      '[data-theme="light"] .sc-footer{border-top-color:rgba(0,0,0,.06)}' +
      '[data-theme="light"] .sc-hash{color:rgba(26,18,32,.35)}' +
      '[data-theme="light"] .sc-note{color:rgba(26,18,32,.25)}' +
      '[data-theme="light"] .ff-card{background:var(--bg,#FEFCF9)}' +
      '[data-theme="light"] .ff-grid{background:rgba(0,0,0,.06)}' +
      '@media(max-width:640px){.sc-hd{flex-direction:column}.ff-grid{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }
})();
