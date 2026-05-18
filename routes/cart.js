import { Router } from 'express';
import { CartModel } from '../models/CartModel.js';
import { ProductModel } from '../models/ProductModel.js';
import { PricingEngine } from '../services/PricingEngine.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

const cartResponse = (cart, pricing) => ({
  id: cart.id,
  items: cart.items || [],
  promo_code: cart.promo_code || null,
  pricing
});

const getCart = (req) => {
  const userId = req.user?.id || null;
  const sessionId = req.headers['x-session-id'] || null;
  if (!userId && !sessionId) return null;
  return CartModel.getOrCreate(userId, sessionId);
};

const priceFor = (cart) => PricingEngine.calculate({
  items: cart.items,
  promoCode: cart.promo_code
});

const extractImage = (images) => {
  if (Array.isArray(images) && images.length) return images[0];
  if (typeof images === 'string') {
    try { return JSON.parse(images || '[]')[0] || ''; } catch { return ''; }
  }
  return '';
};

const resolveProduct = (req) => {
  const { productId, product_id } = req.body;
  const pid = productId || product_id;
  if (!pid) return { error: { status: 400, message: 'productId required' } };

  let product = ProductModel.getById(pid);
  if (!product && pid === 'custom') {
    product = { id: 'custom', name: 'Custom Bloom Arrangement', base_price: 3639.44, images: '[]', inventory: 999 };
  }
  if (!product && pid.startsWith('sub-')) {
    const plan = pid.replace('sub-', '');
    product = {
      id: pid,
      name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Subscription`,
      base_price: Number(req.body.price) || 2299,
      images: JSON.stringify([`/uploads/subscriptions/${plan}.jpg`]),
      inventory: 999
    };
  }
  if (!product) return { error: { status: 404, message: 'Product not found' } };
  if ((product.inventory || 0) < 1) return { error: { status: 400, message: 'Out of stock' } };
  return { pid, product };
};

const buildItem = (pid, product, body) => {
  const { qty, quantity, customization } = body;
  const count = Number(qty || quantity || 1);
  const delta = Number(customization?.priceDeltaPHP || customization?.priceDelta || 0);
  const flower = customization?.flower;
  return {
    productId: pid,
    name: flower
      ? `Custom ${flower.charAt(0).toUpperCase() + flower.slice(1)} Arrangement`
      : product.name,
    price: Number(product.base_price) + delta,
    image: extractImage(product.images),
    qty: count,
    customization: customization || null,
    customized: !!customization
  };
};

const addToCart = (req, res, tag) => {
  try {
    const resolved = resolveProduct(req);
    if (resolved.error) return res.status(resolved.error.status).json({ error: resolved.error.message });

    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });

    const updated = CartModel.addItem(cart.id, buildItem(resolved.pid, resolved.product, req.body));
    res.json(cartResponse(updated, priceFor(updated)));
  } catch (err) {
    console.error(tag, err);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
};

router.get('/', optionalAuth, (req, res) => {
  try {
    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });
    res.json(cartResponse(cart, priceFor(cart)));
  } catch (err) {
    console.error('[CART GET]', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

router.post('/items', optionalAuth, (req, res) => addToCart(req, res, '[CART ADD ITEMS]'));
router.post('/', optionalAuth, (req, res) => addToCart(req, res, '[CART ADD]'));

router.put('/items/:lineId', optionalAuth, (req, res) => {
  try {
    const { qty, quantity } = req.body;
    const count = Number(qty ?? quantity);
    if (Number.isNaN(count)) return res.status(400).json({ error: 'qty required' });

    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });

    const updated = CartModel.updateItem(cart.id, req.params.lineId, count);
    res.json(cartResponse(updated, priceFor(updated)));
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
    res.json(cartResponse(updated, priceFor(updated)));
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

    const basePricing = PricingEngine.calculate({ items: cart.items, promoCode: null });
    const validation = PricingEngine.validatePromo(code, basePricing.subtotal);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const normalized = code.toUpperCase();
    CartModel.applyPromo(cart.id, normalized, validation.discount || 0);
    cart.promo_code = normalized;

    const newPricing = PricingEngine.calculate({ items: cart.items, promoCode: normalized });
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
    cart.promo_code = null;

    res.json(cartResponse(cart, PricingEngine.calculate({ items: cart.items, promoCode: null })));
  } catch (err) {
    console.error('[CART PROMO REMOVE]', err);
    res.status(500).json({ error: 'Failed to remove promo' });
  }
});

router.post('/save', optionalAuth, (req, res) => {
  try {
    const cart = getCart(req);
    if (!cart) return res.status(400).json({ error: 'User or session required' });
    res.json({ ...cartResponse(cart, priceFor(cart)), saved: true });
  } catch (err) {
    console.error('[CART SAVE]', err);
    res.status(500).json({ error: 'Failed to save cart' });
  }
});

export default router;
