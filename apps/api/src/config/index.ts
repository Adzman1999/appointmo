import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://mhanabdulsamad@localhost:5432/appointmo_dev',
  jwtSecret: process.env.JWT_SECRET || 'appointmo_super_secret_jwt_key_for_dev_only_32_chars',
  adminPassword: process.env.PLATFORM_ADMIN_PASSWORD || 'AppointmoAdmin2026!',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
};
