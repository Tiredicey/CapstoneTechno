import { Router } from 'express';
import { SupportModel } from '../models/SupportModel.js';
import { SocketManager } from '../sockets/SocketManager.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';
import db from '../database/Database.js';

const router = Router();

router.get('/faqs', (req, res) => {
  try {
    const { category } = req.query;
    let q = `SELECT * FROM faqs WHERE active = 1`;
    const params = [];
    if (category) { q += ` AND category = ?`; params.push(category); }
    q += ` ORDER BY sort_order ASC`;
    const faqs = db.all(q, params);
    res.json({ faqs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

router.post('/', optionalAuth, (req, res) => {
  try {
    const { orderId, channel, subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'subject and message required' });
    const ticket = SupportModel.create({ userId: req.user?.id || null, orderId: orderId || null, channel: channel || 'chat', subject, firstMessage: message });
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.get('/my', authenticate, (req, res) => {
  try {
    res.json(SupportModel.getByUser(req.user.id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/:id', optionalAuth, (req, res) => {
  try {
    const ticket = SupportModel.getById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

router.post('/:id/message', optionalAuth, (req, res) => {
  try {
    const { message, sender } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const senderLabel = sender || (req.user ? 'user' : 'guest');
    const ticket = SupportModel.addMessage(req.params.id, senderLabel, message);
    try { SocketManager.emitSupportMessage(req.params.id, { sender: senderLabel, message, timestamp: Date.now() }); } catch {}
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add message' });
  }
});

router.post('/:id/resolve', authenticate, requireAdmin, (req, res) => {
  try {
    const { csatScore, npsScore } = req.body;
    SupportModel.resolve(req.params.id, csatScore, npsScore);
    res.json({ resolved: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
});

router.post('/:id/discount', authenticate, requireAdmin, (req, res) => {
  try {
    const code = SupportModel.generateDiscount(req.params.id);
    res.json({ discountCode: code });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate discount' });
  }
});

router.get('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    res.json(SupportModel.getAll({ status }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

export default router;