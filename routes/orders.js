import { Router } from 'express';
import { OrderModel } from '../models/OrderModel.js';
import { CartModel } from '../models/CartModel.js';
import { PricingEngine } from '../services/PricingEngine.js';
import { ProductModel } from '../models/ProductModel.js';
import { SocketManager } from '../sockets/SocketManager.js';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.js';
import { Database } from '../database/Database.js';
import { v4 as uuid } from 'uuid';

const router = Router();
const VALID_STATUSES =['new', 'processing', 'quality_check', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

router.post('/', optionalAuth, (req, res) => {
  try {
    const { cartId, recipient, deliveryDate, deliverySlot, recurring, paymentMethod, specialInstructions, loyaltyPointsUsed } = req.body;
    if (!recipient || !deliveryDate || !deliverySlot || !paymentMethod) return res.status(400).json({ error: 'Missing required fields' });
    const userId = req.user?.id || null;
    const sessionId = req.headers['x-session-id'] || null;
    let cart = cartId ? Database.get('SELECT * FROM carts WHERE id = ?', [cartId]) : null;
    if (!cart && userId) cart = Database.get('SELECT * FROM carts WHERE user_id = ?', [userId]);
    if (!cart && sessionId) cart = Database.get('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    const items = typeof cart.items === 'string' ? JSON.parse(cart.items || '[]') : cart.items;
    if (!items.length) return res.status(400).json({ error: 'Cart is empty' });
    const hasCustomization = items.some(i => i.customized);
    const pricing = PricingEngine.calculate({ items, promoCode: cart.promo_code, loyaltyPointsUsed: Number(loyaltyPointsUsed) || 0, hasCustomization });
    const order = OrderModel.create({ userId, sessionId, items, recipient, deliveryDate, deliverySlot, recurring: recurring || null, pricing, paymentMethod, specialInstructions: specialInstructions || null });
    items.forEach(item => { if (item.productId) ProductModel.decrementInventory(item.productId, item.qty || 1); });
    if (cart.promo_code) PricingEngine.redeemPromo(cart.promo_code);
    if (userId) {
      const points = Math.floor((pricing.finalTotal || 0) * 10);
      Database.run('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?', [points, userId]);
      try { Database.run('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?, ?, ?, ?, ?)',[uuid(), userId, 'order_confirmed', 'Order Confirmed', `Order ${order.qr_code} placed.`]); } catch {}
    }
    CartModel.clearCart(cart.id);
    try { SocketManager.emitNewOrder(order); } catch {}
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.get('/my', authenticate, (req, res) => {
  try { res.json(OrderModel.getByUser(req.user.id)); } catch { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

router.get('/:id/track', (req, res) => {
  try {
    const order = OrderModel.getById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ id: order.id, status: order.status, trackingSteps: order.trackingSteps, delivery_date: order.delivery_date, delivery_slot: order.delivery_slot, qrCode: order.qr_code });
  } catch { res.status(500).json({ error: 'Failed to track order' }); }
});

router.get('/:id', optionalAuth, (req, res) => {
  try {
    const order = OrderModel.getById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch { res.status(500).json({ error: 'Failed to fetch order' }); }
});

router.get('/', authenticate, requireAdmin, (req, res) => {
  try { res.json(OrderModel.getAll({ status: req.query.status, limit: Number(req.query.limit) || 50, offset: Number(req.query.offset) || 0 })); } catch { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

router.put('/:id/status', authenticate, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const order = OrderModel.updateStatus(req.params.id, status);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    try { SocketManager.emitOrderUpdate(req.params.id, { status, orderId: req.params.id }); } catch {}
    if (order.user_id) {
      const msgs = { shipped: `Order ${order.qr_code} shipped`, delivered: `Order ${order.qr_code} delivered` };
      if (msgs[status]) {
        try { Database.run('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?, ?, ?, ?, ?)',[uuid(), order.user_id, `order_${status}`, status, msgs[status]]); } catch {}
      }
    }
    res.json(order);
  } catch { res.status(500).json({ error: 'Failed to update status' }); }
});

router.put('/:id/florist', authenticate, requireAdmin, (req, res) => {
  try { OrderModel.assignFlorist(req.params.id, req.body.floristId); res.json({ ok: true }); } catch { res.status(500).json({ error: 'Failed to assign florist' }); }
});

export default router;
