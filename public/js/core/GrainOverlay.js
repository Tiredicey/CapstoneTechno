(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var STORAGE_KEY = 'bloom_grain_enabled';

  function getPref() {
    try { var v = localStorage.getItem(STORAGE_KEY); return v === null ? true : v === '1'; } catch (e) { return true; }
  }

  function setPref(v) {
    try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0'); } catch (e) {}
  }

  var canvas = document.createElement('canvas');
  canvas.id = 'bloomGrainCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99990;opacity:0.04;mix-blend-mode:overlay;';
  var enabled = getPref();
  if (!enabled) canvas.style.display = 'none';

  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var w = 256, h = 256;
  canvas.width = w;
  canvas.height = h;

  var imageData = ctx.createImageData(w, h);
  var data = imageData.data;
  var tintPhase = 0;

  function renderGrain() {
    tintPhase += 0.008;
    var rTint = Math.sin(tintPhase) * 12;
    var gTint = Math.sin(tintPhase + 2.09) * 8;
    var bTint = Math.sin(tintPhase + 4.19) * 10;
    for (var i = 0; i < data.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      data[i] = Math.min(255, Math.max(0, v + rTint));
      data[i + 1] = Math.min(255, Math.max(0, v + gTint));
      data[i + 2] = Math.min(255, Math.max(0, v + bTint));
      data[i + 3] = 22;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  var frame = 0;
  function loop() {
    if (!enabled) { requestAnimationFrame(loop); return; }
    frame++;
    if (frame % 3 === 0) renderGrain();
    requestAnimationFrame(loop);
  }

  function init() {
    document.body.appendChild(canvas);
    renderGrain();
    loop();
  }

  function toggle() {
    enabled = !enabled;
    setPref(enabled);
    canvas.style.display = enabled ? '' : 'none';
    updateToggleUI();
  }

  function updateToggleUI() {
    var btn = document.getElementById('bloomGrainToggle');
    if (btn) {
      btn.setAttribute('aria-pressed', String(enabled));
      btn.classList.toggle('ba-active', enabled);
      var lbl = btn.querySelector('.bg-lbl');
      if (lbl) lbl.textContent = enabled ? 'Grain On' : 'Grain Off';
    }
  }

  function injectToggle() {
    var acts = document.querySelector('#nav .n-acts');
    if (!acts || document.getElementById('bloomGrainToggle')) return;
    var btn = document.createElement('button');
    btn.id = 'bloomGrainToggle';
    btn.className = 'btn btn-g btn-sm bloom-grain-toggle';
    btn.setAttribute('aria-label', 'Toggle grain texture overlay');
    btn.setAttribute('aria-pressed', String(enabled));
    if (enabled) btn.classList.add('ba-active');
    btn.innerHTML = '<span class="bg-ico">\u2588</span><span class="bg-lbl">' + (enabled ? 'Grain On' : 'Grain Off') + '</span>';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });
    var audioBtn = document.getElementById('bloomAmbientToggle');
    if (audioBtn && audioBtn.nextSibling) {
      acts.insertBefore(btn, audioBtn.nextSibling);
    } else {
      acts.insertBefore(btn, acts.children[1] || null);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); injectToggle(); });
  } else {
    init();
    injectToggle();
  }

  window.BloomGrain = { toggle: toggle };
})();
