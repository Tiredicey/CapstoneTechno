import { Database } from '../database/Database.js';

export class RecommendationEngine {
  static forUser(userId, limit = 4) {
    if (!userId) return RecommendationEngine.trending(limit);
    const history = Database.all(
      `SELECT json_extract(items.value, '$.productId') as pid
       FROM orders, json_each(orders.items) as items
       WHERE orders.user_id = ?
       ORDER BY orders.created_at DESC LIMIT 20`,
      [userId]
    ).map(r => r.pid).filter(Boolean);

    if (!history.length) return RecommendationEngine.trending(limit);

    const tagQuery = Database.all(
      `SELECT tags FROM products WHERE id IN (${history.slice(0, 5).map(() => '?').join(',')})`,
      history.slice(0, 5)
    );
    const allTags = [...new Set(tagQuery.flatMap(r => {
      try { return JSON.parse(r.tags || '[]'); } catch { return []; }
    }))];

    if (!allTags.length) return RecommendationEngine.trending(limit);

    const likeFragments = allTags.map(() => 'tags LIKE ?').join(' OR ');
    const likeParams = allTags.map(t => `%${t}%`);
    const placeholders = history.map(() => '?').join(',');
    return Database.all(
      `SELECT * FROM products WHERE is_active = 1 AND id NOT IN (${placeholders}) AND (${likeFragments})
       ORDER BY rating DESC LIMIT ?`,
      [...history, ...likeParams, limit]
    ).map(RecommendationEngine.parse);
  }

  static trending(limit = 4) {
    return Database.all(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY review_count DESC, rating DESC LIMIT ?',
      [limit]
    ).map(RecommendationEngine.parse);
  }

  static forOccasion(occasion, limit = 6) {
    return Database.all(
      'SELECT * FROM products WHERE is_active = 1 AND tags LIKE ? ORDER BY rating DESC LIMIT ?',
      [`%${occasion}%`, limit]
    ).map(RecommendationEngine.parse);
  }

  static similar(productId, limit = 4) {
    const product = Database.get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) return [];
    let tags = [];
    try { tags = JSON.parse(product.tags || '[]'); } catch { tags = []; }
    if (!tags.length) return RecommendationEngine.trending(limit);
    const likeFragments = tags.map(() => 'tags LIKE ?').join(' OR ');
    return Database.all(
      `SELECT * FROM products WHERE is_active = 1 AND id != ? AND (${likeFragments}) ORDER BY rating DESC LIMIT ?`,
      [productId, ...tags.map(t => `%${t}%`), limit]
    ).map(RecommendationEngine.parse);
  }

  static parse(p) {
    return {
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []),
      tags: typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : (p.tags || [])
    };
  }
}