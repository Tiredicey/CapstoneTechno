import { Router } from 'express';
import { SupportModel } from '../models/SupportModel.js';
import { SocketManager } from '../sockets/SocketManager.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';
import db from '../database/Database.js';

const router = Router();

const MAX_SUBJECT = 200;
const MAX_MESSAGE = 4000;
const MAX_COMMENT = 1000;
const VALID_CHANNELS = new Set(['chat', 'email', 'phone', 'social', 'in_app']);
const VALID_STATUSES = new Set(['open', 'pending', 'in_progress', 'resolved', 'closed']);

const buckets = new Map();
function rateLimit(key, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > b.reset) { b.count = 0; b.reset = now + windowMs; }
  b.count++;
  buckets.set(key, b);
  return b.count <= max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.reset + 60_000) buckets.delete(k);
}, 120_000).unref?.();

function clientKey(req) {
  return req.user?.id || req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'anon';
}
function sanitize(s, max) {
  if (typeof s !== 'string') return '';
  const trimmed = s.trim().replace(/\u0000/g, '');
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}
function clampInt(v, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}

router.get('/faqs', (req, res) => {
  try {
    const { category, q: search } = req.query;
    let q = `SELECT id, category, question, answer, sort_order FROM faqs WHERE active = 1`;
    const params = [];
    if (category) { q += ` AND category = ?`; params.push(category); }
    if (search) {
      q += ` AND (LOWER(question) LIKE ? OR LOWER(answer) LIKE ?)`;
      const like = `%${String(search).toLowerCase()}%`;
      params.push(like, like);
    }
    q += ` ORDER BY sort_order ASC, id ASC`;
    res.json({ faqs: db.all(q, params) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

router.post('/faqs', authenticate, requireAdmin, (req, res) => {
  try {
    const question = sanitize(req.body.question, 300);
    const answer = sanitize(req.body.answer, 4000);
    const category = sanitize(req.body.category || 'general', 60);
    const sortOrder = clampInt(req.body.sortOrder, 0, 9999) ?? 100;
    if (!question || !answer) return res.status(400).json({ error: 'question and answer required' });
    const info = db.run(
      `INSERT INTO faqs (category, question, answer, sort_order, active) VALUES (?, ?, ?, ?, 1)`,
      [category, question, answer, sortOrder]
    );
    res.status(201).json({ id: info.lastInsertRowid, question, answer, category, sort_order: sortOrder });
  } catch {
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

router.put('/faqs/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const id = clampInt(req.params.id, 1, 1e9);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const fields = [];
    const params = [];
    for (const [k, max] of [['question', 300], ['answer', 4000], ['category', 60]]) {
      if (req.body[k] != null) { fields.push(`${k} = ?`); params.push(sanitize(req.body[k], max)); }
    }
    if (req.body.sortOrder != null) { fields.push(`sort_order = ?`); params.push(clampInt(req.body.sortOrder, 0, 9999) ?? 100); }
    if (req.body.active != null) { fields.push(`active = ?`); params.push(req.body.active ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    db.run(`UPDATE faqs SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ updated: true });
  } catch {
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

router.delete('/faqs/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const id = clampInt(req.params.id, 1, 1e9);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    db.run(`UPDATE faqs SET active = 0 WHERE id = ?`, [id]);
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

router.post('/', optionalAuth, (req, res) => {
  try {
    if (!rateLimit(`ticket:${clientKey(req)}`, 6, 60_000)) {
      return res.status(429).json({ error: 'Too many tickets — please wait a moment.' });
    }
    const subject = sanitize(req.body.subject, MAX_SUBJECT);
    const message = sanitize(req.body.message, MAX_MESSAGE);
    const orderId = req.body.orderId ? sanitize(req.body.orderId, 100) : null;
    const channel = VALID_CHANNELS.has(req.body.channel) ? req.body.channel : 'chat';
    if (!subject || !message) return res.status(400).json({ error: 'subject and message required' });
    const ticket = SupportModel.create({
      userId: req.user?.id || null,
      orderId,
      channel,
      subject,
      firstMessage: message
    });
    try { SocketManager.emitSupportTicket?.(ticket); } catch {}
    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.get('/my', authenticate, (req, res) => {
  try { res.json(SupportModel.getByUser(req.user.id)); }
  catch { res.status(500).json({ error: 'Failed to fetch tickets' }); }
});

router.get('/stats', authenticate, requireAdmin, (req, res) => {
  try {
    const row = db.get(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_count,
        AVG(NULLIF(csat_score, 0)) AS avg_csat,
        AVG(NULLIF(nps_score, -1)) AS avg_nps
      FROM support_tickets
    `);
    res.json(row || {});
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/:id', optionalAuth, (req, res) => {
  try {
    const ticket = SupportModel.getById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.user_id && req.user?.id !== ticket.user_id && !req.user?.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(ticket);
  } catch {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

router.get('/:id/transcript', optionalAuth, (req, res) => {
  try {
    const ticket = SupportModel.getById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.user_id && req.user?.id !== ticket.user_id && !req.user?.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const messages = Array.isArray(ticket.messages) ? ticket.messages : (() => {
      try { return JSON.parse(ticket.messages || '[]'); } catch { return []; }
    })();
    const lines = [
      `Bloom Support Transcript`,
      `Ticket: ${ticket.id}`,
      `Subject: ${ticket.subject}`,
      `Status: ${ticket.status}`,
      `Created: ${ticket.created_at}`,
      `─────────────────────────`,
      ...messages.map(m => `[${new Date(m.timestamp || m.created_at).toISOString()}] ${String(m.sender).toUpperCase()}: ${m.message}`)
    ].join('\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.id}.txt"`);
    res.send(lines);
  } catch {
    res.status(500).json({ error: 'Failed to export transcript' });
  }
});

router.post('/:id/message', optionalAuth, (req, res) => {
  try {
    if (!rateLimit(`msg:${clientKey(req)}:${req.params.id}`, 30, 60_000)) {
      return res.status(429).json({ error: 'Slow down a little.' });
    }
    const message = sanitize(req.body.message, MAX_MESSAGE);
    if (!message) return res.status(400).json({ error: 'message required' });
    const senderLabel = req.user?.is_admin
      ? 'agent'
      : (['user', 'guest', 'bot'].includes(req.body.sender) ? req.body.sender : (req.user ? 'user' : 'guest'));
    const ticket = SupportModel.addMessage(req.params.id, senderLabel, message);
    try {
      SocketManager.emitSupportMessage(req.params.id, {
        sender: senderLabel,
        message,
        timestamp: Date.now()
      });
    } catch {}
    res.json(ticket);
  } catch {
    res.status(500).json({ error: 'Failed to add message' });
  }
});

router.post('/:id/status', authenticate, requireAdmin, (req, res) => {
  try {
    const status = String(req.body.status || '').toLowerCase();
    if (!VALID_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid status' });
    SupportModel.updateStatus?.(req.params.id, status);
    try { SocketManager.emitSupportStatus?.(req.params.id, status); } catch {}
    res.json({ status });
  } catch {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.post('/:id/resolve', optionalAuth, (req, res) => {
  try {
    const csatScore = clampInt(req.body.csatScore, 1, 5);
    const npsScore = req.body.npsScore == null ? null : clampInt(req.body.npsScore, 0, 10);
    const feedbackComment = req.body.feedbackComment ? sanitize(req.body.feedbackComment, MAX_COMMENT) : null;
    SupportModel.resolve(req.params.id, csatScore, npsScore, feedbackComment);
    try { SocketManager.emitSupportStatus?.(req.params.id, 'resolved'); } catch {}
    res.json({ resolved: true });
  } catch {
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
});

router.post('/:id/discount', authenticate, requireAdmin, (req, res) => {
  try {
    const ticket = SupportModel.getById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const code = SupportModel.generateDiscount(req.params.id);
    res.json({ discountCode: code });
  } catch {
    res.status(500).json({ error: 'Failed to generate discount' });
  }
});

router.get('/', authenticate, requireAdmin, (req, res) => {
  try {
    const status = VALID_STATUSES.has(req.query.status) ? req.query.status : undefined;
    const limit = clampInt(req.query.limit, 1, 200) ?? 50;
    const offset = clampInt(req.query.offset, 0, 1e6) ?? 0;
    res.json(SupportModel.getAll({ status, limit, offset, search: req.query.q || null }));
  } catch {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

const AI_MODELS = ['openai', 'mistral', 'llama', 'gemini'];
async function callPollinations(messages, model, signal) {
  const r = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, private: true, referrer: 'bloom-support-server' }),
    signal
  });
  if (!r.ok) throw new Error(`pollinations ${model} ${r.status}`);
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('empty response');
  return text;
}

router.post('/ai/chat', optionalAuth, async (req, res) => {
  try {
    if (!rateLimit(`ai:${clientKey(req)}`, 30, 60_000)) {
      return res.status(429).json({ error: 'AI rate limit reached. Try again in a minute.' });
    }
    const messages = Array.isArray(req.body.messages) ? req.body.messages.slice(-20) : null;
    if (!messages?.length) return res.status(400).json({ error: 'messages required' });
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 25_000);
    let lastErr;
    for (const model of AI_MODELS) {
      try {
        const text = await callPollinations(messages, model, ac.signal);
        clearTimeout(timer);
        return res.json({ text, model, provider: 'pollinations' });
      } catch (e) { lastErr = e; }
    }
    clearTimeout(timer);
    res.status(503).json({ error: 'All AI providers unavailable', detail: String(lastErr?.message || lastErr) });
  } catch (e) {
    res.status(500).json({ error: 'AI failure', detail: String(e?.message || e) });
  }
});

export default router;
