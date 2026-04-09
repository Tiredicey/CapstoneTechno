import { Database } from '../database/Database.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

export class UserModel {
  static create({ email, password, name, language = 'en' }) {
    const id   = uuid();
    const hash = bcrypt.hashSync(password, 10);
    Database.run(
      `INSERT INTO users (id, email, password_hash, name, language)
       VALUES (?, ?, ?, ?, ?)`,
      [id, email.toLowerCase().trim(), hash, name.trim(), language]
    );
    return Database.get(
      `SELECT id, email, name, role, loyalty_points, language FROM users WHERE id = ?`,
      [id]
    );
  }

  static findByEmail(email) {
    return Database.get(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
      [email.toLowerCase().trim()]
    );
  }

  static findById(id) {
    return Database.get(
      `SELECT id, email, name, role, loyalty_points, language,
              occasion_profile, phone, avatar, created_at
       FROM users WHERE id = ?`,
      [id]
    );
  }

  static updateProfile(id, fields) {
    const allowed = ['name', 'language', 'occasion_profile', 'phone', 'avatar'];
    const updates = [];
    const values  = [];

    for (const [k, v] of Object.entries(fields)) {
      if (k === 'password' && v) {
        updates.push('password_hash = ?');
        values.push(bcrypt.hashSync(v, 10));
      } else if (allowed.includes(k)) {
        updates.push(`${k} = ?`);
        values.push(typeof v === 'object' ? JSON.stringify(v) : v);
      }
    }

    if (!updates.length) return;
    updates.push('updated_at = unixepoch()');
    values.push(id);

    Database.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  static addLoyaltyPoints(id, points) {
    const n = Number(points);
    if (!n || n < 0) return;
    Database.run(
      'UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?',
      [n, id]
    );
  }

  static verifyPassword(plain, hash) {
    if (!plain || !hash) return false;
    return bcrypt.compareSync(plain, hash);
  }

  static getAll({ search, role, limit = 100, offset = 0 } = {}) {
    let sql = `SELECT id, name, email, role, phone, avatar,
                      loyalty_points, created_at
               FROM users WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    return Database.all(sql, params);
  }
}