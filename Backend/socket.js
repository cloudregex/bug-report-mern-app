import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bug_tracker_super_secret_jwt_key_2026';

// Module-level variable — Node.js caches this module, so `io` is shared everywhere
let io = null;

/**
 * Called ONCE in server.js after the HTTP server is created.
 * Sets up authentication middleware and connection handlers.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174'
      ],
      credentials: true
    }
  });

  // ── Authentication Middleware ──────────────────────────────────────────────
  // Every socket connection must provide a valid JWT in the handshake.
  // This mirrors the HTTP authenticateToken middleware.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Unauthorized: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;       // stored on socket for use below
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      return next(new Error('Unauthorized: Invalid or expired token'));
    }
  });

  // ── Connection Handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    // ✅ User joins their private room immediately on connect.
    // All notifications are sent to this room: io.to(userId).emit(...)
    socket.join(socket.userId);
    console.log(`[Socket] User ${socket.userId} connected (${socket.id})`);

    // ── Ticket Room (for live ticket page updates) ─────────────────────────
    // Frontend emits this when a user opens a ticket detail page.
    socket.on('join:ticket', (ticketId) => {
      if (ticketId) {
        socket.join(`ticket:${ticketId}`);
        console.log(`[Socket] User ${socket.userId} joined ticket room: ticket:${ticketId}`);
      }
    });

    // Frontend emits this when a user leaves a ticket detail page.
    socket.on('leave:ticket', (ticketId) => {
      if (ticketId) {
        socket.leave(`ticket:${ticketId}`);
        console.log(`[Socket] User ${socket.userId} left ticket room: ticket:${ticketId}`);
      }
    });

    socket.on('join:company', (companyId) => {
      if (companyId) {
        socket.join(`company:${companyId}`);
        console.log(`[Socket] User ${socket.userId} joined company room: company:${companyId}`);
      }
    });

    socket.on('join:project', (projectId) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
        console.log(`[Socket] User ${socket.userId} joined project room: project:${projectId}`);
      }
    });

    socket.on('leave:project', (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User ${socket.userId} disconnected: ${reason}`);
    });
  });

  return io;
};

/**
 * Used by controllers and services to emit events.
 * Returns the same `io` instance every time (singleton via module cache).
 * 
 * Example:
 *   getIO().to(userId).emit('notification:new', notification)
 *   getIO().to('ticket:' + ticketId).emit('ticket:updated', ticket)
 */
export const getIO = () => {
  if (!io) {
    // This should never happen — initSocket() runs before any routes are registered.
    throw new Error('[Socket] Socket.IO is not initialized. Call initSocket() first.');
  }
  return io;
};
