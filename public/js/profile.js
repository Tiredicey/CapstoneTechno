async function initProfile() {
  const user = Store.get('user');
  const token = Store.get('token');
  if (!user || !token) {
    window.location.href = '/?signin=1';
    return;
  }

  const nameEl = document.getElementById('profileNameDisplay');
  const emailEl = document.getElementById('profileEmailDisplay');
  const dashNameEl = document.getElementById('dashName');
  const dashPtsEl = document.getElementById('dashPts');
  const loyaltyEl = document.getElementById('loyaltyPagePts');
  const setNameEl = document.getElementById('set-name');
  const setEmailEl = document.getElementById('set-email');

  if (nameEl) nameEl.textContent = user.name || '';
  if (emailEl) emailEl.textContent = user.email || '—';
  if (dashNameEl) dashNameEl.textContent = (user.name || '').split(' ')[0];
  if (dashPtsEl) dashPtsEl.textContent = user.loyalty_points || 0;
  if (loyaltyEl) loyaltyEl.textContent = `${user.loyalty_points || 0} Points`;
  if (setNameEl) setNameEl.value = user.name || '';
  if (setEmailEl) setEmailEl.value = user.email || '';

  try {
    const fresh = await Api.get('/api/auth/me');
    Store.set('user', fresh);
    if (dashPtsEl) dashPtsEl.textContent = fresh.loyalty_points || 0;
    if (loyaltyEl) loyaltyEl.textContent = `${fresh.loyalty_points || 0} Points`;
  } catch {}

  try {
    const orders = await Api.get('/api/orders/my');
    const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    const dashActiveEl = document.getElementById('dashActiveOrders');
    if (dashActiveEl) dashActiveEl.textContent = active.length;

    const renderOrder = (o) => {
      const total = o.pricing?.finalTotal ?? 0;
      const statusClass = o.status === 'delivered' ? 'delivered' : o.status === 'new' ? 'new' : 'processing';
      return `
        <div class="glass-card" style="padding:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="font-weight:700;">${o.qr_code || o.id.slice(0, 8)}</div>
            <div style="font-size:0.8rem;color:rgba(255,255,255,0.4);margin-top:4px;">
              ${new Date((o.created_at || 0) * 1000).toLocaleDateString()} · ${o.items?.length || 0} items
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="font-weight:700;color:#FFD700;">₱${Number(total).toFixed(2)}</div>
            <span class="status-pill status-${statusClass}">${o.status.replace('_', ' ').toUpperCase()}</span>
            <a href="/tracking.html?id=${o.qr_code || o.id}" class="btn btn-ghost btn-sm">Track</a>
          </div>
        </div>`;
    };

    const recentList = document.getElementById('recentOrdersList');
    if (recentList) {
      recentList.innerHTML = orders.slice(0, 3).map(renderOrder).join('') ||
        '<p style="color:rgba(255,255,255,0.4);">No recent orders.</p>';
    }
    const fullList = document.getElementById('fullOrdersList');
    if (fullList) {
      fullList.innerHTML = orders.map(renderOrder).join('') ||
        '<p style="color:rgba(255,255,255,0.4);">No orders found.</p>';
    }
  } catch (e) {
    console.error('[PROFILE ORDERS ERROR]', e);
  }
}

document.querySelectorAll('.profile-nav-btn[data-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.profile-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(`panel-${btn.dataset.target}`);
    if (panel) panel.classList.add('active');
  });
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  Store.remove('token');
  Store.remove('user');
  Store.remove('sessionId');
  window.location.href = '/';
});

document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('set-name')?.value?.trim();
  const language = document.getElementById('set-language')?.value || 'en';
  if (!name || name.length < 2) {
    showToast('Name must be at least 2 characters', 'error');
    return;
  }
  try {
    const updated = await Api.put('/api/auth/me', { name, language });
    Store.set('user', updated);
    const nameEl = document.getElementById('profileNameDisplay');
    if (nameEl) nameEl.textContent = updated.name;
    showToast('Profile updated successfully', 'success');
  } catch (e) {
    showToast(e.message || 'Failed to update profile', 'error');
  }
});

function showToast(msg, type = 'info') {
  const existing = document.getElementById('profile-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'profile-toast';
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

initProfile();