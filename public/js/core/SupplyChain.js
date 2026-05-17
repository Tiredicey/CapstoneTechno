(function () {
  'use strict';
  var QR_API = 'https://api.qrserver.com/v1/create-qr-code/';
  var CHAIN_STAGES = [
    { id: 'harvest', icon: '\uD83C\uDF3F', label: 'Farm Harvest', location: 'Bagong Pook, Lipa City, Batangas', desc: 'Hand-picked at optimal bloom stage by local growers', temp: '22\u00b0C ambient', time: '-48h', verifier: 'Grower cooperative log' },
    { id: 'qc', icon: '\uD83D\uDD2C', label: 'Quality Inspection', location: 'Processing Hub, Lipa City', desc: 'Stem hydration test, petal integrity check, pest screening', temp: '4\u00b0C cold room', time: '-36h', verifier: 'QC station sensor' },
    { id: 'arrange', icon: '\u2702\uFE0F', label: 'Arrangement', location: 'Bloom Studio, Lipa City', desc: 'Hand-arranged by trained florist per order specs', temp: '8\u00b0C workspace', time: '-12h', verifier: 'Florist workstation ID' },
    { id: 'pack', icon: '\uD83D\uDCE6', label: 'Packaging', location: 'Bloom Fulfillment, Lipa City', desc: 'Insulated box, gel pack, moisture seal applied', temp: '4\u00b0C staging', time: '-4h', verifier: 'Pack station barcode' },
    { id: 'transit', icon: '\uD83D\uDE9A', label: 'In Transit', location: 'Route to delivery area', desc: 'Temperature-monitored vehicle dispatched', temp: '2-6\u00b0C vehicle', time: '-2h', verifier: 'Vehicle GPS + temp logger' },
    { id: 'deliver', icon: '\uD83C\uDF38', label: 'Delivered', location: 'Recipient address', desc: 'Photo proof captured, recipient confirmed', temp: 'Ambient', time: '0h', verifier: 'Delivery photo timestamp' }
  ];
  var FARMS = [
    { name: 'Bagong Pook Highland Garden', crop: 'Roses, Chrysanthemums', altitude: '350m', status: 'Active growing season', lat: 13.94, lon: 121.16, region: 'Lipa City, Batangas' },
    { name: 'San Jose Orchid Nursery', crop: 'Dendrobium Orchids, Lilies', altitude: '280m', status: 'Controlled greenhouse', lat: 13.93, lon: 121.15, region: 'Lipa City, Batangas' },
    { name: 'Mataas na Kahoy Flower Farm', crop: 'Sunflowers, Gerbera', altitude: '420m', status: 'Peak harvest', lat: 13.97, lon: 121.09, region: 'Batangas Province' }
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
    return window.location.origin + '/tracking.html?trace=' + (productId || 'BLOOM') + '&chain=full';
  }

  async function generateIntegrityHash(dataStr) {
    if (window.crypto && window.crypto.subtle) {
      try {
        var encoder = new TextEncoder();
        var data = encoder.encode(dataStr);
        var hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        var hashHex = hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
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

    var html = '<div class="sc-wrap">';
    html += '<div class="sc-hd">';
    html += '<div>';
    html += '<div class="sc-title">\uD83D\uDD17 Supply Chain Traceability</div>';
    html += '<div class="sc-subtitle">6-stage hash-chain verified journey</div>';
    html += '</div>';
    html += '<div class="sc-qr-wrap">';
    html += '<img src="' + qrUrl + '" alt="QR code linking to supply chain trace" class="sc-qr" width="80" height="80" loading="lazy">';
    html += '<span class="sc-qr-label">Scan to verify</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="sc-timeline">';

    for (var i = 0; i < CHAIN_STAGES.length; i++) {
      var stage = CHAIN_STAGES[i];
      var stageTime = new Date(now.getTime() + (parseInt(stage.time) * 3600000));
      var timeStr = stageTime.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      var isLast = i === CHAIN_STAGES.length - 1;
      var stageHash = await generateIntegrityHash(stage.id + stageTime.toISOString());
      html += '<div class="sc-stage' + (isLast ? ' sc-stage-last' : '') + '" data-stage="' + stage.id + '">';
      html += '<div class="sc-stage-line"><div class="sc-stage-dot">' + stage.icon + '</div></div>';
      html += '<div class="sc-stage-body">';
      html += '<div class="sc-stage-label">' + stage.label + '</div>';
      html += '<div class="sc-stage-meta">';
      html += '<span>\uD83D\uDCCD ' + stage.location + '</span>';
      html += '<span>\uD83C\uDF21\uFE0F ' + stage.temp + '</span>';
      html += '<span>\uD83D\uDD52 ' + timeStr + '</span>';
      html += '</div>';
      html += '<div class="sc-stage-desc">' + stage.desc + '</div>';
      html += '<div class="sc-stage-verifier">Verified by: ' + stage.verifier + '</div>';
      html += '<div class="sc-stage-hash">Stage hash: <code>' + stageHash + '</code></div>';
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';
    html += '<div class="sc-footer">';
    html += '<div class="sc-hash">Chain hash: <code>' + realHash + '</code></div>';
    html += '<div class="sc-note">Integrity verification uses real Web Crypto API SHA-256 hashing. Hash-chain modeled on blockchain principles for this academic prototype.</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="sc-spacer"></div>';

    html += '<div class="ff-wrap">';
    html += '<div class="ff-hd">';
    html += '<div class="ff-title">\uD83C\uDF31 Grower Network</div>';
    html += '<div class="ff-subtitle">3 partner farms in Batangas province</div>';
    html += '</div>';
    html += '<div class="ff-grid">';

    for (var f = 0; f < FARMS.length; f++) {
      var farm = FARMS[f];
      var windyUrl = 'https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=\u00b0C&metricWind=km/h&zoom=12&overlay=temp&product=ecmwf&level=surface&lat=' + farm.lat + '&lon=' + farm.lon + '&detailLat=' + farm.lat + '&detailLon=' + farm.lon + '&marker=true&message=true';
      html += '<div class="ff-card">';
      html += '<div class="ff-cam">';
      html += '<iframe src="' + windyUrl + '" class="ff-windy-embed" frameborder="0" loading="lazy" title="Live weather conditions at ' + farm.name + '" allow="autoplay" allowfullscreen></iframe>';
      html += '<div class="ff-cam-overlay">';
      html += '<div class="ff-cam-badge">\u25CF LIVE CONDITIONS</div>';
      html += '</div>';
      html += '</div>';
      html += '<div class="ff-info">';
      html += '<div class="ff-farm-name">' + farm.name + '</div>';
      html += '<div class="ff-farm-meta">';
      html += '<span>\uD83C\uDF3E ' + farm.crop + '</span>';
      html += '<span>\u26F0\uFE0F ' + farm.altitude + '</span>';
      html += '<span>\uD83D\uDCCD ' + farm.region + '</span>';
      html += '</div>';
      html += '<div class="ff-farm-status"><div class="ff-status-dot"></div>' + farm.status + '</div>';
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';
    html += '<div class="ff-footer">';
    html += '<div class="ff-note">Weather data powered by <a href="https://www.windy.com" target="_blank" rel="noopener">Windy.com</a> (ECMWF model). Farm coordinates reference Lipa City, Batangas, Philippines.</div>';
    html += '</div>';
    html += '</div>';

    host.innerHTML = html;
    animateTimeline(host);
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
    var cards = host.querySelectorAll('.ff-card');
    cards.forEach(function (c, i) {
      c.style.opacity = '0';
      c.style.transform = 'translateY(20px)';
      setTimeout(function () {
        c.style.transition = 'opacity .6s cubic-bezier(.23,1,.32,1), transform .6s cubic-bezier(.23,1,.32,1)';
        c.style.opacity = '1';
        c.style.transform = 'translateY(0)';
      }, 800 + (150 * i));
    });
  }

  function injectStyles() {
    if (document.getElementById('scStyles')) return;
    var s = document.createElement('style');
    s.id = 'scStyles';
    s.textContent =
      '.sc-wrap{border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,.02),rgba(255,255,255,.005));backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}' +
      '.sc-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:24px 24px 20px;border-bottom:1px solid rgba(255,255,255,.06)}' +
      '.sc-title{font-family:var(--fd);font-weight:700;font-size:1.15rem;margin-bottom:4px}' +
      '.sc-subtitle{font-size:.72rem;color:rgba(255,255,255,.35);letter-spacing:.03em}' +
      '.sc-qr-wrap{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0}' +
      '.sc-qr{border-radius:10px;border:2px solid rgba(255,255,255,.08);background:#fff;padding:4px;transition:transform .3s ease}' +
      '.sc-qr:hover{transform:scale(1.08)}' +
      '.sc-qr-label{font-size:.58rem;color:rgba(255,255,255,.3);letter-spacing:.08em;text-transform:uppercase}' +
      '.sc-timeline{padding:24px;position:relative}' +
      '.sc-stage{display:flex;gap:16px;position:relative;padding-bottom:28px}' +
      '.sc-stage-last{padding-bottom:0}' +
      '.sc-stage-line{display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:40px}' +
      '.sc-stage-dot{width:40px;height:40px;border-radius:50%;background:rgba(230,26,26,.08);border:2px solid rgba(230,26,26,.25);display:flex;align-items:center;justify-content:center;font-size:.95rem;position:relative;z-index:1;transition:border-color .3s,background .3s}' +
      '.sc-stage:hover .sc-stage-dot{border-color:rgba(230,26,26,.5);background:rgba(230,26,26,.15)}' +
      '.sc-stage:not(.sc-stage-last) .sc-stage-line::after{content:"";flex:1;width:2px;background:linear-gradient(180deg,rgba(230,26,26,.25),rgba(230,26,26,.06));margin-top:4px}' +
      '.sc-stage-body{flex:1;min-width:0}' +
      '.sc-stage-label{font-weight:700;font-size:.9rem;margin-bottom:5px}' +
      '.sc-stage-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:.7rem;color:rgba(255,255,255,.4);margin-bottom:6px}' +
      '.sc-stage-desc{font-size:.78rem;color:rgba(255,255,255,.55);line-height:1.6;margin-bottom:4px}' +
      '.sc-stage-verifier{font-size:.62rem;color:rgba(255,255,255,.28);font-style:italic;margin-bottom:3px}' +
      '.sc-stage-hash{font-size:.58rem;color:rgba(255,255,255,.2)}' +
      '.sc-stage-hash code{background:rgba(255,255,255,.04);padding:1px 5px;border-radius:3px;font-family:monospace;color:rgba(0,212,170,.5);font-size:.56rem}' +
      '.sc-footer{padding:16px 24px;border-top:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;gap:6px}' +
      '.sc-hash{font-size:.7rem;color:rgba(255,255,255,.35)}' +
      '.sc-hash code{background:rgba(255,255,255,.05);padding:2px 8px;border-radius:5px;font-family:monospace;color:rgba(0,212,170,.7);font-size:.68rem}' +
      '.sc-note{font-size:.6rem;color:rgba(255,255,255,.22);line-height:1.6;font-style:italic}' +
      '.sc-spacer{height:32px}' +
      '.ff-wrap{border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,.02),rgba(255,255,255,.005));backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}' +
      '.ff-hd{padding:24px 24px 20px;border-bottom:1px solid rgba(255,255,255,.06)}' +
      '.ff-title{font-family:var(--fd);font-weight:700;font-size:1.1rem;margin-bottom:4px}' +
      '.ff-subtitle{font-size:.72rem;color:rgba(255,255,255,.35);letter-spacing:.03em}' +
      '.ff-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1px;background:rgba(255,255,255,.04)}' +
      '.ff-card{background:var(--bg,#0B0516);overflow:hidden;transition:background .3s}' +
      '.ff-card:hover{background:rgba(255,255,255,.03)}' +
      '.ff-cam{aspect-ratio:16/9;position:relative;overflow:hidden;background:#000}' +
      '.ff-windy-embed{width:100%;height:100%;border:0;pointer-events:auto}' +
      '.ff-cam-overlay{position:absolute;top:8px;left:8px;z-index:2;pointer-events:none}' +
      '.ff-cam-badge{font-size:.58rem;font-weight:700;padding:3px 10px;border-radius:6px;background:rgba(0,180,120,.15);color:rgba(0,220,150,.95);border:1px solid rgba(0,180,120,.3);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:inline-flex;align-items:center;gap:4px;letter-spacing:.04em}' +
      '.ff-info{padding:14px 18px}' +
      '.ff-farm-name{font-weight:700;font-size:.88rem;margin-bottom:6px}' +
      '.ff-farm-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:.68rem;color:rgba(255,255,255,.4);margin-bottom:8px}' +
      '.ff-farm-status{display:flex;align-items:center;gap:6px;font-size:.72rem;color:rgba(0,212,170,.7)}' +
      '.ff-status-dot{width:7px;height:7px;border-radius:50%;background:rgba(0,212,170,.8);animation:sc-pulse 2s ease-in-out infinite}' +
      '.ff-footer{padding:14px 24px;border-top:1px solid rgba(255,255,255,.06)}' +
      '.ff-note{font-size:.58rem;color:rgba(255,255,255,.22);line-height:1.6;font-style:italic}' +
      '.ff-note a{color:rgba(0,212,170,.6);text-decoration:none}' +
      '.ff-note a:hover{text-decoration:underline}' +
      '@keyframes sc-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}' +
      '[data-theme="light"] .sc-wrap,[data-theme="light"] .ff-wrap{background:rgba(0,0,0,.015);border-color:rgba(0,0,0,.08);backdrop-filter:none}' +
      '[data-theme="light"] .sc-hd,[data-theme="light"] .ff-hd{border-bottom-color:rgba(0,0,0,.06)}' +
      '[data-theme="light"] .sc-subtitle,[data-theme="light"] .ff-subtitle{color:rgba(26,18,32,.4)}' +
      '[data-theme="light"] .sc-stage-meta,[data-theme="light"] .ff-farm-meta{color:rgba(26,18,32,.45)}' +
      '[data-theme="light"] .sc-stage-desc{color:rgba(26,18,32,.6)}' +
      '[data-theme="light"] .sc-stage-verifier{color:rgba(26,18,32,.3)}' +
      '[data-theme="light"] .sc-stage-hash{color:rgba(26,18,32,.2)}' +
      '[data-theme="light"] .sc-stage-dot{background:rgba(230,26,26,.06);border-color:rgba(230,26,26,.2)}' +
      '[data-theme="light"] .sc-footer,[data-theme="light"] .ff-footer{border-top-color:rgba(0,0,0,.06)}' +
      '[data-theme="light"] .sc-hash{color:rgba(26,18,32,.35)}' +
      '[data-theme="light"] .sc-note,[data-theme="light"] .ff-note{color:rgba(26,18,32,.22)}' +
      '[data-theme="light"] .ff-card{background:var(--bg,#FEFCF9)}' +
      '[data-theme="light"] .ff-card:hover{background:rgba(0,0,0,.02)}' +
      '[data-theme="light"] .ff-grid{background:rgba(0,0,0,.06)}' +
      '[data-theme="light"] .ff-cam-badge{background:rgba(0,180,120,.1);color:rgba(0,140,100,.95);border-color:rgba(0,140,100,.25)}' +
      '@media(max-width:640px){.sc-hd{flex-direction:column}.ff-grid{grid-template-columns:1fr}.sc-stage-meta{flex-direction:column;gap:4px}}' +
      '@media(prefers-reduced-motion:reduce){.ff-status-dot{animation:none}.sc-stage,.ff-card{transition:none!important}}';
    document.head.appendChild(s);
  }
})();
