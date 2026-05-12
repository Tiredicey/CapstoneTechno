import { Router } from 'express';
import db from '../database/Database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { SocketManager } from '../sockets/SocketManager.js';
import { v4 as uuid } from 'uuid';

const router = Router();

function recalcProductRating(productId) {
  const agg = db.get(
    `SELECT COUNT(*) AS cnt, COALESCE(AVG(rating), 0) AS avg FROM reviews WHERE product_id = ?`,
    [productId]
  );
  const avg = Math.round((agg.avg || 0) * 10) / 10;
  db.run(`UPDATE products SET rating = ?, review_count = ? WHERE id = ?`, [avg, agg.cnt || 0, productId]);
  return { rating: avg, review_count: agg.cnt || 0 };
}

router.get('/', (req, res) => {
  try {
    const { rating, product_id, limit, offset } = req.query;
    let q = `SELECT r.*, p.name AS product_name
             FROM reviews r LEFT JOIN products p ON r.product_id = p.id
             WHERE 1=1`;
    const params = [];
    if (rating) {
      const r = Number(rating);
      if (r === 1) { q += ` AND r.rating <= 2`; }
      else { q += ` AND r.rating = ?`; params.push(r); }
    }
    if (product_id) { q += ` AND r.product_id = ?`; params.push(product_id); }
    q += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Math.min(Number(limit) || 100, 500), Number(offset) || 0);
    res.set('Cache-Control', 'no-store');
    res.json(db.all(q, params));
  } catch (err) {
    console.error('[REVIEWS GET]', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { product_id, rating, comment, order_id } = req.body;
    if (!product_id || !rating) return res.status(400).json({ error: 'product_id and rating required' });
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be integer 1-5' });
    const product = db.get(`SELECT id FROM products WHERE id = ?`, [product_id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const user = db.get(`SELECT name FROM users WHERE id = ?`, [req.user.id]);
    const id = uuid();
    const verified = order_id
      ? (db.get(`SELECT id FROM orders WHERE id = ? AND user_id = ?`, [order_id, req.user.id]) ? 1 : 0)
      : 0;
    db.run(
      `INSERT INTO reviews (id, product_id, user_id, order_id, rating, body, comment, user_name, verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, product_id, req.user.id, order_id || null, r, comment || '', comment || '', user?.name || 'Customer', verified]
    );
    db.run(`UPDATE users SET loyalty_points = loyalty_points + 50 WHERE id = ?`, [req.user.id]);
    const stats = recalcProductRating(product_id);
    const review = db.get(`SELECT * FROM reviews WHERE id = ?`, [id]);
    SocketManager.emitCatalogUpdate({ action: 'review_added', productId: product_id, ...stats });
    SocketManager.broadcast('review_update', { action: 'created', review, ...stats });
    res.status(201).json(review);
  } catch (err) {
    console.error('[REVIEW CREATE]', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const review = db.get(`SELECT product_id FROM reviews WHERE id = ?`, [req.params.id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    db.run(`DELETE FROM reviews WHERE id = ?`, [req.params.id]);
    const stats = recalcProductRating(review.product_id);
    SocketManager.emitCatalogUpdate({ action: 'review_removed', productId: review.product_id, ...stats });
    SocketManager.broadcast('review_update', { action: 'deleted', id: req.params.id, productId: review.product_id, ...stats });
    res.json({ success: true });
  } catch (err) {
    console.error('[REVIEW DELETE]', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;
