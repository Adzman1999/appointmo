import { pool, query } from '../db';

export async function findSetupToken(tokenHash: string) {
  const result = await query(
    `SELECT t.id, t.user_id, t.expires_at, t.used_at, u.email, u.name, u.role, u.business_id
     FROM user_setup_tokens t
     JOIN users u ON t.user_id = u.id
     WHERE t.token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0];
}

export async function completePasswordSetup(input: {
  tokenId: string;
  userId: string;
  passwordHash: string;
  accessSession?: {
    requestId: string;
    tokenHash: string;
    email: string;
    expiresAt: Date;
  };
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const token = await client.query(
      `UPDATE user_setup_tokens SET used_at = NOW()
       WHERE id = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > NOW()
       RETURNING id`,
      [input.tokenId, input.userId]
    );
    if (token.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const user = await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [input.passwordHash, input.userId]
    );
    if (user.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    if (input.accessSession) {
      await client.query(
        `INSERT INTO access_sessions (request_id, session_token_hash, email, expires_at)
         VALUES ($1, $2, LOWER($3), $4)`,
        [input.accessSession.requestId, input.accessSession.tokenHash, input.accessSession.email, input.accessSession.expiresAt]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findUserByEmail(email: string) {
  const result = await query(
    `SELECT id, business_id, email, password_hash, role, name, status
     FROM users WHERE LOWER(email) = $1`,
    [email]
  );
  return result.rows[0];
}
