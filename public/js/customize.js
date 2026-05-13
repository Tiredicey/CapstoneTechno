(function () {
  'use strict';

  var POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/';
  var MODEL_SRC_LOCAL = '/models/bouquet.glb';

  var basePrice = 64.99;
  var priceDelta = 0;
  var config = {
    flower: 'rose',
    color: 'crimson',
    colorHex: '#DC143C',
    bloomCount: 12,
    wrapping_premium: false,
    wrapping_luxury: false,
    ribbon_satin: false,
    ribbon_velvet: false,
    giftBox: false,
    engraving: false,
    engravingText: '',
    greetingCard: false,
    cardText: '',
    logoUpload: false,
    customDesign: false,
    logoUrl: null,
    customDesignUrl: null
  };
  var productId = null;
  var customizationId = null;
  var currentMode = 'default';
  var aiDebounce = null;
  var lastAiPromptHash = '';
  var bouquet3DInited = false;

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return Array.from(document.querySelectorAll(s)); }

  function fmt(n) {
    return '\u20B1' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    priceDelta = 0;
    if (config.wrapping_premium) priceDelta += 8;
    if (config.wrapping_luxury) priceDelta += 15;
    if (config.ribbon_satin) priceDelta += 3;
    if (config.ribbon_velvet) priceDelta += 6;
    if (config.giftBox) priceDelta += 10;
    if (config.engraving) priceDelta += 12;
    if (config.logoUpload) priceDelta += 20;
    if (config.customDesign) priceDelta += 15;
    var extraStems = Math.max(0, config.bloomCount - 12);
    priceDelta += Math.floor(extraStems / 3) * 2;
    var total = basePrice + priceDelta;
    var livePriceEl = qs('#livePrice');
    var cartPriceBtn = qs('#cartPriceBtn');
    if (livePriceEl) livePriceEl.textContent = fmt(total);
    if (cartPriceBtn) cartPriceBtn.textContent = fmt(total);
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
        status.textContent = 'Procedural 3D Bouquet — Drag to rotate';
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
      setTimeout(function () { queueARPrepare().catch(function () {}); }, 500);
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
    var ua = navigator.userAgent;
    var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    var isAndroid = /Android/.test(ua);
    var isWin = /Windows NT/.test(ua);
    var hasXR = !!(navigator.xr && navigator.xr.isSessionSupported);
    if (isIOS) return { mode: 'quick-look', label: 'iOS AR Ready', tone: 'ok', needsUSDZ: true };
    if (isAndroid) return { mode: 'scene-viewer', label: 'Android AR Ready', tone: 'ok', needsHTTPS: true };
    if (hasXR) return { mode: 'webxr', label: 'WebXR Capable', tone: 'ok' };
    if (isWin) return { mode: 'webxr', label: 'Windows — Use Edge/Chrome w/ WebXR', tone: 'warn' };
    return { mode: null, label: '3D Only — AR unsupported', tone: 'no' };
  }

  async function refreshARCapability() {
    arCapability = detectARCapability();
    if (navigator.xr && navigator.xr.isSessionSupported) {
      try {
        var ok = await navigator.xr.isSessionSupported('immersive-ar');
        if (ok && arCapability.tone !== 'ok') {
          arCapability = { mode: 'webxr', label: 'WebXR Immersive AR Ready', tone: 'ok' };
        }
      } catch (e) {}
    }
    var el = qs('#arCapability');
    if (el) {
      el.style.display = 'inline-flex';
      el.className = 'ar-capability ' + arCapability.tone;
      el.innerHTML = '<span class="dot"></span>' + arCapability.label;
    }
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
    try { URL.revokeObjectURL(blobUrl); } catch (e) {}
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
        setStatus('AR ready — tap “View in Your Room”', true);
        var slot = qs('#arLaunchSlot');
        if (slot) slot.disabled = false;
        return mv;
      })
      .catch(function (e) {
        arReadyPromise = null;
        console.error('[AR] prepare failed', e);
        setStatus('AR prep failed — retrying on next change', true);
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

  function launchAR() {
    var mv = qs('#modelViewer');
    if (!mv) { showToast('AR not available on this browser', 'error'); return; }
    if (currentMode !== '3d') switchMode('3d');
    var canvas3d = qs('#bouquet3DCanvas');

    if (arReadyPromise && arHostedUrl && mv.getAttribute('src')) {
      if (canvas3d) canvas3d.style.display = 'none';
      mv.style.display = 'block';

      var isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
      if (!isMobile && arCapability.tone !== 'ok') {
        showToast('AR is best experienced on mobile. Open this page on your phone to see the bouquet in your room.', 'info');
        return;
      }

      var canAR = false;
      try { canAR = !!mv.canActivateAR; } catch (e) {}
      if (canAR) {
        try {
          mv.activateAR();
          return;
        } catch (e) {
          console.warn('[AR] activateAR failed:', e);
        }
      }

      if (arCapability.tone === 'no') {
        showToast('Device unsupported. Use a recent Chrome (Android) or Safari (iOS).', 'info');
        return;
      }

      if (arCapability.needsUSDZ) {
        showToast('iOS requires Safari for AR. If in another app, open in Safari.', 'info');
        return;
      }

      showToast('Tap the floating “View in Your Room” button above the model.', 'success');
      return;
    }

    setStatus('Preparing AR — tap again in a moment…');
    queueARPrepare()
      .then(function () {
        if (canvas3d) canvas3d.style.display = 'none';
        mv.style.display = 'block';
        showToast('AR ready — tap “View in Your Room” again', 'success');
      })
      .catch(function () {
        showToast('Could not prepare AR. Check connection and retry.', 'error');
      });
  }


  function onConfigChange() {
    updatePrice();
    scheduleAIPreview();
    if (currentMode === '3d') {
      sync3DConfig();
      invalidateARModel();
      clearTimeout(window.__arDebounce);
      window.__arDebounce = setTimeout(function () {
        if (currentMode === '3d') queueARPrepare().catch(function () {});
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

  document.addEventListener('DOMContentLoaded', function () {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id')) {
      productId = urlParams.get('id');
      var loadProductData = function () {
        if (!window.Api) return;
        Api.get('/api/products/' + productId).then(function (p) {
          basePrice = p.base_price || p.basePrice || 64.99;
          var titleEl = qs('#productTitle');
          if (titleEl) titleEl.textContent = p.name;
          updatePrice();
          var pImgs = p.images || [];
          if (typeof pImgs === 'string') { try { pImgs = JSON.parse(pImgs); } catch (e) {} }
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
        }).catch(function () {});
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
          queueARPrepare().catch(function () {});
        }
      });
      modeARBtn.addEventListener('click', function () {
        var mv = qs('#modelViewer');
        if (mv && mv.canActivateAR && arHostedUrl) {
          try { mv.activateAR(); return; } catch (e) {}
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
      addBtn.addEventListener('click', function () {
        addBtn.disabled = true;
        addBtn.textContent = 'Adding…';
        var id = productId || 'custom';
        var Api = window.Api;
        var Store = window.Store;
        if (!Api) {
          showToast('Service unavailable', 'error');
          addBtn.disabled = false;
          addBtn.innerHTML = '🛒 Add to Cart — <span id="cartPriceBtn">' + fmt(basePrice + priceDelta) + '</span>';
          return;
        }
        Api.post('/api/customization', { productId: id, config: config })
          .then(function (cusRes) {
            customizationId = cusRes.id;
            return Api.post('/api/cart/items', {
              productId: id,
              qty: 1,
              customization: Object.assign({}, config, { id: customizationId, priceDelta: cusRes.priceDelta })
            });
          })
          .then(function () { return Api.get('/api/cart'); })
          .then(function (cart) {
            if (Store) {
              Store.set('cart', cart);
              if (Store.updateCartCount) {
                Store.updateCartCount((cart.items || []).reduce(function (s, i) { return s + (i.qty || 1); }, 0));
              }
            }
            showToast('Custom arrangement added to cart 🌸', 'success');
            setTimeout(function () { window.location.href = '/cart.html'; }, 800);
          })
          .catch(function (e) {
            showToast((e && e.message) || 'Error adding to cart', 'error');
          })
          .finally(function () {
            addBtn.disabled = false;
            addBtn.innerHTML = '🛒 Add to Cart — <span id="cartPriceBtn">' + fmt(basePrice + priceDelta) + '</span>';
          });
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
