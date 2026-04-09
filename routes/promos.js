import { Router } from 'express';
import db from '../database/Database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', authenticate, requireAdmin, (req, res) => {
  try {
    res.json(db.all(`SELECT * FROM promo_codes ORDER BY created_at DESC`));
  } catch (err) {
    console.error('[PROMOS GET]', err);
    res.status(500).json({ error: 'Failed to fetch promos' });
  }
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { code, discount_type, type, value, min_order_amount, min_order, max_uses, expires_at, is_active } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const finalType = discount_type || type;
    if (!finalType || !['percent','fixed','shipping'].includes(finalType)) {
      return res.status(400).json({ error: 'type must be percent, fixed, or shipping' });
    }
    if (value === undefined || value === null) return res.status(400).json({ error: 'value required' });
    if (db.get(`SELECT id FROM promo_codes WHERE code = ?`, [code.toUpperCase()])) {
      return res.status(409).json({ error: 'Code already exists' });
    }
    const id     = uuid();
    const minOrd = Number(min_order_amount || min_order) || 0;
    db.run(
      `INSERT INTO promo_codes
        (id, code, discount_type, type, value, min_order_amount, min_order, max_uses, is_active, used_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, code.toUpperCase(), finalType, finalType, Number(value), minOrd, minOrd,
       Number(max_uses) || null, is_active !== false ? 1 : 0]
    );
    res.status(201).json(db.get(`SELECT * FROM promo_codes WHERE id = ?`, [id]));
  } catch (err) {
    console.error('[PROMO CREATE]', err);
    res.status(500).json({ error: 'Failed to create promo' });
  }
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM promo_codes WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Promo not found' });
    const { value, min_order_amount, min_order, max_uses, is_active, expires_at } = req.body;
    const minOrd = min_order_amount !== undefined ? Number(min_order_amount)
      : min_order !== undefined ? Number(min_order)
      : existing.min_order_amount;
    db.run(
      `UPDATE promo_codes SET value=?, min_order_amount=?, min_order=?, max_uses=?, is_active=?, expires_at=? WHERE id=?`,
      [
        value     !== undefined ? Number(value)    : existing.value,
        minOrd, minOrd,
        max_uses  !== undefined ? Number(max_uses) : existing.max_uses,
        is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
        expires_at !== undefined ? expires_at : existing.expires_at,
        req.params.id
      ]
    );
    res.json(db.get(`SELECT * FROM promo_codes WHERE id = ?`, [req.params.id]));
  } catch (err) {
    console.error('[PROMO UPDATE]', err);
    res.status(500).json({ error: 'Failed to update promo' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    if (!db.get(`SELECT id FROM promo_codes WHERE id = ?`, [req.params.id])) {
      return res.status(404).json({ error: 'Promo not found' });
    }
    db.run(`DELETE FROM promo_codes WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[PROMO DELETE]', err);
    res.status(500).json({ error: 'Failed to delete promo' });
  }
});

export default router;