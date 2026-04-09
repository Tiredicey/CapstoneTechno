import { Api } from './core/Api.js';
import { Store } from './core/Store.js';
import { Toast } from './core/Auth.js';

const STATUS_ICONS = {
  new:'📋', processing:'⚙️', quality_check:'🔍',
  packed:'📦', shipped:'🚚', out_for_delivery:'🛵', delivered:'✅'
};

let socket = null;
let currentOrderId = null;

async function trackOrder(identifier) {
  const resultEl = document.getElementById('trackingResult');
  resultEl.style.display = 'none';
  try {
    const order = await Api.get(`/orders/${identifier}/track`);
    currentOrderId = order.id;
    document.getElementById('detailId').textContent = order.qrCode || order.id;
    document.getElementById('detailEta').textContent = order.estimated || '—';
    document.getElementById('detailRecipient').textContent = '—';
    const statusMap = {
      new:'status-new', processing:'status-processing', packed:'status-packed',
      shipped:'status-shipped', delivered:'status-delivered'
    };
    document.getElementById('statusPill').className = `status-pill ${statusMap[order.status]||'status-new'}`;
    document.getElementById('statusPill').textContent = order.status?.replace('_',' ').toUpperCase();
    renderTimeline(order.timeline, order.status);
    resultEl.style.display = 'block';
    subscribeSocket(order.id);
  } catch (e) { Toast.show(e.message || 'Order not found', 'error'); }
}

function renderTimeline(timeline, currentStatus) {
  const container = document.getElementById('trackingTimeline');
  const fill = document.getElementById('timelineFill');
  const completedCount = timeline.filter(t => t.completed).length;
  const pct = timeline.length ? (completedCount / timeline.length) * 100 : 0;
  const existing = container.querySelectorAll('.timeline-step');
  existing.forEach(e => e.remove());
  setTimeout(() => { if (fill) fill.style.height = `${pct}%`; }, 100);
  timeline.forEach(step => {
    const isActive = step.status === currentStatus && step.completed;
    const div = document.createElement('div');
    div.className = `timeline-step${step.completed?' complete':''}${isActive?' active':''}`;
    div.innerHTML = `
      <div class="timeline-node">${STATUS_ICONS[step.status]||'○'}</div>
      <div class="timeline-content">
        <div class="timeline-label">${step.label}</div>
        <div class="timeline-time">${step.timestamp ? new Date(step.timestamp).toLocaleString() : 'Pending'}</div>
      </div>`;
    container.appendChild(div);
  });
}

function subscribeSocket(orderId) {
  if (typeof io === 'undefined') return;
  if (!socket) socket = io();
  socket.emit('join_order', orderId);
  socket.off('order_update');
  socket.on('order_update', data => {
    if (data.orderId === orderId) {
      Toast.show(`Order status updated: ${data.status?.replace('_',' ')} 🌸`, 'info');
      trackOrder(orderId);
    }
  });
}

async function loadMyOrders() {
  const user = Store.get('user');
  if (!user || user.isGuest) return;
  try {
    const orders = await Api.get('/orders/my');
    if (!orders.length) return;
    const section = document.getElementById('myOrdersSection');
    const list = document.getElementById('myOrdersList');
    section.style.display = 'block';
    list.innerHTML = orders.map(o => {
      const statusClass = { new:'status-new', processing:'status-processing', packed:'status-packed', shipped:'status-shipped', delivered:'status-delivered', cancelled:'status-cancelled' }[o.status] || 'status-new';
      return `
        <div class="glass-card" style="padding:20px;cursor:pointer;" data-qr="${o.qr_code||o.id}">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <div style="font-weight:700;font-family:var(--font-display);">${o.qr_code||o.id}</div>
              <div style="font-size:0.78rem;color:rgba(255,255,255,0.4);margin-top:2px;">${o.items?.length||0} item(s) · $${o.pricing?.finalTotal?.toFixed(2)||'—'}</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <span class="status-pill ${statusClass}">${o.status?.replace('_',' ').toUpperCase()}</span>
              <span style="font-size:0.78rem;color:rgba(255,255,255,0.35);">${o.delivery_date||'—'}</span>
            </div>
          </div>
        </div>`;
    }).join('');
    list.querySelectorAll('[data-qr]').forEach(card => {
      card.addEventListener('click', () => {
        document.getElementById('trackInput').value = card.dataset.qr;
        trackOrder(card.dataset.qr);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  } catch {}
}

document.getElementById('trackBtn')?.addEventListener('click', () => {
  const val = document.getElementById('trackInput')?.value?.trim();
  if (!val) { Toast.show('Enter an order code', 'error'); return; }
  trackOrder(val);
});

document.getElementById('trackInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('trackBtn')?.click();
});

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('id')) {
  document.getElementById('trackInput').value = urlParams.get('id');
  trackOrder(urlParams.get('id'));
}

loadMyOrders();