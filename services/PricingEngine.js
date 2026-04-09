import { Database } from '../database/Database.js';

export class PricingEngine {
  static FREE_SHIPPING_THRESHOLD = 4350;
  static SHIPPING_BASE           = 560;
  static TAX_RATE                = 0.12;
  static CUSTOMIZATION_FEE       = 280;
  static LOYALTY_RATIO           = 0.01;

  static calculate({
    items = [],
    promoCode = null,
    loyaltyPointsUsed = 0,
    hasCustomization = false
  }) {
    const subtotal = items.reduce((sum, item) => {
      return sum + (Number(item.price || 0) * (Number(item.qty) || 1));
    }, 0);

    const customizationFee = hasCustomization
      ? PricingEngine.CUSTOMIZATION_FEE * items.filter(i => i.customized).length
      : 0;

    let deliveryFee   = subtotal >= PricingEngine.FREE_SHIPPING_THRESHOLD
      ? 0
      : PricingEngine.SHIPPING_BASE;
    let promoDiscount = 0;
    let promoLabel    = '';

    if (promoCode) {
      try {
        const promo = Database.get(
          `SELECT * FROM promo_codes
           WHERE code = ? AND is_active = 1
           AND (max_uses IS NULL OR used_count < max_uses)`,
          [promoCode.toUpperCase()]
        );
        if (promo) {
          const minOrder = Number(promo.min_order_amount || promo.min_order || 0);
          const notExpired = !promo.expires_at ||
            Number(promo.expires_at) > Math.floor(Date.now() / 1000);
          const discountType = promo.discount_type || promo.type;

          if (notExpired && subtotal >= minOrder) {
            if (discountType === 'percent') {
              promoDiscount = (subtotal * Number(promo.value)) / 100;
              promoLabel    = `${promo.value}% off`;
            } else if (discountType === 'shipping') {
              deliveryFee = 0;
              promoLabel  = 'Free shipping';
            } else if (discountType === 'fixed' || discountType === 'flat') {
              promoDiscount = Number(promo.value);
              promoLabel    = `₱${Number(promo.value).toLocaleString('en-PH')} off`;
            }
          }
        }
      } catch (err) {
        console.warn('[PricingEngine] promo lookup error:', err.message);
      }
    }

    const loyaltyDiscount = Math.min(
      Number(loyaltyPointsUsed) * PricingEngine.LOYALTY_RATIO,
      subtotal * 0.1
    );

    const taxableAmount = Math.max(
      0,
      subtotal + customizationFee - promoDiscount - loyaltyDiscount
    );
    const tax        = taxableAmount * PricingEngine.TAX_RATE;
    const finalTotal = Math.max(0, taxableAmount + deliveryFee + tax);

    const r = (n) => Math.round(Number(n) * 100) / 100;

    return {
      subtotal:              r(subtotal),
      customizationFee:      r(customizationFee),
      deliveryFee:           r(deliveryFee),
      promoDiscount:         r(promoDiscount),
      loyaltyDiscount:       r(loyaltyDiscount),
      promoLabel,
      tax:                   r(tax),
      finalTotal:            r(finalTotal),
      freeShippingThreshold: PricingEngine.FREE_SHIPPING_THRESHOLD,
      amountToFreeShipping:  r(Math.max(0, PricingEngine.FREE_SHIPPING_THRESHOLD - subtotal))
    };
  }

  static validatePromo(code, orderTotal) {
    if (!code) return { valid: false, error: 'No code provided' };
    let promo;
    try {
      promo = Database.get(
        `SELECT * FROM promo_codes WHERE code = ? AND is_active = 1`,
        [code.toUpperCase()]
      );
    } catch (err) {
      console.error('[PricingEngine] validatePromo error:', err.message);
      return { valid: false, error: 'Could not validate promo code' };
    }
    if (!promo) return { valid: false, error: 'Invalid promo code' };
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return { valid: false, error: 'Promo code usage limit reached' };
    }
    if (promo.expires_at && Number(promo.expires_at) < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Promo code has expired' };
    }
    const minOrder = Number(promo.min_order_amount || promo.min_order || 0);
    if (orderTotal < minOrder) {
      return {
        valid: false,
        error: `Minimum order of ₱${minOrder.toLocaleString('en-PH')} required`
      };
    }
    return { valid: true, promo, discount: promo.value };
  }

  static redeemPromo(code) {
    try {
      Database.run(
        'UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?',
        [code.toUpperCase()]
      );
    } catch (err) {
      console.error('[PricingEngine] redeemPromo error:', err.message);
    }
  }
}