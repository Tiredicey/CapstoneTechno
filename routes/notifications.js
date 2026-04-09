import { Router } from 'express';
import db from '../database/Database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', authenticate, (req, res) => {
  try {
    res.json(db.all(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    ));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/:id/read', authenticate, (req, res) => {
  try {
    db.run(`UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.post('/read-all', authenticate, (req, res) => {
  try {
    db.run(`UPDATE notifications SET read = 1 WHERE user_id = ?`, [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

router.post('/broadcast', authenticate, requireAdmin, (req, res) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });
    const users = db.all(`SELECT id FROM users WHERE role = 'customer'`);
    for (const u of users) {
      db.run(
        `INSERT INTO notifications (id, user_id, type, title, body, message) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuid(), u.id, type || 'info', title, message, message]
      );
    }
    res.json({ success: true, count: users.length });
  } catch (err) {
    console.error('[BROADCAST]', err);
    res.status(500).json({ error: 'Failed to broadcast' });
  }
});

export default router;