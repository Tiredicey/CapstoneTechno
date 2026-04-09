import { Database } from '../database/Database.js';
import { v4 as uuid } from 'uuid';

export class SupportModel {
  static create({ userId, orderId, channel = 'chat', subject, firstMessage }) {
    const id = uuid();
    const messages = JSON.stringify([{
      sender:    userId ? 'user' : 'guest',
      message:   firstMessage,
      timestamp: Date.now()
    }]);
    Database.run(
      `INSERT INTO support_tickets
        (id, user_id, order_id, channel, subject, messages)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId || null, orderId || null, channel, subject, messages]
    );
    return SupportModel.getById(id);
  }

  static getById(id) {
    const t = Database.get('SELECT * FROM support_tickets WHERE id = ?', [id]);
    return t ? SupportModel.parse(t) : null;
  }

  static getByUser(userId) {
    return Database.all(
      'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    ).map(SupportModel.parse);
  }

  static getAll({ status } = {}) {
    let sql    = 'SELECT * FROM support_tickets';
    const params = [];
    if (status) { sql += ' WHERE status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    return Database.all(sql, params).map(SupportModel.parse);
  }

  static addMessage(id, sender, message) {
    const ticket = Database.get('SELECT * FROM support_tickets WHERE id = ?', [id]);
    if (!ticket) throw new Error('Ticket not found');
    const messages = JSON.parse(ticket.messages || '[]');
    messages.push({ sender, message, timestamp: Date.now() });
    Database.run(
      'UPDATE support_tickets SET messages = ?, updated_at = unixepoch() WHERE id = ?',
      [JSON.stringify(messages), id]
    );
    return SupportModel.getById(id);
  }

  static resolve(id, csatScore, npsScore) {
    Database.run(
      `UPDATE support_tickets
       SET status = 'resolved', csat_score = ?, nps_score = ?, updated_at = unixepoch()
       WHERE id = ?`,
      [csatScore || null, npsScore || null, id]
    );
  }

  static generateDiscount(ticketId) {
    const code = `SUPPORT-${ticketId.slice(0, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const id   = uuid();
    Database.run(
      `INSERT INTO promo_codes
        (id, code, discount_type, type, value, min_order_amount, min_order, max_uses, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, code, 'percent', 'percent', 10, 0, 0, 1]
    );
    return code;
  }

  static parse(t) {
    if (!t) return null;
    return {
      ...t,
      messages: typeof t.messages === 'string'
        ? JSON.parse(t.messages || '[]')
        : (t.messages || [])
    };
  }
}