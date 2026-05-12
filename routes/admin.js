import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { SocketManager } from '../sockets/SocketManager.js';
import db from '../database/Database.js';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'products'),
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

function tryParse(val, fallback) {
  if (typeof val !== 'string') return val ?? fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

router.use(authenticate, requireAdmin);

router.get('/stats', (req, res) => {
  try {
    const revenue = db.get(`SELECT COALESCE(SUM(json_extract(pricing,'$.finalTotal')),0) as total, COUNT(*) as orders FROM orders WHERE status != 'cancelled'`);
    const today = db.get(`SELECT COUNT(*) as c FROM orders WHERE date(created_at,'unixepoch') = date('now')`);
    const pending = db.get(`SELECT COUNT(*) as c FROM orders WHERE status IN ('new','processing')`);
    const users = db.get(`SELECT COUNT(*) as c FROM users WHERE role = 'customer'`);
    const products = db.get(`SELECT COUNT(*) as c FROM products WHERE is_active = 1`);
    const topProducts = db.all(`
      SELECT p.id, p.name, p.category, p.rating, p.base_price,
             COUNT(DISTINCT o.id) AS order_count
      FROM products p
      LEFT JOIN orders o
        ON o.status != 'cancelled'
       AND instr(o.items, '"' || p.id || '"') > 0
      WHERE p.is_active = 1
      GROUP BY p.id ORDER BY order_count DESC LIMIT 5
    `);
    const salesByCategory = db.all(`
      SELECT p.category,
             COALESCE(SUM(json_extract(o.pricing,'$.finalTotal')),0) AS revenue
      FROM orders o
      JOIN products p ON instr(o.items, '"' || p.id || '"') > 0
      WHERE o.status != 'cancelled'
      GROUP BY p.category
    `);
    const recentEvents = db.all(`SELECT event_type, COUNT(*) as count FROM analytics_events GROUP BY event_type ORDER BY count DESC LIMIT 8`);
    const nps = db.get(`SELECT AVG(nps_score) as nps FROM support_tickets WHERE nps_score IS NOT NULL`);
    const csat = db.get(`SELECT AVG(csat_score) as csat FROM support_tickets WHERE csat_score IS NOT NULL`);
    res.json({ revenue, today, pending, users: users?.c || 0, products: products?.c || 0, topProducts, salesByCategory, recentEvents, nps: nps?.nps || null, csat: csat?.csat || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});











router.post('/notifications/broadcast', (req, res) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });
    const users = db.all(`SELECT id FROM users WHERE role = 'customer'`);
    const notifType = type || 'info';
    const tx = db.transaction(() => {
      for (const u of users) {
        const id = uuid();
        db.run(
          `INSERT INTO notifications (id, user_id, type, title, body, message) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, u.id, notifType, title, message, message]
        );
        SocketManager.emitNotificationToUser(u.id, { id, type: notifType, title, body: message, message, read: 0 });
      }
    });
    tx();
    SocketManager.io?.to('admin_room').emit('broadcast_sent', { title, message, count: users.length, timestamp: Date.now() });
    res.json({ success: true, count: users.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to broadcast' });
  }
});

export default router;
