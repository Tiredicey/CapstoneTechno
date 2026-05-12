import { Router } from 'express';
import db from '../database/Database.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';

const router = Router();

router.post('/event', optionalAuth, (req, res) => {
  try {
    const { eventType, payload } = req.body;
    if (!eventType) return res.status(400).json({ error: 'eventType required' });
    db.run(
      'INSERT INTO analytics_events (id, user_id, session_id, event_type, payload) VALUES (?, ?, ?, ?, ?)',
      [uuid(), req.user?.id || null, req.headers['x-session-id'] || null, eventType, JSON.stringify(payload || {})]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[ANALYTICS EVENT ERROR]', err);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

router.get('/dashboard', authenticate, requireAdmin, (req, res) => {
  try {
    const revenue = db.get(
      "SELECT SUM(json_extract(pricing,'$.finalTotal')) as total, COUNT(*) as orders FROM orders WHERE payment_status='paid'"
    );
    const today = db.get(
      "SELECT COUNT(*) as c FROM orders WHERE date(datetime(created_at,'unixepoch')) = date('now')"
    );
    const pending = db.get(
      "SELECT COUNT(*) as c FROM orders WHERE status NOT IN ('delivered','cancelled')"
    );
    const topProducts = db.all(`
      SELECT p.name, p.category, COUNT(*) as order_count, p.rating
      FROM orders o, json_each(o.items) i
      JOIN products p ON json_extract(i.value,'$.productId') = p.id
      WHERE o.status != 'cancelled'
      GROUP BY p.name, p.category, p.rating
      ORDER BY order_count DESC
      LIMIT 10
    `);
    const salesByCategory = db.all(`
      SELECT p.category,
             COUNT(*) as orders,
             SUM(json_extract(i.value,'$.price') * json_extract(i.value,'$.qty')) as revenue
      FROM orders o, json_each(o.items) i
      JOIN products p ON json_extract(i.value,'$.productId') = p.id
      WHERE o.status != 'cancelled'
      GROUP BY p.category
    `);
    const recentEvents = db.all(
      'SELECT event_type, COUNT(*) as count FROM analytics_events GROUP BY event_type ORDER BY count DESC LIMIT 20'
    );
    const nps = db.get(
      'SELECT AVG(nps_score) as avg FROM support_tickets WHERE nps_score IS NOT NULL'
    );
    const csat = db.get(
      'SELECT AVG(csat_score) as avg FROM support_tickets WHERE csat_score IS NOT NULL'
    );
    res.json({
      revenue: { total: revenue?.total || 0, orders: revenue?.orders || 0 },
      today: { c: today?.c || 0 },
      pending: { c: pending?.c || 0 },
      topProducts: topProducts || [],
      salesByCategory: salesByCategory || [],
      recentEvents: recentEvents || [],
      nps: nps?.avg || null,
      csat: csat?.avg || null
    });
  } catch (err) {
    console.error('[ANALYTICS DASHBOARD ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/abtest/:testId', authenticate, requireAdmin, (req, res) => {
  try {
    const results = db.all(
      "SELECT payload, COUNT(*) as count FROM analytics_events WHERE event_type = 'ab_test' AND json_extract(payload, '$.testId') = ? GROUP BY json_extract(payload,'$.variant')",
      [req.params.testId]
    );
    res.json(results);
  } catch (err) {
    console.error('[ABTEST ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch AB test results' });
  }
});

export default router;
