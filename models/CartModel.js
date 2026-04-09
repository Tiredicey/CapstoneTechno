import { Database } from '../database/Database.js';
import { v4 as uuid } from 'uuid';

export class CartModel {
  static getOrCreate(userId, sessionId) {
    const key = userId ? 'user_id' : 'session_id';
    const val = userId || sessionId;
    if (!val) return null;

    try {
      let cart = Database.get(`SELECT * FROM carts WHERE ${key} = ? LIMIT 1`, [val]);
      if (!cart) {
        const id = uuid();
        Database.run(
          `INSERT INTO carts (id, ${key}, items, discount) VALUES (?, ?, ?, ?)`,
          [id, val, '[]', 0]
        );
        cart = Database.get('SELECT * FROM carts WHERE id = ?', [id]);
      }
      return CartModel.parse(cart);
    } catch (err) {
      console.error('[CartModel.getOrCreate]', err.message);
      return null;
    }
  }

  static addItem(cartId, item) {
    const cart = Database.get('SELECT * FROM carts WHERE id = ?', [cartId]);
    if (!cart) throw new Error('Cart not found');

    const items    = CartModel._parseItems(cart.items);
    const existing = items.find(
      i => i.productId === item.productId &&
           JSON.stringify(i.customization || null) === JSON.stringify(item.customization || null)
    );

    if (existing) {
      existing.qty = (existing.qty || 1) + (item.qty || 1);
    } else {
      items.push({
        lineId:        uuid(),
        productId:     item.productId,
        name:          item.name || 'Product',
        price:         Number(item.price) || 0,
        image:         item.image || item.image_url || '',
        qty:           Number(item.qty) || 1,
        customization: item.customization || null,
        customized:    Boolean(item.customization),
      });
    }

    Database.run(
      'UPDATE carts SET items = ?, updated_at = unixepoch() WHERE id = ?',
      [JSON.stringify(items), cartId]
    );

    return CartModel.parse(Database.get('SELECT * FROM carts WHERE id = ?', [cartId]));
  }

  static updateItem(cartId, lineId, qty) {
    const cart = Database.get('SELECT * FROM carts WHERE id = ?', [cartId]);
    if (!cart) throw new Error('Cart not found');

    let items = CartModel._parseItems(cart.items);

    if (Number(qty) <= 0) {
      items = items.filter(i => i.lineId !== lineId);
    } else {
      const item = items.find(i => i.lineId === lineId);
      if (item) item.qty = Number(qty);
    }

    Database.run(
      'UPDATE carts SET items = ?, updated_at = unixepoch() WHERE id = ?',
      [JSON.stringify(items), cartId]
    );

    return CartModel.parse(Database.get('SELECT * FROM carts WHERE id = ?', [cartId]));
  }

  static applyPromo(cartId, code, discount) {
    try {
      Database.run(
        'UPDATE carts SET promo_code = ?, discount = ?, updated_at = unixepoch() WHERE id = ?',
        [code || null, Number(discount) || 0, cartId]
      );
    } catch (err) {
      console.error('[CartModel.applyPromo]', err.message);
    }
  }

  static clearCart(cartId) {
    try {
      Database.run(
        'UPDATE carts SET items = ?, promo_code = NULL, discount = 0, updated_at = unixepoch() WHERE id = ?',
        ['[]', cartId]
      );
    } catch (err) {
      console.error('[CartModel.clearCart]', err.message);
    }
  }

  static mergeGuestCart(sessionId, userId) {
    try {
      const guestCart = Database.get('SELECT * FROM carts WHERE session_id = ?', [sessionId]);
      if (!guestCart) return 0;

      const guestItems = CartModel._parseItems(guestCart.items);
      if (!guestItems.length) return 0;

      const userCart = CartModel.getOrCreate(userId, null);
      if (!userCart) return 0;

      for (const item of guestItems) {
        CartModel.addItem(userCart.id, item);
      }

      Database.run('DELETE FROM carts WHERE session_id = ?', [sessionId]);
      return guestItems.length;
    } catch (err) {
      console.error('[CartModel.mergeGuestCart]', err.message);
      return 0;
    }
  }

  static getById(cartId) {
    try {
      const cart = Database.get('SELECT * FROM carts WHERE id = ?', [cartId]);
      return CartModel.parse(cart);
    } catch {
      return null;
    }
  }

  static _parseItems(raw) {
    try {
      const items = JSON.parse(raw || '[]');
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  static parse(c) {
    if (!c) return null;
    return {
      ...c,
      items:    CartModel._parseItems(c.items),
      discount: Number(c.discount) || 0,
    };
  }
}