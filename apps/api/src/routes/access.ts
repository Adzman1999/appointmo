import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
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

// 2. Redeem Access Code (Direct code lookup without email requirement + demo master code support)
router.post('/verify-code', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { email, code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Please enter your access code.' });
    }

    const cleanCode = code.replace(/\s+/g, '').trim().toUpperCase();

    // Check for convenient instant showcase code (e.g. APPOINTMO-DEMO)
    if (cleanCode === 'APPOINTMO-DEMO' || cleanCode === 'DEMO2026') {
      const demoToken = jwt.sign(
        {
          userId: 'demo_guest_readonly',
          email: 'guest@appointmo.demo',
          name: 'Demo Visitor',
          role: 'demo_guest',
          isReadOnly: true,
        },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Access granted! Welcome to the read-only interactive demo.',
        token: demoToken,
        user: {
          email: 'guest@appointmo.demo',
          name: 'Demo Visitor',
          role: 'demo_guest',
          isReadOnly: true,
        },
      });
    }

    const codeHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

    await client.query('BEGIN');

    // 1. Fetch eligible invitation by codeHash or email
    let invQuery = `
      SELECT i.id, i.request_id, i.token_hash, i.expires_at, i.used_at, i.is_revoked,
             i.attempt_count, i.max_attempts, r.email, r.full_name, r.status
      FROM demo_invitations i
      JOIN demo_access_requests r ON i.request_id = r.id
      WHERE i.is_revoked = false
    `;
    const params: any[] = [];

    if (email && typeof email === 'string' && email.trim()) {
      params.push(email.toLowerCase().trim());
      invQuery += ` AND r.email = $${params.length}`;
    } else {
      params.push(codeHash);
      invQuery += ` AND i.token_hash = $${params.length}`;
    }

    invQuery += ' ORDER BY i.created_at DESC LIMIT 1 FOR UPDATE OF i';

    const invRes = await client.query(invQuery, params);

    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid access code. Please check and try again.' });
    }

    const inv = invRes.rows[0];

    // Check revocation
    if (inv.is_revoked || inv.status === 'revoked') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'This access invitation has been revoked.' });
    }

    // Check single-use
    if (inv.used_at) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This access code has already been used.' });
    }

    // Check expiration (extended to 24 hours for convenience)
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This access code has expired.' });
    }

    // Timing-safe comparison if found via email
    if (params.length > 0 && params[0] !== codeHash) {
      const expectedHashBuf = Buffer.from(inv.token_hash, 'utf8');
      const providedHashBuf = Buffer.from(codeHash, 'utf8');
      const isMatch = expectedHashBuf.length === providedHashBuf.length && crypto.timingSafeEqual(expectedHashBuf, providedHashBuf);

      if (!isMatch) {
        await client.query('UPDATE demo_invitations SET attempt_count = attempt_count + 1 WHERE id = $1', [inv.id]);
        await client.query('COMMIT');
        return res.status(400).json({ error: 'Incorrect access code.' });
      }
    }

    // 2. Mark code as used
    await client.query(`
      UPDATE demo_invitations 
      SET used_at = NOW(), redeemed_at = NOW() 
      WHERE id = $1
    `, [inv.id]);

    // 3. Issue read-only authenticated visitor session (7 days)
    const sessionId = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const jwtToken = jwt.sign(
      {
        userId: inv.request_id,
        sessionId,
        email: inv.email,
        name: inv.full_name,
        role: 'demo_guest',
        isReadOnly: true,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const jwtTokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');

    await client.query(`
      INSERT INTO demo_sessions (id, request_id, session_token_hash, email, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [sessionId, inv.request_id, jwtTokenHash, inv.email, sessionExpiresAt]);

    await client.query('COMMIT');

    res.json({
      message: 'Access verified! Enjoy exploring the interactive demo.',
      token: jwtToken,
      user: {
        email: inv.email,
        name: inv.full_name,
        role: 'demo_guest',
        isReadOnly: true,
      },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Verify code error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  } finally {
    client.release();
  }
});

// 3. Session Status Check Endpoint
router.get('/session', authenticateDemoSession, async (req: Request, res: Response) => {
  res.json({
    active: true,
    user: req.user,
  });
});

export default router;
