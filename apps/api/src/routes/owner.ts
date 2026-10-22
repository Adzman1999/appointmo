import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { config } from '../config';
import { requireOwnerAuth } from '../middleware/session';
import { EmailService } from '../services/email';
import { runMigrations } from '../db/migrate';

const router = Router();

// Automatic Database Migration Endpoint
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
             u.id AS user_id,
             s.created_at AS session_started_at
      FROM demo_access_requests r
      LEFT JOIN users u ON LOWER(r.email) = LOWER(u.email)
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

// Helper to provision user account and setup token
async function provisionUserAndSetupToken(accessReq: { id: string; email: string; full_name: string }, origin: string) {
  const emailNorm = accessReq.email.toLowerCase().trim();

  // Find or create user
  let userRes = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [emailNorm]);
  let userId: string;
  let hasPassword = false;

  if (userRes.rows.length === 0) {
    const bcrypt = await import('bcryptjs');
    const dummyHash = await bcrypt.default.hash(crypto.randomBytes(32).toString('hex'), 10);
    const newUser = await query(`
      INSERT INTO users (email, password_hash, role, name)
      VALUES ($1, $2, 'demo_guest', $3)
      RETURNING id
    `, [emailNorm, dummyHash, accessReq.full_name]);
    userId = newUser.rows[0].id;
  } else {
    userId = userRes.rows[0].id;
    hasPassword = true;
  }

  // Generate single-use, 24-hour setup token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Invalidate any previous unused setup tokens for this user
  await query('DELETE FROM user_setup_tokens WHERE user_id = $1', [userId]);

  await query(`
    INSERT INTO user_setup_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
  `, [userId, tokenHash, expiresAt]);

  const cleanOrigin = origin.replace(/\/+$/, '');
  const setupUrl = `${cleanOrigin}/#/setup-password?token=${rawToken}&email=${encodeURIComponent(emailNorm)}`;
  const loginUrl = `${cleanOrigin}/#/admin/login`;

  return { userId, rawToken, setupUrl, loginUrl, hasPassword };
}

// 3. Approve Request: Updates status, provisions account, and sends friendly approval notification
router.post('/requests/:id/approve', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reqRes = await query('SELECT id, full_name, email, status FROM demo_access_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const accessReq = reqRes.rows[0];
    const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : 'https://appointmo.com');

    // 1. Transactionally provision account & single-use setup link
    const { rawToken, setupUrl, loginUrl } = await provisionUserAndSetupToken(accessReq, origin);

    // 2. Send invitation email (no codes or passcodes)
    const emailResult = await EmailService.sendApprovalNotification({
      recipientEmail: accessReq.email,
      recipientName: accessReq.full_name,
      setupUrl,
      loginUrl,
    });

    if (!emailResult.success) {
      return res.status(502).json({
        error: `Email delivery failed: ${emailResult.error || 'Provider rejected send request'}. Request status was not modified.`,
      });
    }

    // 3. Mark request as approved
    await query(`
      UPDATE demo_access_requests 
      SET status = 'approved', approved_at = NOW(), reviewed_at = NOW(), reviewed_by = $1, updated_at = NOW()
      WHERE id = $2
    `, [req.user?.email || 'owner', id]);

    // 4. Record audit log
    await query(`
      INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, details)
      VALUES ('owner', $1, 'approve_access_request', 'demo_access_requests', $2, $3)
    `, [req.user?.userId || 'owner', id, JSON.stringify({ email: accessReq.email, isMock: emailResult.isMock })]);

    res.json({
      message: emailResult.isMock
        ? 'Request approved. (Mock approval email logged to console in local development).'
        : `Approval invitation successfully sent to ${accessReq.email}.`,
      isMock: emailResult.isMock,
      setupUrl: emailResult.isMock ? setupUrl : undefined,
      devSetupToken: emailResult.isMock ? rawToken : undefined,
    });
  } catch (err: any) {
    console.error('Approve and send error:', err);
    res.status(500).json({ error: 'Failed to approve request and send email: ' + (err.message || 'Server error') });
  }
});

// 4. Resend Approval Notification Email
router.post('/requests/:id/resend', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reqRes = await query('SELECT id, full_name, email, status FROM demo_access_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const accessReq = reqRes.rows[0];
    if (accessReq.status === 'revoked' || accessReq.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot resend approval notification for rejected or revoked request' });
    }

    const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : 'https://appointmo.com');
    const { rawToken, setupUrl, loginUrl } = await provisionUserAndSetupToken(accessReq, origin);

    const emailResult = await EmailService.sendApprovalNotification({
      recipientEmail: accessReq.email,
      recipientName: accessReq.full_name,
      setupUrl,
      loginUrl,
    });

    if (!emailResult.success) {
      return res.status(502).json({ error: `Email delivery failed: ${emailResult.error}` });
    }

    await query(`
      INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, details)
      VALUES ('owner', $1, 'resend_approval_notification', 'demo_access_requests', $2, $3)
    `, [req.user?.userId || 'owner', id, JSON.stringify({ email: accessReq.email })]);

    res.json({
      message: `Approval notification resent to ${accessReq.email}.`,
      isMock: emailResult.isMock,
      setupUrl: emailResult.isMock ? setupUrl : undefined,
      devSetupToken: emailResult.isMock ? rawToken : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resend approval notification' });
  }
});

// 5. Reject Request
router.post('/requests/:id/reject', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reqRes = await query('SELECT id, email, status FROM demo_access_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await query(`
      UPDATE demo_access_requests
      SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1, updated_at = NOW()
      WHERE id = $2
    `, [req.user?.email || 'owner', id]);

    await query(`
      INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, details)
      VALUES ('owner', $1, 'reject_access_request', 'demo_access_requests', $2, $3)
    `, [req.user?.userId || 'owner', id, JSON.stringify({ email: reqRes.rows[0].email })]);

    res.json({ message: 'Request rejected successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// 6. Revoke Access Immediately
router.post('/requests/:id/revoke', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reqRes = await query('SELECT id, email, status FROM demo_access_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const emailNorm = reqRes.rows[0].email.toLowerCase().trim();

    // 1. Mark demo_access_requests status = 'revoked'
    await query(`
      UPDATE demo_access_requests
      SET status = 'revoked', updated_at = NOW()
      WHERE id = $1
    `, [id]);

    // 2. Invalidate all active demo_sessions
    await query(`
      UPDATE demo_sessions
      SET revoked_at = NOW()
      WHERE request_id = $1 OR LOWER(email) = $2
    `, [id, emailNorm]);

    // 3. Invalidate any pending setup tokens
    await query(`
      DELETE FROM user_setup_tokens
      WHERE user_id IN (SELECT id FROM users WHERE LOWER(email) = $1)
    `, [emailNorm]);

    // 4. Audit log
    await query(`
      INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, details)
      VALUES ('owner', $1, 'revoke_access', 'demo_access_requests', $2, $3)
    `, [req.user?.userId || 'owner', id, JSON.stringify({ email: emailNorm })]);

    res.json({ message: `Access revoked and active sessions invalidated for ${emailNorm}` });
  } catch (err: any) {
    console.error('Revoke access error:', err);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// 7. List Store Admin Creation Requests (For Super Admin Approval)
router.get('/store-approvals', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        u.id AS user_id,
        u.name AS admin_name,
        u.email AS admin_email,
        u.created_at AS registered_at,
        u.status AS user_status,
        b.id AS business_id,
        b.name AS store_name,
        b.slug AS store_slug,
        b.category AS category,
        b.city AS city,
        b.address AS address,
        b.phone AS store_phone,
        b.description AS description,
        b.status AS store_status
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      WHERE u.role = 'business_admin'
      ORDER BY 
        CASE WHEN u.status = 'pending' THEN 0 ELSE 1 END,
        u.created_at DESC
    `);

    res.json({ stores: result.rows });
  } catch (err: any) {
    console.error('Error fetching store approvals:', err);
    res.status(500).json({ error: 'Failed to fetch store approvals' });
  }
});

// 8. Super Admin: Approve Store Admin Creation
router.post('/store-approvals/:userId/approve', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userRes = await query('SELECT id, business_id, email, name FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    // Mark user status approved
    await query("UPDATE users SET status = 'approved', updated_at = NOW() WHERE id = $1", [userId]);

    // Mark business status approved
    if (user.business_id) {
      await query("UPDATE businesses SET status = 'approved', updated_at = NOW() WHERE id = $1", [user.business_id]);
    }

    res.json({ 
      message: `Store Admin ${user.email} has been approved! They can now sign in to their store admin portal.`,
      user: { id: user.id, email: user.email, status: 'approved' }
    });
  } catch (err: any) {
    console.error('Error approving store:', err);
    res.status(500).json({ error: 'Failed to approve store: ' + err.message });
  }
});

// 9. Super Admin: Reject Store Admin Creation
router.post('/store-approvals/:userId/reject', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userRes = await query('SELECT id, business_id, email FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    await query("UPDATE users SET status = 'rejected', updated_at = NOW() WHERE id = $1", [userId]);
    if (user.business_id) {
      await query("UPDATE businesses SET status = 'rejected', updated_at = NOW() WHERE id = $1", [user.business_id]);
    }

    res.json({ 
      message: `Store Admin registration for ${user.email} has been rejected.`,
      user: { id: user.id, email: user.email, status: 'rejected' }
    });
  } catch (err: any) {
    console.error('Error rejecting store:', err);
    res.status(500).json({ error: 'Failed to reject store: ' + err.message });
  }
});

export default router;
