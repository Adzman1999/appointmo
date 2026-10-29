import bcrypt from 'bcryptjs';
import { pool } from './index';
import { config } from '../config';
import { runMigrations } from './migrate';

const localCredentials = {
  superAdmin: {
    email: 'superadmin@appointmo.local',
    password: 'SuperAdmin2026!',
    name: 'Local Super Administrator',
  },
  storeAdmin: {
    email: 'storeadmin@appointmo.local',
    password: 'StoreAdmin2026!',
    name: 'Local Store Administrator',
  },
  customer: {
    email: 'customer@appointmo.local',
    password: 'Customer2026!',
    name: 'Local Customer',
  },
};

function credentialFromEnvironment(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

function getSeedAccounts() {
  if (config.env === 'production') {
    throw new Error('The local account seed is disabled in production. Create production users through the platform admin flow.');
  }

  const accounts = {
    superAdmin: {
      email: credentialFromEnvironment('SEED_SUPER_ADMIN_EMAIL', localCredentials.superAdmin.email).toLowerCase(),
      password: credentialFromEnvironment('SEED_SUPER_ADMIN_PASSWORD', localCredentials.superAdmin.password),
      name: credentialFromEnvironment('SEED_SUPER_ADMIN_NAME', localCredentials.superAdmin.name),
    },
    storeAdmin: {
      email: credentialFromEnvironment('SEED_STORE_ADMIN_EMAIL', localCredentials.storeAdmin.email).toLowerCase(),
      password: credentialFromEnvironment('SEED_STORE_ADMIN_PASSWORD', localCredentials.storeAdmin.password),
      name: credentialFromEnvironment('SEED_STORE_ADMIN_NAME', localCredentials.storeAdmin.name),
    },
    customer: {
      email: credentialFromEnvironment('SEED_CUSTOMER_EMAIL', localCredentials.customer.email).toLowerCase(),
      password: credentialFromEnvironment('SEED_CUSTOMER_PASSWORD', localCredentials.customer.password),
      name: credentialFromEnvironment('SEED_CUSTOMER_NAME', localCredentials.customer.name),
    },
  };

  for (const [role, account] of Object.entries(accounts)) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email) || !account.name.trim()) {
      throw new Error(`A valid email and name are required for the local ${role} seed account.`);
    }
    if (account.password.length < 12) {
      throw new Error(`The local ${role} seed password must contain at least 12 characters.`);
    }
  }

  return accounts;
}

export async function seedData(): Promise<void> {
  await runMigrations();

  const accounts = getSeedAccounts();
  const passwordHashes = {
    superAdmin: await bcrypt.hash(accounts.superAdmin.password, 12),
    storeAdmin: await bcrypt.hash(accounts.storeAdmin.password, 12),
    customer: await bcrypt.hash(accounts.customer.password, 12),
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['appointmo:local-seed']);

    const businessResult = await client.query(
      `INSERT INTO businesses (name, slug, description, currency, timezone, status)
       VALUES ('Lumière Beauty Studio', 'lumiere-beauty-studio', 'Beauty and wellness appointment services.', 'PHP', 'Asia/Manila', 'approved')
       ON CONFLICT (slug) DO UPDATE SET updated_at = businesses.updated_at
       RETURNING id`,
    );
    const businessId: string = businessResult.rows[0].id;

    await client.query(
      `INSERT INTO branches (business_id, name, address, city, phone, latitude, longitude, location_description)
       SELECT $1, 'Lumière Studio - Quezon City Branch', 'Quezon City', 'Quezon City', '+63 900 000 0000', 14.6507, 121.0336, 'Local development branch'
       WHERE NOT EXISTS (SELECT 1 FROM branches WHERE business_id = $1)`,
      [businessId]
    );

    await client.query(
      `INSERT INTO users (business_id, email, password_hash, role, name, status)
       VALUES (NULL, $1, $2, 'platform_admin', $3, 'approved')
       ON CONFLICT (email) DO UPDATE SET
         business_id = NULL, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role,
         name = EXCLUDED.name, status = EXCLUDED.status, updated_at = NOW()`,
      [accounts.superAdmin.email, passwordHashes.superAdmin, accounts.superAdmin.name]
    );

    await client.query(
      `INSERT INTO users (business_id, email, password_hash, role, name, status)
       VALUES ($1, $2, $3, 'business_admin', $4, 'approved')
       ON CONFLICT (email) DO UPDATE SET
         business_id = EXCLUDED.business_id, password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role, name = EXCLUDED.name, status = EXCLUDED.status, updated_at = NOW()`,
      [businessId, accounts.storeAdmin.email, passwordHashes.storeAdmin, accounts.storeAdmin.name]
    );

    await client.query(
      `INSERT INTO users (business_id, email, password_hash, role, name, status)
       VALUES ($1, $2, $3, 'customer', $4, 'approved')
       ON CONFLICT (email) DO UPDATE SET
         business_id = EXCLUDED.business_id, password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role, name = EXCLUDED.name, status = EXCLUDED.status, updated_at = NOW()`,
      [businessId, accounts.customer.email, passwordHashes.customer, accounts.customer.name]
    );

    await client.query(
      `INSERT INTO customers (business_id, name, email, phone)
       VALUES ($1, $2, $3, '+63 900 000 0000')
       ON CONFLICT (business_id, email) DO UPDATE
       SET name = EXCLUDED.name, updated_at = NOW()`,
      [businessId, accounts.customer.name, accounts.customer.email]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  console.log('Local seed accounts ready: super admin, store admin, and customer. Existing appointment and customer records were preserved.');
}

if (require.main === module) {
  seedData()
    .then(() => pool.end())
    .catch((error: unknown) => {
      console.error('Local database seed failed:', error);
      process.exit(1);
    });
}
