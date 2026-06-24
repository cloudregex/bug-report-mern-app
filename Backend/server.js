import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Route imports
import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import attachmentRoutes from './routes/attachmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import mentionRoutes from './routes/mentionRoutes.js';
import savedFilterRoutes from './routes/savedFilterRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import securityRoutes from './routes/securityRoutes.js';

// Socket.IO singleton
import { initSocket } from './socket.js';

import { seedAdminUser, seedSuperAdmin } from './controllers/authController.js';
import { seedPlans, ensureAllCompanySubscriptions } from './services/subscriptionService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bug-tracker';

app.set('trust proxy', 1);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174'
  ],
  credentials: true
}));
app.use(express.json());

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── REST Routes ───────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api', commentRoutes);
app.use('/api', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/mentions', mentionRoutes);
app.use('/api/saved-filters', savedFilterRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/security', securityRoutes);

// Root health check
app.get('/', (req, res) => {
  res.json({ message: 'Bug Tracking System API is running.' });
});

// ── HTTP Server (wraps Express for Socket.IO) ─────────────────────────────────
// We upgrade from app.listen() to http.createServer() so Socket.IO
// can attach to the same port as the REST API.
const httpServer = http.createServer(app);

// ── Socket.IO Init ────────────────────────────────────────────────────────────
// initSocket() sets up the singleton io instance.
// All controllers call getIO() after this to emit events.
initSocket(httpServer);

// ── Database Connection & Startup ─────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB local database successfully.');

    // Seed default admin
    await seedAdminUser();
    await seedPlans();
    await ensureAllCompanySubscriptions();
    await seedSuperAdmin();

    httpServer.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT} (HTTP + Socket.IO)`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
// Closes all socket connections cleanly before process exits.
// Important for production deployments (Docker, PM2, Railway).
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

// Handle listen errors (e.g. EADDRINUSE) cleanly
httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Is another server instance running?`);
  } else {
    console.error('HTTP server error:', err);
  }
  process.exit(1);
});
