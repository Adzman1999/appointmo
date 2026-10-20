import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, pool } from '../db';
import { config } from '../config';
import { DemoAccessRequestSchema } from '@appointmo/shared';
import { authenticateDemoSession } from '../middleware/session';

const router = Router();

// 1. Submit Access Request (Customer-Facing & Friendly)
router.post('/request', async (req: Request, res: Response) => {
  try {
    const parsed = DemoAccessRequestSchema.parse(req.body);
    const emailNorm = parsed.email.toLowerCase().trim();

    // Check duplicate pending requests
    const existing = await query('SELECT id, status FROM demo_access_requests WHERE email = $1', [emailNorm]);
    if (existing.rows.length > 0) {
      const currentStatus = existing.rows[0].status;
      if (currentStatus === 'pending') {
        return res.status(200).json({
          message: "Thanks for reaching out! We've received your request. You'll receive an email when your access is ready.",
          status: 'pending',
        });
      }
      if (currentStatus === 'approved') {
        return res.status(200).json({
          message: "Your access has already been approved! You can sign in using your email address.",
          status: 'approved',
        });
      }
      if (currentStatus === 'revoked' || currentStatus === 'rejected') {
        // Allow re-submitting after rejection/revocation
        await query(`
          UPDATE demo_access_requests 
          SET status = 'pending', full_name = $1, business_name = $2, message = $3, requested_at = NOW(), updated_at = NOW()
          WHERE email = $4
        `, [parsed.fullName, parsed.businessName, parsed.message, emailNorm]);

        return res.status(201).json({
          message: "Thanks for reaching out! We've received your request. You'll receive an email when your access is ready.",
          status: 'pending',
        });
      }
    }

    await query(`
      INSERT INTO demo_access_requests (full_name, email, business_name, message, status)
      VALUES ($1, $2, $3, $4, 'pending')
    `, [parsed.fullName, emailNorm, parsed.businessName, parsed.message]);

    return res.status(201).json({
      message: "Thanks for reaching out! We've received your request. You'll receive an email when your access is ready.",
      status: 'pending',
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Please check the information you entered', details: err.errors });
    }
    return res.status(500).json({ error: 'Unable to submit your request. Please try again shortly.' });
  }
});

// 2. Set Up Password via Single-Use Setup Token
router.post('/setup-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid, unexpired, unused token
    const tokenRes = await query(`
      SELECT t.id, t.user_id, t.expires_at, t.used_at, u.email, u.name, u.role, u.business_id
      FROM user_setup_tokens t
      JOIN users u ON t.user_id = u.id
      WHERE t.token_hash = $1
    `, [tokenHash]);

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired setup link' });
    }

    const row = tokenRes.rows[0];
    if (row.used_at) {
      return res.status(400).json({ error: 'This setup link has already been used. Please sign in with your password.' });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This setup link has expired. Please contact support or request access again.' });
    }

    // Verify user is still approved in demo_access_requests
    const reqRes = await query('SELECT id, status FROM demo_access_requests WHERE LOWER(email) = LOWER($1)', [row.email]);
    if (reqRes.rows.length > 0 && reqRes.rows[0].status === 'revoked') {
      return res.status(403).json({ error: 'Access for this account has been revoked.' });
    }

    // Hash password and update user
    const passwordHash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, row.user_id]);

    // Mark token as used
    await query('UPDATE user_setup_tokens SET used_at = NOW() WHERE id = $1', [row.id]);

    // Generate authenticated session for immediate smooth entry
    const sessionToken = jwt.sign(
      {
        userId: row.user_id,
        email: row.email,
        name: row.name,
        role: row.role || 'demo_guest',
        businessId: row.business_id,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const sessionHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const requestId = reqRes.rows[0]?.id;
    if (requestId) {
      await query(`
        INSERT INTO demo_sessions (request_id, session_token_hash, email, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [requestId, sessionHash, row.email, expiresAt]);
    }

    res.json({
      message: 'Password set successfully! Welcome to Appointmo.',
      token: sessionToken,
      user: {
        id: row.user_id,
        email: row.email,
        name: row.name,
        role: row.role || 'demo_guest',
      },
    });
  } catch (err: any) {
    console.error('Setup password error:', err);
    res.status(500).json({ error: 'Failed to set up password' });
  }
});

// 3. Demo User Login (Email & Password with Strict Backend Approval Check)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailNorm = email.toLowerCase().trim();

    // 1. Verify User exists
    const userRes = await query('SELECT id, business_id, email, password_hash, role, name FROM users WHERE LOWER(email) = $1', [emailNorm]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];

    // 2. Verify Password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. If demo_guest, verify approval and lack of revocation in demo_access_requests
    let requestId: string | null = null;
    if (user.role === 'demo_guest') {
      const accessRes = await query('SELECT id, status FROM demo_access_requests WHERE LOWER(email) = $1', [emailNorm]);
      if (accessRes.rows.length === 0) {
        return res.status(403).json({ error: 'Access request has not been submitted or approved yet.' });
      }

      const reqStatus = accessRes.rows[0].status;
      if (reqStatus === 'pending') {
        return res.status(403).json({ error: 'Your access request is currently pending review.' });
      }
      if (reqStatus === 'rejected') {
        return res.status(403).json({ error: 'Your access request was not approved.' });
      }
      if (reqStatus === 'revoked') {
        return res.status(403).json({ error: 'Your access has been revoked by the administrator.' });
      }
      requestId = accessRes.rows[0].id;
    }

    // 4. Generate authenticated JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.business_id,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // 5. Track in demo_sessions for instant server-wide revocation capability
    if (requestId) {
      const sessionHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await query(`
        INSERT INTO demo_sessions (request_id, session_token_hash, email, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [requestId, sessionHash, user.email, expiresAt]);
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 4. Active Session Verification
router.get('/session', authenticateDemoSession, async (req: Request, res: Response) => {
  res.json({
    active: true,
    user: req.user,
  });
});

export default router;
