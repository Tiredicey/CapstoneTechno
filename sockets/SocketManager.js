import jwt from 'jsonwebtoken';

export class SocketManager {
  static io = null;
  static adminSockets = new Set();
  static userSocketMap = new Map();

  static init(io) {
    SocketManager.io = io;

    io.on('connection', (socket) => {
      socket.on('join_user', (token) => {
        if (!token) return;
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded?.id) {
            socket.join(`user_${decoded.id}`);
            if (!SocketManager.userSocketMap.has(decoded.id)) {
              SocketManager.userSocketMap.set(decoded.id, new Set());
            }
            SocketManager.userSocketMap.get(decoded.id).add(socket.id);
            socket._userId = decoded.id;
          }
        } catch {}
      });

      socket.on('join_order', (orderId) => {
        if (orderId && typeof orderId === 'string') {
          socket.join(`order_${orderId}`);
        }
      });

      socket.on('join_support', (ticketId) => {
        if (ticketId && typeof ticketId === 'string') {
          socket.join(`ticket_${ticketId}`);
        }
      });

      socket.on('join_admin', (token) => {
        if (!token) return;
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded?.role === 'admin') {
            socket.join('admin_room');
            SocketManager.adminSockets.add(socket.id);
            socket._isAdmin = true;
          }
        } catch {}
      });

      socket.on('support_message', ({ ticketId, message, sender }) => {
        if (ticketId && message) {
          io.to(`ticket_${ticketId}`).emit('support_message', {
            sender: sender || 'user',
            message,
            timestamp: Date.now()
          });
        }
      });

      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      socket.on('disconnect', () => {
        SocketManager.adminSockets.delete(socket.id);
        if (socket._userId) {
          const set = SocketManager.userSocketMap.get(socket._userId);
          if (set) {
            set.delete(socket.id);
            if (set.size === 0) SocketManager.userSocketMap.delete(socket._userId);
          }
        }
      });
    });
  }

  static emitOrderUpdate(orderId, data) {
    if (!SocketManager.io) return;
    const payload = { ...data, orderId, timestamp: Date.now() };
    SocketManager.io.to(`order_${orderId}`).emit('order_update', payload);
    SocketManager.io.to('admin_room').emit('order_update', payload);
  }

  static emitNewOrder(orderData) {
    if (!SocketManager.io) return;
    SocketManager.io.to('admin_room').emit('new_order', {
      type: 'new_order',
      data: orderData,
      timestamp: Date.now()
    });
  }

  static emitSupportMessage(ticketId, data) {
    if (!SocketManager.io) return;
    const payload = { ...data, ticketId, timestamp: Date.now() };
    SocketManager.io.to(`ticket_${ticketId}`).emit('support_message', payload);
    SocketManager.io.to('admin_room').emit('support_message', payload);
  }

  static emitToUser(userId, event, data) {
    if (!SocketManager.io || !userId) return;
    SocketManager.io.to(`user_${userId}`).emit(event, {
      ...data,
      timestamp: Date.now()
    });
  }

  static emitCatalogUpdate(data = {}) {
    if (!SocketManager.io) return;
    SocketManager.io.emit('catalog_update', { ...data, timestamp: Date.now() });
  }

  static emitBannerUpdate(data = {}) {
    if (!SocketManager.io) return;
    SocketManager.io.emit('banner_update', { ...data, timestamp: Date.now() });
  }

  static emitPromoUpdate(data = {}) {
    if (!SocketManager.io) return;
    SocketManager.io.emit('promo_update', { ...data, timestamp: Date.now() });
  }

  static emitContentUpdate(data = {}) {
    if (!SocketManager.io) return;
    SocketManager.io.emit('content_update', { ...data, timestamp: Date.now() });
  }

  static emitNotificationToUser(userId, data) {
    if (!SocketManager.io || !userId) return;
    SocketManager.io.to(`user_${userId}`).emit('notification', {
      ...data,
      timestamp: Date.now()
    });
  }

  static emitBroadcastNotification(data) {
    if (!SocketManager.io) return;
    SocketManager.io.emit('notification', { ...data, timestamp: Date.now() });
  }

  static broadcast(event, data) {
    if (!SocketManager.io) return;
    SocketManager.io.emit(event, { ...data, timestamp: Date.now() });
  }
}
