(function () {
  'use strict';
  if (!window.MediaRecorder || !navigator.mediaDevices) return;

  var stream = null;
  var recorder = null;
  var chunks = [];
  var videoBlob = null;
  var recordingTimer = null;
  var elapsed = 0;
  var MAX_SECONDS = 30;
  var currentObjectUrl = null;
  var pickedMime = '';

  window.BloomVideoMessage = {
    getBlobAsync: function () {
      return new Promise(function (resolve) {
        if (recorder && recorder.state !== 'inactive') {
          var done = false;
          var resolver = function () { if (done) return; done = true; resolve(videoBlob); };
          recorder.addEventListener('stop', resolver, { once: true });
          try { recorder.requestData(); } catch (e) {}
          try { recorder.stop(); } catch (e) {}
          setTimeout(resolver, 2500);
        } else {
          resolve(videoBlob);
        }
      });
    },
    getBlob: function () { return videoBlob; },
    getMime: function () { return pickedMime || 'video/webm'; },
    getExtension: function () {
      var m = (pickedMime || 'video/webm').toLowerCase();
      if (m.indexOf('mp4') !== -1) return 'mp4';
      if (m.indexOf('ogg') !== -1) return 'ogg';
      return 'webm';
    },
    reset: function () { videoBlob = null; revokeUrl(); updatePreview(); showControls('start'); },
    attachTo: function (containerId) {
      var host = document.getElementById(containerId);
      if (!host || host.dataset.vmInit) return;
      host.dataset.vmInit = '1';
      injectStyles();
      host.innerHTML = buildUI();
      bindEvents(host);
    },
    forceStop: function () {
      if (recorder && recorder.state !== 'inactive') stopRecording();
    }
  };

  function revokeUrl() {
    if (currentObjectUrl) {
      try { URL.revokeObjectURL(currentObjectUrl); } catch (e) {}
      currentObjectUrl = null;
    }
  }

  function buildUI() {
    return '' +
      '<div class="vm-wrap">' +
        '<div class="vm-hd">' +
          '<span class="vm-title">\uD83C\uDFA5 Video Greeting</span>' +
          '<span class="vm-api-tag">MediaRecorder</span>' +
        '</div>' +
        '<div class="vm-stage">' +
          '<video class="vm-preview" id="vmPreview" playsinline muted></video>' +
          '<video class="vm-playback" id="vmPlayback" playsinline style="display:none"></video>' +
          '<div class="vm-overlay" id="vmOverlay">' +
            '<div class="vm-rec-dot"></div>' +
            '<div class="vm-timer" id="vmTimer">0:00</div>' +
          '</div>' +
          '<div class="vm-placeholder" id="vmPlaceholder">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;opacity:.4"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' +
            '<span>Record a personal video greeting</span>' +
            '<span class="vm-note">Up to 30 seconds \u00b7 Camera + microphone required</span>' +
          '</div>' +
        '</div>' +
        '<div class="vm-controls">' +
          '<button type="button" class="vm-btn vm-btn-start" id="vmStart">\u25CF Record</button>' +
          '<button type="button" class="vm-btn vm-btn-stop" id="vmStop" style="display:none">\u25A0 Stop</button>' +
          '<button type="button" class="vm-btn vm-btn-retake" id="vmRetake" style="display:none">Retake</button>' +
          '<button type="button" class="vm-btn vm-btn-accept" id="vmAccept" style="display:none">Attach</button>' +
        '</div>' +
      '</div>';
  }

  function bindEvents(host) {
    host.querySelector('#vmStart').addEventListener('click', startRecording);
    host.querySelector('#vmStop').addEventListener('click', stopRecording);
    host.querySelector('#vmRetake').addEventListener('click', function () {
      videoBlob = null;
      revokeUrl();
      updatePreview();
      showControls('start');
    });
    host.querySelector('#vmAccept').addEventListener('click', function () {
      if (!videoBlob || videoBlob.size === 0) return;
      showControls('done');
      if (window.showToast) window.showToast('\uD83C\uDFA5 Video greeting attached', 'success');
      var event = new CustomEvent('bloom:video-attached', { detail: { blob: videoBlob, size: videoBlob.size } });
      document.dispatchEvent(event);
    });
  }

  function showControls(state) {
    var startBtn = document.getElementById('vmStart');
    var stopBtn = document.getElementById('vmStop');
    var retakeBtn = document.getElementById('vmRetake');
    var acceptBtn = document.getElementById('vmAccept');
    if (!startBtn) return;
    startBtn.style.display = state === 'start' ? '' : 'none';
    stopBtn.style.display = state === 'recording' ? '' : 'none';
    retakeBtn.style.display = (state === 'review' || state === 'done') ? '' : 'none';
    acceptBtn.style.display = state === 'review' ? '' : 'none';
  }

  async function startRecording() {
    var preview = document.getElementById('vmPreview');
    var placeholder = document.getElementById('vmPlaceholder');
    var overlay = document.getElementById('vmOverlay');
    var playback = document.getElementById('vmPlayback');

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });
    } catch (e) {
      if (window.showToast) window.showToast('Camera access denied or unavailable', 'error');
      return;
    }

    videoBlob = null;
    revokeUrl();
    if (preview) {
      preview.srcObject = stream;
      preview.style.display = 'block';
      preview.play().catch(function () {});
    }
    if (playback) {
      try { playback.pause(); } catch (e) {}
      playback.removeAttribute('src');
      try { playback.load(); } catch (e) {}
      playback.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'none';
    if (overlay) overlay.style.display = 'flex';

    chunks = [];
    var candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a',
      'video/mp4'
    ];
    pickedMime = '';
    for (var i = 0; i < candidates.length; i++) {
      if (MediaRecorder.isTypeSupported(candidates[i])) {
        pickedMime = candidates[i];
        break;
      }
    }

    var options = pickedMime ? { mimeType: pickedMime } : undefined;
    recorder = new MediaRecorder(stream, options);
    recorder.ondataavailable = function (e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
    recorder.onerror = function (e) {
      if (window.showToast) window.showToast('Recording error: ' + (e.error && e.error.name || 'unknown'), 'error');
    };
    recorder.onstop = function () {
      var blobType = pickedMime && pickedMime.split(';')[0] ? pickedMime.split(';')[0] : 'video/webm';
      videoBlob = new Blob(chunks, { type: blobType });
      stopStream();
      setTimeout(function () { updatePreview(); showControls('review'); }, 60);
    };

    try { recorder.start(250); } catch (e) { recorder.start(); }
    elapsed = 0;
    updateTimer();
    recordingTimer = setInterval(function () {
      elapsed++;
      updateTimer();
      if (elapsed >= MAX_SECONDS) stopRecording();
    }, 1000);
    showControls('recording');
  }

  function stopRecording() {
    if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.requestData(); } catch (e) {}
      try { recorder.stop(); } catch (e) {}
    }
    var overlay = document.getElementById('vmOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function stopStream() {
    if (stream) {
      try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      stream = null;
    }
    var preview = document.getElementById('vmPreview');
    if (preview) {
      try { preview.pause(); } catch (e) {}
      preview.srcObject = null;
      preview.removeAttribute('src');
      try { preview.load(); } catch (e) {}
      preview.style.display = 'none';
    }
  }

  function updateTimer() {
    var el = document.getElementById('vmTimer');
    if (!el) return;
    var m = Math.floor(elapsed / 60);
    var s = elapsed % 60;
    el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    var remaining = MAX_SECONDS - elapsed;
    if (remaining <= 5) el.style.color = 'rgba(230,26,26,.9)';
    else el.style.color = '#fff';
  }

  function updatePreview() {
    var playback = document.getElementById('vmPlayback');
    var placeholder = document.getElementById('vmPlaceholder');
    var preview = document.getElementById('vmPreview');

    if (!playback) return;
    if (videoBlob && videoBlob.size > 0) {
      revokeUrl();
      currentObjectUrl = URL.createObjectURL(videoBlob);
      if (preview) preview.style.display = 'none';
      if (placeholder) placeholder.style.display = 'none';

      playback.style.display = 'block';
      playback.muted = false;
      playback.controls = true;
      playback.setAttribute('controls', 'controls');
      playback.setAttribute('playsinline', 'playsinline');
      playback.src = currentObjectUrl;

      var onReady = function () {
        playback.removeEventListener('loadedmetadata', onReady);
        try { playback.currentTime = 0; } catch (e) {}
      };
      playback.addEventListener('loadedmetadata', onReady);
      try { playback.load(); } catch (e) {}
    } else {
      try { playback.pause(); } catch (e) {}
      playback.removeAttribute('src');
      try { playback.load(); } catch (e) {}
      playback.style.display = 'none';
      revokeUrl();
      if (preview) preview.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
    }
  }

  function injectStyles() {
    if (document.getElementById('vmStyles')) return;
    var s = document.createElement('style');
    s.id = 'vmStyles';
    s.textContent =
      '.vm-wrap{border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.03)}' +
      '.vm-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.06)}' +
      '.vm-title{font-weight:700;font-size:.82rem}' +
      '.vm-api-tag{font-size:.58rem;padding:2px 7px;border-radius:4px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);color:rgba(56,189,248,.85);font-weight:600;letter-spacing:.04em}' +
      '.vm-stage{position:relative;aspect-ratio:16/9;background:#000;overflow:hidden}' +
      '.vm-preview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;background:#000;transform:scaleX(-1)}' +
      '.vm-playback{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:5}' +
      '.vm-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(255,255,255,.55);font-size:.84rem;text-align:center;padding:20px;z-index:2}' +
      '.vm-note{font-size:.68rem;color:rgba(255,255,255,.3)}' +
      '.vm-overlay{position:absolute;top:12px;left:12px;display:none;align-items:center;gap:8px;padding:5px 12px;border-radius:100px;background:rgba(230,26,26,.92);backdrop-filter:blur(8px);z-index:6;color:#fff;font-weight:700;font-size:.72rem;letter-spacing:.1em}' +
      '.vm-timer{font-variant-numeric:tabular-nums}' +
      '.vm-rec-dot{width:8px;height:8px;border-radius:50%;background:#fff;animation:vm-blink 1s ease-in-out infinite}' +
      '@keyframes vm-blink{0%,100%{opacity:1}50%{opacity:.3}}' +
      '.vm-controls{display:flex;gap:8px;padding:12px 16px}' +
      '.vm-btn{flex:1;padding:9px 14px;border-radius:10px;font-size:.82rem;font-weight:700;border:none;cursor:pointer;transition:all .2s;font-family:inherit}' +
      '.vm-btn-start{background:linear-gradient(135deg,#a81010,#e61a1a);color:#fff}' +
      '.vm-btn-start:hover{box-shadow:0 4px 16px rgba(230,26,26,.4);transform:translateY(-1px)}' +
      '.vm-btn-stop{background:rgba(230,26,26,.15);color:#ff3b3b;border:1px solid rgba(230,26,26,.3)}' +
      '.vm-btn-retake{background:rgba(255,255,255,.06);color:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.1)}' +
      '.vm-btn-accept{background:linear-gradient(135deg,#00a882,#00d4aa);color:#fff}' +
      '.vm-btn-accept:hover{box-shadow:0 4px 16px rgba(0,212,170,.4);transform:translateY(-1px)}' +
      '[data-theme="light"] .vm-wrap{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.08)}' +
      '[data-theme="light"] .vm-hd{border-bottom-color:rgba(0,0,0,.06)}' +
      '[data-theme="light"] .vm-placeholder{color:rgba(26,18,32,.55)}' +
      '[data-theme="light"] .vm-note{color:rgba(26,18,32,.35)}' +
      '[data-theme="light"] .vm-btn-retake{background:rgba(0,0,0,.04);color:rgba(26,18,32,.78);border-color:rgba(0,0,0,.1)}';
    document.head.appendChild(s);
  }
})();
