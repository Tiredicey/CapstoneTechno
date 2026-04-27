let step = 1;
let cartData = null;
let selectedDate = null;
let selectedSlot = null;
let selectedPayment = 'card';
let selectedRecurring = null;
let calendarDate = new Date();

async function init() {
  const sessionId = Store.get('sessionId');
  const token = Store.get('token');
  if (!token && !sessionId) { window.location.href = '/cart.html'; return; }
  const urlParams = new URLSearchParams(window.location.search);
  const subPlan = urlParams.get('subscription');
  const subPrice = urlParams.get('price');
  
  if (subPlan && subPrice) {
    cartData = {
      items: [{ name: subPlan.charAt(0).toUpperCase() + subPlan.slice(1) + ' Subscription', qty: 1, price: Number(subPrice) }],
      pricing: { subtotal: Number(subPrice), customizationFee: 0, deliveryFee: 0, tax: Number(subPrice) * 0.12, finalTotal: Number(subPrice) * 1.12, promoDiscount: 0 }
    };
    renderCheckoutSummary();
    renderCalendar();
    return;
  }

  try {
    cartData = await Api.get('/api/cart');
    if (!cartData.items?.length) { window.location.href = '/cart.html'; return; }
    renderCheckoutSummary();
    renderCalendar();
  } catch { window.location.href = '/cart.html'; }
}

function renderCheckoutSummary() {
  const p = cartData.pricing;
  if (!p) return;
  const fmt = (n) => `₱${Number(n || 0).toFixed(2)}`;
  document.getElementById('coSubtotal').textContent = fmt(p.subtotal);
  document.getElementById('coCustom').textContent = fmt(p.customizationFee);
  document.getElementById('coShipping').textContent = p.deliveryFee === 0 ? '🎉 Free' : fmt(p.deliveryFee);
  document.getElementById('coTax').textContent = fmt(p.tax);
  document.getElementById('coTotal').textContent = fmt(p.finalTotal);
  document.getElementById('pointsEarned').textContent = Math.floor((p.finalTotal || 0) * 10);
  const promoRow = document.getElementById('coPromoRow');
  const promoEl = document.getElementById('coPromo');
  if (p.promoDiscount > 0 && promoRow && promoEl) {
    promoRow.style.display = 'flex';
    promoEl.textContent = `−₱${Number(p.promoDiscount).toFixed(2)}`;
  }
  const itemsEl = document.getElementById('checkoutItems');
  if (itemsEl) {
    itemsEl.innerHTML = cartData.items.map(i => `
      <div style="display:flex;gap:12px;align-items:center;font-size:0.83rem;">
        <div style="width:40px;height:40px;border-radius:8px;background:rgba(139,31,110,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">🌸</div>
        <div style="flex:1;">${i.name}<br><span style="color:rgba(255,255,255,0.4);">×${i.qty || 1}</span></div>
        <div style="font-weight:600;color:#FFD700;">₱${(i.price * (i.qty || 1)).toFixed(2)}</div>
      </div>`).join('');
  }
}

function goTo(newStep) {
  document.querySelectorAll('.checkout-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`step${newStep}`)?.classList.add('active');
  document.querySelectorAll('.checkout-step').forEach((s, i) => {
    s.classList.remove('active', 'complete');
    if (i + 1 < newStep) s.classList.add('complete');
    else if (i + 1 === newStep) s.classList.add('active');
  });
  step = newStep;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(msg, type = 'info') {
  const existing = document.getElementById('checkout-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'checkout-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:99999;
    background:${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#6366f1'};
    color:white;padding:12px 24px;border-radius:12px;
    font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

document.getElementById('step1Next')?.addEventListener('click', () => {
  const req = ['recFirstName', 'recLastName', 'recAddress', 'recCity', 'recZip'];
  for (const id of req) {
    if (!document.getElementById(id)?.value?.trim()) {
      showToast('Please fill in all required fields', 'error');
      document.getElementById(id)?.focus();
      return;
    }
  }
  goTo(2);
});

document.getElementById('step2Back')?.addEventListener('click', () => goTo(1));
document.getElementById('step2Next')?.addEventListener('click', () => {
  if (!selectedDate) { showToast('Please select a delivery date', 'error'); return; }
  if (!selectedSlot) { showToast('Please select a time slot', 'error'); return; }
  goTo(3);
});

document.getElementById('step3Back')?.addEventListener('click', () => goTo(2));

document.querySelectorAll('.payment-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedPayment = opt.dataset.method;
    const cardFields = document.getElementById('cardFields');
    if (cardFields) cardFields.style.display = selectedPayment === 'card' ? 'block' : 'none';
  });
});

document.querySelectorAll('.time-slot').forEach(slot => {
  slot.addEventListener('click', () => {
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    slot.classList.add('selected');
    selectedSlot = slot.dataset.slot;
  });
});

document.getElementById('recurringToggle')?.addEventListener('change', e => {
  const opts = document.getElementById('recurringOptions');
  if (opts) opts.style.display = e.target.checked ? 'block' : 'none';
  if (!e.target.checked) selectedRecurring = null;
});

document.querySelectorAll('[data-recur]').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('[data-recur]').forEach(p => p.classList.remove('selected'));
    pill.classList.add('selected');
    selectedRecurring = pill.dataset.recur;
  });
});

document.getElementById('cardNumber')?.addEventListener('input', e => {
  e.target.value = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
});
document.getElementById('cardExpiry')?.addEventListener('input', e => {
  e.target.value = e.target.value.replace(/\D/g, '').replace(/^(.{2})(.+)/, '$1/$2').slice(0, 5);
});

document.getElementById('placeOrder')?.addEventListener('click', async () => {
  const btn = document.getElementById('placeOrder');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  try {
    const cartId = cartData?.id || Store.get('cartId') || Store.get('sessionId');
    const payload = {
      cartId,
      recipient: {
        firstName: document.getElementById('recFirstName')?.value || '',
        lastName: document.getElementById('recLastName')?.value || '',
        phone: document.getElementById('recPhone')?.value || '',
        address: document.getElementById('recAddress')?.value || '',
        city: document.getElementById('recCity')?.value || '',
        zip: document.getElementById('recZip')?.value || '',
        surprise: document.getElementById('surpriseDelivery')?.checked || false
      },
      deliveryDate: selectedDate,
      deliverySlot: selectedSlot,
      recurring: selectedRecurring,
      paymentMethod: selectedPayment,
      specialInstructions: document.getElementById('specialInstructions')?.value || ''
    };
    if (!payload.deliveryDate || !payload.deliverySlot) {
      showToast('Please select delivery date and time slot', 'error');
      btn.disabled = false;
      btn.textContent = 'Place Order 🌸';
      return;
    }
    const order = await Api.post('/api/orders', payload);
    Store.set('cartId', null);
    Store.set('cart', null);
    Store.updateCartCount(0);
    const qrEl = document.getElementById('qrDisplay');
    if (qrEl) qrEl.textContent = order.qr_code || 'BLOOM-CONFIRMED';
    goTo(4);
    launchConfetti();
  } catch (e) {
    showToast(e.message || 'Order failed. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Place Order 🌸';
  }
});

function renderCalendar() {
  const grid = document.getElementById('datePicker');
  const monthEl = document.getElementById('calendarMonth');
  if (!grid) return;
  const now = new Date();
  const y = calendarDate.getFullYear();
  const m = calendarDate.getMonth();
  if (monthEl) monthEl.textContent = calendarDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  grid.innerHTML = '';
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement('div'));
  }
  const lead = new Date(now);
  lead.setDate(lead.getDate() + 2);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const dateStr = date.toISOString().split('T')[0];
    const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tooSoon = date < new Date(lead.getFullYear(), lead.getMonth(), lead.getDate());
    const cell = document.createElement('div');
    cell.className = [
      'date-cell',
      date.toDateString() === now.toDateString() ? 'today' : '',
      tooSoon || isPast ? 'unavailable' : '',
      dateStr === selectedDate ? 'selected' : ''
    ].filter(Boolean).join(' ');
    cell.textContent = d;
    if (!tooSoon && !isPast) {
      cell.addEventListener('click', () => {
        document.querySelectorAll('.date-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        selectedDate = dateStr;
      });
    }
    grid.appendChild(cell);
  }
}

document.getElementById('prevMonth')?.addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('nextMonth')?.addEventListener('click', () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

document.getElementById('shipToSelf')?.addEventListener('change', e => {
  if (e.target.checked) {
    const user = Store.get('user');
    if (user?.name) {
      const parts = user.name.split(' ');
      const firstEl = document.getElementById('recFirstName');
      const lastEl = document.getElementById('recLastName');
      if (firstEl) firstEl.value = parts[0] || '';
      if (lastEl) lastEl.value = parts.slice(1).join(' ') || '';
    }
  }
});

function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 6 + 3,
    d: Math.random() * 120,
    color: ['#E84393', '#FFD700', '#00D4AA', '#7C3AED', '#FF6B6B', '#38BDF8'][Math.floor(Math.random() * 6)],
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.1 + 0.05
  }));
  let angle = 0;
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.ellipse(p.x + p.tilt, p.y, p.r, p.r * 0.4, p.tiltAngle, 0, Math.PI * 2);
      ctx.fill();
    });
    angle += 0.01;
    particles.forEach((p, i) => {
      p.tiltAngle += p.tiltSpeed;
      p.y += (Math.cos(angle + p.d) + 2 + p.r / 2) * 1.5;
      p.tilt = Math.sin(angle - i / 3) * 12;
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
    });
    frame++;
    if (frame < 240) requestAnimationFrame(draw);
  }
  draw();
}

init();
