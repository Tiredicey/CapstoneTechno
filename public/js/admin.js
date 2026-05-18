const STATUS_ORDER = ['new','processing','quality_check','packed','shipped','out_for_delivery','delivered'];
const Api = window.Api || window.__BloomApi;
const Store = window.Store || window.__BloomStore;
let socket = null;
let allOrdersCache =[];
let allProductsCache =[];

function safeDate(d) {
  if (!d) return '—';
  let ts = typeof d === 'number' && d < 1e12 ? d * 1000 : d;
  return new Date(ts).toLocaleDateString();
}

function resolveImage(raw) {
  if (!raw) return null;
  let imgs = raw;
  if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch(e) { return raw; } }
  if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch(e) {} }
  let src = Array.isArray(imgs) ? imgs.flat(Infinity)[0] : imgs;
  if (typeof src !== 'string' || !src) return null;
  let clean = src.replace(/[\[\]"\\]/g, '/');
  let parts = clean.split('/');
  let filename = parts[parts.length - 1];
  return filename && filename !== 'null' ? '/uploads/products/' + filename : null;
}

function fmt(n) {
  return `\u20B1${Number(n||0).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

function stars(n) {
  return Array.from({length:5},(_,i)=>`<span style="color:${i<Math.round(n||0)?'#FFD700':'rgba(255,255,255,0.15)'}">★</span>`).join('');
}

function showToast(msg, type='info') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('toast-show'));
  setTimeout(()=>{
    t.classList.remove('toast-show');
    setTimeout(()=>t.remove(),300);
  },3500);
}

async function checkAdmin() {
  let token = null;
  try { token = Store.get('token'); } catch(e){}
  if (!token) {
    token = localStorage.getItem('bloom_token') || localStorage.getItem('token');
    if (token && typeof Store !== 'undefined' && Store.set) Store.set('token', token);
  }
  if (!token) { showLogin(); return; }
  
  let user = null;
  try { user = Store.get('user'); } catch(e){}
  if (!user) {
    try { user = JSON.parse(localStorage.getItem('user')); } catch(e){}
    if (user && typeof Store !== 'undefined' && Store.set) Store.set('user', user);
  }
  if (user?.role==='admin') { showApp(user); return; }
  try {
    const me = await Api.get('/api/auth/me');
    if (me.role!=='admin') { 
      localStorage.removeItem('token');
      localStorage.removeItem('bloom_token');
      localStorage.removeItem('user');
      showLogin(); 
      return; 
    }
    Store.set('user',me);
    showApp(me);
  } catch { showLogin(); }
}

function showLogin() {
  const login = document.getElementById('loginScreen');
  const app = document.getElementById('adminApp');
  if (login) { login.hidden = false; login.style.display = 'flex'; }
  if (app) { app.hidden = true; app.style.display = 'none'; }
  document.body.style.overflow = '';
  setTimeout(() => document.getElementById('loginEmail')?.focus(), 60);
}

function showApp(user) {
  const login = document.getElementById('loginScreen');
  const app = document.getElementById('adminApp');
  if (login) { login.hidden = true; login.style.display = 'none'; }
  if (app) { app.hidden = false; app.style.display = 'grid'; }
  const g = document.getElementById('adminGreeting');
  if (g) {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    g.textContent = `🌸 Good ${greet}, ${user.name || user.email || 'Staff'}`;
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');
  if (err) { err.hidden = true; err.style.display='none'; err.textContent=''; }
  if (!email||!password) {
    if (err) { err.textContent='Enter email and password'; err.hidden=false; err.style.display='block'; }
    return;
  }
  if (btn) { btn.disabled=true; btn.textContent='Signing in...'; }
  try {
    const res = await Api.post('/api/auth/login',{email,password});
    if (typeof Store !== 'undefined' && Store.set) {
      Store.set('token',res.token);
      Store.set('user',res.user||res);
    }
    localStorage.setItem('bloom_token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user||res));
    if ((res.user||res).role!=='admin') {
      localStorage.removeItem('token');
      localStorage.removeItem('bloom_token');
      localStorage.removeItem('user');
      if (err) { err.textContent='Access denied — admin only'; err.hidden=false; err.style.display='block'; }
      return;
    }
    showApp(res.user||res);
    if (!socket) initWebSocket();
    loadDashboard();
  } catch(e) {
    if (err) { err.textContent = e.message||'Invalid credentials'; err.hidden=false; err.style.display='block'; }
  } finally {
    if (btn) { btn.disabled=false; btn.textContent='Sign In \u2192'; }
  }
}

async function loadDashboard() {
  const dateEl = document.getElementById('dashDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  try {
    const data = await Api.get('/api/analytics/dashboard');
    const map = {
      kpiRevenue: fmt(data.revenue?.total||0),
      kpiToday: data.today?.c||0,
      kpiPending: data.pending?.c||0,
      kpiNps: data.nps?Number(data.nps).toFixed(1):'—'
    };
    Object.entries(map).forEach(([id,val])=>{ const el=document.getElementById(id); if(el) el.textContent=val; });

    const topList = document.getElementById('topProductsList');
    if (topList) {
      topList.innerHTML = data.topProducts?.length
        ? data.topProducts.slice(0,5).map((p,i)=>`
          <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span class="rank-badge">${i+1}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
              <div style="font-size:0.72rem;color:rgba(255,255,255,0.35);margin-top:2px;">${p.category||'—'} · ${stars(p.rating)}</div>
            </div>
            <span class="pill pill-primary">${p.order_count} sold</span>
          </div>`).join('')
        : '<div class="empty-state">No product data yet</div>';
    }

    renderBarChart('revenueChart', data.salesByCategory||[]);
    await loadRecentOrders();
  } catch(e) {
    showToast('Failed to load dashboard','error');
    console.error(e);
  }
}

function renderBarChart(id, data) {
  const chart = document.getElementById(id);
  if (!chart||!data.length) return;
  const max = Math.max(...data.map(r=>r.revenue||0))||1;
  chart.innerHTML = data.map(cat=>`
    <div class="bar-col">
      <div class="bar-tooltip">${fmt(cat.revenue||0)}</div>
      <div class="bar" style="height:${Math.max(8,(cat.revenue/max)*100)}%"></div>
      <div class="bar-label">${(cat.category||'').slice(0,7)}</div>
    </div>`).join('');
}

async function loadRecentOrders() {
  try {
    const orders = await Api.get('/api/orders?limit=10');
    const tbody = document.getElementById('recentOrdersTbody');
    if (tbody) {
      tbody.innerHTML = orders.length
        ? orders.map(o=>orderRow(o,false)).join('')
        : emptyRow(7,'No orders yet');
      bindOrderActions(tbody);
    }
  } catch { showToast('Could not load recent orders','error'); }
}

async function loadAllOrders() {
  const statusFilter = document.getElementById('orderStatusFilter')?.value||'';
  const search = (document.getElementById('orderSearch')?.value||'').toLowerCase();
  try {
    const orders = await Api.get(`/api/orders?limit=100${statusFilter?'&status='+statusFilter:''}`);
    allOrdersCache = orders;
    renderOrderTable(orders,search);
  } catch { showToast('Could not load orders','error'); }
}

function renderOrderTable(orders, search='') {
  const tbody = document.getElementById('allOrdersTbody');
  if (!tbody) return;
  const filtered = search
    ? orders.filter(o=>{
        const rec=parseRecipient(o);
        return (rec.firstName||rec.name||'').toLowerCase().includes(search)
          || (o.qr_code||o.id||'').toLowerCase().includes(search);
      })
    : orders;
  tbody.innerHTML = filtered.length
    ? filtered.map(o=>orderRow(o,true)).join('')
    : emptyRow(9,'No orders found');
  bindOrderActions(tbody);
}

function parseRecipient(o) {
  if (!o.recipient) return {};
  let rec = o.recipient;
  if (typeof rec === 'string') { try { rec = JSON.parse(rec); } catch {} }
  if (typeof rec === 'string') { try { rec = JSON.parse(rec); } catch {} }
  return typeof rec === 'object' && rec ? rec : {};
}

function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:rgba(255,255,255,0.2);font-size:0.85rem;">${msg}</td></tr>`;
}

function statusClass(s) {
  const map={new:'pill-blue',processing:'pill-yellow',quality_check:'pill-purple',
    packed:'pill-pink',shipped:'pill-indigo',out_for_delivery:'pill-indigo',
    delivered:'pill-green',cancelled:'pill-red'};
  return map[s]||'pill-blue';
}

function orderRow(o, extended=false) {
  const next = STATUS_ORDER[STATUS_ORDER.indexOf(o.status)+1];
  const rec = parseRecipient(o);
  const total = o.pricing?.finalTotal??0;
  const date = extended ? `<td style="font-size:0.78rem;color:rgba(255,255,255,0.5);">${safeDate(o.created_at)}</td>` : '';
  const payment = extended ? `<td><span class="pill ${o.payment_status==='paid'?'pill-green':'pill-yellow'}">${o.payment_status||'pending'}</span></td>` : '';
  return `<tr>
    <td><span class="order-id">${o.qr_code||(o.id||'').slice(0,8)}</span></td>
    ${date}
    <td style="font-size:0.83rem;">${rec.firstName||rec.name||'Guest'} ${rec.lastName||''}</td>
    <td style="font-size:0.82rem;color:rgba(255,255,255,0.6);">${o.items?.length||0} item(s)</td>
    <td class="price-cell">${fmt(total)}</td>
    <td><span class="pill ${statusClass(o.status)}">${(o.status||'').replace(/_/g,' ').toUpperCase()}</span></td>
    ${payment}
    <td style="font-size:0.78rem;color:rgba(255,255,255,0.6);">${o.delivery_date||'—'}</td>
    <td>
      <div class="action-btns">
        <button class="btn btn-ghost btn-sm view-order-btn" data-id="${o.id}">View</button>
        ${next?`<button class="btn btn-primary btn-sm advance-btn" data-id="${o.id}" data-status="${next}" style="font-size:0.72rem;">\u2192 ${next.replace(/_/g,' ')}</button>`:''}
      </div>
    </td>
  </tr>`;
}

function bindOrderActions(container) {
  if (!container) return;
  container.querySelectorAll('.view-order-btn').forEach(btn=>{
    btn.addEventListener('click',()=>openOrderDetail(btn.dataset.id));
  });
  container.querySelectorAll('.advance-btn').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      btn.disabled=true; btn.textContent='...';
      try {
        await Api.put(`/api/orders/${btn.dataset.id}/status`,{status:btn.dataset.status});
        showToast(`\u2192 ${btn.dataset.status.replace(/_/g,' ')} \u2713`,'success');
        loadDashboard();
      } catch(e) {
        showToast(e.message||'Failed','error');
        btn.disabled=false;
        btn.textContent=`\u2192 ${btn.dataset.status.replace(/_/g,' ')}`;
      }
    });
  });
}

async function openOrderDetail(id) {
  const modal = document.getElementById('orderDetailModal');
  const body = document.getElementById('orderDetailBody');
  const title = document.getElementById('orderDetailTitle');
  if (!modal||!body) return;
  if (title) title.textContent='Loading...';
  body.innerHTML='<div class="loading-state">Loading order details...</div>';
  modal.classList.add('active');
  try {
    const o = await Api.get(`/api/orders/${id}`);
    if (title) title.textContent = o.qr_code||(o.id||'').slice(0,8);
    const rec = parseRecipient(o);
    const total = o.pricing?.finalTotal??0;
    body.innerHTML=`
      <div class="order-detail-grid">
        <div class="detail-section">
          <div class="detail-label">RECIPIENT</div>
          <div style="font-weight:600;">${rec.firstName||rec.name||'Guest'} ${rec.lastName||''}</div>
          <div class="detail-sub">${rec.address||''}${rec.city?', '+rec.city:''}${rec.zip?' '+rec.zip:''}</div>
          <div class="detail-sub">${rec.phone||''}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">DELIVERY</div>
          <div>${o.delivery_date||'—'} · ${o.delivery_slot||'—'}</div>
          <div style="font-size:1.3rem;font-weight:800;color:#FFD700;margin-top:8px;">${fmt(total)}</div>
          <div class="detail-sub">${o.payment_method||'—'} · ${o.payment_status||'pending'}</div>
        </div>
      </div>
      <div class="detail-section" style="margin-top:20px;">
        <div class="detail-label">ITEMS</div>
        ${(o.items||[]).map(i=>`
          <div class="order-item-row">
            <div><span style="font-weight:600;">${i.name}</span><span class="detail-sub" style="margin-left:8px;">×${i.qty||1}</span></div>
            <span class="price-cell">${fmt((i.price||0)*(i.qty||1))}</span>
          </div>`).join('')||'<div class="detail-sub">No items</div>'}
      </div>
      ${o.special_instructions?`<div class="note-box">\uD83D\uDCDD ${o.special_instructions}</div>`:''}
      <div class="detail-section" style="margin-top:20px;">
        <div class="detail-label">DELIVERY VERIFICATION</div>
        ${o.delivery_photo ? `
          <div style="margin-top:8px;">
            <img src="${o.delivery_photo}" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,0.1);" alt="Delivery Photo">
            <div class="detail-sub" style="margin-top:4px;">Uploaded at ${safeDate(o.delivery_photo_at)}</div>
          </div>
        ` : `
          <div style="margin-top:8px;background:rgba(255,255,255,0.03);padding:12px;border-radius:12px;border:1px dashed rgba(255,255,255,0.1);">
            <div class="detail-sub" style="margin-bottom:8px;">No photo uploaded yet.</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="file" id="deliveryPhotoInp" accept="image/*" style="display:none;">
              <label for="deliveryPhotoInp" class="btn btn-ghost btn-sm" style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">Select Photo</label>
              <button type="button" class="btn btn-primary btn-sm" id="uploadDeliveryBtn" disabled>Upload Proof</button>
            </div>
            <div id="deliveryPhotoPreview" style="margin-top:10px;display:none;">
               <img id="dpPrevImg" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;">
            </div>
          </div>
        `}
      </div>
      <div class="detail-section" style="margin-top:20px;">
        <div class="detail-label">ADVANCE STATUS</div>
        <div class="action-btns" style="margin-top:8px;">
          ${STATUS_ORDER.filter(s=>STATUS_ORDER.indexOf(s)>STATUS_ORDER.indexOf(o.status))
            .map(s=>`<button class="btn btn-ghost btn-sm modal-advance" data-id="${o.id}" data-status="${s}">${s.replace(/_/g,' ')}</button>`)
            .join('')||'<span class="detail-sub">Order fully processed</span>'}
        </div>
      </div>`;
    
    const photoInp = body.querySelector('#deliveryPhotoInp');
    const uploadBtn = body.querySelector('#uploadDeliveryBtn');
    const prevDiv = body.querySelector('#deliveryPhotoPreview');
    const prevImg = body.querySelector('#dpPrevImg');

    if (photoInp) {
      photoInp.addEventListener('change', () => {
        const file = photoInp.files[0];
        if (file) {
          uploadBtn.disabled = false; // Enable immediately!
          const reader = new FileReader();
          reader.onload = (e) => {
            prevImg.src = e.target.result;
            prevDiv.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (uploadBtn) {
      uploadBtn.addEventListener('click', async () => {
        const file = photoInp.files[0];
        if (!file) return;
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        try {
          const fd = new FormData();
          fd.append('photo', file);
          await Api.upload(`/api/orders/${o.id}/photo`, fd, 'PUT');
          showToast('Delivery proof uploaded!', 'success');
          openOrderDetail(o.id); // Reload
          loadDashboard();
        } catch (e) {
          showToast(e.message || 'Upload failed', 'error');
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'Upload Proof';
        }
      });
    }

    body.querySelectorAll('.modal-advance').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        btn.disabled=true; btn.textContent='...';
        try {
          await Api.put(`/api/orders/${btn.dataset.id}/status`,{status:btn.dataset.status});
          showToast(`Advanced to ${btn.dataset.status.replace(/_/g,' ')} \u2713`,'success');
          modal.classList.remove('active');
          loadDashboard();
        } catch(e) {
          showToast(e.message||'Failed','error');
          btn.disabled=false;
          btn.textContent=btn.dataset.status.replace(/_/g,' ');
        }
      });
    });
  } catch {
    body.innerHTML='<div class="error-state">Failed to load order details</div>';
  }
}

async function loadQueue() {
  try {
    const orders = await Api.get('/api/orders?limit=200');
    STATUS_ORDER.slice(0,-1).forEach(status=>{
      const col = document.getElementById(`col-${status}`);
      const cnt = document.getElementById(`cnt-${status}`);
      if (!col) return;
      const filtered = orders.filter(o=>o.status===status);
      if (cnt) cnt.textContent = filtered.length;
      col.innerHTML = filtered.length
        ? filtered.map(o=>{
            const rec=parseRecipient(o);
            return `<div class="kanban-card" data-id="${o.id}">
              <div class="kanban-id">${o.qr_code||(o.id||'').slice(0,8)}</div>
              <div class="kanban-name">${rec.firstName||rec.name||'Guest'} ${rec.lastName||''}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                <span style="font-size:0.72rem;color:rgba(255,255,255,0.4);">${o.delivery_date||'?'}</span>
                <span style="font-size:0.8rem;font-weight:700;color:#FFD700;">${fmt(o.pricing?.finalTotal)}</span>
              </div>
            </div>`;
          }).join('')
        : '<div class="kanban-empty">Empty</div>';
      col.querySelectorAll('.kanban-card').forEach(card=>{
        card.addEventListener('click',()=>openOrderDetail(card.dataset.id));
      });
    });
  } catch { showToast('Failed to load queue','error'); }
}

async function loadAdminProducts() {
  const search = (document.getElementById('productSearch')?.value||'').toLowerCase();
  const cat = document.getElementById('productCatFilter')?.value||'';
  try {
    const params = cat?`?category=${cat}&limit=100`:'?limit=100';
    const data = await Api.get(`/api/products${params}`);
    allProductsCache = data.products||data;
    const products = allProductsCache.filter(p=>!search||p.name.toLowerCase().includes(search));
    const tbody = document.getElementById('adminProductsTbody');
    if (!tbody) return;

   
   tbody.innerHTML = products.length
      ? products.map(p=>`
        <tr>
          <td>
            <div class="product-thumb">
              ${resolveImage(p.images)
                ?`<img src="${resolveImage(p.images)}" alt="${p.name}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;">`
                :'<span style="font-size:1.5rem;">\uD83C\uDF38</span>'}
            </div>
          </td>
          <td>
            <div style="font-weight:600;font-size:0.88rem;">${p.name}</div>
            <div style="font-size:0.72rem;color:rgba(255,255,255,0.35);margin-top:2px;">${p.description?p.description.slice(0,60)+'…':''}</div>
          </td>
          <td><span class="pill pill-blue">${p.category||'—'}</span></td>
          <td class="price-cell">${fmt(p.base_price)}</td>
          <td>
            <span style="font-weight:700;color:${p.inventory<=0?'#ef4444':p.inventory<10?'#fbbf24':'#00D4AA'};">
              ${p.inventory||0}
            </span>
          </td>
          <td>
            <span class="pill ${p.inventory>0?'pill-green':'pill-red'}">
              ${p.inventory>0?'Active':'Out of Stock'}
            </span>
          </td>
          <td>
            <div class="action-btns">
              <button class="btn btn-ghost btn-sm edit-product" data-id="${p.id}">Edit</button>
              <button class="btn btn-sm delete-product" data-id="${p.id}" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);">Delete</button>
            </div>
          </td>
        </tr>`).join('')
      : emptyRow(7,'No products found');

    tbody.querySelectorAll('.edit-product').forEach(btn=>{
      btn.addEventListener('click',()=>openEditProduct(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-product').forEach(btn=>{
      btn.addEventListener('click',()=>{
        openConfirm('Delete this product? This cannot be undone.', async () => {
          try {
            await Api.delete(`/api/products/${btn.dataset.id}`);
            showToast('Product deleted \u2713','success');
            loadAdminProducts();
            if (typeof socket !== 'undefined' && socket) socket.emit('admin_updated_catalog');
          } catch { showToast('Failed to delete','error'); }
        });
      });
    });
  } catch { showToast('Failed to load products','error'); }
}

function openEditProduct(id) {
  const p = allProductsCache.find(x=>String(x.id)===String(id));
  if (!p) return;
  document.getElementById('productModalTitle').textContent='Edit Product';
  document.getElementById('pmId').value=id;
  document.getElementById('pmName').value=p.name||'';
  document.getElementById('pmCategory').value=p.category||'fresh';
  document.getElementById('pmSubcategory').value=p.subcategory||'';
  document.getElementById('pmPrice').value=p.base_price||'';
  document.getElementById('pmInventory').value=p.inventory||'';
  document.getElementById('pmLeadTime').value=p.lead_time||1;
  document.getElementById('pmCustomizable').value=p.customizable?'1':'0';
  document.getElementById('pmDescription').value=p.description||'';
  document.getElementById('pmTags').value=Array.isArray(p.tags)?p.tags.join(', '):(p.tags||'');
  const preview = document.getElementById('pmImagePreview');
  if (preview) {
    let imgs = p.images;
    if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch(e) {} }
    if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch(e) {} }
    let arr = Array.isArray(imgs) ? imgs.flat(Infinity) : (imgs ? [imgs] :[]);
    preview.innerHTML = arr.map(src => resolveImage(src)).filter(Boolean)
      .map(src => `<img src="${src}" style="height:60px;border-radius:6px;object-fit:cover;" alt="">`).join('');
  }
  document.getElementById('productModal').classList.add('active');
}

async function saveProduct() {
  const id = document.getElementById('pmId').value;
  const name = document.getElementById('pmName').value.trim();
  const price = parseFloat(document.getElementById('pmPrice').value);
  if (!name) { showToast('Product name required','error'); return; }
  if (isNaN(price) || price < 0) { showToast('Valid price required','error'); return; }

  const category = document.getElementById('pmCategory').value;
  const subcategory = document.getElementById('pmSubcategory').value.trim();
  const base_price = price;
  const inventory = parseInt(document.getElementById('pmInventory').value) || 0;
  const lead_time = parseInt(document.getElementById('pmLeadTime').value) || 1;
  const customizable = document.getElementById('pmCustomizable').value === '1' || document.getElementById('pmCustomizable').checked;
  const description = document.getElementById('pmDescription').value.trim();
  const tags = document.getElementById('pmTags').value.split(',').map(s => s.trim()).filter(Boolean);

  const fileInput = document.getElementById('pmImages');
  const files = fileInput?.files;

  const formData = new FormData();
  formData.append('name', name);
  formData.append('category', category);
  formData.append('subcategory', subcategory);
  formData.append('base_price', String(base_price));
  formData.append('inventory', String(inventory));
  formData.append('lead_time', String(lead_time));
  formData.append('customizable', customizable ? 'true' : 'false');
  formData.append('description', description);
  
  
  formData.append('tags', JSON.stringify(tags));
 
  if (files?.length) {
    Array.from(files).slice(0, 5).forEach(f => formData.append('images', f));
  } else if (id) {
    let existing = allProductsCache.find(x => String(x.id) === String(id))?.images ||[];
    if (typeof existing === 'string') { try { existing = JSON.parse(existing); } catch(e){} }
    if (typeof existing === 'string') { try { existing = JSON.parse(existing); } catch(e){} }
    const flatExisting = Array.isArray(existing) ? existing.flat(Infinity) : [existing];
    formData.append('images', JSON.stringify(flatExisting.map(img => typeof img === 'string' ? img.replace(/[\[\]"\\]/g, '/') : img)));
  }

  const btn = document.getElementById('saveProduct');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';
   
    await Api.upload(url, formData, method);

    showToast(id ? 'Product updated \u2713' : 'Product created \uD83C\uDF38', 'success');
    document.getElementById('productModal').classList.remove('active');
    if (typeof loadAdminProducts === 'function') loadAdminProducts();
    if (typeof socket !== 'undefined' && socket) socket.emit('admin_updated_catalog');
  } catch (e) {
    showToast(e.message || 'Failed to save', 'error');
    console.error('saveProduct error:', e);
  } finally {
    btn.disabled = false; btn.textContent = '💾 Save Product';
  }
}


function resetProductForm() {
  document.getElementById('pmId').value='';
  document.getElementById('pmName').value='';
  document.getElementById('pmCategory').value='fresh';
  document.getElementById('pmSubcategory').value='';
  document.getElementById('pmPrice').value='';
  document.getElementById('pmInventory').value='';
  document.getElementById('pmLeadTime').value='1';
  document.getElementById('pmCustomizable').value='0';
  document.getElementById('pmDescription').value='';
  document.getElementById('pmTags').value='';
  document.getElementById('pmImages').value='';
  document.getElementById('pmImagePreview').innerHTML='';
  document.getElementById('productModalTitle').textContent='Add Product';
}

async function loadInventory() {
  try {
    const data = await Api.get('/api/products?limit=200');
    const products = data.products||data;
    const low = products.filter(p=>p.inventory>0&&p.inventory<10).length;
    const out = products.filter(p=>!p.inventory||p.inventory<=0).length;
    const setEl=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
    setEl('invLow',low); setEl('invOut',out); setEl('invTotal',products.length);
    const listEl = document.getElementById('inventoryList');
    if (!listEl) return;
    listEl.innerHTML = products.length
      ? products.map(p=>`
        <div class="inv-row">
          <div class="inv-info">
            <div style="font-weight:600;font-size:0.88rem;">${p.name}</div>
            <div style="font-size:0.73rem;color:rgba(255,255,255,0.35);margin-top:2px;">${p.category||'—'} · ${fmt(p.base_price)}</div>
          </div>
          <div class="inv-controls">
            <div class="stock-stepper">
              <button class="stepper-btn inv-dec" data-id="${p.id}" data-stock="${p.inventory||0}">\u2212</button>
              <span class="stock-val" style="color:${p.inventory<=0?'#ef4444':p.inventory<10?'#fbbf24':'#00D4AA'};">${p.inventory||0}</span>
              <button class="stepper-btn inv-inc" data-id="${p.id}" data-stock="${p.inventory||0}">+</button>
            </div>
            <span class="stock-status" style="color:${p.inventory<=0?'#ef4444':p.inventory<10?'#fbbf24':'rgba(255,255,255,0.3)'};">
              ${p.inventory<=0?'\u26A0 Out':p.inventory<10?'\u26A0 Low':'\u2713 OK'}
            </span>
          </div>
        </div>`).join('')
      : '<div class="empty-state">No products found</div>';

    listEl.querySelectorAll('.inv-inc,.inv-dec').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const isInc=btn.classList.contains('inv-inc');
        const current=parseInt(btn.dataset.stock)||0;
        const newStock=isInc?current+1:Math.max(0,current-1);
        try {
          await Api.put(`/api/products/${btn.dataset.id}`,{inventory:newStock});
          showToast(`Stock \u2192 ${newStock}`,'success');
          loadInventory();
        } catch { showToast('Failed to update stock','error'); }
      });
    });
  } catch { showToast('Failed to load inventory','error'); }
}

async function loadFaqs() {
  try {
    let faqs=[];
    try { faqs=await Api.get('/api/faq'); } catch { faqs=[]; }
    const listEl=document.getElementById('faqsList');
    if (!listEl) return;
    listEl.innerHTML = faqs.length
      ? faqs.map(f=>`
        <div class="content-block">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div style="flex:1;">
              <div style="font-weight:700;margin-bottom:6px;">${f.question}</div>
              <div style="font-size:0.84rem;color:rgba(255,255,255,0.55);line-height:1.6;">${f.answer}</div>
              ${f.category?`<span class="pill pill-blue" style="margin-top:10px;display:inline-block;">${f.category}</span>`:''}
            </div>
            <div class="action-btns" style="flex-shrink:0;">
              <button class="btn btn-ghost btn-sm edit-faq" data-id="${f.id}">Edit</button>
              <button class="btn btn-sm delete-faq" data-id="${f.id}" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.25);">Del</button>
            </div>
          </div>
        </div>`).join('')
      : '<div class="empty-state">No FAQs yet. Add your first one!</div>';
    listEl.querySelectorAll('.edit-faq').forEach(btn=>{
      btn.addEventListener('click',()=>openEditFaq(btn.dataset.id,faqs));
    });
    listEl.querySelectorAll('.delete-faq').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        if (!confirm('Delete this FAQ?')) return;
        try {
          await Api.delete(`/api/faq/${btn.dataset.id}`);
          showToast('FAQ deleted','success');
          loadFaqs();
        } catch { showToast('Failed to delete FAQ','error'); }
      });
    });
  } catch { showToast('Failed to load FAQs','error'); }
}

function openEditFaq(id, faqs) {
  const f=faqs.find(x=>String(x.id)===String(id));
  if (!f) return;
  document.getElementById('faqModalTitle').textContent='Edit FAQ';
  document.getElementById('faqId').value=id;
  document.getElementById('faqQuestion').value=f.question||'';
  document.getElementById('faqAnswer').value=f.answer||'';
  document.getElementById('faqCategory').value=f.category||'general';
  document.getElementById('faqOrder').value=f.sort_order||0;
  document.getElementById('faqModal').classList.add('active');
}

async function saveFaq() {
  const id=document.getElementById('faqId').value;
  const question=document.getElementById('faqQuestion').value.trim();
  const answer=document.getElementById('faqAnswer').value.trim();
  if (!question) { showToast('Question required','error'); return; }
  if (!answer) { showToast('Answer required','error'); return; }
  const payload={
    question, answer,
    category:document.getElementById('faqCategory').value,
    sort_order:parseInt(document.getElementById('faqOrder').value)||0
  };
  const btn=document.getElementById('saveFaq');
  btn.disabled=true; btn.textContent='Saving...';
  try {
    if (id) {
      await Api.put(`/api/faq/${id}`,payload);
      showToast('FAQ updated \u2713','success');
    } else {
      await Api.post('/api/faq',payload);
      showToast('FAQ created \u2713','success');
    }
    document.getElementById('faqModal').classList.remove('active');
    loadFaqs();
  } catch(e) {
    showToast(e.message||'Failed to save FAQ','error');
  } finally {
    btn.disabled=false; btn.textContent='💾 Save FAQ';
  }
}

function resetFaqForm() {
  ['faqId','faqQuestion','faqAnswer'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  document.getElementById('faqCategory').value='general';
  document.getElementById('faqOrder').value='0';
  document.getElementById('faqModalTitle').textContent='Add FAQ';
}

async function loadContent() {
  try {
    const c=await Api.get('/api/content');
    const fields={
      contentHeroBadge:c.heroBadge,
      contentHeroHeadline:c.heroHeadline,
      contentHeroSub:c.hero_subtitle || c.heroSub,
      contentFreeShip:c.freeShipThreshold,
      contentBanner:c.banner,
      contentCorpHeadline:c.corpHeadline,
      contentFooter:c.footerTagline,
      contentIG:c.instagramUrl,
      contentFB:c.facebookUrl,
      contentSubWeeklyName:c.sub_weekly_name,
      contentSubWeeklyPrice:c.sub_weekly_price,
      contentSubBiweeklyName:c.sub_biweekly_name,
      contentSubBiweeklyPrice:c.sub_biweekly_price,
      contentSubMonthlyName:c.sub_monthly_name,
      contentSubMonthlyPrice:c.sub_monthly_price
    };
    Object.entries(fields).forEach(([id,val])=>{
      const el=document.getElementById(id);
      if (el&&val!=null) el.value=val;
    });
    const ba=document.getElementById('contentBannerActive');
    if (ba) ba.checked=!!c.bannerActive;
  } catch {}
}

async function saveContent() {
  const payload={
    heroBadge:document.getElementById('contentHeroBadge')?.value.trim(),
    heroHeadline:document.getElementById('contentHeroHeadline')?.value.trim(),
    hero_subtitle:document.getElementById('contentHeroSub')?.value.trim(),
    freeShipThreshold:parseFloat(document.getElementById('contentFreeShip')?.value)||4350,
    banner:document.getElementById('contentBanner')?.value.trim(),
    bannerActive:document.getElementById('contentBannerActive')?.checked||false,
    corpHeadline:document.getElementById('contentCorpHeadline')?.value.trim(),
    footerTagline:document.getElementById('contentFooter')?.value.trim(),
    instagramUrl:document.getElementById('contentIG')?.value.trim(),
    facebookUrl:document.getElementById('contentFB')?.value.trim(),
    sub_weekly_name:document.getElementById('contentSubWeeklyName')?.value.trim(),
    sub_weekly_price:parseFloat(document.getElementById('contentSubWeeklyPrice')?.value)||1499,
    sub_biweekly_name:document.getElementById('contentSubBiweeklyName')?.value.trim(),
    sub_biweekly_price:parseFloat(document.getElementById('contentSubBiweeklyPrice')?.value)||2299,
    sub_monthly_name:document.getElementById('contentSubMonthlyName')?.value.trim(),
    sub_monthly_price:parseFloat(document.getElementById('contentSubMonthlyPrice')?.value)||4299
  };
  const btn=document.getElementById('saveContent');
  btn.disabled=true; btn.textContent='Saving...';
  try {
    await Api.put('/api/content',payload);
    showToast('Content saved \u2713','success');
  } catch(e) {
    showToast(e.message||'Failed to save content','error');
  } finally {
    btn.disabled=false; btn.textContent='💾 Save All';
  }
}

async function loadSupportTickets() {
  const status=document.getElementById('ticketStatusFilter')?.value||'';
  try {
    const tickets=await Api.get(`/api/support${status?'?status='+status:''}`);
    const list=document.getElementById('ticketsList');
    if (!list) return;
    list.innerHTML = tickets.length
      ? tickets.map(t=>`
        <div class="content-block">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
            <div style="flex:1;">
              <div style="font-weight:700;margin-bottom:4px;">${t.subject||'No subject'}</div>
              <div style="font-size:0.78rem;color:rgba(255,255,255,0.35);">#${(t.id||'').slice(0,8)} · ${t.channel||'web'} · ${t.messages?.length||0} msg(s)</div>
              ${(t.csat_score || t.nps_score) ? `
                <div style="font-size:0.85rem;margin-top:6px;color:#FFD700;background:rgba(255,215,0,0.1);display:inline-block;padding:2px 8px;border-radius:4px;">\u2B50 CSAT: <b>${t.csat_score||'—'}</b>/5 &nbsp;&middot;&nbsp; \uD83D\uDCCA NPS: <b>${t.nps_score||'—'}</b>/10</div>
                ${t.feedback_comment ? `<div style="font-size:0.8rem;color:rgba(255,255,255,0.65);margin-top:6px;font-style:italic;background:rgba(255,255,255,0.03);padding:6px 10px;border-left:2px solid var(--bloom-primary);border-radius:0 4px 4px 0;max-width:400px;word-wrap:break-word;">\uD83D\uDCAC "${t.feedback_comment}"</div>` : ''}
              ` : ''}
            </div>
            <div class="action-btns" style="align-items:center;">
              <span class="pill ${t.status==='resolved'?'pill-green':t.status==='pending'?'pill-yellow':'pill-blue'}">${(t.status||'open').toUpperCase()}</span>
              ${t.status!=='resolved'?`
                <button class="btn btn-ghost btn-sm resolve-ticket" data-id="${t.id}">Resolve</button>
                <button class="btn btn-primary btn-sm gen-discount" data-id="${t.id}">Gen Code</button>
              `:''}
            </div>
          </div>
        </div>`).join('')
      : '<div class="empty-state">No tickets found</div>';

    list.querySelectorAll('.resolve-ticket').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        btn.disabled=true; btn.textContent='...';
        try {
          await Api.post(`/api/support/${btn.dataset.id}/resolve`,{csatScore:5});
          showToast('Ticket resolved \u2713','success');
          loadSupportTickets();
        } catch(e) {
          showToast(e.message||'Failed','error');
          btn.disabled=false; btn.textContent='Resolve';
        }
      });
    });
    list.querySelectorAll('.gen-discount').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        btn.disabled=true;
        try {
          const res=await Api.post(`/api/support/${btn.dataset.id}/discount`,{});
          showToast(`Code: ${res.discountCode}`,'success');
        } catch(e) {
          showToast(e.message||'Failed to generate','error');
        } finally { btn.disabled=false; }
      });
    });
  } catch { showToast('Failed to load tickets','error'); }
}

async function loadAnalytics() {
  try {
    const data=await Api.get('/api/analytics/dashboard');
    const kpi=document.getElementById('analyticsKpi');
    if (kpi) {
      kpi.innerHTML=`
        <div class="kpi-card" style="--kpi-color:rgba(0,212,170,0.2)"><div class="kpi-icon">\uD83D\uDE0A</div><div class="kpi-label">CSAT Score</div><div class="kpi-value">${data.csat?Number(data.csat).toFixed(1):'—'}<span style="font-size:1rem;font-weight:400">/5</span></div></div>
        <div class="kpi-card" style="--kpi-color:rgba(99,102,241,0.2)"><div class="kpi-icon">\uD83D\uDCCA</div><div class="kpi-label">NPS Score</div><div class="kpi-value">${data.nps?Number(data.nps).toFixed(1):'—'}<span style="font-size:1rem;font-weight:400">/10</span></div></div>
        <div class="kpi-card" style="--kpi-color:rgba(232,67,147,0.2)"><div class="kpi-icon">\uD83D\uDCB0</div><div class="kpi-label">Total Revenue</div><div class="kpi-value">${fmt(data.revenue?.total||0)}</div></div>
        <div class="kpi-card" style="--kpi-color:rgba(255,215,0,0.2)"><div class="kpi-icon">\uD83D\uDCE6</div><div class="kpi-label">Total Orders</div><div class="kpi-value">${data.revenue?.orders||0}</div></div>`;
    }
    renderBarChart('analyticsChart',data.salesByCategory||[]);
    const events=document.getElementById('eventList');
    if (events) {
      events.innerHTML=(data.recentEvents||[]).length
        ? data.recentEvents.map(e=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:0.84rem;color:rgba(255,255,255,0.65);">${e.event_type}</span>
            <span style="font-weight:700;font-size:0.9rem;">${e.count}</span>
          </div>`).join('')
        : '<div class="empty-state">No events yet</div>';
    }
  } catch { showToast('Failed to load analytics','error'); }
}

async function loadUsers() {
  const search=(document.getElementById('userSearch')?.value||'').toLowerCase();
  const role=document.getElementById('userRoleFilter')?.value||'';
  try {
    const users=await Api.get(`/api/users?limit=100${role?'&role='+role:''}`);
    const tbody=document.getElementById('usersTbody');
    if (!tbody) return;
    const filtered=search
      ? users.filter(u=>(u.name||'').toLowerCase().includes(search)||(u.email||'').toLowerCase().includes(search))
      : users;
    tbody.innerHTML=filtered.length
      ? filtered.map(u=>`
        <tr>
          <td style="font-weight:600;">${u.name||'—'}</td>
          <td style="font-size:0.82rem;color:rgba(255,255,255,0.6);">${u.email||'—'}</td>
          <td><span class="pill ${u.role==='admin'?'pill-pink':'pill-blue'}">${u.role||'customer'}</span></td>
          <td style="font-weight:600;color:#FFD700;">${u.loyalty_points||0}</td>
          <td style="font-size:0.78rem;color:rgba(255,255,255,0.4);">${safeDate(u.created_at)}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-ghost btn-sm view-user" data-id="${u.id}">View</button>
              ${u.role!=='admin'?`<button class="btn btn-ghost btn-sm promote-user" data-id="${u.id}" data-name="${u.name||u.email}">Promote</button>`:''}
            </div>
          </td>
        </tr>`).join('')
      : emptyRow(6,'No users found');
    tbody.querySelectorAll('.view-user').forEach(btn=>{
      btn.addEventListener('click',()=>openUserDetail(btn.dataset.id,filtered));
    });
    tbody.querySelectorAll('.promote-user').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        if (!confirm(`Promote ${btn.dataset.name} to admin?`)) return;
        try {
          await Api.put(`/api/users/${btn.dataset.id}`,{role:'admin'});
          showToast('User promoted to admin','success');
          loadUsers();
        } catch { showToast('Failed to promote user','error'); }
      });
    });
  } catch { showToast('Failed to load users','error'); }
}

function openUserDetail(id, users) {
  const u=users.find(x=>String(x.id)===String(id));
  const modal=document.getElementById('userDetailModal');
  const body=document.getElementById('userDetailBody');
  if (!modal||!body||!u) return;
  body.innerHTML=`
    <div class="detail-section">
      <div class="detail-label">PROFILE</div>
      <div style="font-weight:700;font-size:1.1rem;">${u.name||'—'}</div>
      <div class="detail-sub">${u.email}</div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <span class="pill ${u.role==='admin'?'pill-pink':'pill-blue'}">${u.role}</span>
        <span class="pill pill-yellow">⭐ ${u.loyalty_points||0} pts</span>
      </div>
    </div>
    <div class="detail-section" style="margin-top:16px;">
      <div class="detail-label">ACCOUNT</div>
      <div style="font-size:0.85rem;">Joined: ${safeDate(u.created_at)}</div>
      <div style="font-size:0.85rem;">Orders: ${u.order_count||0}</div>
      <div style="font-size:0.85rem;">Total Spent: ${fmt(u.total_spent||0)}</div>
    </div>`;
  modal.classList.add('active');
}

async function loadReviews() {
  const rating=document.getElementById('reviewFilter')?.value||'';
  try {
    const reviews=await Api.get(`/api/reviews?limit=100${rating?'&rating='+rating:''}`);
    const tbody=document.getElementById('reviewsTbody');
    if (!tbody) return;
    tbody.innerHTML=reviews.length
      ? reviews.map(r=>`
        <tr>
          <td style="font-size:0.83rem;font-weight:600;">${r.product_name||r.productId||'—'}</td>
          <td style="font-size:0.83rem;">${r.user_name||'Anonymous'}</td>
          <td style="white-space:nowrap;">${stars(r.rating)}</td>
          <td style="font-size:0.82rem;color:rgba(255,255,255,0.6);max-width:260px;">${(r.comment||'—').slice(0,100)}${r.comment?.length>100?'…':''}</td>
          <td style="font-size:0.78rem;color:rgba(255,255,255,0.35);">${safeDate(r.created_at)}</td>
          <td>
            <button class="btn btn-sm delete-review" data-id="${r.id}" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.25);">Delete</button>
          </td>
        </tr>`).join('')
      : emptyRow(6,'No reviews found');
    tbody.querySelectorAll('.delete-review').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        if (!confirm('Delete this review?')) return;
        try {
          await Api.delete(`/api/reviews/${btn.dataset.id}`);
          showToast('Review deleted','success');
          loadReviews();
        } catch { showToast('Failed to delete review','error'); }
      });
    });
  } catch { showToast('Failed to load reviews','error'); }
}

async function loadPromos() {
  try {
    const promos=await Api.get('/api/promos');
    const tbody=document.getElementById('promosTbody');
    if (!tbody) return;
    tbody.innerHTML=promos.length
      ? promos.map(p=>`
        <tr>
          <td><span style="font-family:monospace;font-weight:700;font-size:0.9rem;letter-spacing:1px;color:#e84393;">${p.code}</span></td>
          <td><span class="pill pill-blue">${p.discount_type||p.type}</span></td>
          <td style="font-weight:700;">${p.discount_type==='percent'||p.type==='percent'?p.value+'%':fmt(p.value)}</td>
          <td>${p.min_order_amount?fmt(p.min_order_amount):'—'}</td>
          <td>${p.used_count||0} / ${p.max_uses||'∞'}</td>
          <td style="font-size:0.78rem;color:rgba(255,255,255,0.4);">${p.expires_at?safeDate(p.expires_at):'Never'}</td>
          <td><span class="pill ${p.is_active?'pill-green':'pill-red'}">${p.is_active?'Active':'Inactive'}</span></td>
          <td>
            <div class="action-btns">
              <button class="btn btn-ghost btn-sm toggle-promo" data-id="${p.id}" data-active="${p.is_active?'1':'0'}">${p.is_active?'Disable':'Enable'}</button>
              <button class="btn btn-sm delete-promo" data-id="${p.id}" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.25);">Del</button>
            </div>
          </td>
        </tr>`).join('')
      : emptyRow(8,'No promo codes yet');
    tbody.querySelectorAll('.toggle-promo').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const active=btn.dataset.active==='1';
        try {
          await Api.put(`/api/promos/${btn.dataset.id}`,{is_active:!active});
          showToast(`Promo ${active?'disabled':'enabled'} ✓`,'success');
          loadPromos();
        } catch { showToast('Failed to update promo','error'); }
      });
    });
    tbody.querySelectorAll('.delete-promo').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        if (!confirm('Delete this promo code?')) return;
        try {
          await Api.delete(`/api/promos/${btn.dataset.id}`);
          showToast('Promo deleted','success');
          loadPromos();
        } catch { showToast('Failed to delete promo','error'); }
      });
    });
  } catch { showToast('Failed to load promos','error'); }
}

async function savePromo() {
  const code=document.getElementById('promoCode').value.trim().toUpperCase();
  const type=document.getElementById('promoType').value;
  const value=parseFloat(document.getElementById('promoValue').value);
  if (!code) { showToast('Code required','error'); return; }
  if (isNaN(value)||value<0) { showToast('Valid value required','error'); return; }
  const payload={
    code, discount_type:type, value,
    min_order_amount:parseFloat(document.getElementById('promoMinOrder').value)||0,
    max_uses:parseInt(document.getElementById('promoMaxUses').value)||null,
    expires_at:document.getElementById('promoExpires').value||null,
    is_active:true
  };
  const btn=document.getElementById('savePromo');
  btn.disabled=true; btn.textContent='Saving...';
  try {
    await Api.post('/api/promos',payload);
    showToast('Promo created ✓','success');
    document.getElementById('promoModal').classList.remove('active');
    loadPromos();
  } catch(e) {
    showToast(e.message||'Failed to save promo','error');
  } finally {
    btn.disabled=false; btn.textContent='💾 Save Promo';
  }
}

async function loadBanners() {
  try {
    let banners=[];
    try { banners=await Api.get('/api/banners'); } catch { banners=[]; }
    const list=document.getElementById('bannersList');
    if (!list) return;
    list.innerHTML=banners.length
      ? banners.map(b=>`
        <div class="content-block" style="display:flex;gap:16px;align-items:center;">
          ${b.image_url?`<img src="${b.image_url}" style="width:80px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;" alt="">`:'<div style="width:80px;height:56px;background:rgba(139,31,110,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🖼</div>'}
          <div style="flex:1;">
            <div style="font-weight:700;">${b.title||'—'}</div>
            <div style="font-size:0.8rem;color:rgba(255,255,255,0.45);margin-top:2px;">${b.subtitle||''}</div>
            <div style="font-size:0.72rem;color:rgba(255,255,255,0.25);margin-top:4px;">${b.link_url||''}</div>
          </div>
          <div class="action-btns">
            <span class="pill ${b.is_active?'pill-green':'pill-red'}">${b.is_active?'Active':'Off'}</span>
            <button class="btn btn-ghost btn-sm edit-banner" data-id="${b.id}">Edit</button>
            <button class="btn btn-sm delete-banner" data-id="${b.id}" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.25);">Del</button>
          </div>
        </div>`).join('')
      : '<div class="empty-state">No banners yet. Add your first!</div>';
    list.querySelectorAll('.edit-banner').forEach(btn=>{
      btn.addEventListener('click',()=>openEditBanner(btn.dataset.id,banners));
    });
    list.querySelectorAll('.delete-banner').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        if (!confirm('Delete this banner?')) return;
        try {
          await Api.delete(`/api/banners/${btn.dataset.id}`);
          showToast('Banner deleted','success');
          loadBanners();
          if (socket) socket.emit('admin_updated_catalog');
        } catch { showToast('Failed to delete banner','error'); }
      });
    });
  } catch { showToast('Failed to load banners','error'); }
}

function openEditBanner(id, banners) {
  const b=banners.find(x=>String(x.id)===String(id));
  if (!b) return;
  document.getElementById('bannerModalTitle').textContent='Edit Banner';
  document.getElementById('bannerId').value=id;
  document.getElementById('bannerTitle').value=b.title||'';
  document.getElementById('bannerSubtitle').value=b.subtitle||'';
  document.getElementById('bannerLink').value=b.link_url||'';
  document.getElementById('bannerOrder').value=b.sort_order||0;
  const preview=document.getElementById('bannerImagePreview');
  if (preview&&b.image_url) { preview.src=b.image_url; preview.style.display='block'; }
  document.getElementById('bannerModal').classList.add('active');
}

async function saveBanner() {
  const id=document.getElementById('bannerId').value;
  const title=document.getElementById('bannerTitle').value.trim();
  if (!title) { showToast('Title required','error'); return; }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('subtitle', document.getElementById('bannerSubtitle').value.trim());
  formData.append('link_url', document.getElementById('bannerLink').value.trim());
  formData.append('sort_order', document.getElementById('bannerOrder').value || 0);
  formData.append('active', 1);

  const fileInput = document.getElementById('bannerImage');
  if (fileInput?.files?.length) {
    formData.append('image', fileInput.files[0]);
  }

  const btn=document.getElementById('saveBanner');
  btn.disabled=true; btn.textContent='Saving...';
  try {
    const url = id ? `/api/banners/${id}` : '/api/banners';
    
    await Api.upload(url, formData, id ? 'PUT' : 'POST');
    
    showToast(id ? 'Banner updated ✓' : 'Banner created ✓', 'success');
    document.getElementById('bannerModal').classList.remove('active');
    loadBanners();
    if (socket) socket.emit('admin_updated_catalog');
  } catch(e) {
    showToast(e.message||'Failed to save banner','error');
  } finally {
    btn.disabled=false; btn.textContent='💾 Save Banner';
  }
}

async function sendBroadcast() {
  const title=document.getElementById('broadcastTitleInput').value.trim();
  const message=document.getElementById('broadcastMessage').value.trim();
  const type=document.getElementById('broadcastType').value;
  const result=document.getElementById('broadcastResult');
  if (!title||!message) { showToast('Title and message required','error'); return; }
  const btn=document.getElementById('sendBroadcast');
  btn.disabled=true; btn.textContent='Sending...';
  try {
    const res=await Api.post('/api/notifications/broadcast',{title,message,type});
    result.textContent=`✓ Sent to ${res.count||'all'} customers`;
    result.style.color='#00D4AA';
    showToast('Broadcast sent ✓','success');
    document.getElementById('broadcastTitleInput').value='';
    document.getElementById('broadcastMessage').value='';
    const countEl = document.getElementById('broadcastCount');
    if (countEl) countEl.textContent = '0';
  } catch(e) {
    result.textContent=`✕ ${e.message||'Failed to send'}`;
    result.style.color='#ef4444';
    showToast('Broadcast failed','error');
  } finally {
    btn.disabled=false; btn.textContent='📣 Send to All Customers';
  }
}

function switchPanel(panel) {
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.remove('active');
    p.hidden = true;
    p.style.display = '';
  });
  document.querySelectorAll('.admin-nav-item').forEach(n => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });
  const el = document.getElementById(`panel-${panel}`);
  if (el) { el.hidden = false; el.classList.add('active'); }
  const nav = document.querySelector(`[data-panel="${panel}"]`);
  if (nav) { nav.classList.add('active'); nav.setAttribute('aria-current', 'page'); }

  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (window.innerWidth <= 900 && sidebar?.classList.contains('open')) {
    sidebar.classList.remove('open');
    backdrop?.classList.remove('active');
    document.getElementById('sidebarToggle')?.setAttribute('aria-expanded', 'false');
  }

  const loaders = {
    dashboard: loadDashboard,
    products: loadAdminProducts,
    orders: loadAllOrders,
    queue: loadQueue,
    inventory: loadInventory,
    banners: loadBanners,
    faqs: loadFaqs,
    content: loadContent,
    users: loadUsers,
    support: loadSupportTickets,
    reviews: loadReviews,
    promos: loadPromos,
    broadcast: () => {},
    analytics: loadAnalytics
  };
  if (loaders[panel]) loaders[panel]();
  try { history.replaceState(null, '', `#${panel}`); } catch {}
}

function bindNav() {
  document.querySelectorAll('.admin-nav-item[data-panel]').forEach(btn=>{
    btn.addEventListener('click', e => { e.preventDefault(); switchPanel(btn.dataset.panel); });
  });
}

function openConfirm(message, onOk) {
  const modal = document.getElementById('confirmModal');
  const msg = document.getElementById('confirmMessage');
  const ok = document.getElementById('confirmOk');
  if (!modal) { if (window.confirm(message)) onOk(); return; }
  if (msg) msg.textContent = message;
  modal.classList.add('active');
  modal.hidden = false;
  const cleanup = () => {
    modal.classList.remove('active');
    modal.hidden = true;
    ok.removeEventListener('click', handler);
  };
  const handler = () => { cleanup(); try { onOk(); } catch(e) { console.error(e); } };
  ok.addEventListener('click', handler, { once: true });
  document.getElementById('confirmCancel')?.addEventListener('click', cleanup, { once: true });
  document.getElementById('closeConfirm')?.addEventListener('click', cleanup, { once: true });
}
window.openConfirm = openConfirm;

function exportCSV(filename, rows) {
  if (!rows?.length) { showToast('Nothing to export', 'info'); return; }
  const headers = Object.keys(rows[0]);
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
  showToast('Export ready \u2713', 'success');
}

function bindModals() {
  const pairs=[
    ['closeOrderDetail','orderDetailModal'],
    ['closeProductModal','productModal'],
    ['cancelProductModal','productModal'],
    ['closeFaqModal','faqModal'],
    ['cancelFaqModal','faqModal'],
    ['closePromoModal','promoModal'],
    ['cancelPromoModal','promoModal'],
    ['closeBannerModal','bannerModal'],
    ['cancelBannerModal','bannerModal'],
    ['closeUserDetail','userDetailModal']
  ];
  const closeModal = (modalId) => {
    const m = document.getElementById(modalId);
    if (m) { m.classList.remove('active'); m.hidden = true; }
  };
  pairs.forEach(([btnId,modalId])=>{
    document.getElementById(btnId)?.addEventListener('click',()=>closeModal(modalId));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay=>{
    overlay.addEventListener('click',e=>{ if(e.target===overlay) { overlay.classList.remove('active'); overlay.hidden = true; } });
  });

  document.getElementById('openAddProduct')?.addEventListener('click',()=>{
    resetProductForm();
    document.getElementById('productModal')?.classList.add('active');
  });
  document.getElementById('productModalBody')?.addEventListener('submit', e => { e.preventDefault(); saveProduct(); });

  document.getElementById('openAddFaq')?.addEventListener('click',()=>{
    resetFaqForm();
    document.getElementById('faqModal')?.classList.add('active');
  });
  document.getElementById('faqForm')?.addEventListener('submit', e => { e.preventDefault(); saveFaq(); });

  document.getElementById('openAddPromo')?.addEventListener('click',()=>{
    ['promoId','promoCode','promoValue','promoMinOrder','promoMaxUses','promoExpires']
      .forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
    document.getElementById('promoModalTitle') && (document.getElementById('promoModalTitle').textContent='Add Promo Code');
    document.getElementById('promoModal')?.classList.add('active');
  });
  document.getElementById('promoForm')?.addEventListener('submit', e => { e.preventDefault(); savePromo(); });

  document.getElementById('openAddBanner')?.addEventListener('click',()=>{
    document.getElementById('bannerId').value='';
    document.getElementById('bannerTitle').value='';
    document.getElementById('bannerSubtitle').value='';
    document.getElementById('bannerLink').value='';
    document.getElementById('bannerOrder').value='0';
    const bi = document.getElementById('bannerImage'); if (bi) bi.value='';
    const bip = document.getElementById('bannerImagePreview');
    if (bip) { bip.removeAttribute('src'); bip.hidden = true; bip.style.display='none'; }
    document.getElementById('bannerModalTitle').textContent='Add Banner';
    document.getElementById('bannerModal')?.classList.add('active');
  });
  document.getElementById('bannerForm')?.addEventListener('submit', e => { e.preventDefault(); saveBanner(); });
  document.getElementById('saveContent')?.addEventListener('click',saveContent);
  document.getElementById('sendBroadcast')?.addEventListener('click',sendBroadcast);

  document.getElementById('broadcastMessage')?.addEventListener('input', e => {
    const countEl = document.getElementById('broadcastCount');
    if (countEl) countEl.textContent = e.target.value.length;
  });

  document.getElementById('viewAllOrders')?.addEventListener('click',()=>switchPanel('orders'));
  document.getElementById('refreshDash')?.addEventListener('click',loadDashboard);
  document.getElementById('refreshQueue')?.addEventListener('click',loadQueue);
  document.getElementById('refreshInventory')?.addEventListener('click',loadInventory);
  document.getElementById('refreshAnalytics')?.addEventListener('click',loadAnalytics);

  document.getElementById('pmImages')?.addEventListener('change',e=>{
    const preview=document.getElementById('pmImagePreview');
    if (!preview) return;
    preview.innerHTML='';
    Array.from(e.target.files).slice(0,5).forEach(f=>{
      const url=URL.createObjectURL(f);
      const img=document.createElement('img');
      img.src=url; img.style.cssText='height:60px;border-radius:6px;object-fit:cover;';
      preview.appendChild(img);
    });
  });

  document.getElementById('bannerImage')?.addEventListener('change',e=>{
    const f=e.target.files?.[0];
    const preview=document.getElementById('bannerImagePreview');
    if (!f||!preview) return;
    const url=URL.createObjectURL(f);
    preview.src=url; preview.hidden = false; preview.style.display='block';
  });

  const pwToggle = document.getElementById('togglePassword');
  const pwInput = document.getElementById('loginPassword');
  if (pwToggle && pwInput) {
    pwToggle.addEventListener('click', () => {
      const isPwd = pwInput.type === 'password';
      pwInput.type = isPwd ? 'text' : 'password';
      pwToggle.setAttribute('aria-pressed', isPwd ? 'true' : 'false');
      pwToggle.setAttribute('aria-label', isPwd ? 'Hide password' : 'Show password');
      pwToggle.textContent = isPwd ? '🙈' : '👁';
      pwInput.focus();
    });
  }

  const sidebar = document.getElementById('adminSidebar');
  const sidebarBtn = document.getElementById('sidebarToggle');
  if (sidebar && sidebarBtn) {
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }
    const closeSidebar = () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
      sidebarBtn.setAttribute('aria-expanded', 'false');
    };
    sidebarBtn.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('open');
      backdrop.classList.toggle('active', isOpen);
      sidebarBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    backdrop.addEventListener('click', closeSidebar);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => {
        m.classList.remove('active');
        m.hidden = true;
      });
      const sb = document.getElementById('adminSidebar');
      if (sb?.classList.contains('open')) {
        sb.classList.remove('open');
        document.querySelector('.sidebar-backdrop')?.classList.remove('active');
        document.getElementById('sidebarToggle')?.setAttribute('aria-expanded', 'false');
      }
    }
  });

  document.getElementById('inventorySearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#inventoryList .inv-row').forEach(row => {
      const name = row.querySelector('.inv-info')?.textContent.toLowerCase() || '';
      row.style.display = !q || name.includes(q) ? '' : 'none';
    });
  });

  document.getElementById('revenueRange')?.addEventListener('change', loadDashboard);
  document.getElementById('analyticsRange')?.addEventListener('change', loadAnalytics);

  document.getElementById('exportDash')?.addEventListener('click', () => {
    const rows = allOrdersCache.length ? allOrdersCache : [];
    if (!rows.length) { loadAllOrders().then(() => exportCSV('dashboard_orders', allOrdersCache.map(o => ({
      id: o.qr_code || o.id, date: o.created_at, status: o.status, total: o.pricing?.finalTotal || 0
    })))); return; }
    exportCSV('dashboard_orders', rows.map(o => ({
      id: o.qr_code || o.id, date: o.created_at, status: o.status, total: o.pricing?.finalTotal || 0
    })));
  });

  document.getElementById('exportOrders')?.addEventListener('click', () => {
    exportCSV('orders', allOrdersCache.map(o => {
      const rec = parseRecipient(o);
      return {
        order_id: o.qr_code || o.id,
        date: o.created_at,
        customer: `${rec.firstName || rec.name || ''} ${rec.lastName || ''}`.trim() || 'Guest',
        items: o.items?.length || 0,
        total: o.pricing?.finalTotal || 0,
        status: o.status,
        payment: o.payment_status || 'pending',
        delivery: o.delivery_date || ''
      };
    }));
  });

  const bannerActiveToggle = document.getElementById('contentBannerActive');
  if (bannerActiveToggle) bannerActiveToggle.classList.add('toggle-input');
}

function bindFilters() {
  document.getElementById('orderStatusFilter')?.addEventListener('change',loadAllOrders);
  document.getElementById('orderSearch')?.addEventListener('input',()=>{
    const s=(document.getElementById('orderSearch')?.value||'').toLowerCase();
    renderOrderTable(allOrdersCache,s);
  });
  document.getElementById('productSearch')?.addEventListener('input',loadAdminProducts);
  document.getElementById('productCatFilter')?.addEventListener('change',loadAdminProducts);
  document.getElementById('ticketStatusFilter')?.addEventListener('change',loadSupportTickets);
  document.getElementById('reviewFilter')?.addEventListener('change',loadReviews);
  document.getElementById('userSearch')?.addEventListener('input',loadUsers);
  document.getElementById('userRoleFilter')?.addEventListener('change',loadUsers);
}

function bindLogin() {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', e => { e.preventDefault(); handleLogin(); });
  } else {
    document.getElementById('loginBtn')?.addEventListener('click', e => { e.preventDefault(); handleLogin(); });
  }
}

function bindLogout() {
  document.getElementById('adminLogout')?.addEventListener('click',()=>{
    localStorage.removeItem('token');
    localStorage.removeItem('bloom_token');
    localStorage.removeItem('user');
    showLogin();
  });
}

function initWebSocket() {
  if (typeof io === 'undefined' && !(window.Store && window.Store.getSocket)) return;
  try {
    socket = (window.Store && window.Store.getSocket()) || (typeof io !== 'undefined' ? io(Api.getSocketUrl()) : null);
    if (!socket) return;
    
    let token = null;
    try { token = (window.Store && Store.get('token')) || null; } catch {}
    if (!token) token = localStorage.getItem('bloom_token') || localStorage.getItem('token');
    if (token) socket.emit('join_admin', token);

    socket.on('new_order', msg => {
      try {
        showToast(`🌸 New order: ${msg.data?.qr_code||(msg.data?.id||'').slice(0,8)}`,'success');
        const active=document.querySelector('.admin-nav-item.active')?.dataset.panel;
        if (active==='dashboard') loadDashboard();
        if (active==='orders') loadAllOrders();
        if (active==='queue') loadQueue();
      } catch {}
    });

    socket.on('order_update', msg => {
      try {
        showToast(`Order updated → ${(msg.status||'').replace(/_/g,' ')}`,'info');
        const active=document.querySelector('.admin-nav-item.active')?.dataset.panel;
        if (active==='dashboard') loadDashboard();
        if (active==='orders') loadAllOrders();
        if (active==='queue') loadQueue();
      } catch {}
    });

    socket.on('disconnect', () => setTimeout(initWebSocket, 5000));
  } catch {}
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.panel').forEach(p => {
    if (!p.classList.contains('active')) { p.hidden = true; }
  });
  document.getElementById('panel-dashboard')?.classList.add('active');

  bindLogin();
  bindLogout();
  bindNav();
  bindModals();
  bindFilters();

  await checkAdmin();

  let token = null;
  try { token = (window.Store && Store.get('token')) || localStorage.getItem('bloom_token'); } catch {}

  if (token) {
    initWebSocket();
    const hash = (location.hash || '#dashboard').slice(1);
    const valid = ['dashboard','analytics','products','orders','queue','inventory','banners','faqs','content','users','support','reviews','promos','broadcast'];
    switchPanel(valid.includes(hash) ? hash : 'dashboard');
  }

  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1);
    const valid = ['dashboard','analytics','products','orders','queue','inventory','banners','faqs','content','users','support','reviews','promos','broadcast'];
    if (valid.includes(hash)) switchPanel(hash);
  });
});
