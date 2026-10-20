import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/auth';
import authRoutes from './routes/auth';
import demoAccessRoutes from './routes/demoAccess';
import bookingRoutes from './routes/booking';
import adminRoutes from './routes/admin';
import ownerRoutes from './routes/owner';
import accessRoutes from './routes/access';
import demoAdminRoutes from './routes/demoAdmin';
import { runMigrations } from './db/migrate';

// Automatically ensure database schema is up-to-date on cold-start (non-blocking)
if (config.env !== 'test') {
  runMigrations()
    .then(() => console.log('✅ Server auto-migration initialized'))
    .catch((err) => console.error('⚠️ Server auto-migration warning:', err.message));
}

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  if (config.env !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'Appointmo API',
      timestamp: new Date().toISOString(),
      environment: config.env,
    });
  });

  // API Routes
  app.use('/api/demo/admin', demoAdminRoutes);
  app.use('/api/owner', ownerRoutes);
  app.use('/api/access', accessRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/demo-access', demoAccessRoutes);
  app.use('/api', bookingRoutes);
  app.use('/api/admin', adminRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

const app = createApp();
export default app;

