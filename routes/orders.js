import { Router } from 'express';
import { OrderModel } from '../models/OrderModel.js';
import { CartModel } from '../models/CartModel.js';
import { PricingEngine } from '../services/PricingEngine.js';
import { ProductModel } from '../models/ProductModel.js';
import { SocketManager } from '../sockets/SocketManager.js';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.js';
import db from '../database/Database.js';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const deliveriesDir = path.join(__dirname, '..', 'uploads', 'deliveries');
fs.mkdirSync(deliveriesDir, { recursive: true });

const greetingsDir = path.join(__dirname, '..', 'uploads', 'greetings');
fs.mkdirSync(greetingsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: deliveriesDir,
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

const videoStorage = multer.diskStorage({
  destination: greetingsDir,
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname) || '.webm'}`)
});
const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.webm', '.mp4', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext) || file.mimetype.startsWith('video/'));
  }
});

const router = Router();
const VALID_STATUSES = ['new', 'processing', 'quality_check', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

router.post('/', optionalAuth, (req, res) => {
  try {
    const { cartId, recipient, deliveryDate, deliverySlot, recurring, paymentMethod, specialInstructions, loyaltyPointsUsed, surpriseDelivery } = req.body;
    if (!recipient || !deliveryDate || !deliverySlot || !paymentMethod) return res.status(400).json({ error: 'Missing required fields' });
    const userId = req.user?.id || null;
    const sessionId = req.headers['x-session-id'] || null;
    let cart = cartId ? db.get('SELECT * FROM carts WHERE id = ?', [cartId]) : null;
    if (!cart && userId) cart = db.get('SELECT * FROM carts WHERE user_id = ?', [userId]);
    if (!cart && sessionId) cart = db.get('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    const items = typeof cart.items === 'string' ? JSON.parse(cart.items || '[]') : cart.items;
    if (!items.length) return res.status(400).json({ error: 'Cart is empty' });
    const hasCustomization = items.some(i => i.customized);
    const pricing = PricingEngine.calculate({ items, promoCode: cart.promo_code, loyaltyPointsUsed: Number(loyaltyPointsUsed) || 0, hasCustomization });
    const tx = db.transaction(() => {
      const order = OrderModel.create({
        userId, sessionId, items, recipient,
        deliveryDate, deliverySlot, recurring: recurring || null, pricing,
        paymentMethod, specialInstructions: specialInstructions || null,
        surpriseDelivery: !!surpriseDelivery
      });
      for (const item of items) {
        db.run('UPDATE products SET inventory = MAX(0, inventory - ?) WHERE id = ?', [item.qty || 1, item.productId]);
      }
      if (cart.promo_code) PricingEngine.redeemPromo(cart.promo_code);
      if (userId) {
        const points = Math.floor((pricing.finalTotal || 0) * 10);
        db.run('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?', [points, userId]);
        try {
          db.run('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?, ?, ?, ?, ?)',
            [uuid(), userId, 'order_confirmed', 'Order Confirmed', `Order ${order.qr_code} placed.`]);
        } catch {}
      }
      CartModel.clearCart(cart.id);
      return order;
    });
    const order = tx();
    try { SocketManager.emitNewOrder(order); } catch {}
    res.status(201).json(order);
  } catch (err) {
    console.error('[ORDER CREATE ERROR]', err);
    res.status(500).json({ error: 'Failed to create order: ' + err.message });
  }
});

router.get('/my', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];
    if (userId) {
      return res.json(OrderModel.getByUser(userId));
    }
    if (sessionId) {
      return res.json(OrderModel.getBySession(sessionId));
    }
    res.json([]);
  } catch (err) {
    console.error('[ORDERS FETCH ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/:id/track', (req, res) => {
  try {
    const order = OrderModel.getById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const rec = order.recipient || {};
    const recipientName = rec.name || ((rec.firstName || '') + ' ' + (rec.lastName || '')).trim() || null;
    res.json({
      id: order.id,
      status: order.status,
      trackingSteps: order.trackingSteps,
      delivery_date: order.delivery_date,
      delivery_slot: order.delivery_slot,
      qrCode: order.qr_code,
      delivery_photo: order.delivery_photo,
      video_greeting: order.video_greeting,
      recipient: { ...rec, name: recipientName },
      surpriseDelivery: order.surprise_delivery
    });
  } catch (err) {
    console.error('[ORDER TRACK ERROR]', err);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

router.get('/:id', optionalAuth, (req, res) => {
  try {
    const order = OrderModel.getById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch { res.status(500).json({ error: 'Failed to fetch order' }); }
});

router.post('/:id/greeting', videoUpload.single('video'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video uploaded' });
    const order = OrderModel.getById(req.params.id);
    if (!order) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(404).json({ error: 'Order not found' });
    }
    const videoUrl = `/uploads/greetings/${req.file.filename}`;
    db.run('UPDATE orders SET video_greeting = ?, updated_at = unixepoch() WHERE id = ?', [videoUrl, order.id]);
    res.json({ success: true, videoUrl });
  } catch (err) {
    console.error('[VIDEO GREETING UPLOAD ERROR]', err);
    res.status(500).json({ error: 'Failed to upload video greeting' });
  }
});

router.get('/', authenticate, requireAdmin, (req, res) => {
  try {
    res.json(OrderModel.getAll({ status: req.query.status, limit: Number(req.query.limit) || 50, offset: Number(req.query.offset) || 0 }));
  } catch { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

router.put('/:id/status', authenticate, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const order = OrderModel.updateStatus(req.params.id, status);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    try { SocketManager.emitOrderUpdate(req.params.id, { status, orderId: req.params.id, trackingSteps: order.trackingSteps }); } catch {}
    if (order.user_id) {
      const msgs = { shipped: `Order ${order.qr_code} shipped`, delivered: `Order ${order.qr_code} delivered` };
      if (msgs[status]) {
        try { db.run('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?, ?, ?, ?, ?)', [uuid(), order.user_id, `order_${status}`, status, msgs[status]]); } catch {}
      }
    }
    res.json(order);
  } catch { res.status(500).json({ error: 'Failed to update status' }); }
});

router.put('/:id/florist', authenticate, requireAdmin, (req, res) => {
  try { OrderModel.assignFlorist(req.params.id, req.body.floristId); res.json({ ok: true }); } catch { res.status(500).json({ error: 'Failed to assign florist' }); }
});

router.put('/:id/photo', authenticate, requireAdmin, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    const photoUrl = `/uploads/deliveries/${req.file.filename}`;
    const order = OrderModel.setDeliveryPhoto(req.params.id, photoUrl, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'delivered') {
      OrderModel.updateStatus(order.id, 'delivered');
    }
    try { SocketManager.emitOrderUpdate(req.params.id, { status: 'delivered', photoUrl, orderId: req.params.id }); } catch {}
    res.json({ success: true, photoUrl });
  } catch (err) {
    console.error('[ORDER PHOTO UPLOAD ERROR]', err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

export default router;
