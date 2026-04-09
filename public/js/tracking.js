var Api = window.Api || window.__BloomApi;
var Store = window.Store || window.__BloomStore;

const STATUS_ICONS = {
  new: '📋', processing: '⚙️', quality_check: '🔍',
  packed: '📦', shipped: '🚚', out_for_delivery: '🛵', delivered: '✅', cancelled: '❌'
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
    ';color:white;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 3500);
}

var currentOrderId = null;

async function trackOrder(identifier) {
  if (!identifier) return;
  var resultEl = document.getElementById('trackingResult');
  if (resultEl) resultEl.style.display = 'none';
  try {
    var order = await Api.get('/orders/' + identifier + '/track');
    currentOrderId = order.id;

    var detailId = document.getElementById('detailId');
    var detailEta = document.getElementById('detailEta');
    var detailRecipient = document.getElementById('detailRecipient');
    var statusPill = document.getElementById('statusPill');

    if (detailId) detailId.textContent = order.qrCode || order.id || '—';
    if (detailEta) detailEta.textContent = order.delivery_date || order.deliveryDate || '—';
    if (detailRecipient) {
      try {
        var rec = typeof order.recipient === 'string' ? JSON.parse(order.recipient) : order.recipient;
        detailRecipient.textContent = (rec && rec.name) ? rec.name : '—';
      } catch { detailRecipient.textContent = '—'; }
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
    if (typeof steps === 'string') { try { steps = JSON.parse(steps); } catch { steps = []; } }
    renderTimeline(steps, order.status);

    if (resultEl) resultEl.style.display = 'block';
    subscribeSocket(order.id);
  } catch (e) {
    showTrackToast(e.message || 'Order not found', 'error');
  }
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
    div.innerHTML = '<div class="timeline-node">' + (STATUS_ICONS[step.status] || '○') + '</div>' +
      '<div class="timeline-content">' +
      '<div class="timeline-label">' + label + '</div>' +
      '<div class="timeline-time">' + timeText + '</div>' +
      '</div>';
    container.appendChild(div);
  });
}

function subscribeSocket(orderId) {
  if (!Store) return;
  Store.joinOrderRoom(orderId);
  Store.on('order_update', function (data) {
    if (!data || data.orderId !== orderId) return;
    showTrackToast('Order status updated: ' + (data.status || '').replace(/_/g, ' ') + ' 🌸', 'info');
    trackOrder(orderId);
  });
}

async function loadMyOrders() {
  if (!Store) return;
  var user = Store.get('user');
  if (!user || user.isGuest) return;
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
      return '<div class="glass-card" style="padding:20px;cursor:pointer;" data-qr="' + (o.qr_code || o.id) + '">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
        '<div><div style="font-weight:700;font-family:var(--font-display);">' + (o.qr_code || o.id) + '</div>' +
        '<div style="font-size:0.78rem;color:rgba(255,255,255,0.4);margin-top:2px;">' + items.length + ' item(s) · ₱' + Number(pricing.finalTotal || 0).toFixed(2) + '</div></div>' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
        '<span class="status-pill ' + statusClass + '">' + (o.status || '').replace(/_/g, ' ').toUpperCase() + '</span>' +
        '<span style="font-size:0.78rem;color:rgba(255,255,255,0.35);">' + (o.delivery_date || '—') + '</span>' +
        '</div></div></div>';
    }).join('');

    list.querySelectorAll('[data-qr]').forEach(function (card) {
      card.addEventListener('click', function () {
        var input = document.getElementById('trackInput');
        if (input) input.value = card.dataset.qr;
        trackOrder(card.dataset.qr);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  } catch {}
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
