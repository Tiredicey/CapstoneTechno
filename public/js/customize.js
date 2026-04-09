let basePrice = 64.99;
let priceDelta = 0;
let config = {
  flower: 'rose',
  color: 'crimson',
  bloomCount: 12,
  wrapping_premium: false,
  wrapping_luxury: false,
  ribbon_satin: false,
  ribbon_velvet: false,
  giftBox: false,
  engraving: false,
  engravingText: '',
  greetingCard: false,
  cardText: '',
  logoUpload: false,
  customDesign: false,
  logoUrl: null
};
let productId = null;
let customizationId = null;

function fmt(n) {
  return `₱${Number(n || 0).toFixed(2)}`;
}

function updatePrice() {
  priceDelta = 0;
  if (config.wrapping_premium) priceDelta += 8;
  if (config.wrapping_luxury) priceDelta += 15;
  if (config.ribbon_satin) priceDelta += 3;
  if (config.ribbon_velvet) priceDelta += 6;
  if (config.giftBox) priceDelta += 10;
  if (config.engraving) priceDelta += 12;
  if (config.logoUpload) priceDelta += 20;
  if (config.customDesign) priceDelta += 15;
  const extraStems = Math.max(0, config.bloomCount - 12);
  priceDelta += Math.floor(extraStems / 3) * 2;
  const total = basePrice + priceDelta;
  const livePriceEl = document.getElementById('livePrice');
  const cartPriceBtn = document.getElementById('cartPriceBtn');
  if (livePriceEl) livePriceEl.textContent = fmt(total);
  if (cartPriceBtn) cartPriceBtn.textContent = fmt(total);
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('id')) {
    productId = urlParams.get('id');
    
    const loadProductData = () => {
      Api.get(`/api/products/${productId}`).then(p => {
        basePrice = p.base_price || p.basePrice || 64.99;
        const titleEl = document.getElementById('productTitle');
        if (titleEl) titleEl.textContent = p.name;
        updatePrice();
        
        let pImgs = p.images ||[];
        if (typeof pImgs === 'string') { try { pImgs = JSON.parse(pImgs); } catch(e){} }
        let mainImg = Array.isArray(pImgs) && pImgs.length ? pImgs.flat(Infinity)[0] : '';
        if (typeof mainImg === 'string') {
          var cleanStr = mainImg.replace(/[\[\]"\\]/g, '/');
          var parts = cleanStr.split('/');
          var filename = parts[parts.length - 1];
          mainImg = filename && filename !== 'null' ? '/uploads/products/' + filename : '';
        }
        
        if (mainImg) {
          const preview = document.getElementById('previewDisplay');
          if (preview) preview.innerHTML = `<img src="${mainImg}" style="width:100%;height:100%;object-fit:contain;" alt="${p.name}">`;
        }
      }).catch(() => {});
    };

    loadProductData();

    if (typeof io !== 'undefined') {
      var socket = io();
      socket.on('catalog_update', loadProductData);
    }
  }

  updatePrice();

  document.querySelectorAll('.config-section-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.config-section')?.classList.toggle('open');
    });
  });

  document.querySelectorAll('#flowerPills .option-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#flowerPills .option-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      config.flower = pill.dataset.flower;
      const emojis = { rose: '🌹', tulip: '🌷', lily: '🌸', orchid: '🪷', sunflower: '🌻', peony: '✿' };
      if (!productId) {
        const preview = document.getElementById('previewDisplay');
        if (preview) preview.innerHTML = `<div style="font-size:8rem;display:flex;align-items:center;justify-content:center;height:100%;">${emojis[config.flower] || '🌸'}</div>`;
      }
    });
  });

  document.getElementById('bloomCount')?.addEventListener('input', e => {
    config.bloomCount = Number(e.target.value);
    const label = document.getElementById('bloomCountLabel');
    if (label) label.textContent = `${config.bloomCount} stems`;
    updatePrice();
  });

  document.querySelectorAll('#colorSwatches .swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      config.color = swatch.dataset.color;
    });
  });

  document.querySelectorAll('input[data-config]').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.config;
      config[key] = input.checked;
      if (key === 'engraving') {
        const el = document.getElementById('engravingText');
        if (el) el.style.display = input.checked ? 'block' : 'none';
      }
      if (key === 'greetingCard') {
        const el = document.getElementById('cardText');
        if (el) el.style.display = input.checked ? 'block' : 'none';
      }
      if (key === 'logoUpload') {
        const el = document.getElementById('logoUploadArea');
        if (el) el.style.display = input.checked ? 'block' : 'none';
      }
      updatePrice();
    });
  });

  document.getElementById('engravingInput')?.addEventListener('input', e => { config.engravingText = e.target.value; });
  document.getElementById('cardInput')?.addEventListener('input', e => { config.cardText = e.target.value; });

  const dragUpload = document.getElementById('dragUpload');
  const logoFile = document.getElementById('logoFile');

  dragUpload?.addEventListener('click', () => logoFile?.click());
  dragUpload?.addEventListener('dragover', e => { e.preventDefault(); dragUpload.classList.add('dragover'); });
  dragUpload?.addEventListener('dragleave', () => dragUpload.classList.remove('dragover'));
  dragUpload?.addEventListener('drop', async e => {
    e.preventDefault();
    dragUpload.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) await uploadLogo(file);
  });
  logoFile?.addEventListener('change', async e => { if (e.target.files[0]) await uploadLogo(e.target.files[0]); });

  document.getElementById('removeLogo')?.addEventListener('click', () => {
    config.logoUrl = null;
    const preview = document.getElementById('logoPreview');
    const drag = document.getElementById('dragUpload');
    if (preview) preview.style.display = 'none';
    if (drag) drag.style.display = 'block';
    if (logoFile) logoFile.value = '';
  });

  document.getElementById('addCustomToCart')?.addEventListener('click', async () => {
    const btn = document.getElementById('addCustomToCart');
    btn.disabled = true;
    btn.textContent = 'Adding...';
    try {
      const id = productId || 'custom';
      const cusRes = await Api.post('/api/customization', { productId: id, config });
      customizationId = cusRes.id;
      await Api.post('/api/cart/items', {
        productId: id,
        qty: 1,
        customization: { ...config, id: customizationId, priceDelta: cusRes.priceDelta }
      });
      const cart = await Api.get('/api/cart');
      Store.set('cart', cart);
      Store.updateCartCount(cart.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0);
      showToast('Custom arrangement added to cart 🌸', 'success');
      setTimeout(() => { window.location.href = '/cart.html'; }, 800);
    } catch (e) {
      showToast(e.message || 'Error adding to cart', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `🛒 Add to Cart — <span id="cartPriceBtn">${fmt(basePrice + priceDelta)}</span>`;
    }
  });

  document.getElementById('saveCustomization')?.addEventListener('click', async () => {
    const user = Store.get('user');
    if (!user || user.isGuest) { showToast('Sign in to save designs', 'info'); return; }
    try {
      if (!customizationId) {
        const res = await Api.post('/api/customization', { productId: productId || 'custom', config });
        customizationId = res.id;
      }
      await Api.post(`/api/customization/${customizationId}/save`, {});
      showToast('Design saved to your account 💾', 'success');
    } catch { showToast('Could not save design', 'error'); }
  });

  document.getElementById('view3d')?.addEventListener('click', () => {
    const preview = document.getElementById('previewDisplay');
    if (!preview) return;
    preview.style.transform = preview.style.transform ? '' : 'perspective(600px) rotateY(15deg)';
    preview.style.transition = 'transform 0.5s ease';
  });

  document.getElementById('zoomIn')?.addEventListener('click', () => {
    const preview = document.getElementById('previewDisplay');
    if (!preview) return;
    const curr = parseFloat(preview.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1);
    preview.style.transform = `scale(${Math.min(2, curr + 0.1)})`;
  });

  document.getElementById('zoomOut')?.addEventListener('click', () => {
    const preview = document.getElementById('previewDisplay');
    if (!preview) return;
    const curr = parseFloat(preview.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1);
    preview.style.transform = `scale(${Math.max(0.5, curr - 0.1)})`;
  });
});

async function uploadLogo(file) {
  const fd = new FormData();
  fd.append('design', file);
  try {
    const res = await Api.upload('/api/customization/upload', fd);
    config.logoUrl = res.url;
    const preview = document.getElementById('logoPreview');
    const img = document.getElementById('logoPreviewImg');
    const drag = document.getElementById('dragUpload');
    if (preview) preview.style.display = 'block';
    if (img) img.src = res.url;
    if (drag) drag.style.display = 'none';
    showToast('Logo uploaded!', 'success');
  } catch { showToast('Upload failed', 'error'); }
}