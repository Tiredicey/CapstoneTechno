import { Router } from 'express';
import db from '../database/Database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { category } = req.query;
    let q = `SELECT * FROM faqs WHERE active = 1`;
    const params = [];
    if (category) { q += ` AND category = ?`; params.push(category); }
    q += ` ORDER BY sort_order ASC`;
    res.json(db.all(q, params));
  } catch (err) {
    console.error('[FAQ GET]', err);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { question, answer, category, sort_order } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'Question and answer required' });
    const id = uuid();
    db.run(
      `INSERT INTO faqs (id, question, answer, category, sort_order, active) VALUES (?, ?, ?, ?, ?, 1)`,
      [id, question, answer, category || 'general', sort_order || 0]
    );
    res.status(201).json(db.get(`SELECT * FROM faqs WHERE id = ?`, [id]));
  } catch (err) {
    console.error('[FAQ CREATE]', err);
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM faqs WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'FAQ not found' });
    const { question, answer, category, sort_order, active } = req.body;
    db.run(
      `UPDATE faqs SET question=?, answer=?, category=?, sort_order=?, active=? WHERE id=?`,
      [
        question   ?? existing.question,
        answer     ?? existing.answer,
        category   ?? existing.category,
        sort_order ?? existing.sort_order,
        active !== undefined ? (active ? 1 : 0) : existing.active,
        req.params.id
      ]
    );
    res.json(db.get(`SELECT * FROM faqs WHERE id = ?`, [req.params.id]));
  } catch (err) {
    console.error('[FAQ UPDATE]', err);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const existing = db.get(`SELECT * FROM faqs WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'FAQ not found' });
    db.run(`DELETE FROM faqs WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[FAQ DELETE]', err);
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

export default router;