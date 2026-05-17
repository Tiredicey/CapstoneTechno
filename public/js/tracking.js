var Api = window.Api || window.__BloomApi;
var Store = window.Store || window.__BloomStore;
var BloomDB = window.BloomDB;
var STATUS_ICONS = {
  new: '\uD83D\uDCCB', processing: '\u2699\uFE0F', quality_check: '\uD83D\uDD0D',
  packed: '\uD83D\uDCE6', shipped: '\uD83D\uDE9A', out_for_delivery: '\uD83D\uDEF5', delivered: '\u2705', cancelled: '\u274C'
};
function showTrackToast(msg, type) {
  type = type || 'info';
  var existing = document.getElementById('track-toast');
  if (existing) existing.remove();
  var el = document.createElement('div');
  el.id = 'track-toast';
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:' +
    (type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#6366f1') +
    ';color:white;padding:14px 28px;border-radius:14px;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.4);transition:opacity .4s,transform .4s;transform:translateY(0);';
  document.body.appendChild(el);
  setTimeout(function () {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(function () { el.remove(); }, 400);
  }, 3500);
}
var currentOrderId = null;
async function trackOrder(identifier) {
  if (!identifier) return;
  var cleanId = String(identifier).trim().toUpperCase();
  var resultEl = document.getElementById('trackingResult');
  if (resultEl) resultEl.style.display = 'none';
  try {
    var order = await Api.get('/orders/' + encodeURIComponent(cleanId) + '/track');
    currentOrderId = order.id;
    var detailId = document.getElementById('detailId');
    var detailEta = document.getElementById('detailEta');
    var detailRecipient = document.getElementById('detailRecipient');
    var statusPill = document.getElementById('statusPill');
    var isSurprise = order.surpriseDelivery && order.status !== 'delivered';
    if (detailId) detailId.textContent = order.qrCode || order.id || '\u2014';
    if (detailEta) {
      if (isSurprise) {
        detailEta.textContent = 'Hidden \u2014 Surprise Mode';
      } else {
        detailEta.textContent = order.delivery_date || order.deliveryDate || '\u2014';
      }
    }
    if (detailRecipient) {
      if (isSurprise) {
        detailRecipient.textContent = '\uD83C\uDF81 Surprise';
      } else {
        try {
          var rec = typeof order.recipient === 'string' ? JSON.parse(order.recipient) : order.recipient;
          var rName = '';
          if (rec) {
            if (rec.name) rName = rec.name;
            else if (rec.firstName || rec.lastName) rName = ((rec.firstName || '') + ' ' + (rec.lastName || '')).trim();
          }
          detailRecipient.textContent = rName || '\u2014';
        } catch (e) { detailRecipient.textContent = '\u2014'; }
      }
    }
    var statusMap = {
      new: 'status-new', processing: 'status-processing', quality_check: 'status-processing',
      packed: 'status-packed', shipped: 'status-shipped', out_for_delivery: 'status-shipped',
      delivered: 'status-delivered', cancelled: 'status-cancelled'
    };
    if (statusPill) {
      statusPill.className = 'status-pill ' + (statusMap[order.status] || 'status-new');
      statusPill.textContent = (order.status || '').replace(/_/g, ' ').toUpperCase();
    }
    var steps = order.trackingSteps || order.timeline || [];
    if (typeof steps === 'string') { try { steps = JSON.parse(steps); } catch (e) { steps = []; } }
    if (isSurprise) {
      renderSurpriseTimeline(steps, order.status);
    } else {
      renderTimeline(steps, order.status);
    }
    var photoArea = document.getElementById('deliveryPhotoArea');
    if (photoArea) {
      if (order.delivery_photo) {
        photoArea.innerHTML = '<img src="' + encodeURI(order.delivery_photo) + '" alt="Delivery verification photo" style="width:100%;height:100%;object-fit:cover;border-radius:12px;cursor:pointer;" onclick="window.open(this.src,\'_blank\')">';
        photoArea.style.border = 'none';
        photoArea.style.height = '200px';
      } else {
        photoArea.innerHTML = 'Photo will appear upon delivery';
        photoArea.style.height = '120px';
      }
    }
    renderVideoGreeting(order);
    if (resultEl) resultEl.style.display = 'block';
    subscribeSocket(order.id);
  } catch (e) {
    var msg = 'Order not found';
    if (e.status === 404) {
      msg = 'Order ID not recognized. Please check the ID or QR code.';
    } else if (e.status === 500) {
      msg = 'Server error while tracking. Please try again later.';
    } else {
      msg = e.message || 'Tracking unavailable at the moment.';
    }
    showTrackToast(msg, 'error');
  }
}
function renderSurpriseTimeline(steps, currentStatus) {
  var container = document.getElementById('trackingTimeline');
  var fill = document.getElementById('timelineFill');
  if (!container) return;
  container.querySelectorAll('.timeline-step').forEach(function (e) { e.remove(); });
  var completedCount = steps.filter(function (t) { return t.completed || t.timestamp; }).length;
  var pct = steps.length ? (completedCount / steps.length) * 100 : 0;
  setTimeout(function () { if (fill) fill.style.height = pct + '%'; }, 100);
  var div = document.createElement('div');
  div.className = 'timeline-step active';
  div.innerHTML = '<div class="timeline-node">\uD83C\uDF81</div>' +
    '<div class="timeline-content">' +
    '<div class="timeline-label" style="font-weight:700;">Surprise Delivery Active</div>' +
    '<div class="timeline-time">Delivery details hidden to preserve the surprise.<br>Full timeline visible after delivery.</div>' +
    '</div>';
  container.appendChild(div);
}
function renderTimeline(steps, currentStatus) {
  var container = document.getElementById('trackingTimeline');
  var fill = document.getElementById('timelineFill');
  if (!container) return;
  var completedCount = steps.filter(function (t) { return t.completed || t.timestamp; }).length;
  var pct = steps.length ? (completedCount / steps.length) * 100 : 0;
  container.querySelectorAll('.timeline-step').forEach(function (e) { e.remove(); });
  setTimeout(function () { if (fill) fill.style.height = pct + '%'; }, 100);
  steps.forEach(function (step) {
    var isCompleted = step.completed || !!step.timestamp;
    var isActive = step.status === currentStatus && isCompleted;
    var div = document.createElement('div');
    div.className = 'timeline-step' + (isCompleted ? ' complete' : '') + (isActive ? ' active' : '');
    var label = step.label || (step.status || '').replace(/_/g, ' ');
    var timeText = step.timestamp ? new Date(typeof step.timestamp === 'number' && step.timestamp < 1e12 ? step.timestamp * 1000 : step.timestamp).toLocaleString() : 'Pending';
    var photoHtml = step.photo ? '<div style="margin-top:12px;"><img src="' + encodeURI(step.photo) + '" alt="Status photo" style="width:100%;max-height:180px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.08);cursor:pointer;" onclick="window.open(this.src,\'_blank\')"></div>' : '';
    div.innerHTML = '<div class="timeline-node">' + (STATUS_ICONS[step.status] || '\u25CB') + '</div>' +
      '<div class="timeline-content">' +
      '<div class="timeline-label">' + label + '</div>' +
      '<div class="timeline-time">' + timeText + '</div>' +
      photoHtml +
      '</div>';
    container.appendChild(div);
  });
}
function renderVideoGreeting(order) {
  var area = document.getElementById('videoGreetingArea');
  if (!area) {
    area = document.createElement('div');
    area.id = 'videoGreetingArea';
    var issuePanel = document.getElementById('issuePanel');
    var photoCard = document.getElementById('deliveryPhotoArea');
    var parent = photoCard ? photoCard.closest('.track-card') || photoCard.closest('.glass-card') : null;
    if (parent && parent.parentNode) {
      parent.parentNode.insertBefore(area, parent.nextSibling);
    } else if (issuePanel && issuePanel.parentNode) {
      issuePanel.parentNode.insertBefore(area, issuePanel);
    } else {
      var result = document.getElementById('trackingResult');
      if (result) result.appendChild(area);
    }
  }
  var videoUrl = order.video_greeting;
  if (!videoUrl) {
    area.innerHTML = '';
    area.style.display = 'none';
    return;
  }
  area.style.display = 'block';
  area.style.marginTop = '20px';
  var safeUrl = encodeURI(videoUrl);
  area.innerHTML =
    '<div class="track-card" style="overflow:hidden;">' +
      '<div class="track-card-hd">' +
        '<span class="track-card-title">\uD83C\uDFA5 Video Greeting</span>' +
        '<span id="videoStatusBadge" style="font-size:0.62rem;padding:3px 10px;border-radius:100px;background:rgba(0,212,170,0.12);border:1px solid rgba(0,212,170,0.25);color:rgba(0,212,170,0.9);font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Loading\u2026</span>' +
      '</div>' +
      '<div id="videoContainer" style="aspect-ratio:16/9;background:#000;position:relative;">' +
        '<video id="greetingVideo" src="' + safeUrl + '" controls playsinline muted preload="metadata" style="width:100%;height:100%;object-fit:contain;display:block;"></video>' +
      '</div>' +
    '</div>';
  var vid = document.getElementById('greetingVideo');
  var badge = document.getElementById('videoStatusBadge');
  if (vid) {
    vid.addEventListener('loadedmetadata', function () {
      if (badge) {
        badge.textContent = 'Attached';
        badge.style.background = 'rgba(0,212,170,0.12)';
        badge.style.borderColor = 'rgba(0,212,170,0.25)';
        badge.style.color = 'rgba(0,212,170,0.9)';
      }
    });
    vid.addEventListener('error', function () {
      var container = document.getElementById('videoContainer');
      if (container) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.4);font-size:0.85rem;padding:24px;text-align:center;">Video file unavailable or corrupted.<br>The sender may need to re-record their greeting.</div>';
      }
      if (badge) {
        badge.textContent = 'Unavailable';
        badge.style.background = 'rgba(239,68,68,0.12)';
        badge.style.borderColor = 'rgba(239,68,68,0.25)';
        badge.style.color = 'rgba(239,68,68,0.9)';
      }
    });
  }
}
function subscribeSocket(orderId) {
  if (!Store) return;
  if (Store.joinOrderRoom) Store.joinOrderRoom(orderId);
  if (Store.on) {
    Store.on('order_update', function (data) {
      if (!data || data.orderId !== orderId) return;
      showTrackToast('Order status updated: ' + (data.status || '').replace(/_/g, ' ') + ' \uD83C\uDF38', 'info');
      trackOrder(orderId);
    });
  }
}
async function loadMyOrders() {
  if (!Store) return;
  try {
    var orders = await Api.get('/orders/my');
    if (!Array.isArray(orders) || !orders.length) return;
    var section = document.getElementById('myOrdersSection');
    var list = document.getElementById('myOrdersList');
    if (section) section.style.display = 'block';
    if (!list) return;
    var statusClassMap = {
      new: 'status-new', processing: 'status-processing', packed: 'status-packed',
      shipped: 'status-shipped', delivered: 'status-delivered', cancelled: 'status-cancelled'
    };
    list.innerHTML = orders.map(function (o) {
      var pricing = typeof o.pricing === 'string' ? JSON.parse(o.pricing || '{}') : (o.pricing || {});
      var items = typeof o.items === 'string' ? JSON.parse(o.items || '[]') : (o.items || []);
      var statusClass = statusClassMap[o.status] || 'status-new';
      return '<div class="my-order-row" data-qr="' + (o.qr_code || o.id) + '">' +
        '<div><div style="font-weight:700;font-family:var(--fd);">' + (o.qr_code || o.id) + '</div>' +
        '<div style="font-size:0.78rem;color:rgba(255,255,255,0.4);margin-top:2px;">' + items.length + ' item(s) \u00B7 \u20B1' + Number(pricing.finalTotal || 0).toFixed(2) + '</div></div>' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
        '<span class="status-pill ' + statusClass + '">' + (o.status || '').replace(/_/g, ' ').toUpperCase() + '</span>' +
        '<span style="font-size:0.78rem;color:rgba(255,255,255,0.35);">' + (o.delivery_date || '\u2014') + '</span>' +
        '</div></div>';
    }).join('');
    list.querySelectorAll('[data-qr]').forEach(function (card) {
      card.addEventListener('click', function () {
        var input = document.getElementById('trackInput');
        if (input) input.value = card.dataset.qr;
        trackOrder(card.dataset.qr);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  } catch (e) {}
}
document.getElementById('trackBtn') && document.getElementById('trackBtn').addEventListener('click', function () {
  var val = document.getElementById('trackInput');
  val = val ? val.value.trim() : '';
  if (!val) { showTrackToast('Enter an order code', 'error'); return; }
  trackOrder(val);
});
document.getElementById('trackInput') && document.getElementById('trackInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    var btn = document.getElementById('trackBtn');
    if (btn) btn.click();
  }
});
var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('id')) {
  var input = document.getElementById('trackInput');
  if (input) input.value = urlParams.get('id');
  trackOrder(urlParams.get('id'));
}
loadMyOrders();
