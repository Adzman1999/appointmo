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

// 2. Redeem 15-Minute Access Code (Atomic, Concurrency-Safe)
router.post('/verify-code', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { email, code } = req.body;
    if (!email || !code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Please provide both your email address and access code.' });
    }

    const emailNorm = email.toLowerCase().trim();
    const cleanCode = code.replace(/\s+/g, '').trim();
    const codeHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

    await client.query('BEGIN');

    // 1. Fetch eligible request and invitation
    const invRes = await client.query(`
      SELECT i.id, i.request_id, i.token_hash, i.expires_at, i.used_at, i.is_revoked,
             i.attempt_count, i.max_attempts, r.email, r.full_name, r.status
      FROM demo_invitations i
      JOIN demo_access_requests r ON i.request_id = r.id
      WHERE r.email = $1 AND i.is_revoked = false
      ORDER BY i.created_at DESC
      LIMIT 1
      FOR UPDATE OF i
    `, [emailNorm]);

    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No active access code found for this email address.' });
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
      return res.status(400).json({ error: 'This access code has already been used. Please request a new code.' });
    }

    // Check expiration (15 minutes)
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This access code has expired. Please ask the owner to resend access.' });
    }

    // Check attempt lockout
    if (inv.attempt_count >= inv.max_attempts) {
      await client.query('ROLLBACK');
      return res.status(429).json({ error: 'Too many incorrect attempts. Please ask the owner to resend a fresh code.' });
    }

    // Timing-safe comparison of code hashes
    const expectedHashBuf = Buffer.from(inv.token_hash, 'utf8');
    const providedHashBuf = Buffer.from(codeHash, 'utf8');
    const isMatch = expectedHashBuf.length === providedHashBuf.length && crypto.timingSafeEqual(expectedHashBuf, providedHashBuf);

    if (!isMatch) {
      const remaining = inv.max_attempts - (inv.attempt_count + 1);
      await client.query('UPDATE demo_invitations SET attempt_count = attempt_count + 1 WHERE id = $1', [inv.id]);
      await client.query('COMMIT');
      return res.status(400).json({
        error: `Incorrect access code. ${remaining > 0 ? remaining + ' attempt(s) remaining.' : 'Code locked.'}`,
      });
    }

    // 2. Mark code as used atomically
    await client.query(`
      UPDATE demo_invitations 
      SET used_at = NOW(), redeemed_at = NOW() 
      WHERE id = $1
    `, [inv.id]);

    // 3. Issue a long-lived authenticated visitor session (24 hours)
    const sessionId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create signed JWT containing session pointer
    const jwtToken = jwt.sign(
      {
        userId: inv.request_id,
        sessionId,
        sessionToken,
        email: emailNorm,
        name: inv.full_name,
        role: 'demo_guest',
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    const jwtTokenHash = crypto.createHash('sha256').update(jwtToken).digest('hex');

    await client.query(`
      INSERT INTO demo_sessions (id, request_id, session_token_hash, email, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [sessionId, inv.request_id, jwtTokenHash, emailNorm, sessionExpiresAt]);

    // Audit log
    await client.query(`
      INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id)
      VALUES ('customer', $1, 'passcode_redeemed', 'demo_sessions', $2)
    `, [inv.request_id, inv.id]);

    await client.query('COMMIT');

    res.json({
      message: 'Access verified! Welcome to Appointmo.',
      token: jwtToken,
      sessionToken,
      user: {
        email: emailNorm,
        name: inv.full_name,
        role: 'demo_guest',
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
