import { pool, query } from '../db';

export type AuthUserRecord = {
  id: string;
  business_id: string | null;
  email: string;
  phone: string | null;
  password_hash: string;
  role: string;
  name: string;
  status: string;
};

export type PublicUserRecord = Omit<AuthUserRecord, 'password_hash'>;

export async function findUserForLogin(email: string): Promise<AuthUserRecord | undefined> {
  const result = await query(
    `SELECT id, business_id, email, phone, password_hash, role, name,
            COALESCE(status, 'approved') AS status
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0];
}

export async function findBusinessIdentity(businessId: string) {
  const result = await query('SELECT slug, name FROM businesses WHERE id = $1', [businessId]);
  return result.rows[0] as { slug: string; name: string } | undefined;
}

export async function emailInUse(email: string): Promise<boolean> {
  const result = await query('SELECT id FROM users WHERE email = $1', [email]);
  return result.rows.length > 0;
}

export async function registerCustomerAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
}): Promise<PublicUserRecord | null> {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [input.email]);
    if (existing.rows.length > 0) return null;

    await client.query('BEGIN');
    transactionStarted = true;

    const approvedBusiness = await client.query(
      "SELECT id FROM businesses WHERE status = 'approved' ORDER BY created_at ASC LIMIT 1"
    );
    const anyBusiness = approvedBusiness.rows[0]
      ? null
      : await client.query('SELECT id FROM businesses LIMIT 1');
    const businessId = approvedBusiness.rows[0]?.id || anyBusiness?.rows[0]?.id || null;

    if (businessId) {
      await client.query(
        `INSERT INTO customers (business_id, name, email, phone)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (business_id, email) DO UPDATE SET name = $2, phone = $4`,
        [businessId, input.name, input.email, input.phone || '+63 900 000 0000']
      );
    }

    const userResult = await client.query(
      `INSERT INTO users (business_id, email, password_hash, role, name, phone, status)
       VALUES ($1, $2, $3, 'customer', $4, $5, 'approved')
       RETURNING id, business_id, email, role, name, phone, status`,
      [businessId, input.email, input.passwordHash, input.name, input.phone || null]
    );

    await client.query('COMMIT');
    transactionStarted = false;
    return userResult.rows[0] as PublicUserRecord;
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findAccountForUpdate(userId: string): Promise<AuthUserRecord | undefined> {
  const result = await query(
    `SELECT id, email, password_hash, name, phone, role, status, business_id
     FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0];
}

export async function emailBelongsToAnotherAccount(email: string, userId: string): Promise<boolean> {
  const result = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
  return result.rows.length > 0;
}

export async function updateAccount(input: {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
}): Promise<PublicUserRecord | undefined> {
  const result = await query(
    `UPDATE users
     SET name = $1, email = $2, phone = $3, password_hash = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING id, name, email, phone, role, status, business_id`,
    [input.name, input.email, input.phone, input.passwordHash, input.userId]
  );
  return result.rows[0] as PublicUserRecord | undefined;
}
