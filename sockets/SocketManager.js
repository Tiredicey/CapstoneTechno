export class SocketManager {
  static io = null;
  static adminSockets = new Set();

  static init(io) {
    SocketManager.io = io;

    io.on('connection', (socket) => {
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

      socket.on('join_admin', () => {
        socket.join('admin_room');
        SocketManager.adminSockets.add(socket.id);
      });

     
      socket.on('admin_updated_catalog', () => {
        io.emit('catalog_update', { timestamp: Date.now() });
      });

      socket.on('support_message', ({ ticketId, message, sender }) => {
        if (ticketId && message) {
          io.to(`ticket_${ticketId}`).emit('support_message', {
            sender:    sender || 'user',
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
      });
    });
  }

  static emitOrderUpdate(orderId, data) {
    if (!SocketManager.io) return;
    SocketManager.io.to(`order_${orderId}`).emit('order_update', {
      ...data,
      orderId,
      timestamp: Date.now()
    });
    SocketManager.io.to('admin_room').emit('order_update', {
      ...data,
      orderId,
      timestamp: Date.now()
    });
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
    SocketManager.io.to(`ticket_${ticketId}`).emit('support_message', {
      ...data,
      ticketId,
      timestamp: Date.now()
    });
    SocketManager.io.to('admin_room').emit('support_message', {
      ...data,
      ticketId,
      timestamp: Date.now()
    });
  }

  static broadcast(event, data) {
    if (!SocketManager.io) return;
    SocketManager.io.emit(event, { ...data, timestamp: Date.now() });
  }
}