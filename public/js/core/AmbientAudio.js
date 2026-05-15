(function () {
  'use strict';
  var ctx = null;
  var masterGain = null;
  var playing = false;
  var nodes = [];
  var STORAGE_KEY = 'bloom_ambient_audio';

  function getPreference() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }

  function setPreference(v) {
    try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0'); } catch (e) {}
  }

  function createOscLayer(freq, type, gain, detune) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune || 0;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    nodes.push(osc, g);
    return osc;
  }

  function createNoise(vol) {
    var bufferSize = ctx.sampleRate * 4;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 0.7;
    var g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    src.start();
    nodes.push(src, filter, g);
  }

  function startAudio() {
    if (playing) return;
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);
    createOscLayer(55, 'sine', 0.08, 0);
    createOscLayer(82.5, 'sine', 0.04, 5);
    createOscLayer(110, 'triangle', 0.025, -3);
    createOscLayer(165, 'sine', 0.012, 8);
    createNoise(0.015);
    masterGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2.5);
    playing = true;
    setPreference(true);
    updateUI(true);
  }

  function stopAudio() {
    if (!playing || !masterGain) return;
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    setTimeout(function () {
      nodes.forEach(function (n) { try { n.stop && n.stop(); n.disconnect(); } catch (e) {} });
      nodes = [];
      if (masterGain) { masterGain.disconnect(); masterGain = null; }
    }, 1400);
    playing = false;
    setPreference(false);
    updateUI(false);
  }

  function toggle() {
    if (playing) stopAudio(); else startAudio();
  }

  function updateUI(on) {
    var btn = document.getElementById('bloomAmbientToggle');
    if (!btn) return;
    var ico = btn.querySelector('.ba-ico');
    var lbl = btn.querySelector('.ba-lbl');
    if (ico) ico.textContent = on ? '\u266B' : '\u266A';
    if (lbl) lbl.textContent = on ? 'Sound On' : 'Sound Off';
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('ba-active', on);
  }

  function injectToggle() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var acts = nav.querySelector('.n-acts');
    if (!acts) return;
    if (document.getElementById('bloomAmbientToggle')) return;
    var btn = document.createElement('button');
    btn.id = 'bloomAmbientToggle';
    btn.className = 'btn btn-g btn-sm bloom-ambient-toggle';
    btn.setAttribute('aria-label', 'Toggle ambient sound');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = '<span class="ba-ico">\u266A</span><span class="ba-lbl">Sound Off</span>';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });
    acts.insertBefore(btn, acts.firstChild);
    if (getPreference()) {
      var handler = function () {
        document.removeEventListener('click', handler);
        document.removeEventListener('keydown', handler);
        startAudio();
      };
      document.addEventListener('click', handler, { once: true });
      document.addEventListener('keydown', handler, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }

  window.BloomAmbientAudio = { toggle: toggle, start: startAudio, stop: stopAudio };
})();
