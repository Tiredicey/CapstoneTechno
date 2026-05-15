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
  window.BloomVideoMessage = {
    getBlobAsync: function () {
      return new Promise(function (resolve) {
        if (recorder && recorder.state !== 'inactive') {
          var originalOnStop = recorder.onstop;
          recorder.onstop = function (e) {
            if (originalOnStop) originalOnStop(e);
            resolve(videoBlob);
          };
          stopRecording();
        } else {
          resolve(videoBlob);
        }
      });
    },
    getBlob: function () { return videoBlob; },
    reset: function () { videoBlob = null; revokeUrl(); updatePreview(); },
    attachTo: function (containerId) {
      var host = document.getElementById(containerId);
      if (!host || host.dataset.vmInit) return;
      host.dataset.vmInit = '1';
      host.innerHTML = buildUI();
      injectStyles();
      bindEvents(host);
    },
    forceStop: function () {
      if (recorder && recorder.state !== 'inactive') {
        stopRecording();
      }
    }
  };
  function revokeUrl() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }
  function buildUI() {
    return '<div class="vm-wrap">' +
      '<div class="vm-hd">' +
        '<span class="vm-title">\uD83C\uDFA5 Video Greeting</span>' +
        '<span class="vm-api-tag">MediaRecorder API</span>' +
      '</div>' +
      '<div class="vm-stage">' +
        '<video class="vm-preview" id="vmPreview" playsinline muted></video>' +
        '<video class="vm-playback" id="vmPlayback" playsinline controls style="display:none"></video>' +
        '<div class="vm-overlay" id="vmOverlay">' +
          '<div class="vm-timer" id="vmTimer">0:00</div>' +
          '<div class="vm-rec-dot" id="vmRecDot"></div>' +
        '</div>' +
        '<div class="vm-placeholder" id="vmPlaceholder">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;opacity:.4"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' +
          '<span>Record a personal video greeting</span>' +
          '<span class="vm-note">Up to 30 seconds \u00b7 Camera + microphone required</span>' +
        '</div>' +
      '</div>' +
      '<div class="vm-controls">' +
        '<button type="button" class="vm-btn vm-btn-start" id="vmStart">Record</button>' +
        '<button type="button" class="vm-btn vm-btn-stop" id="vmStop" style="display:none">Stop</button>' +
        '<button type="button" class="vm-btn vm-btn-retake" id="vmRetake" style="display:none">Retake</button>' +
        '<button type="button" class="vm-btn vm-btn-accept" id="vmAccept" style="display:none">Attach</button>' +
      '</div>' +
    '</div>';
  }
  function bindEvents(host) {
    var startBtn = host.querySelector('#vmStart');
    var stopBtn = host.querySelector('#vmStop');
    var retakeBtn = host.querySelector('#vmRetake');
    var acceptBtn = host.querySelector('#vmAccept');
    startBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
    retakeBtn.addEventListener('click', function () {
      videoBlob = null;
      revokeUrl();
      updatePreview();
      showControls('start');
    });
    acceptBtn.addEventListener('click', function () {
      showControls('done');
      if (window.showToast) window.showToast('\uD83C\uDFA5 Video greeting attached', 'success');
      var event = new CustomEvent('bloom:video-attached', { detail: { blob: videoBlob, size: videoBlob ? videoBlob.size : 0 } });
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
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: true });
    } catch (e) {
      if (window.showToast) window.showToast('Camera access denied or unavailable', 'error');
      return;
    }
    videoBlob = null;
    revokeUrl();
    preview.srcObject = stream;
    preview.style.display = 'block';
    preview.play().catch(function () {});
    if (playback) { playback.style.display = 'none'; playback.removeAttribute('src'); playback.load(); }
    if (placeholder) placeholder.style.display = 'none';
    if (overlay) overlay.style.display = 'flex';
    chunks = [];
    var mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' :
                   MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' :
                   MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' :
                   MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '';
    recorder = new MediaRecorder(stream, mimeType ? { mimeType: mimeType } : undefined);
    recorder.ondataavailable = function (e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = function () {
      var blobType = 'video/webm';
      if (mimeType.indexOf('mp4') !== -1) blobType = 'video/mp4';
      videoBlob = new Blob(chunks, { type: blobType });
      stopStream();
      updatePreview();
      showControls('review');
    };
    recorder.start();
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
    clearInterval(recordingTimer);
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.requestData(); } catch (e) {}
      recorder.stop();
    }
    var overlay = document.getElementById('vmOverlay');
    if (overlay) overlay.style.display = 'none';
  }
  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    var preview = document.getElementById('vmPreview');
    if (preview) { preview.srcObject = null; preview.style.display = 'none'; }
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
    if (videoBlob) {
      revokeUrl();
      currentObjectUrl = URL.createObjectURL(videoBlob);
      playback.onloadeddata = function () {
        playback.currentTime = 0;
      };
      playback.src = currentObjectUrl;
      playback.load();
      playback.style.display = 'block';
      if (preview) preview.style.display = 'none';
      if (placeholder) placeholder.style.display = 'none';
    } else {
      playback.pause();
      playback.removeAttribute('src');
      playback.load();
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
      '.vm-api-tag{font-size:.58rem;padding:2px 7px;border-radius:4px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);color:rgba(56,189,248,.8);font-weight:600;letter-spacing:.04em}' +
      '.vm-stage{position:relative;aspect-ratio:4/3;background:#000;overflow:hidden}' +
      '.vm-preview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}' +
      '.vm-playback{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:5}' +
      '.vm-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(255,255,255,.5);font-size:.82rem;text-align:center;padding:20px}' +
      '.vm-note{font-size:.68rem;color:rgba(255,255,255,.3)}' +
      '.vm-overlay{position:absolute;top:12px;right:12px;display:none;align-items:center;gap:6px;padding:4px 10px;border-radius:8px;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);z-index:2}' +
      '.vm-timer{font-size:.78rem;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}' +
      '.vm-rec-dot{width:8px;height:8px;border-radius:50%;background:#e61a1a;animation:vm-blink 1s ease-in-out infinite}' +
      '@keyframes vm-blink{0%,100%{opacity:1}50%{opacity:.3}}' +
      '.vm-controls{display:flex;gap:8px;padding:12px 16px}' +
      '.vm-btn{flex:1;padding:8px 14px;border-radius:10px;font-size:.8rem;font-weight:700;border:none;cursor:pointer;transition:all .2s}' +
      '.vm-btn-start{background:linear-gradient(135deg,#a81010,#e61a1a);color:#fff}' +
      '.vm-btn-start:hover{box-shadow:0 4px 16px rgba(230,26,26,.4)}' +
      '.vm-btn-stop{background:rgba(230,26,26,.15);color:#ff3b3b;border:1px solid rgba(230,26,26,.3)}' +
      '.vm-btn-retake{background:rgba(255,255,255,.06);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.1)}' +
      '.vm-btn-accept{background:linear-gradient(135deg,#00a882,#00d4aa);color:#fff}' +
      '.vm-btn-accept:hover{box-shadow:0 4px 16px rgba(0,212,170,.4)}' +
      '[data-theme="light"] .vm-wrap{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.08)}' +
      '[data-theme="light"] .vm-hd{border-bottom-color:rgba(0,0,0,.06)}' +
      '[data-theme="light"] .vm-placeholder{color:rgba(26,18,32,.5)}' +
      '[data-theme="light"] .vm-note{color:rgba(26,18,32,.35)}' +
      '[data-theme="light"] .vm-btn-retake{background:rgba(0,0,0,.04);color:rgba(26,18,32,.7);border-color:rgba(0,0,0,.1)}';
    document.head.appendChild(s);
  }
})();
