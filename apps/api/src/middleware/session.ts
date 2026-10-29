import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthUser } from './auth';
import { SessionServiceError, verifyAccessSession } from '../services/sessionService';

/**
 * Verifies invited access sessions against PostgreSQL `access_sessions` table
 * This ensures owner-initiated revocation takes effect immediately.
 */
export const authenticateAccessSession = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Valid invitation access required' });
  }

  const token = authHeader.split(' ')[1];
  let decoded: any;

  try {
    decoded = jwt.verify(token, config.jwtSecret) as any;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  if (decoded.role !== 'access_guest') {
    return res.status(403).json({ error: 'Invited access session required' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  try {
    await verifyAccessSession(tokenHash);
  } catch (err) {
    if (err instanceof SessionServiceError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  req.user = decoded;
  return next();
};

/**
 * Strict owner-only authentication guard
 */
export const requireOwnerAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Owner authorization required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    if (decoded.role !== 'owner' && decoded.role !== 'platform_admin') {
      return res.status(403).json({ error: 'Forbidden: Owner privileges required' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired owner session' });
  }
};
