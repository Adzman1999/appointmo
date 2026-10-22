import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, pool } from '../db';
import { config } from '../config';

const router = Router();

// Sign in with role routing
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailNorm = email.toLowerCase().trim();
    const userRes = await query('SELECT id, business_id, email, password_hash, role, name FROM users WHERE email = $1', [emailNorm]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
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
        businessId: user.business_id,
        businessSlug,
        businessName,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Sign up for Customer or Store Admin
router.post('/register', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { 
      role, name, email, password, phone,
      // Store creation fields (when role === 'store_admin' or 'business_admin')
      storeName, category, description, address, city, openingHours, socialHandle
    } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const emailNorm = email.toLowerCase().trim();
    const targetRole = role === 'store_admin' || role === 'business_admin' ? 'business_admin' : 'customer';

    // Check if user already exists
    const existUser = await client.query('SELECT id FROM users WHERE email = $1', [emailNorm]);
    if (existUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    let createdBusinessId: string | null = null;
    let createdBusinessSlug: string | undefined;
    let createdBusinessName: string | undefined;

    // If registering as a store admin, create their store immediately
    if (targetRole === 'business_admin') {
      const finalStoreName = (storeName || `${name.trim()}'s Studio`).trim();
      const finalCategory = (category || 'Beauty & Wellness').trim();
      const finalCity = (city || 'Quezon City').trim();
      const finalAddress = (address || `101 Commercial Ave, ${finalCity}`).trim();
      const finalOpeningHours = (openingHours || '9:00 AM - 6:00 PM').trim();
      const finalPhone = (phone || '+63 2 8999 0001').trim();
      const finalSocMed = socialHandle ? socialHandle.trim() : null;

      const slug = finalStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 6);

      const bRes = await client.query(`
        INSERT INTO businesses (
          name, slug, description, category, currency, timezone,
          phone, email, address, city, opening_hours, instagram, social_handle
        )
        VALUES ($1, $2, $3, $4, 'PHP', 'Asia/Manila', $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, slug
      `, [
        finalStoreName, slug, description || `Premier service business offering ${finalCategory}`,
        finalCategory, finalPhone, emailNorm, finalAddress, finalCity, finalOpeningHours, finalSocMed, finalSocMed
      ]);

      const biz = bRes.rows[0];
      createdBusinessId = biz.id;
      createdBusinessSlug = biz.slug;
      createdBusinessName = biz.name;

      // Create primary branch
      const brRes = await client.query(`
        INSERT INTO branches (business_id, name, address, city, phone, latitude, longitude, location_description)
        VALUES ($1, $2, $3, $4, $5, 14.5547, 121.0244, $6)
        RETURNING id
      `, [biz.id, `${finalStoreName} Main`, finalAddress, finalCity, finalPhone, `${finalStoreName} - ${finalCity}`]);

      // Create starter services
      const sRes = await client.query(`
        INSERT INTO services (business_id, name, description, duration_minutes, price, category)
        VALUES ($1, 'Standard Consultation', 'Initial consultation and assessment session.', 45, 1000, 'Consultation')
        RETURNING id
      `, [biz.id]);

      // Create starter staff
      const spRes = await client.query(`
        INSERT INTO staff_profiles (business_id, name, bio)
        VALUES ($1, $2, 'Lead specialist and store practitioner.')
        RETURNING id
      `, [biz.id, name.trim()]);

      await client.query(`INSERT INTO staff_services (staff_id, service_id) VALUES ($1, $2)`, [spRes.rows[0].id, sRes.rows[0].id]);

      for (let day = 1; day <= 6; day++) {
        await client.query(`
          INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time, break_start, break_end, is_working)
          VALUES ($1, $2, '09:00:00', '18:00:00', '12:00:00', '13:00:00', true)
        `, [spRes.rows[0].id, day]);
      }
    } else {
      // Customer registration: register customer profile linked to canonical store or default
      const defaultBiz = await client.query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio' LIMIT 1");
      const defaultBizId = defaultBiz.rows[0]?.id;
      if (defaultBizId) {
        await client.query(`
          INSERT INTO customers (business_id, name, email, phone)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (business_id, email) DO UPDATE SET name = $2, phone = $4
        `, [defaultBizId, name.trim(), emailNorm, phone || '+63 900 000 0000']);
      }
    }

    // Insert user record
    const userRes = await client.query(`
      INSERT INTO users (business_id, email, password_hash, role, name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, business_id, email, role, name
    `, [createdBusinessId, emailNorm, passwordHash, targetRole, name.trim()]);

    await client.query('COMMIT');

    const newUser = userRes.rows[0];
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        businessId: newUser.business_id,
      },
      config.jwtSecret,
      { expiresIn: '48h' }
    );

    res.status(201).json({
      message: targetRole === 'business_admin' ? 'Store and admin account registered successfully!' : 'Customer account created successfully!',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        businessId: newUser.business_id,
        businessSlug: createdBusinessSlug,
        businessName: createdBusinessName,
      },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Registration failed: ' + (err.message || 'Unknown error') });
  } finally {
    client.release();
  }
});

export default router;
