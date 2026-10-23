import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, pool } from '../db';
import { config } from '../config';
import { EmailService } from '../services/email';

const router = Router();

// Sign in with role routing
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailNorm = email.toLowerCase().trim();
    const userRes = await query('SELECT id, business_id, email, password_hash, role, name, COALESCE(status, \'approved\') as status FROM users WHERE email = $1', [emailNorm]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ 
        error: 'Your account registration request was not approved. Please contact support.' 
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended by the administrator. Please contact support for assistance.'
      });
    }

    if (user.status === 'disabled' || user.status === 'deactivated') {
      return res.status(403).json({
        error: 'Your account is disabled. Please contact the platform administrator to reactivate your access.'
      });
    }

    if (user.status === 'revoked') {
      return res.status(403).json({
        error: 'Your account access has been revoked by the administrator.'
      });
    }

    // Get business slug if store admin
    let businessSlug: string | undefined;
    let businessName: string | undefined;
    if (user.business_id) {
      const bRes = await query('SELECT slug, name FROM businesses WHERE id = $1', [user.business_id]);
      if (bRes.rows.length > 0) {
        businessSlug = bRes.rows[0].slug;
        businessName = bRes.rows[0].name;
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.business_id,
      },
      config.jwtSecret,
      { expiresIn: '48h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        businessId: user.business_id,
        businessSlug,
        businessName,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed: ' + (err?.message || 'Internal server error') });
  }
});

// Customer Sign up
router.post('/register', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { name, email, password, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const emailNorm = email.toLowerCase().trim();

    // Check if user already exists
    const existUser = await client.query('SELECT id FROM users WHERE email = $1', [emailNorm]);
    if (existUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    // Link customer to canonical or default business
    const defaultBiz = await client.query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio' LIMIT 1");
    const defaultBizId = defaultBiz.rows[0]?.id;
    if (defaultBizId) {
      await client.query(`
        INSERT INTO customers (business_id, name, email, phone)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (business_id, email) DO UPDATE SET name = $2, phone = $4
      `, [defaultBizId, name.trim(), emailNorm, phone || '+63 900 000 0000']);
    }

    // Insert user record: customer starts immediately as 'approved'
    const initialStatus = 'approved';
    const userRes = await client.query(`
      INSERT INTO users (business_id, email, password_hash, role, name, phone, status)
      VALUES ($1, $2, $3, 'customer', $4, $5, $6)
      RETURNING id, business_id, email, role, name, phone, status
    `, [defaultBizId || null, emailNorm, passwordHash, name.trim(), phone || null, initialStatus]);

    await client.query('COMMIT');

    const newUser = userRes.rows[0];

    // Customer sign up is immediately approved and ready to sign in (no Super Admin approval needed)
    res.status(201).json({
      message: 'Account created successfully! Please sign in to access your appointments.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Registration failed: ' + (err.message || 'Unknown error') });
  } finally {
    client.release();
  }
});

// Update Current User Account (Name, Email, Phone, Password)
router.put('/account', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { name, email, phone, currentPassword, newPassword } = req.body;

    // Fetch existing user
    const userRes = await query('SELECT id, email, password_hash, name, phone, role, status, business_id FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found' });
    }
    const currentUser = userRes.rows[0];

    // If changing password, verify current password
    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const isMatch = await bcrypt.compare(currentPassword, currentUser.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password does not match' });
      }
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
    }

    // Check if new email is taken by someone else
    const finalEmail = (email || currentUser.email).toLowerCase().trim();
    if (finalEmail !== currentUser.email) {
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [finalEmail, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email address is already in use by another account' });
      }
    }

    const finalName = name ? name.trim() : currentUser.name;
    const finalPhone = phone !== undefined ? phone.trim() : currentUser.phone;
    let finalPasswordHash = currentUser.password_hash;
    if (newPassword && newPassword.trim()) {
      finalPasswordHash = await bcrypt.hash(newPassword.trim(), 10);
    }

    const updatedRes = await query(`
      UPDATE users 
      SET name = $1, email = $2, phone = $3, password_hash = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, name, email, phone, role, status, business_id
    `, [finalName, finalEmail, finalPhone, finalPasswordHash, userId]);

    const updatedUser = updatedRes.rows[0];

    // Issue refreshed token
    const newToken = jwt.sign(
      {
        userId: updatedUser.id,
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        businessId: updatedUser.business_id,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Account details updated successfully',
      token: newToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
        businessId: updatedUser.business_id,
      }
    });
  } catch (err: any) {
    console.error('Update account error:', err);
    res.status(500).json({ error: 'Failed to update account: ' + err.message });
  }
});

export default router;
