import { Router } from 'express';
import { ProductModel } from '../models/ProductModel.js';
import { RecommendationEngine } from '../services/RecommendationEngine.js';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.js';
import db from '../database/Database.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { SocketManager } from '../sockets/SocketManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'products'),
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});
const router = Router();

function tryParse(val, fallback) {
  if (typeof val !== 'string') return val ?? fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

router.get('/', optionalAuth, (req, res) => {
  try {
    const { category, search, limit, offset, tags } = req.query;
    let products = ProductModel.getAll({ category, search, tags, limit: Number(limit) || 20, offset: Number(offset) || 0 });
    products = products.map(p => ({ ...p, images: tryParse(p.images, []), tags: tryParse(p.tags,[]) }));
    res.json({ products, total: products.length });
  } catch (err) {
    console.error('[PRODUCTS GET ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/featured', (req, res) => {
  try {
    const featured = db.all(`SELECT * FROM products WHERE is_active = 1 ORDER BY rating DESC LIMIT 8`)
      .map(p => ({ ...p, images: tryParse(p.images, []), tags: tryParse(p.tags, []) }));
    res.json(featured);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch featured' });
  }
});

router.get('/recommendations', optionalAuth, (req, res) => {
  try {
    const recs = RecommendationEngine.forUser(req.user?.id, 8);
    res.json({ products: recs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

router.get('/trending', (req, res) => {
  try {
    res.json({ products: RecommendationEngine.trending(8) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

router.get('/occasion/:occasion', (req, res) => {
  try {
    res.json({ products: RecommendationEngine.forOccasion(req.params.occasion, 8) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch by occasion' });
  }
});

router.get('/:id', (req, res) => {
  try {
    let product = ProductModel.getById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.images = tryParse(product.images, []);
    product.tags = tryParse(product.tags,[]);
    const similar = RecommendationEngine.similar(req.params.id, 4);
    res.json({ ...product, similar });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.get('/:id/reviews', (req, res) => {
  try {
    const { limit, offset } = req.query;
    const reviews = db.all(`SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.params.id, Number(limit) || 10, Number(offset) || 0]);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/:id/reviews', authenticate, (req, res) => {
  try {
    const { rating, body, orderId, photos } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });
    const id = uuid();
    const user = db.get(`SELECT name FROM users WHERE id = ?`, [req.user.id]);
    db.run(`INSERT INTO reviews (id, product_id, user_id, order_id, rating, body, photos, user_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, req.user.id, orderId || null, rating, body || '', JSON.stringify(photos || []), user?.name || 'Customer']);
    ProductModel.updateRating(req.params.id);
    db.run(`UPDATE users SET loyalty_points = loyalty_points + 50 WHERE id = ?`, [req.user.id]);
    const review = db.get(`SELECT * FROM reviews WHERE id = ?`, [id]);
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.post('/', authenticate, requireAdmin, upload.array('images', 5), (req, res) => {
  try {
    const { name, category, subcategory, description, base_price, inventory, lead_time_days, customizable, tags } = req.body;
    if (!name || !category || !base_price) return res.status(400).json({ error: 'name, category, base_price required' });
    const images = req.files?.length ? JSON.stringify(req.files.map(f => `/uploads/products/${f.filename}`)) : JSON.stringify([]);
    const parsedTags = typeof tags === 'string' && tags.startsWith('[') ? tags : JSON.stringify((tags || '').split(',').map(t => t.trim()).filter(Boolean));
    const product = ProductModel.create({ name, category, subcategory, description, base_price: Number(base_price), images, tags: parsedTags, inventory: Number(inventory) || 0, lead_time_days: Number(lead_time_days) || 1, customizable: customizable ? 1 : 0 });
    SocketManager.broadcast('catalog_update', {});
    res.status(201).json(product);
  } catch (err) {
    console.error('[PRODUCT CREATE ERROR]', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/:id', authenticate, requireAdmin, upload.array('images', 5), (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    const cleanImgs = (arr) => arr.map(i => {
      if(typeof i !== 'string') return i;
      const name = i.replace(/[\[\]"\\]/g, '/').split('/').pop();
      return name && name !== 'null' ? `/uploads/products/${name}` : null;
    }).filter(Boolean);

    let images = existing.images;
    if (req.files?.length) {
      images = JSON.stringify(req.files.map(f => `/uploads/products/${f.filename}`));
    } else if (req.body.images) {
      let raw = req.body.images;
      if (typeof raw === 'string' && raw.startsWith('[')) { try { raw = JSON.parse(raw); } catch(e){} }
      images = JSON.stringify(cleanImgs(Array.isArray(raw) ? raw : [raw]));
    } else {
      images = JSON.stringify([]);
    }
    const product = ProductModel.update(req.params.id, { ...req.body, images });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    SocketManager.broadcast('catalog_update', {});
    res.json(product);
  } catch (err) {
    console.error('[PRODUCT UPDATE ERROR]', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const result = db.run(`UPDATE products SET is_active = 0 WHERE id = ?`,[req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
    SocketManager.broadcast('catalog_update', {});
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;