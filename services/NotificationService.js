import { Database } from '../database/Database.js';
import { v4 as uuid } from 'uuid';

export class NotificationService {
  static send(userId, type, title, body) {
    Database.run(
      'INSERT INTO notifications (id, user_id, type, title, body) VALUES (?, ?, ?, ?, ?)',
      [uuid(), userId, type, title, body]
    );
  }

  static orderConfirmed(userId, orderId, qrCode) {
    NotificationService.send(userId, 'order', '🌸 Order Confirmed!', `Your order ${qrCode} has been placed. We're preparing your blooms.`);
  }

  static orderShipped(userId, orderId) {
    NotificationService.send(userId, 'shipping', '🚚 Order On Its Way!', `Your order is out for delivery today. Track it live in your dashboard.`);
  }

  static orderDelivered(userId, orderId) {
    NotificationService.send(userId, 'delivery', '✅ Delivered!', `Your blooms have arrived. We hope they bring joy — leave a review to earn loyalty points!`);
  }

  static reEngagement(userId, occasion) {
    NotificationService.send(userId, 'promo', `🌷 ${occasion} is coming up!`, `Don't forget to pre-order for ${occasion}. Use BLOOM10 for 10% off.`);
  }

  static getUserNotifications(userId) {
    return Database.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [userId]);
  }

  static markRead(id, userId) {
    Database.run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
  }
}