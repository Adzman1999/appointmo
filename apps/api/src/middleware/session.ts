import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { config } from '../config';
import { AuthUser } from './auth';

/**
 * Verifies demo guest sessions against PostgreSQL `demo_sessions` table
 * This ensures owner-initiated revocation takes effect immediately.
 */
export const authenticateDemoSession = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Valid invitation access required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Check database session record if it's a demo guest session
    if (decoded.role === 'demo_guest') {
      const sessionRes = await query(`
        SELECT s.id, s.revoked_at, s.expires_at, r.status AS request_status
        FROM demo_sessions s
        JOIN demo_access_requests r ON s.request_id = r.id
        WHERE s.session_token_hash = $1
      `, [tokenHash]);

      if (sessionRes.rows.length === 0) {
        return res.status(401).json({ error: 'Session not recognized or expired' });
      }

      const session = sessionRes.rows[0];
      if (session.revoked_at || session.request_status === 'revoked') {
        return res.status(403).json({ error: 'Access has been revoked' });
      }

      if (new Date(session.expires_at).getTime() < Date.now()) {
        return res.status(401).json({ error: 'Access session has expired' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
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
