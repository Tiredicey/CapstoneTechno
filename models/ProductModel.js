import { Database } from '../database/Database.js';
import { v4 as uuid } from 'uuid';

export class ProductModel {
  static getAll({ category, search, limit = 20, offset = 0, tags } = {}) {
    let sql = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];
    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (tags) {
      sql += ' AND tags LIKE ?';
      params.push(`%${tags}%`);
    }
    sql += ' ORDER BY rating DESC, review_count DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    return Database.all(sql, params).map(ProductModel.parse);
  }

  static getById(id) {
    const p = Database.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [id]);
    return p ? ProductModel.parse(p) : null;
  }

  static getByCategory(category, limit = 8) {
    return Database.all(
      'SELECT * FROM products WHERE category = ? AND is_active = 1 LIMIT ?',
      [category, limit]
    ).map(ProductModel.parse);
  }

  static create(data) {
    const id = uuid();
    Database.run(
      `INSERT INTO products
        (id, name, category, subcategory, description, base_price, images, tags, inventory, lead_time_days, customizable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.name, data.category, data.subcategory || null, data.description,
        data.base_price, JSON.stringify(data.images || []), JSON.stringify(data.tags || []),
        data.inventory || 100, data.lead_time_days || 2, data.customizable ? 1 : 0
      ]
    );
    return ProductModel.getById(id);
  }

  static update(id, data) {
    const allowed = ['name', 'description', 'base_price', 'inventory', 'is_active', 'category'];
    const updates = Object.entries(data).filter(([k]) => allowed.includes(k));
    if (!updates.length) return ProductModel.getById(id);
    const sql = `UPDATE products SET ${updates.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`;
    Database.run(sql, [...updates.map(([, v]) => v), id]);
    return ProductModel.getById(id);
  }

  static updateRating(id) {
    const result = Database.get(
      'SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE product_id = ?',
      [id]
    );
    Database.run(
      'UPDATE products SET rating = ?, review_count = ? WHERE id = ?',
      [Math.round((result.avg || 0) * 10) / 10, result.cnt, id]
    );
  }

  static decrementInventory(id, qty = 1) {
    Database.run(
      'UPDATE products SET inventory = MAX(0, inventory - ?) WHERE id = ?',
      [qty, id]
    );
  }

  static parse(p) {
    return {
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : (p.images || []),
      tags: typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : (p.tags || []),
      customizable: !!p.customizable
    };
  }
}