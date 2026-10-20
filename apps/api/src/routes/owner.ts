import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { config } from '../config';
import { requireOwnerAuth } from '../middleware/session';
import { EmailService } from '../services/email';
import { runMigrations } from '../db/migrate';

const router = Router();

// Automatic Database Migration Endpoint (Auto-creates missing tables like demo_sessions on hosted Neon)
router.post('/auto-migrate', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    console.log('Running auto-migration requested by owner...');
    await runMigrations();
    res.json({ message: 'Database tables and schema synchronized successfully!' });
  } catch (err: any) {
    console.error('Auto-migrate error:', err);
    res.status(500).json({ error: 'Migration failed: ' + (err.message || 'Unknown database error') });
  }
});

// 1. Owner Login Endpoint (Strict, rate-limited credentials)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailNorm = email.toLowerCase().trim();
    // Allow either configured ownerEmail or existing platform admin
    const isConfiguredOwner = emailNorm === config.ownerEmail.toLowerCase() && password === config.ownerPassword;

    let userRole = 'owner';
    let userId = 'owner_root';
    let userName = 'Appointmo Owner';

    if (!isConfiguredOwner) {
      // Check database users for platform_admin
      const userRes = await query(
        "SELECT id, email, password_hash, role, name FROM users WHERE email = $1 AND role IN ('platform_admin', 'owner')",
        [emailNorm]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid owner credentials' });
      }

      const bcrypt = await import('bcryptjs');
      const match = await bcrypt.default.compare(password, userRes.rows[0].password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid owner credentials' });
      }

      userRole = userRes.rows[0].role;
      userId = userRes.rows[0].id;
      userName = userRes.rows[0].name;
    }

    const token = jwt.sign(
      {
        userId,
        email: emailNorm,
        name: userName,
        role: userRole,
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    // Audit log
    await query(`
      INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, details)
      VALUES ('owner', $1, 'owner_login', 'system', 'auth', $2)
    `, [userId, JSON.stringify({ email: emailNorm, ip: req.ip })]);

    res.json({
      token,
      owner: {
        email: emailNorm,
        name: userName,
        role: userRole,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Owner authentication failed' });
  }
});

// 2. List Access Requests with Status Counts
router.get('/requests', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT r.id, r.full_name, r.email, r.business_name, r.message, r.status,
             r.requested_at, r.reviewed_at, r.reviewed_by, r.created_at,
             i.expires_at, i.used_at, i.revoked_at, i.attempt_count, i.raw_token_hint,
             s.created_at AS session_started_at
      FROM demo_access_requests r
      LEFT JOIN demo_invitations i ON r.id = i.request_id
      LEFT JOIN demo_sessions s ON r.id = s.request_id AND s.revoked_at IS NULL
    `;
    const params: any[] = [];

    if (status && typeof status === 'string' && status !== 'all') {
      sql += ' WHERE r.status = $1';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC';

    const result = await query(sql, params);

    // Summary counts
    const countRes = await query(`
      SELECT status, COUNT(*)::int AS count
      FROM demo_access_requests
      GROUP BY status
    `);

    const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, revoked: 0, all: 0 };
    let total = 0;
    for (const row of countRes.rows) {
      counts[row.status] = row.count;
      total += row.count;
    }
    counts.all = total;

    res.json({
      requests: result.rows,
      counts,
    });
  } catch (err: any) {
    console.error('Owner list requests error:', err);
    res.status(500).json({ error: 'Failed to retrieve access requests: ' + (err.message || 'Database error') });
  }
});

// 3. Approve Request and Send 15-Minute Access Code Email
router.post('/requests/:id/approve', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reqRes = await query('SELECT id, full_name, email, status FROM demo_access_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const accessReq = reqRes.rows[0];

    // Generate cryptographic 6-digit alphanumeric passcode (e.g. 849201)
    const rawPasscode = crypto.randomInt(100000, 999999).toString();
    const codeHash = crypto.createHash('sha256').update(rawPasscode).digest('hex');
    const tokenHint = rawPasscode.slice(0, 2) + '****';
    const expiresInMinutes = 15;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // 1. Send email first via Resend / DevMock
    const emailResult = await EmailService.sendAccessPasscode({
      recipientEmail: accessReq.email,
      recipientName: accessReq.full_name,
      passcode: rawPasscode,
      expiresInMinutes,
    });

    if (!emailResult.success) {
      return res.status(502).json({
        error: `Email delivery failed: ${emailResult.error || 'Provider rejected send request'}. Code was not issued.`,
      });
    }

    // 2. Mark request as approved
    await query(`
      UPDATE demo_access_requests 
      SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1, updated_at = NOW()
      WHERE id = $2
    `, [req.user?.email || 'owner', id]);

    // 3. Insert or update passcode invitation record
    await query(`
      INSERT INTO demo_invitations (request_id, token_hash, raw_token_hint, expires_at, attempt_count)
      VALUES ($1, $2, $3, $4, 0)
      ON CONFLICT (token_hash) DO NOTHING
    `, [id, codeHash, tokenHint, expiresAt]);

    // 4. Record audit log
    await query(`
      INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, details)
      VALUES ('owner', $1, 'approve_and_send_code', 'demo_access_requests', $2, $3)
    `, [req.user?.userId || 'owner', id, JSON.stringify({ email: accessReq.email, isMock: emailResult.isMock })]);

    res.json({
      message: emailResult.isMock
        ? 'Request approved. (Mock email logged to console in local development).'
        : `Access code email successfully sent to ${accessReq.email}.`,
      expiresAt: expiresAt.toISOString(),
      isMock: emailResult.isMock,
      // Passcode only sent in response if in mock dev mode for testing convenience
      devCodeHint: emailResult.isMock ? rawPasscode : undefined,
    });
  } catch (err: any) {
    console.error('Approve and send error:', err);
    res.status(500).json({ error: 'Failed to approve request and send email' });
  }
});

// 4. Resend Access Code Email (Generates a fresh 15-minute code)
router.post('/requests/:id/resend', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reqRes = await query('SELECT id, full_name, email, status FROM demo_access_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const accessReq = reqRes.rows[0];
    if (accessReq.status === 'revoked' || accessReq.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot resend access code for rejected or revoked request' });
    }

    const rawPasscode = crypto.randomInt(100000, 999999).toString();
    const codeHash = crypto.createHash('sha256').update(rawPasscode).digest('hex');
    const tokenHint = rawPasscode.slice(0, 2) + '****';
    const expiresInMinutes = 15;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const emailResult = await EmailService.sendAccessPasscode({
      recipientEmail: accessReq.email,
      recipientName: accessReq.full_name,
      passcode: rawPasscode,
      expiresInMinutes,
    });

    if (!emailResult.success) {
      return res.status(502).json({ error: `Email delivery failed: ${emailResult.error}` });
    }

    // Invalidate prior codes
    await query('UPDATE demo_invitations SET is_revoked = true, revoked_at = NOW() WHERE request_id = $1', [id]);

    // Insert new fresh code
    await query(`
      INSERT INTO demo_invitations (request_id, token_hash, raw_token_hint, expires_at, attempt_count)
      VALUES ($1, $2, $3, $4, 0)
    `, [id, codeHash, tokenHint, expiresAt]);

    res.json({
      message: `Fresh access code sent to ${accessReq.email}`,
      expiresAt: expiresAt.toISOString(),
      isMock: emailResult.isMock,
      devCodeHint: emailResult.isMock ? rawPasscode : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend access email' });
  }
});

// 5. Reject Request
router.post('/requests/:id/reject', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query(`
      UPDATE demo_access_requests 
      SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1, updated_at = NOW()
      WHERE id = $2
    `, [req.user?.email || 'owner', id]);

    await query('UPDATE demo_invitations SET is_revoked = true, revoked_at = NOW() WHERE request_id = $1', [id]);

    res.json({ message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// 6. Revoke Access (Immediately terminates invitations & active database sessions)
router.post('/requests/:id/revoke', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await query(`
      UPDATE demo_access_requests 
      SET status = 'revoked', updated_at = NOW()
      WHERE id = $1
    `, [id]);

    await query('UPDATE demo_invitations SET is_revoked = true, revoked_at = NOW() WHERE request_id = $1', [id]);
    await query('UPDATE demo_sessions SET revoked_at = NOW() WHERE request_id = $1', [id]);

    await query(`
      INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id)
      VALUES ('owner', $1, 'revoke_access', 'demo_access_requests', $2)
    `, [req.user?.userId || 'owner', id]);

    res.json({ message: 'Access and active sessions revoked successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

export default router;
