import { Router } from 'express';
import { UserModel } from '../models/UserModel.js';
import { signToken, authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import db from '../database/Database.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.post('/register', authLimiter, validate({
  email: { required: true, type: 'email' },
  password: { required: true, min: 8 },
  name: { required: true, min: 2 }
}), (req, res) => {
  try {
    const { email, password, name, language } = req.body;
    const existing = UserModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const user = UserModel.create({ email, password, name, language });
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const { password_hash, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error('[REGISTER ERROR]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = UserModel.findByEmail(email);
    if (!user || !UserModel.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/guest', (req, res) => {
  res.json({ sessionId: uuid(), isGuest: true });
});

router.get('/me', authenticate, (req, res) => {
  try {
    const user = UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/me', authenticate, (req, res) => {
  try {
    UserModel.updateProfile(req.user.id, req.body);
    const user = UserModel.findById(req.user.id);
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/me/password', authenticate, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const user = UserModel.findById(req.user.id);
    if (!UserModel.verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    UserModel.updateProfile(req.user.id, { password: newPassword });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.get('/notifications', authenticate, (req, res) => {
  try {
    const notes = db.all(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`, [req.user.id]);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/notifications/:id/read', authenticate, (req, res) => {
  try {
    db.run(`UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.post('/notifications/read-all', authenticate, (req, res) => {
  try {
    db.run(`UPDATE notifications SET read = 1 WHERE user_id = ?`, [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;