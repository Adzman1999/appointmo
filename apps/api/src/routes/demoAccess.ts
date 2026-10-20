import { Router, Request, Response } from 'express';
import { query } from '../db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { DemoAccessRequestSchema } from '@appointmo/shared';

const router = Router();

// 1. Submit Demo Access Request (Public)
router.post('/requests', async (req: Request, res: Response) => {
  try {
    const parsed = DemoAccessRequestSchema.parse(req.body);
    const emailNorm = parsed.email.toLowerCase().trim();

    // Check if already requested
    const existing = await query('SELECT id, status FROM demo_access_requests WHERE email = $1', [emailNorm]);
    if (existing.rows.length > 0) {
      return res.status(200).json({
        message: 'A demo request for this email already exists and is currently: ' + existing.rows[0].status,
        status: existing.rows[0].status,
        requestId: existing.rows[0].id,
      });
    }

    const result = await query(`
      INSERT INTO demo_access_requests (full_name, email, business_name, message, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, full_name, email, status, created_at
    `, [parsed.fullName, emailNorm, parsed.businessName, parsed.message]);

    return res.status(201).json({
      message: 'Demo access request submitted successfully. It will be reviewed by the product owner.',
      request: result.rows[0],
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    return res.status(500).json({ error: 'Failed to submit demo access request' });
  }
});

// 2. Platform Admin: List Requests
router.get('/requests', authenticateJwt, requireRole(['platform_admin']), async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT r.id, r.full_name, r.email, r.business_name, r.message, r.status, r.approved_at, r.created_at,
             i.expires_at, i.redeemed_at, i.is_revoked, i.raw_token_hint
      FROM demo_access_requests r
      LEFT JOIN demo_invitations i ON r.id = i.request_id
    `;
    const params: any[] = [];
    if (status && typeof status === 'string') {
      sql += ' WHERE r.status = $1';
      params.push(status);
    }
    sql += ' ORDER BY r.created_at DESC';

    const result = await query(sql, params);
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch access requests' });
  }
});

// 3. Platform Admin: Approve Request and Generate Secure Invitation
router.post('/requests/:id/approve', authenticateJwt, requireRole(['platform_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reqRes = await query('SELECT id, email, status FROM demo_access_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Generate secure token (24 hex characters)
    const rawInvitationToken = 'inv_' + crypto.randomBytes(16).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
    const tokenHint = rawInvitationToken.slice(0, 8) + '...';
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    await query('UPDATE demo_access_requests SET status = $1, approved_at = NOW(), updated_at = NOW() WHERE id = $2', ['approved', id]);

    // Store hashed token only
    await query(`
      INSERT INTO demo_invitations (request_id, token_hash, raw_token_hint, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [id, tokenHash, tokenHint, expiresAt]);

    // Audit log
    await query(`
      INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, details)
      VALUES ('platform_admin', $1, 'approve_demo_request', 'demo_access_requests', $2, $3)
    `, [req.user?.userId || 'admin', id, JSON.stringify({ email: reqRes.rows[0].email })]);

    res.json({
      message: 'Demo access request approved successfully',
      invitationToken: rawInvitationToken, // Provided once to admin for sending/local testing
      expiresAt: expiresAt.toISOString(),
      invitationUrl: `/demo/redeem?token=${rawInvitationToken}`,
    });
  } catch (err) {
    console.error('Approve demo request error:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// 4. Platform Admin: Reject or Revoke Request
router.post('/requests/:id/revoke', authenticateJwt, requireRole(['platform_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('UPDATE demo_access_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['revoked', id]);
    await query('UPDATE demo_invitations SET is_revoked = true WHERE request_id = $1', [id]);

    res.json({ message: 'Demo request and associated invitations revoked successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke request' });
  }
});

// 5. Visitor: Redeem Invitation Token for Authenticated Demo Session
router.post('/redeem', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invitation token is required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invRes = await query(`
      SELECT i.id, i.request_id, i.expires_at, i.redeemed_at, i.is_revoked, r.email, r.full_name, r.status
      FROM demo_invitations i
      JOIN demo_access_requests r ON i.request_id = r.id
      WHERE i.token_hash = $1
    `, [tokenHash]);

    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or non-existent invitation token' });
    }

    const invitation = invRes.rows[0];

    if (invitation.is_revoked || invitation.status === 'revoked') {
      return res.status(403).json({ error: 'This invitation has been revoked by the administrator' });
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      return res.status(403).json({ error: 'This invitation token has expired' });
    }

    // Mark as redeemed
    await query('UPDATE demo_invitations SET redeemed_at = NOW() WHERE id = $1', [invitation.id]);

    // Issue demo guest JWT session (valid for 24h)
    const sessionToken = jwt.sign(
      {
        userId: invitation.request_id,
        email: invitation.email,
        name: invitation.full_name,
        role: 'demo_guest',
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Demo access granted',
      token: sessionToken,
      user: {
        email: invitation.email,
        name: invitation.full_name,
        role: 'demo_guest',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to redeem invitation' });
  }
});

export default router;
