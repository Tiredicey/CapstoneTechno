(function () {
  'use strict';

  const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/';
  const MODEL_SRC_LOCAL = '/models/bouquet.glb';
  const PHP_RATE = 56;
  const PHP_FMT = new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', minimumFractionDigits: 2
  });

  let basePricePHP = 0;
  let priceDeltaPHP = 0;

  const ADDON_PHP = {
    wrapping_premium: 448, wrapping_luxury: 840,
    ribbon_satin: 168, ribbon_velvet: 336,
    giftBox: 560, engraving: 672,
    logoUpload: 1120, customDesign: 840
  };
  const EXTRA_STEM_TRIPLET_PHP = 112;

  const config = {
    flower: 'rose', color: 'crimson', colorHex: '#DC143C', bloomCount: 12,
    wrapping_premium: false, wrapping_luxury: false,
    ribbon_satin: false, ribbon_velvet: false,
    giftBox: false, engraving: false, engravingText: '',
    greetingCard: false, cardText: '',
    logoUpload: false, customDesign: false,
    logoUrl: null, customDesignUrl: null
  };
  var productId = null;
  var customizationId = null;
  var currentMode = 'default';
  var aiDebounce = null;
  var lastAiPromptHash = '';
  var bouquet3DInited = false;

  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const fmt = n => PHP_FMT.format(Number(n) || 0);

  function toPHP(v) {
    const n = Number(v) || 0;
    if (n < 500) return Math.round(n * PHP_RATE * 100) / 100;
    return n;
  }

  function showToast(msg, type) {
    if (window.showToast) return window.showToast(msg, type);
    var con = qs('#toastContainer');
    if (!con) return;
    var t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.textContent = msg;
    con.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  function updatePrice() {
    priceDeltaPHP = 0;
    if (config.wrapping_premium) priceDeltaPHP += ADDON_PHP.wrapping_premium;
    if (config.wrapping_luxury) priceDeltaPHP += ADDON_PHP.wrapping_luxury;
    if (config.ribbon_satin) priceDeltaPHP += ADDON_PHP.ribbon_satin;
    if (config.ribbon_velvet) priceDeltaPHP += ADDON_PHP.ribbon_velvet;
    if (config.giftBox) priceDeltaPHP += ADDON_PHP.giftBox;
    if (config.engraving) priceDeltaPHP += ADDON_PHP.engraving;
    if (config.logoUpload) priceDeltaPHP += ADDON_PHP.logoUpload;
    if (config.customDesign) priceDeltaPHP += ADDON_PHP.customDesign;

    const extraStems = Math.max(0, config.bloomCount - 12);
    priceDeltaPHP += Math.floor(extraStems / 3) * EXTRA_STEM_TRIPLET_PHP;

    const totalPHP = basePricePHP + priceDeltaPHP;
    const livePriceEl = qs('#livePrice');
    const cartPriceBtn = qs('#cartPriceBtn');
    if (livePriceEl) livePriceEl.textContent = fmt(totalPHP);
    if (cartPriceBtn) cartPriceBtn.textContent = fmt(totalPHP);
  }

  function buildAIPrompt() {
    var colorNames = {
      crimson: 'deep crimson red', blush: 'soft blush pink', white: 'pure white',
      lavender: 'lavender purple', peach: 'warm peach', yellow: 'golden yellow',
      coral: 'coral pink', burgundy: 'deep burgundy', teal: 'teal green'
    };
    var flowerNames = {
      rose: 'roses', tulip: 'tulips', lily: 'lilies',
      orchid: 'orchids', sunflower: 'sunflowers', peony: 'peonies'
    };
    var wrap = '';
    if (config.wrapping_luxury) wrap = ', wrapped in luxury silk fabric with wax seal';
    else if (config.wrapping_premium) wrap = ', wrapped in premium textured kraft paper with gold foil accent';
    var ribbon = '';
    if (config.ribbon_velvet) ribbon = ', tied with deep velvet ribbon';
    else if (config.ribbon_satin) ribbon = ', tied with elegant satin ribbon';
    var extras = '';
    if (config.giftBox) extras += ', presented inside a rigid magnetic gift box';
    var color = colorNames[config.color] || config.color;
    var flower = flowerNames[config.flower] || config.flower;
    return 'Professional studio photography of a luxurious bouquet containing ' +
      config.bloomCount + ' ' + color + ' ' + flower +
      wrap + ribbon + extras +
      ', dark moody background with subtle warm lighting, high-end floral arrangement, photorealistic, 4k quality, elegant composition';
  }

  function hashString(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  function generateAIPreview() {
    var prompt = buildAIPrompt();
    var promptHash = hashString(prompt);
    if (promptHash === lastAiPromptHash) return;
    lastAiPromptHash = promptHash;

    var loading = qs('#aiLoading');
    var img = qs('#aiImage');
    if (!img) return;

    if (loading) loading.style.display = 'flex';
    img.style.opacity = '0';

    var seed = Math.abs(parseInt(promptHash)) % 100000;
    var url = POLLINATIONS_BASE + encodeURIComponent(prompt) +
      '?width=768&height=768&seed=' + seed + '&nologo=true&model=flux';

    var preload = new Image();
    preload.onload = function () {
      img.src = url;
      img.alt = 'AI-generated bouquet: ' + config.bloomCount + ' ' + config.color + ' ' + config.flower;
      img.style.transition = 'opacity 0.6s ease';
      img.style.opacity = '1';
      if (loading) loading.style.display = 'none';
      var container = img.closest('.preview-mode') || img.parentElement;
      if (container && !container.querySelector('.ai-gen-label')) {
        var lbl = document.createElement('div');
        lbl.className = 'ai-gen-label';
        lbl.textContent = '\u2728 AI-Generated Visualization';
        container.style.position = 'relative';
        container.appendChild(lbl);
      }
    };
    preload.onerror = function () {
      if (loading) loading.style.display = 'none';
      img.style.opacity = '1';
      showToast('AI preview temporarily unavailable', 'info');
    };
    preload.src = url;
  }

  function scheduleAIPreview() {
    if (currentMode !== 'ai') return;
    clearTimeout(aiDebounce);
    aiDebounce = setTimeout(generateAIPreview, 1200);
  }

  function buildRendererCfg() {
    return {
      flower: config.flower,
      color: config.colorHex,
      bloomCount: config.bloomCount,
      wrappingPremium: config.wrapping_premium,
      wrappingLuxury: config.wrapping_luxury,
      ribbonSatin: config.ribbon_satin,
      ribbonVelvet: config.ribbon_velvet,
      giftBox: config.giftBox,
      engraving: config.engraving,
      engravingText: config.engravingText || '',
      greetingCard: config.greetingCard,
      cardText: config.cardText || '',
      logoUpload: config.logoUpload,
      logoUrl: config.logoUrl,
      customDesign: config.customDesign,
      customDesignUrl: config.customDesignUrl || config.logoUrl
    };
  }

  function init3DBouquet() {
    var container = qs('#bouquet3DCanvas');
    if (!container || !window.BloomBouquetRenderer) return;
    if (bouquet3DInited) { sync3DConfig(); return; }
    bouquet3DInited = true;
    var status = qs('#modelStatus');
    if (status) {
      status.textContent = 'Generating 3D bouquet…';
      status.style.display = 'block';
      status.style.opacity = '1';
    }
    window.BloomBouquetRenderer.init(container, buildRendererCfg()).then(function () {
      if (status) {
        status.textContent = 'Procedural 3D Bouquet - Drag to rotate';
        setTimeout(function () { status.style.opacity = '0'; }, 3000);
      }
    });
  }

  function sync3DConfig() {
    if (!bouquet3DInited || !window.BloomBouquetRenderer) return;
    window.BloomBouquetRenderer.updateConfig(buildRendererCfg());
  }

  function switchMode(mode) {
    currentMode = mode;
    ['default', 'ai', '3d'].forEach(function (m) {
      var el = qs('#preview' + (m === 'default' ? 'Default' : m === 'ai' ? 'AI' : '3D'));
      if (el) el.style.display = (m === mode) ? 'flex' : 'none';
    });
    var ptcl = qs('#ptcl');
    if (ptcl) ptcl.style.display = (mode === 'default') ? 'block' : 'none';
    
    qsa('.canvas-btn').forEach(function (b) { b.classList.remove('mode-active'); });
    var btnMap = { default: '#modeDefault', ai: '#modeAI', '3d': '#mode3D' };
    var activeBtn = qs(btnMap[mode]);
    if (activeBtn) activeBtn.classList.add('mode-active');
    if (mode === 'ai') { lastAiPromptHash = ''; generateAIPreview(); }
    if (mode === '3d') {
      init3DBouquet();
      var mv = qs('#modelViewer');
      var canvas3d = qs('#bouquet3DCanvas');
      if (mv) mv.style.display = 'none';
      if (canvas3d) canvas3d.style.display = 'block';
      refreshARCapability();
      setTimeout(function () { queueARPrepare().catch(function () { }); }, 500);
    }
    if (mode === 'ar') { launchAR(); }
  }

  var arHostedUrl = null;
  var arReadyPromise = null;
  var arCapability = { mode: null, label: 'Checking…', tone: 'warn' };

  function setStatus(msg, autoHide) {
    var s = qs('#modelStatus');
    if (!s) return;
    s.textContent = msg;
    s.style.display = 'block';
    s.style.opacity = '1';
    if (autoHide) setTimeout(function () { s.style.opacity = '0'; }, 2500);
  }

  function detectARCapability() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);
    const isWin = /Windows NT/.test(ua);
    const isMac = /Macintosh/.test(ua);
    if (isIOS) return { mode: 'quick-look', label: 'iOS AR Ready', tone: 'ok' };
    if (isAndroid) return { mode: 'scene-viewer', label: 'Android AR Ready', tone: 'ok' };
    if (isWin || isMac) return { mode: 'qr-handoff', label: 'Scan QR with phone', tone: 'warn' };
    return { mode: 'none', label: '3D only', tone: 'no' };
  }

  async function refreshARCapability() {
    arCapability = detectARCapability();
    if (arCapability.mode !== 'quick-look' && arCapability.mode !== 'scene-viewer'
      && navigator.xr?.isSessionSupported) {
      try {
        if (await navigator.xr.isSessionSupported('immersive-ar')) {
          arCapability = { mode: 'webxr', label: 'WebXR AR Ready', tone: 'ok' };
        }
      } catch (_) { }
    }
    const el = qs('#arCapability');
    if (el) {
      el.style.display = 'inline-flex';
      el.className = 'ar-capability ' + arCapability.tone;
      el.innerHTML = '<span class="dot"></span>' + arCapability.label;
    }
  }

  function buildQRDataURL(text, size = 220) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size +
      '&margin=8&data=' + encodeURIComponent(text);
  }

  function buildHandoffURL() {
    const url = new URL(window.location.href);
    Object.keys(config).forEach(key => {
      const val = config[key];
      if (val !== null && val !== undefined && val !== '') {
        url.searchParams.set(key, String(val));
      } else {
        url.searchParams.delete(key);
      }
    });
    return url.toString();
  }

  function showHandoffModal() {
    const handoffUrl = buildHandoffURL();
    let modal = qs('#arHandoffModal');
    if (modal) {
      var qr = modal.querySelector('.ar-handoff-qr');
      var linkText = modal.querySelector('.ar-handoff-url');
      if (qr) qr.src = buildQRDataURL(handoffUrl);
      if (linkText) linkText.textContent = handoffUrl;
      modal.classList.add('active');
      return;
    }
    modal = document.createElement('div');
    modal.id = 'arHandoffModal';
    modal.className = 'ar-handoff-modal active';
    modal.innerHTML =
      '<div class="ar-handoff-card">' +
      '<button class="ar-handoff-close">✕</button>' +
      '<h3>View in Your Room</h3>' +
      '<p>AR requires a phone camera. Scan this code with your iPhone or Android to open this exact bouquet and tap View in Your Room.</p>' +
      '<img src="' + buildQRDataURL(handoffUrl) + '" class="ar-handoff-qr">' +
      '<div class="ar-handoff-url">' + handoffUrl + '</div>' +
      '<button class="ar-handoff-copy">Copy link</button>' +
      '</div>';
    document.body.appendChild(modal);
    modal.querySelector('.ar-handoff-close').onclick = () => modal.classList.remove('active');
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
    modal.querySelector('.ar-handoff-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(buildHandoffURL()); showToast('Link copied', 'success'); }
      catch { showToast('Copy failed', 'error'); }
    };
  }

  async function ensureRendererReady() {
    if (!window.BloomBouquetRenderer) throw new Error('renderer missing');
    await window.BloomBouquetRenderer.init(qs('#bouquet3DCanvas'), buildRendererCfg());
    bouquet3DInited = true;
    window.BloomBouquetRenderer.updateConfig(buildRendererCfg());
    await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
  }

  async function uploadGLBForAR(blobUrl) {
    var resp = await fetch(blobUrl);
    var blob = await resp.blob();
    var fd = new FormData();
    fd.append('model', blob, 'bouquet.glb');
    var up = await fetch('/api/customization/ar-model', { method: 'POST', body: fd });
    if (!up.ok) throw new Error('AR upload failed (' + up.status + ')');
    var json = await up.json();
    if (!json.url) throw new Error('AR upload: no URL returned');
    return json.url;
  }

  async function prepareARModel() {
    await ensureRendererReady();
    var blobUrl = await window.BloomBouquetRenderer.exportGLB();
    var hosted = await uploadGLBForAR(blobUrl);
    try { URL.revokeObjectURL(blobUrl); } catch (e) { }
    var mv = qs('#modelViewer');
    if (!mv) throw new Error('model-viewer missing');
    await new Promise(function (resolve, reject) {
      var done = false;
      var onLoad = function () { if (done) return; done = true; cleanup(); resolve(); };
      var onError = function (e) { if (done) return; done = true; cleanup(); reject(e); };
      var cleanup = function () {
        mv.removeEventListener('load', onLoad);
        mv.removeEventListener('error', onError);
      };
      mv.addEventListener('load', onLoad, { once: true });
      mv.addEventListener('error', onError, { once: true });
      arHostedUrl = hosted;
      mv.setAttribute('src', hosted);
      mv.removeAttribute('ios-src');
      setTimeout(function () { if (!done) onError(new Error('model-viewer load timeout')); }, 25000);
    });
    return mv;
  }

  function queueARPrepare() {
    if (arReadyPromise) return arReadyPromise;
    setStatus('Preparing AR scene…');
    arReadyPromise = prepareARModel()
      .then(function (mv) {
        setStatus('AR ready - tap “View in Your Room”', true);
        var slot = qs('#arLaunchSlot');
        if (slot) slot.disabled = false;
        return mv;
      })
      .catch(function (e) {
        arReadyPromise = null;
        console.error('[AR] prepare failed', e);
        setStatus('AR prep failed - retrying on next change', true);
        throw e;
      });
    return arReadyPromise;
  }

  function invalidateARModel() {
    arReadyPromise = null;
    arHostedUrl = null;
    var mv = qs('#modelViewer');
    if (mv) mv.removeAttribute('src');
    var slot = qs('#arLaunchSlot');
    if (slot) slot.disabled = true;
  }

  async function launchAR() {
    const mv = qs('#modelViewer');
    if (currentMode !== '3d') switchMode('3d');

    if (arCapability.mode === 'qr-handoff' || arCapability.mode === 'none') {
      showHandoffModal();
      return;
    }
    if (!mv) { showToast('AR not available', 'error'); return; }

    try { await queueARPrepare(); }
    catch { showToast('Could not prepare AR. Retry.', 'error'); return; }

    const canvas3d = qs('#bouquet3DCanvas');
    if (canvas3d) canvas3d.style.display = 'none';
    mv.style.display = 'block';

    let canAR = false;
    try { canAR = await Promise.resolve(mv.canActivateAR); } catch (_) { }
    if (canAR) {
      try { mv.activateAR(); return; } catch (e) { console.warn('[AR]', e); }
    }
    showToast('Tap "View in Your Room" above the model.', 'info');
  }


  function onConfigChange() {
    updatePrice();
    scheduleAIPreview();
    try {
      window.history.replaceState(null, '', buildHandoffURL());
    } catch (_) { }
    if (currentMode === '3d') {
      sync3DConfig();
      invalidateARModel();
      clearTimeout(window.__arDebounce);
      window.__arDebounce = setTimeout(function () {
        if (currentMode === '3d') queueARPrepare().catch(function () { });
      }, 900);
    }
  }

  function updateDefaultPreview() {
    var emojis = { rose: '🌹', tulip: '🌷', lily: '🌸', orchid: '🪷', sunflower: '🌻', peony: '✿' };
    if (!productId) {
      var preview = qs('#previewDefault');
      if (preview) {
        var hex = config.colorHex || '#DC143C';
        preview.innerHTML =
          '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px">' +
          '<div style="font-size:6rem;filter:drop-shadow(0 8px 24px ' + hex + '40);transition:all .4s ease">' + (emojis[config.flower] || '🌸') + '</div>' +
          '<div style="display:flex;gap:4px;align-items:center;padding:6px 16px;border-radius:100px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">' +
          '<span style="width:12px;height:12px;border-radius:50%;background:' + hex + ';display:inline-block"></span>' +
          '<span style="font-size:.78rem;color:rgba(255,255,255,.5);font-weight:500">' + config.bloomCount + ' ' + config.flower + 's</span>' +
          '</div>' +
          '</div>';
      }
    }
  }

  function syncConfigToUI() {
    qsa('#flowerPills .option-pill').forEach(function (pill) {
      pill.classList.toggle('selected', pill.dataset.flower === config.flower);
    });
    var bloomInput = qs('#bloomCount');
    if (bloomInput) {
      bloomInput.value = config.bloomCount;
      var label = qs('#bloomCountLabel');
      if (label) label.textContent = config.bloomCount + ' stems';
    }
    qsa('#colorSwatches .swatch').forEach(function (swatch) {
      swatch.classList.toggle('selected', swatch.dataset.color === config.color);
    });
    qsa('input[data-config]').forEach(function (input) {
      const key = input.dataset.config;
      input.checked = !!config[key];
      if (key === 'engraving') {
        var el = qs('#engravingText');
        if (el) el.style.display = input.checked ? 'block' : 'none';
      }
      if (key === 'greetingCard') {
        var el2 = qs('#cardText');
        if (el2) el2.style.display = input.checked ? 'block' : 'none';
      }
      if (key === 'logoUpload') {
        var el3 = qs('#logoUploadArea');
        if (el3) el3.style.display = input.checked ? 'block' : 'none';
      }
    });
    var engInput = qs('#engravingInput');
    if (engInput) engInput.value = config.engravingText || '';
    var cardInp = qs('#cardInput');
    if (cardInp) cardInp.value = config.cardText || '';
    updatePrice();
    updateDefaultPreview();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var urlParams = new URLSearchParams(window.location.search);

    // Parse handoff configurations from URL query parameters
    Object.keys(config).forEach(key => {
      if (urlParams.has(key)) {
        const val = urlParams.get(key);
        if (typeof config[key] === 'boolean') {
          config[key] = val === 'true';
        } else if (typeof config[key] === 'number') {
          config[key] = Number(val);
        } else {
          config[key] = val;
        }
      }
    });
    syncConfigToUI();
    if (urlParams.get('id')) {
      productId = urlParams.get('id');
      var loadProductData = function () {
        if (!window.Api) return;
        window.Api.get('/api/products/' + productId).then(p => {
          const raw = p.price_php ?? p.base_price_php ?? p.base_price ?? p.basePrice ?? 64.99;
          basePricePHP = toPHP(raw);
          const t = qs('#productTitle'); if (t) t.textContent = p.name || 'Custom Bouquet';
          updatePrice();
          var pImgs = p.images || [];
          if (typeof pImgs === 'string') { try { pImgs = JSON.parse(pImgs); } catch (e) { } }
          var mainImg = Array.isArray(pImgs) && pImgs.length ? pImgs.flat(Infinity)[0] : '';
          if (typeof mainImg === 'string') {
            var cleanStr = mainImg.replace(/[\[\]"\\]/g, '/');
            var parts = cleanStr.split('/');
            var filename = parts[parts.length - 1];
            mainImg = filename && filename !== 'null' ? '/uploads/products/' + filename : '';
          }
          if (mainImg) {
            var preview = qs('#previewDefault');
            if (preview) preview.innerHTML = '<img src="' + mainImg + '" style="width:100%;height:100%;object-fit:contain;" alt="' + (p.name || 'Product') + '">';
          }
        }).catch(() => {
          basePricePHP = toPHP(64.99);
          updatePrice();
        });
      };
      loadProductData();
      if (typeof io !== 'undefined') {
        var socket = io();
        socket.on('catalog_update', loadProductData);
      }
    }

    updatePrice();
    updateDefaultPreview();
    refreshARCapability();

    qsa('.config-section-header').forEach(function (header) {
      header.addEventListener('click', function () {
        var sec = header.closest('.config-section');
        if (sec) sec.classList.toggle('open');
      });
    });

    qsa('#flowerPills .option-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        qsa('#flowerPills .option-pill').forEach(function (p) { p.classList.remove('selected'); });
        pill.classList.add('selected');
        config.flower = pill.dataset.flower;
        updateDefaultPreview();
        onConfigChange();
      });
    });

    var bloomInput = qs('#bloomCount');
    if (bloomInput) {
      bloomInput.addEventListener('input', function (e) {
        config.bloomCount = Number(e.target.value);
        var label = qs('#bloomCountLabel');
        if (label) label.textContent = config.bloomCount + ' stems';
        updateDefaultPreview();
        onConfigChange();
      });
    }

    qsa('#colorSwatches .swatch').forEach(function (swatch) {
      swatch.addEventListener('click', function () {
        qsa('.swatch').forEach(function (s) { s.classList.remove('selected'); });
        swatch.classList.add('selected');
        config.color = swatch.dataset.color;
        config.colorHex = swatch.dataset.hex;
        updateDefaultPreview();
        onConfigChange();
      });
    });

    qsa('input[data-config]').forEach(function (input) {
      input.addEventListener('change', function () {
        var key = input.dataset.config;
        config[key] = input.checked;
        if (key === 'engraving') {
          var el = qs('#engravingText');
          if (el) el.style.display = input.checked ? 'block' : 'none';
        }
        if (key === 'greetingCard') {
          var el2 = qs('#cardText');
          if (el2) el2.style.display = input.checked ? 'block' : 'none';
        }
        if (key === 'logoUpload') {
          var el3 = qs('#logoUploadArea');
          if (el3) el3.style.display = input.checked ? 'block' : 'none';
        }
        onConfigChange();
      });
    });

    var engInput = qs('#engravingInput');
    if (engInput) engInput.addEventListener('input', function (e) { config.engravingText = e.target.value; });
    var cardInp = qs('#cardInput');
    if (cardInp) cardInp.addEventListener('input', function (e) { config.cardText = e.target.value; });

    var dragUpload = qs('#dragUpload');
    var logoFile = qs('#logoFile');

    if (dragUpload) {
      dragUpload.addEventListener('click', function () { if (logoFile) logoFile.click(); });
      dragUpload.addEventListener('dragover', function (e) { e.preventDefault(); dragUpload.classList.add('dragover'); });
      dragUpload.addEventListener('dragleave', function () { dragUpload.classList.remove('dragover'); });
      dragUpload.addEventListener('drop', function (e) {
        e.preventDefault();
        dragUpload.classList.remove('dragover');
        var file = e.dataTransfer.files[0];
        if (file) uploadLogo(file);
      });
    }
    if (logoFile) logoFile.addEventListener('change', function (e) { if (e.target.files[0]) uploadLogo(e.target.files[0]); });

    var removeLogoBtn = qs('#removeLogo');
    if (removeLogoBtn) {
      removeLogoBtn.addEventListener('click', function () {
        config.logoUrl = null;
        var preview = qs('#logoPreview');
        var drag = qs('#dragUpload');
        if (preview) preview.style.display = 'none';
        if (drag) drag.style.display = 'block';
        if (logoFile) logoFile.value = '';
      });
    }

    var modeDefaultBtn = qs('#modeDefault');
    var modeAIBtn = qs('#modeAI');
    var mode3DBtn = qs('#mode3D');
    var modeARBtn = qs('#modeAR');

    if (modeDefaultBtn) modeDefaultBtn.addEventListener('click', function () { switchMode('default'); });
    if (modeAIBtn) modeAIBtn.addEventListener('click', function () { switchMode('ai'); });
    if (mode3DBtn) mode3DBtn.addEventListener('click', function () { switchMode('3d'); });
    if (modeARBtn) {
      modeARBtn.addEventListener('pointerdown', function () {
        if (currentMode !== '3d') {
          init3DBouquet();
          queueARPrepare().catch(function () { });
        }
      });
      modeARBtn.addEventListener('click', function () {
        var mv = qs('#modelViewer');
        if (mv && mv.canActivateAR && arHostedUrl) {
          try { mv.activateAR(); return; } catch (e) { }
        }
        launchAR();
      });
    }
    var arSlot = qs('#arLaunchSlot');
    if (arSlot) {
      arSlot.disabled = true;
      arSlot.addEventListener('click', function (ev) {
        var mv = qs('#modelViewer');
        if (mv && mv.canActivateAR) {
          try { mv.activateAR(); }
          catch (e) { console.warn('[AR] slot activate failed', e); }
        }
      });
    }

    var zoomLevel = 1;
    var zoomInBtn = qs('#zoomIn');
    var zoomOutBtn = qs('#zoomOut');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', function () {
        zoomLevel = Math.min(2, zoomLevel + 0.1);
        applyZoom();
      });
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', function () {
        zoomLevel = Math.max(0.5, zoomLevel - 0.1);
        applyZoom();
      });
    }

    function applyZoom() {
      var targets = qsa('.preview-mode');
      targets.forEach(function (t) {
        if (t.style.display !== 'none' && !t.querySelector('canvas')) {
          t.style.transform = 'scale(' + zoomLevel + ')';
          t.style.transition = 'transform 0.3s ease';
        }
      });
    }

    var addBtn = qs('#addCustomToCart');
    if (addBtn) {
      addBtn.addEventListener('click', async function () {
        if (!window.Api) return;
        const original = addBtn.innerHTML;
        addBtn.disabled = true;
        addBtn.innerHTML = '🛒 Adding...';
        const clientLineId = 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        try {
          const id = productId || 'custom';
          const cusRes = await window.Api.post('/api/customization', { productId: id, config: config });
          const cartItemPayload = {
            productId: id,
            qty: 1,
            customization: {
              clientLineId,
              ...config,
              id: cusRes.id,
              priceDeltaPHP
            }
          };
          await window.Api.post('/api/cart/items', cartItemPayload);

          const Store = window.__BloomStore || window.Store;
          if (Store) {
            const cartData = (await window.Api.get('/cart')) || { items: [] };
            Store.set('cart', cartData);
            const count = (cartData.items || []).reduce((s, i) => s + (i.qty || 1), 0);
            if (Store.updateCartCount) Store.updateCartCount(count);
          }
          showToast('Custom arrangement added 🌸', 'success');
          setTimeout(() => location.href = '/cart.html', 700);
        } catch (e) {
          showToast((e && e.message) || 'Error adding to cart', 'error');
        } finally {
          addBtn.disabled = false;
          addBtn.innerHTML = original;
        }
      });
    }

    var saveBtn = qs('#saveCustomization');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var Store = window.Store;
        var Api = window.Api;
        if (!Store || !Api) return;
        var user = Store.get('user');
        if (!user || user.isGuest) { showToast('Sign in to save designs', 'info'); return; }
        var doSave = function () {
          if (!customizationId) {
            Api.post('/api/customization', { productId: productId || 'custom', config: config })
              .then(function (res) {
                customizationId = res.id;
                return Api.post('/api/customization/' + customizationId + '/save', {});
              })
              .then(function () { showToast('Design saved to your account 💾', 'success'); })
              .catch(function () { showToast('Could not save design', 'error'); });
          } else {
            Api.post('/api/customization/' + customizationId + '/save', {})
              .then(function () { showToast('Design saved to your account 💾', 'success'); })
              .catch(function () { showToast('Could not save design', 'error'); });
          }
        };
        doSave();
      });
    }
  });

  function uploadLogo(file) {
    var Api = window.Api;
    if (!Api || !Api.upload) { showToast('Upload unavailable', 'error'); return; }
    var fd = new FormData();
    fd.append('design', file);
    Api.upload('/api/customization/upload', fd)
      .then(function (res) {
        config.logoUrl = res.url;
        var preview = qs('#logoPreview');
        var img = qs('#logoPreviewImg');
        var drag = qs('#dragUpload');
        if (preview) preview.style.display = 'block';
        if (img) img.src = res.url;
        if (drag) drag.style.display = 'none';
        showToast('Logo uploaded!', 'success');
      })
      .catch(function () { showToast('Upload failed', 'error'); });
  }
})();
