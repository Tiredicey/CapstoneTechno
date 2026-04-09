import { Router } from 'express';
import db from '../database/Database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { rating, product_id, limit, offset } = req.query;
    let q = `SELECT r.*, p.name as product_name
             FROM reviews r
             LEFT JOIN products p ON r.product_id = p.id
             WHERE 1=1`;
    const params = [];
    if (rating) {
      const r = Number(rating);
      if (r === 1) { q += ` AND r.rating <= 2`; }
      else { q += ` AND r.rating = ?`; params.push(r); }
    }
    if (product_id) { q += ` AND r.product_id = ?`; params.push(product_id); }
    q += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit) || 100, Number(offset) || 0);
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
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const user = db.get(`SELECT name FROM users WHERE id = ?`, [req.user.id]);
    const id   = uuid();
    db.run(
      `INSERT INTO reviews (id, product_id, user_id, order_id, rating, body, comment, user_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, product_id, req.user.id, order_id || null, rating,
       comment || '', comment || '', user?.name || 'Customer']
    );
    db.run(`UPDATE users SET loyalty_points = loyalty_points + 50 WHERE id = ?`, [req.user.id]);
    res.status(201).json(db.get(`SELECT * FROM reviews WHERE id = ?`, [id]));
  } catch (err) {
    console.error('[REVIEW CREATE]', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    if (!db.get(`SELECT id FROM reviews WHERE id = ?`, [req.params.id])) {
      return res.status(404).json({ error: 'Review not found' });
    }
    db.run(`DELETE FROM reviews WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[REVIEW DELETE]', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;