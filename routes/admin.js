import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { SocketManager } from '../sockets/SocketManager.js';
import db from '../database/Database.js';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'products'),
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

function tryParse(val, fallback) {
  if (typeof val !== 'string') return val ?? fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

router.use(authenticate, requireAdmin);

router.get('/stats', (req, res) => {
  try {
    const revenue = db.get(`SELECT COALESCE(SUM(json_extract(pricing,'$.finalTotal')),0) as total, COUNT(*) as orders FROM orders WHERE status != 'cancelled'`);
    const today = db.get(`SELECT COUNT(*) as c FROM orders WHERE date(created_at,'unixepoch') = date('now')`);
    const pending = db.get(`SELECT COUNT(*) as c FROM orders WHERE status IN ('new','processing')`);
    const users = db.get(`SELECT COUNT(*) as c FROM users WHERE role = 'customer'`);
    const products = db.get(`SELECT COUNT(*) as c FROM products WHERE is_active = 1`);
    const topProducts = db.all(`
      SELECT p.id, p.name, p.category, p.rating, p.base_price,
             COUNT(DISTINCT o.id) as order_count
      FROM products p
      LEFT JOIN orders o ON o.items LIKE '%' || p.id || '%'
      WHERE p.is_active = 1
      GROUP BY p.id ORDER BY order_count DESC LIMIT 5
    `);
    const salesByCategory = db.all(`
      SELECT p.category,
             COALESCE(SUM(json_extract(o.pricing,'$.finalTotal')),0) as revenue
      FROM orders o
      JOIN products p ON o.items LIKE '%' || p.id || '%'
      WHERE o.status != 'cancelled'
      GROUP BY p.category
    `);
    const recentEvents = db.all(`SELECT event_type, COUNT(*) as count FROM analytics_events GROUP BY event_type ORDER BY count DESC LIMIT 8`);
    const nps = db.get(`SELECT AVG(nps_score) as nps FROM support_tickets WHERE nps_score IS NOT NULL`);
    const csat = db.get(`SELECT AVG(csat_score) as csat FROM support_tickets WHERE csat_score IS NOT NULL`);
    res.json({ revenue, today, pending, users: users?.c || 0, products: products?.c || 0, topProducts, salesByCategory, recentEvents, nps: nps?.nps || null, csat: csat?.csat || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/users', (req, res) => {
  try {
    const { search, role, limit, offset } = req.query;
    let q = `SELECT id, name, email, role, avatar, phone, loyalty_points, created_at FROM users WHERE 1=1`;
    const params = [];
    if (search) { q += ` AND (name LIKE ? OR email LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
    if (role) { q += ` AND role = ?`; params.push(role); }
    q += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit) || 50, Number(offset) || 0);
    const users = db.all(q, params);
    const total = db.get(`SELECT COUNT(*) as c FROM users`);
    res.json({ users, total: total?.c || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/role', (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'customer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });
    db.run(`UPDATE users SET role = ? WHERE id = ?`, [role, req.params.id]);
    SocketManager.emitToUser(req.params.id, 'user_updated', { role });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.put('/users/:id', (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM users WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (req.params.id === req.user.id && req.body.role && req.body.role !== existing.role) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    const { role, name, phone } = req.body;
    if (role && !['admin', 'customer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    db.run(
      `UPDATE users SET
        role  = COALESCE(?, role),
        name  = COALESCE(?, name),
        phone = COALESCE(?, phone)
       WHERE id = ?`,
      [role || null, name || null, phone || null, req.params.id]
    );
    const user = db.get(`SELECT id, name, email, role, phone, loyalty_points, created_at FROM users WHERE id = ?`, [req.params.id]);
    SocketManager.emitToUser(req.params.id, 'user_updated', { role: user.role, name: user.name, phone: user.phone });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    SocketManager.emitToUser(req.params.id, 'account_deleted', { reason: 'Account removed by admin' });
    db.run(`DELETE FROM users WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/faqs', (req, res) => {
  try {
    res.json(db.all(`SELECT * FROM faqs ORDER BY sort_order ASC`));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

router.post('/faqs', (req, res) => {
  try {
    const { question, answer, category, sort_order } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'Question and answer required' });
    const id = uuid();
    db.run(
      `INSERT INTO faqs (id, question, answer, category, sort_order, active) VALUES (?, ?, ?, ?, ?, 1)`,
      [id, question, answer, category || 'general', sort_order || 0]
    );
    const faq = db.get(`SELECT * FROM faqs WHERE id = ?`, [id]);
    SocketManager.broadcast('faq_update', { action: 'created', faq });
    res.status(201).json(faq);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

router.put('/faqs/:id', (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM faqs WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'FAQ not found' });
    const { question, answer, category, sort_order, active } = req.body;
    db.run(
      `UPDATE faqs SET question=?, answer=?, category=?, sort_order=?, active=? WHERE id=?`,
      [
        question ?? existing.question,
        answer ?? existing.answer,
        category ?? existing.category,
        sort_order ?? existing.sort_order,
        active !== undefined ? (active ? 1 : 0) : existing.active,
        req.params.id
      ]
    );
    const faq = db.get(`SELECT * FROM faqs WHERE id = ?`, [req.params.id]);
    SocketManager.broadcast('faq_update', { action: 'updated', faq });
    res.json(faq);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

router.delete('/faqs/:id', (req, res) => {
  try {
    db.run(`DELETE FROM faqs WHERE id = ?`, [req.params.id]);
    SocketManager.broadcast('faq_update', { action: 'deleted', id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

router.get('/content', (req, res) => {
  try {
    const rows = db.all(`SELECT * FROM site_content ORDER BY key ASC`);
    const obj = {};
    for (const row of rows) {
      let val = row.value;
      if (row.type === 'boolean') val = val === '1' || val === 'true';
      else if (row.type === 'number') val = Number(val);
      obj[row.key] = val;
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

router.put('/content', (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      let type = 'text';
      let strVal = String(value ?? '');
      if (typeof value === 'boolean') { type = 'boolean'; strVal = value ? '1' : '0'; }
      else if (typeof value === 'number') { type = 'number'; strVal = String(value); }
      db.run(
        `INSERT INTO site_content (key, value, type, updated_at)
         VALUES (?, ?, ?, unixepoch())
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, type=COALESCE(excluded.type,type), updated_at=unixepoch()`,
        [key, strVal, type]
      );
    }
    SocketManager.emitContentUpdate({ keys: Object.keys(req.body) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save content' });
  }
});

router.get('/content/:key', (req, res) => {
  try {
    const row = db.get(`SELECT * FROM site_content WHERE key = ?`, [req.params.key]);
    res.json(row || { key: req.params.key, value: null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

router.put('/content/:key', (req, res) => {
  try {
    const { value, type } = req.body;
    db.run(
      `INSERT INTO site_content (key, value, type, updated_at) VALUES (?, ?, ?, unixepoch())
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, type=COALESCE(excluded.type,type), updated_at=unixepoch()`,
      [req.params.key, value, type || 'text']
    );
    SocketManager.emitContentUpdate({ keys: [req.params.key] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update content' });
  }
});

router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/products/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.post('/upload/multiple', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
    res.json({ urls: req.files.map(f => `/uploads/products/${f.filename}`) });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/banners', (req, res) => {
  try {
    res.json(db.all(`SELECT * FROM banners ORDER BY sort_order ASC`));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

router.post('/banners', upload.single('image'), (req, res) => {
  try {
    const { title, subtitle, link_url, link, sort_order } = req.body;
    const image_url = req.file ? `/uploads/products/${req.file.filename}` : (req.body.image_url || '');
    const finalLink = link_url || link || '';
    const id = uuid();
    db.run(
      `INSERT INTO banners (id, title, subtitle, image_url, link_url, link, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, title || '', subtitle || '', image_url, finalLink, finalLink, sort_order || 0]
    );
    const banner = db.get(`SELECT * FROM banners WHERE id = ?`, [id]);
    SocketManager.emitBannerUpdate({ action: 'created', banner });
    res.status(201).json(banner);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

router.put('/banners/:id', upload.single('image'), (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM banners WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Banner not found' });
    const { title, subtitle, link_url, link, sort_order, active } = req.body;
    const image_url = req.file ? `/uploads/products/${req.file.filename}` : (req.body.image_url || existing.image_url || '');
    const finalLink = link_url || link || existing.link_url || existing.link || '';
    db.run(
      `UPDATE banners SET title=?, subtitle=?, image_url=?, link_url=?, link=?, sort_order=?, active=? WHERE id=?`,
      [
        title ?? existing.title,
        subtitle ?? existing.subtitle,
        image_url,
        finalLink,
        finalLink,
        sort_order !== undefined ? Number(sort_order) : existing.sort_order,
        active !== undefined ? (active ? 1 : 0) : existing.active,
        req.params.id
      ]
    );
    const banner = db.get(`SELECT * FROM banners WHERE id = ?`, [req.params.id]);
    SocketManager.emitBannerUpdate({ action: 'updated', banner });
    res.json(banner);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

router.delete('/banners/:id', (req, res) => {
  try {
    db.run(`DELETE FROM banners WHERE id = ?`, [req.params.id]);
    SocketManager.emitBannerUpdate({ action: 'deleted', id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

router.get('/promos', (req, res) => {
  try {
    res.json(db.all(`SELECT * FROM promo_codes ORDER BY created_at DESC`));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch promos' });
  }
});

router.post('/promos', (req, res) => {
  try {
    const { code, discount_type, type, value, min_order_amount, min_order, max_uses, expires_at } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const finalType = discount_type || type;
    if (!finalType || !['percent', 'fixed', 'shipping'].includes(finalType)) {
      return res.status(400).json({ error: 'type must be percent, fixed, or shipping' });
    }
    if (value === undefined) return res.status(400).json({ error: 'value required' });
    if (db.get(`SELECT id FROM promo_codes WHERE code = ?`, [code.toUpperCase()])) {
      return res.status(409).json({ error: 'Code already exists' });
    }
    const id = uuid();
    const minOrd = Number(min_order_amount || min_order) || 0;
    db.run(
      `INSERT INTO promo_codes
        (id, code, discount_type, type, value, min_order_amount, min_order, max_uses, is_active, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, code.toUpperCase(), finalType, finalType, Number(value), minOrd, minOrd, Number(max_uses) || 1000, expires_at || null]
    );
    const promo = db.get(`SELECT * FROM promo_codes WHERE id = ?`, [id]);
    SocketManager.emitPromoUpdate({ action: 'created', promo });
    res.status(201).json(promo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create promo' });
  }
});

router.put('/promos/:id', (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM promo_codes WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Promo not found' });
    const { value, min_order_amount, min_order, max_uses, is_active, expires_at } = req.body;
    const minOrd = min_order_amount !== undefined ? Number(min_order_amount) : (min_order !== undefined ? Number(min_order) : existing.min_order_amount);
    db.run(
      `UPDATE promo_codes SET value=?, min_order_amount=?, min_order=?, max_uses=?, is_active=?, expires_at=? WHERE id=?`,
      [
        value !== undefined ? Number(value) : existing.value,
        minOrd,
        minOrd,
        max_uses !== undefined ? Number(max_uses) : existing.max_uses,
        is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
        expires_at !== undefined ? expires_at : existing.expires_at,
        req.params.id
      ]
    );
    const promo = db.get(`SELECT * FROM promo_codes WHERE id = ?`, [req.params.id]);
    SocketManager.emitPromoUpdate({ action: 'updated', promo });
    res.json(promo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update promo' });
  }
});

router.delete('/promos/:id', (req, res) => {
  try {
    db.run(`DELETE FROM promo_codes WHERE id = ?`, [req.params.id]);
    SocketManager.emitPromoUpdate({ action: 'deleted', id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete promo' });
  }
});

router.get('/orders', (req, res) => {
  try {
    const { status, limit, offset, search } = req.query;
    let q = `SELECT o.*, u.name as customer_name, u.email as customer_email
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             WHERE 1=1`;
    const params = [];
    if (status) { q += ` AND o.status = ?`; params.push(status); }
    if (search) { q += ` AND (o.id LIKE ? OR o.qr_code LIKE ? OR u.name LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    q += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit) || 50, Number(offset) || 0);
    const orders = db.all(q, params).map(o => ({
      ...o,
      items: tryParse(o.items, []),
      pricing: tryParse(o.pricing, {}),
      recipient: tryParse(o.recipient, {})
    }));
    res.json({ orders, total: db.get(`SELECT COUNT(*) as c FROM orders`)?.c || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.put('/orders/:id/status', (req, res) => {
  try {
    const valid = ['new', 'processing', 'quality_check', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    const { status } = req.body;
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const row = db.get(`SELECT * FROM orders WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Order not found' });
    const steps = tryParse(row.tracking_steps, []);
    steps.push({ status, timestamp: Date.now() });
    db.run(
      `UPDATE orders SET status = ?, tracking_steps = ?, updated_at = unixepoch() WHERE id = ?`,
      [status, JSON.stringify(steps), req.params.id]
    );
    SocketManager.emitOrderUpdate(req.params.id, { status, orderId: req.params.id, trackingSteps: steps });
    if (row.user_id) {
      const msgs = {
        shipped: `Your order has been shipped`,
        delivered: `Your order has been delivered`,
        out_for_delivery: `Your order is out for delivery`,
        cancelled: `Your order has been cancelled`
      };
      if (msgs[status]) {
        const notifId = uuid();
        db.run(
          `INSERT INTO notifications (id, user_id, type, title, body, message) VALUES (?, ?, ?, ?, ?, ?)`,
          [notifId, row.user_id, `order_${status}`, `Order ${status.replace(/_/g, ' ')}`, msgs[status], msgs[status]]
        );
        SocketManager.emitNotificationToUser(row.user_id, {
          id: notifId,
          type: `order_${status}`,
          title: `Order ${status.replace(/_/g, ' ')}`,
          body: msgs[status],
          read: 0
        });
      }
    }
    res.json({ success: true, status, trackingSteps: steps });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

router.get('/products', (req, res) => {
  try {
    const { search, category, limit, offset } = req.query;
    let q = `SELECT * FROM products WHERE 1=1`;
    const params = [];
    if (search) { q += ` AND (name LIKE ? OR description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
    if (category) { q += ` AND category = ?`; params.push(category); }
    q += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit) || 50, Number(offset) || 0);
    const products = db.all(q, params).map(p => ({
      ...p,
      images: tryParse(p.images, []),
      tags: tryParse(p.tags, [])
    }));
    res.json({ products, total: db.get(`SELECT COUNT(*) as c FROM products`)?.c || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/products', upload.array('images', 5), (req, res) => {
  try {
    const { name, category, subcategory, description, base_price, inventory, lead_time_days, customizable, tags } = req.body;
    if (!name || !category || !base_price) return res.status(400).json({ error: 'name, category, base_price required' });
    const cleanImgs = (arr) => arr.map(i => {
      if (typeof i !== 'string') return i;
      const n = i.replace(/[\[\]"\\]/g, '/').split('/').pop();
      return n && n !== 'null' ? `/uploads/products/${n}` : null;
    }).filter(Boolean);
    const images = req.files?.length
      ? JSON.stringify(req.files.map(f => `/uploads/products/${f.filename}`))
      : JSON.stringify(cleanImgs(Array.isArray(req.body.images) ? req.body.images : (req.body.images ? [req.body.images] : [])));
    const parsedTags = typeof tags === 'string' && tags.startsWith('[')
      ? tags
      : JSON.stringify((tags || '').split(',').map(t => t.trim()).filter(Boolean));
    const id = uuid();
    db.run(
      `INSERT INTO products
        (id, name, category, subcategory, description, base_price, images, tags, inventory, lead_time_days, customizable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, category, subcategory || '', description || '', Number(base_price), images, parsedTags,
        Number(inventory) || 0, Number(lead_time_days) || 1, customizable ? 1 : 0]
    );
    const product = db.get(`SELECT * FROM products WHERE id = ?`, [id]);
    const parsed = { ...product, images: tryParse(product.images, []), tags: tryParse(product.tags, []) };
    SocketManager.emitCatalogUpdate({ action: 'created', product: parsed });
    res.status(201).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/products/:id', upload.array('images', 5), (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    const { name, category, subcategory, description, base_price, inventory, lead_time_days, customizable, tags, is_active } = req.body;
    let images = existing.images;
    if (req.files?.length) {
      images = JSON.stringify(req.files.map(f => `/uploads/products/${f.filename}`));
    } else if (req.body.images) {
      images = typeof req.body.images === 'string' && req.body.images.startsWith('[')
        ? req.body.images
        : JSON.stringify(Array.isArray(req.body.images) ? req.body.images : [req.body.images]);
    }
    let parsedTags = existing.tags;
    if (tags !== undefined) {
      parsedTags = typeof tags === 'string' && tags.startsWith('[')
        ? tags
        : JSON.stringify((tags || '').split(',').map(t => t.trim()).filter(Boolean));
    }
    db.run(
      `UPDATE products SET
        name=?, category=?, subcategory=?, description=?, base_price=?,
        images=?, tags=?, inventory=?, lead_time_days=?, customizable=?, is_active=?
       WHERE id=?`,
      [
        name ?? existing.name,
        category ?? existing.category,
        subcategory ?? existing.subcategory,
        description ?? existing.description,
        Number(base_price ?? existing.base_price),
        images, parsedTags,
        Number(inventory ?? existing.inventory),
        Number(lead_time_days ?? existing.lead_time_days),
        customizable !== undefined ? (customizable ? 1 : 0) : existing.customizable,
        is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
        req.params.id
      ]
    );
    const product = db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id]);
    const parsed = { ...product, images: tryParse(product.images, []), tags: tryParse(product.tags, []) };
    SocketManager.emitCatalogUpdate({ action: 'updated', product: parsed });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', (req, res) => {
  try {
    db.run(`UPDATE products SET is_active = 0 WHERE id = ?`, [req.params.id]);
    SocketManager.emitCatalogUpdate({ action: 'deleted', id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate product' });
  }
});

router.get('/reviews', (req, res) => {
  try {
    const { rating } = req.query;
    let q = `SELECT r.*, p.name as product_name FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE 1=1`;
    const params = [];
    if (rating) {
      const r = Number(rating);
      if (r === 1) { q += ` AND r.rating <= 2`; } else { q += ` AND r.rating = ?`; params.push(r); }
    }
    q += ` ORDER BY r.created_at DESC LIMIT 100`;
    res.json(db.all(q, params));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.delete('/reviews/:id', (req, res) => {
  try {
    db.run(`DELETE FROM reviews WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

router.post('/notifications/broadcast', (req, res) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });
    const users = db.all(`SELECT id FROM users WHERE role = 'customer'`);
    const notifType = type || 'info';
    for (const u of users) {
      const id = uuid();
      db.run(
        `INSERT INTO notifications (id, user_id, type, title, body, message) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, u.id, notifType, title, message, message]
      );
      SocketManager.emitNotificationToUser(u.id, { id, type: notifType, title, body: message, message, read: 0 });
    }
    SocketManager.io?.to('admin_room').emit('broadcast_sent', { title, message, count: users.length, timestamp: Date.now() });
    res.json({ success: true, count: users.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to broadcast' });
  }
});

export default router;
