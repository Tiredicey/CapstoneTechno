import { Router } from 'express';
import { CartModel } from '../models/CartModel.js';
import { ProductModel } from '../models/ProductModel.js';
import { PricingEngine } from '../services/PricingEngine.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

function cartResponse(cart, pricing) {
  return {
    id:         cart.id,
    items:      cart.items || [],
    promo_code: cart.promo_code || null,
    pricing
  };
}

function getCart(req) {
  const userId    = req.user?.id || null;
  const sessionId = req.headers['x-session-id'] || null;
  if (!userId && !sessionId) return null;
  return CartModel.getOrCreate(userId, sessionId);
}

router.get('/', optionalAuth, (req, res) => {
  try {
    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });
    const pricing = PricingEngine.calculate({
      items: cart.items,
      promoCode: cart.promo_code
    });
    res.json(cartResponse(cart, pricing));
  } catch (err) {
    console.error('[CART GET]', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

router.post('/items', optionalAuth, (req, res) => {
  try {
    const { productId, product_id, qty, quantity, customization } = req.body;
    const pid   = productId || product_id;
    const count = Number(qty || quantity || 1);
    if (!pid) return res.status(400).json({ error: 'productId required' });

    const product = ProductModel.getById(pid);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if ((product.inventory || 0) < 1) {
      return res.status(400).json({ error: 'Out of stock' });
    }

    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });

    const image = Array.isArray(product.images) && product.images.length
      ? product.images[0]
      : (typeof product.images === 'string' ? JSON.parse(product.images || '[]')[0] || '' : '');

    const item = {
      productId:     pid,
      name:          product.name,
      price:         Number(product.base_price) + Number(customization?.priceDelta || 0),
      image,
      qty:           count,
      customization: customization || null,
      customized:    !!customization
    };

    const updated = CartModel.addItem(cart.id, item);
    const pricing = PricingEngine.calculate({
      items: updated.items,
      promoCode: updated.promo_code
    });
    res.json(cartResponse(updated, pricing));
  } catch (err) {
    console.error('[CART ADD ITEMS]', err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

router.post('/', optionalAuth, (req, res) => {
  try {
    const { productId, product_id, qty, quantity, customization } = req.body;
    const pid   = productId || product_id;
    const count = Number(qty || quantity || 1);
    if (!pid) return res.status(400).json({ error: 'productId required' });

    const product = ProductModel.getById(pid);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if ((product.inventory || 0) < 1) {
      return res.status(400).json({ error: 'Out of stock' });
    }

    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });

    const image = Array.isArray(product.images) && product.images.length
      ? product.images[0]
      : (typeof product.images === 'string' ? JSON.parse(product.images || '[]')[0] || '' : '');

    const item = {
      productId:     pid,
      name:          product.name,
      price:         Number(product.base_price) + Number(customization?.priceDelta || 0),
      image,
      qty:           count,
      customization: customization || null,
      customized:    !!customization
    };

    const updated = CartModel.addItem(cart.id, item);
    const pricing = PricingEngine.calculate({
      items: updated.items,
      promoCode: updated.promo_code
    });
    res.json(cartResponse(updated, pricing));
  } catch (err) {
    console.error('[CART ADD]', err);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

router.put('/items/:lineId', optionalAuth, (req, res) => {
  try {
    const { qty, quantity } = req.body;
    const count = Number(qty ?? quantity);
    if (isNaN(count)) return res.status(400).json({ error: 'qty required' });

    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });

    const updated = CartModel.updateItem(cart.id, req.params.lineId, count);
    const pricing = PricingEngine.calculate({
      items: updated.items,
      promoCode: updated.promo_code
    });
    res.json(cartResponse(updated, pricing));
  } catch (err) {
    console.error('[CART UPDATE]', err);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

router.delete('/items/:lineId', optionalAuth, (req, res) => {
  try {
    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });

    const updated = CartModel.updateItem(cart.id, req.params.lineId, 0);
    const pricing = PricingEngine.calculate({
      items: updated.items,
      promoCode: updated.promo_code
    });
    res.json(cartResponse(updated, pricing));
  } catch (err) {
    console.error('[CART DELETE]', err);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

router.post('/promo', optionalAuth, (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Promo code required' });

    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });

    const basePricing = PricingEngine.calculate({
      items: cart.items,
      promoCode: null
    });
    const validation = PricingEngine.validatePromo(code, basePricing.subtotal);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    CartModel.applyPromo(cart.id, code.toUpperCase(), validation.discount || 0);
    const newPricing = PricingEngine.calculate({
      items: cart.items,
      promoCode: code.toUpperCase()
    });
    res.json({ ...cartResponse(cart, newPricing), promoApplied: true });
  } catch (err) {
    console.error('[CART PROMO]', err);
    res.status(500).json({ error: 'Failed to apply promo code' });
  }
});

router.delete('/promo', optionalAuth, (req, res) => {
  try {
    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });
    CartModel.applyPromo(cart.id, null, 0);
    const pricing = PricingEngine.calculate({ items: cart.items, promoCode: null });
    res.json(cartResponse(cart, pricing));
  } catch (err) {
    console.error('[CART PROMO REMOVE]', err);
    res.status(500).json({ error: 'Failed to remove promo' });
  }
});

router.post('/save', optionalAuth, (req, res) => {
  try {
    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });
    const pricing = PricingEngine.calculate({
      items: cart.items,
      promoCode: cart.promo_code
    });
    res.json({ ...cartResponse(cart, pricing), saved: true });
  } catch (err) {
    console.error('[CART SAVE]', err);
    res.status(500).json({ error: 'Failed to save cart' });
  }
});

export default router;