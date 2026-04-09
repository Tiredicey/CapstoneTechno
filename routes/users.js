import { Router } from 'express';
import db from '../database/Database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { search, role, limit, offset } = req.query;
    let q = `SELECT id, name, email, role, avatar, phone, loyalty_points, created_at FROM users WHERE 1=1`;
    const params = [];
    if (search) { q += ` AND (name LIKE ? OR email LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
    if (role)   { q += ` AND role = ?`; params.push(role); }
    q += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit) || 100, Number(offset) || 0);
    res.json(db.all(q, params));
  } catch (err) {
    console.error('[USERS GET]', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const user = db.get(
      `SELECT id, name, email, role, avatar, phone, loyalty_points, created_at FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    const orderCount = db.get(`SELECT COUNT(*) as c FROM orders WHERE user_id = ?`, [req.params.id]);
    const totalSpent = db.get(
      `SELECT COALESCE(SUM(json_extract(pricing,'$.finalTotal')),0) as total
       FROM orders WHERE user_id = ? AND status != 'cancelled'`,
      [req.params.id]
    );
    res.json({ ...user, order_count: orderCount?.c || 0, total_spent: totalSpent?.total || 0 });
  } catch (err) {
    console.error('[USER GET]', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM users WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (req.params.id === req.user.id && req.body.role && req.body.role !== existing.role) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    const { role, name, phone } = req.body;
    if (role && !['admin','customer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    db.run(
      `UPDATE users SET
        role  = COALESCE(?, role),
        name  = COALESCE(?, name),
        phone = COALESCE(?, phone)
       WHERE id = ?`,
      [role || null, name || null, phone || null, req.params.id]
    );
    res.json(db.get(
      `SELECT id, name, email, role, phone, loyalty_points, created_at FROM users WHERE id = ?`,
      [req.params.id]
    ));
  } catch (err) {
    console.error('[USER UPDATE]', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    if (!db.get(`SELECT id FROM users WHERE id = ?`, [req.params.id])) {
      return res.status(404).json({ error: 'User not found' });
    }
    db.run(`DELETE FROM users WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[USER DELETE]', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;