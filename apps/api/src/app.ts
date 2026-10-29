import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/auth';
import authRoutes from './routes/auth';
import accessRequestRoutes from './routes/accessRequests';
import bookingRoutes from './routes/booking';
import adminRoutes from './routes/admin';
import platformAdminRoutes from './routes/platformAdmin';
import accessRoutes from './routes/access';
import storeAdminRoutes from './routes/storeAdmin';
import discoveryRoutes from './routes/discovery';
import customerRoutes from './routes/customer';

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
  app.use('/api/customer', customerRoutes);
  app.use('/api/store/admin', storeAdminRoutes);
  app.use('/api/platform-admin', platformAdminRoutes);
  app.use('/api/owner', platformAdminRoutes); // Compatibility for existing clients.
  app.use('/api/access', accessRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/access-requests', accessRequestRoutes);
  app.use('/api', discoveryRoutes);
  app.use('/api', bookingRoutes);
  app.use('/api/admin', adminRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

const app = createApp();
export default app;

