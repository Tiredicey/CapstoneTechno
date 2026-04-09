import { Database } from '../database/Database.js';

function parseProduct(p) {
  if (!p) return null;
  return {
    ...p,
    images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []),
    tags: typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : (p.tags || []),
    basePrice: p.base_price,
    reviewCount: p.review_count,
    customizable: !!p.customizable
  };
}

export const resolvers = {
  Query: {
    products: (_, { category, search, limit = 20, offset = 0 }) => {
      try {
        let sql = 'SELECT * FROM products WHERE is_active = 1';
        const params = [];
        if (category && category !== 'all') { sql += ' AND category = ?'; params.push(category); }
        if (search) {
          sql += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)';
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        sql += ' ORDER BY rating DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        return Database.all(sql, params).map(parseProduct);
      } catch { return []; }
    },

    product: (_, { id }) => {
      try {
        return parseProduct(Database.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [id]));
      } catch { return null; }
    },

    orders: (_, { status, limit = 50 }) => {
      try {
        let sql = 'SELECT * FROM orders';
        const params = [];
        if (status) { sql += ' WHERE status = ?'; params.push(status); }
        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        return Database.all(sql, params).map(o => ({ ...o, createdAt: String(o.created_at) }));
      } catch { return []; }
    },

    analytics: () => {
      try {
        const total = Database.get(
          'SELECT COUNT(*) as c, SUM(json_extract(pricing, "$.finalTotal")) as rev FROM orders WHERE payment_status = "paid"'
        );
        const avg = Database.get(
          'SELECT AVG(json_extract(pricing, "$.finalTotal")) as avg FROM orders WHERE payment_status = "paid"'
        );
        const events = Database.get(
          'SELECT COUNT(*) as visits FROM analytics_events WHERE event_type = "page_view"'
        );
        const conversions = Database.get(
          'SELECT COUNT(*) as c FROM analytics_events WHERE event_type = "order_complete"'
        );
        const visits = events?.visits || 0;
        return {
          totalOrders: total?.c || 0,
          totalRevenue: total?.rev || 0,
          avgOrderValue: avg?.avg || 0,
          conversionRate: visits > 0 ? ((conversions?.c || 0) / visits) * 100 : 0,
          topProducts: Database.all(
            'SELECT * FROM products WHERE is_active = 1 ORDER BY review_count DESC LIMIT 5'
          ).map(parseProduct)
        };
      } catch { return { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, conversionRate: 0, topProducts: [] }; }
    }
  },

  Mutation: {
    updateOrderStatus: (_, { id, status }) => {
      try {
        Database.run(
          'UPDATE orders SET status = ?, updated_at = unixepoch() WHERE id = ?',
          [status, id]
        );
        const o = Database.get('SELECT * FROM orders WHERE id = ?', [id]);
        return o ? { ...o, createdAt: String(o.created_at) } : null;
      } catch { return null; }
    },

    applyPromo: (_, { code, cartId }) => {
      try {
        const promo = Database.get('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1', [code]);
        if (!promo) return false;
        Database.run('UPDATE carts SET promo_code = ? WHERE id = ?', [code, cartId]);
        return true;
      } catch { return false; }
    }
  }
};