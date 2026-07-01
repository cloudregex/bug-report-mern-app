import { sequelize } from './models/index.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

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
import rateLimiter from './middleware/rateLimiter.js';

import { initSocket } from './socket.js';
import { seedAdminUser, seedSuperAdmin } from './controllers/authController.js';
import { seedPlans, ensureAllCompanySubscriptions } from './services/subscriptionService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

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
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Apply rate limiting globally to all API routes
app.use('/api', rateLimiter);

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

app.get('/', (req, res) => {
  res.json({ message: 'Bug Tracking System API is running.' });
});

const httpServer = http.createServer(app);
initSocket(httpServer);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to MySQL database successfully.');

    await sequelize.sync();
    console.log('Database schema synchronized.');

    await seedAdminUser();
    await seedPlans();
    await ensureAllCompanySubscriptions();
    await seedSuperAdmin();

    httpServer.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT} (HTTP + Socket.IO)`);
    });
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully...');
  httpServer.close(async () => {
    console.log('HTTP server closed.');
    await sequelize.close();
    console.log('MySQL connection closed.');
    process.exit(0);
  });
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Is another server instance running?`);
  } else {
    console.error('HTTP server error:', err);
  }
  process.exit(1);
});
