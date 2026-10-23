import { query, pool } from './index';
import { runMigrations } from './migrate';
import bcrypt from 'bcryptjs';

export const seedData = async () => {
  // Ensure all schema and tables exist
  await runMigrations();

  console.log('Ensuring essential system users and business infrastructure exist without injecting dummy bookings/customers...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure baseline business exists (e.g. Lumière Beauty Studio) as a live operational store
    let businessId: string;
    const existingBiz = await client.query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio'");

    if (existingBiz.rows.length > 0) {
      businessId = existingBiz.rows[0].id;
    } else {
      const bizRes = await client.query(`
        INSERT INTO businesses (name, slug, description, currency, timezone, status)
        VALUES ('Lumière Beauty Studio', 'lumiere-beauty-studio', 'Premium aesthetic, skincare and wellness studio.', 'PHP', 'Asia/Manila', 'approved')
        RETURNING id
      `);
      businessId = bizRes.rows[0].id;
    }

    // Ensure branch exists
    const existingBranch = await client.query("SELECT id FROM branches WHERE business_id = $1 LIMIT 1", [businessId]);
    if (existingBranch.rows.length === 0) {
      await client.query(`
        INSERT INTO branches (business_id, name, address, city, phone, latitude, longitude, location_description)
        VALUES ($1, 'Lumière Studio - Quezon City Branch', 'Suite 404, Innovation Tower, Commercial District', 'Quezon City', '+63 2 8000 0001', 14.6507, 121.0336, 'Near North Triangle')
      `, [businessId]);
    }

    // 2. Ensure Super Administrator and Platform Owner accounts exist
    const superAdminPasswordHash = await bcrypt.hash('SuperAdmin2026!', 10);
    const legacyAdminHash = await bcrypt.hash('AppointmoAdmin2026!', 10);

    await client.query(`
      INSERT INTO users (business_id, email, password_hash, role, name, status)
      VALUES (NULL, 'superadmin@appointmo.demo', $1, 'platform_admin', 'Super Administrator', 'approved')
      ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'platform_admin', status = 'approved'
    `, [superAdminPasswordHash]);

    await client.query(`
      INSERT INTO users (business_id, email, password_hash, role, name, status)
      VALUES (NULL, 'admin@appointmo.demo', $1, 'platform_admin', 'Super Administrator', 'approved')
      ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'platform_admin', status = 'approved'
    `, [legacyAdminHash]);

    // Ensure store manager account exists
    const storePasswordHash = await bcrypt.hash('Store2026!', 10);
    await client.query(`
      INSERT INTO users (business_id, email, password_hash, role, name, status)
      VALUES ($1, 'store@appointmo.demo', $2, 'business_admin', 'Lumière Store Manager', 'approved')
      ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'business_admin', business_id = $1, status = 'approved'
    `, [businessId, storePasswordHash]);

    // 3. Purge dummy synthetic demo customers and dummy seed appointments
    await client.query(`
      DELETE FROM appointments 
      WHERE booking_reference LIKE 'APT-PAST-%' 
         OR booking_reference LIKE 'APT-UP-%' 
         OR booking_reference LIKE 'APT-CANC-%'
    `);

    await client.query(`
      DELETE FROM users 
      WHERE email IN ('customer@appointmo.demo', 'customer@example.com')
         OR email LIKE 'customer%@example.com'
    `);

    await client.query(`
      DELETE FROM customers 
      WHERE email IN ('customer@appointmo.demo', 'customer@example.com')
         OR email LIKE 'customer%@example.com'
    `);

    await client.query('COMMIT');
    console.log('✅ Clean state initialized: dummy bookings and fictional demo customers eliminated.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed transaction failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  seedData()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
