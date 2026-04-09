import { Database } from '../database/Database.js';
import { v4 as uuid } from 'uuid';
import { ProductModel } from './ProductModel.js';

export class ReviewModel {
  static create({ productId, userId, orderId, rating, body, photos = [] }) {
    const id = uuid();
    const existing = Database.get('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?', [productId, userId]);
    if (existing) {
      Database.run('UPDATE reviews SET rating = ?, body = ?, photos = ? WHERE id = ?',
        [rating, body, JSON.stringify(photos), existing.id]);
    } else {
      Database.run(
        `INSERT INTO reviews (id, product_id, user_id, order_id, rating, body, photos, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, productId, userId, orderId || null, rating, body, JSON.stringify(photos), orderId ? 1 : 0]
      );
    }
    ProductModel.updateRating(productId);
    return ReviewModel.getByProduct(productId, 1)[0];
  }

  static getByProduct(productId, limit = 20, offset = 0) {
    return Database.all(
      `SELECT r.*, u.name as user_name FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    ).map(r => ({ ...r, photos: JSON.parse(r.photos || '[]') }));
  }

  static getSummary(productId) {
    const dist = Database.all(
      'SELECT rating, COUNT(*) as count FROM reviews WHERE product_id = ? GROUP BY rating',
      [productId]
    );
    const avg = Database.get('SELECT AVG(rating) as avg, COUNT(*) as total FROM reviews WHERE product_id = ?', [productId]);
    return { average: Math.round((avg?.avg || 0) * 10) / 10, total: avg?.total || 0, distribution: dist };
  }
}