import { Database } from '../database/Database.js';
import { v4 as uuid } from 'uuid';

export class OrderModel {
  static create(data) {
    const id = uuid();
    const qr = `BLOOM-${id.substring(0, 8).toUpperCase()}`;
    Database.run(
      `INSERT INTO orders
        (id, user_id, session_id, items, recipient, delivery_date, delivery_slot,
         recurring, pricing, payment_method, qr_code, special_instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.userId || null, data.sessionId || null,
        JSON.stringify(data.items), JSON.stringify(data.recipient),
        data.deliveryDate, data.deliverySlot,
        data.recurring ? JSON.stringify(data.recurring) : null,
        JSON.stringify(data.pricing), data.paymentMethod || null,
        qr, data.specialInstructions || null
      ]
    );
    return OrderModel.getById(id);
  }

  static getById(id) {
    const o = Database.get('SELECT * FROM orders WHERE id = ?', [id]);
    return o ? OrderModel.parse(o) : null;
  }

  static getByUser(userId, limit = 20) {
    return Database.all(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    ).map(OrderModel.parse);
  }

  static getAll({ status, limit = 50, offset = 0 } = {}) {
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    return Database.all(sql, params).map(OrderModel.parse);
  }

  static updateStatus(id, status) {
    const row = Database.get('SELECT tracking_steps FROM orders WHERE id = ?', [id]);
    const steps = JSON.parse(row?.tracking_steps || '[]');
    steps.push({ status, timestamp: Date.now() });
    Database.run(
      'UPDATE orders SET status = ?, tracking_steps = ?, updated_at = unixepoch() WHERE id = ?',
      [status, JSON.stringify(steps), id]
    );
    return OrderModel.getById(id);
  }

  static updatePayment(id, paymentStatus) {
    Database.run(
      'UPDATE orders SET payment_status = ?, updated_at = unixepoch() WHERE id = ?',
      [paymentStatus, id]
    );
  }

  static assignFlorist(id, floristId) {
    Database.run(
      'UPDATE orders SET florist_id = ?, updated_at = unixepoch() WHERE id = ?',
      [floristId, id]
    );
  }

  static parse(o) {
    if (!o) return null;
    return {
      ...o,
      items: typeof o.items === 'string' ? JSON.parse(o.items || '[]') : o.items,
      recipient: typeof o.recipient === 'string' ? JSON.parse(o.recipient || '{}') : o.recipient,
      pricing: typeof o.pricing === 'string' ? JSON.parse(o.pricing || '{}') : o.pricing,
      trackingSteps: typeof o.tracking_steps === 'string' ? JSON.parse(o.tracking_steps || '[]') : (o.tracking_steps || [])
    };
  }
}