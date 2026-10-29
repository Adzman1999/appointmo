import { pool, query } from '../db';

type AccessRequestInput = {
  fullName: string;
  email: string;
  businessName: string;
  message: string;
};

export async function findRequestByEmail(email: string) {
  const result = await query(
    'SELECT id, status FROM access_requests WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1',
    [email]
  );
  return result.rows[0];
}

export async function createRequest(input: AccessRequestInput) {
  const result = await query(
    `INSERT INTO access_requests (full_name, email, business_name, message, status)
     VALUES ($1, LOWER($2), $3, $4, 'pending')
     RETURNING id, full_name, email, status, created_at`,
    [input.fullName, input.email, input.businessName, input.message]
  );
  return result.rows[0];
}

export async function resubmitRequest(input: AccessRequestInput) {
  const result = await query(
    `UPDATE access_requests
     SET status = 'pending', full_name = $1, business_name = $2, message = $3,
         requested_at = NOW(), reviewed_at = NULL, reviewed_by = NULL, updated_at = NOW()
     WHERE LOWER(email) = LOWER($4)
     RETURNING id, full_name, email, status, created_at`,
    [input.fullName, input.businessName, input.message, input.email]
  );
  return result.rows[0];
}

export async function listRequests(status?: string) {
  const params: string[] = [];
  let where = '';
  if (status) {
    where = 'WHERE r.status = $1';
    params.push(status);
  }
  const result = await query(
    `SELECT r.id, r.full_name, r.email, r.business_name, r.message, r.status, r.approved_at, r.created_at,
            i.expires_at, i.redeemed_at, i.is_revoked, i.raw_token_hint
     FROM access_requests r
     LEFT JOIN access_invitations i ON r.id = i.request_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );
  return result.rows;
}

export async function approveRequest(input: {
  id: string;
  actorId: string;
  tokenHash: string;
  tokenHint: string;
  expiresAt: Date;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await client.query(
      `UPDATE access_requests
       SET status = 'approved', approved_at = NOW(), reviewed_at = NOW(), reviewed_by = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email`,
      [input.id, input.actorId]
    );
    if (request.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `INSERT INTO access_invitations (request_id, token_hash, raw_token_hint, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [input.id, input.tokenHash, input.tokenHint, input.expiresAt]
    );
    await client.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, details)
       VALUES ('platform_admin', $1, 'approve_access_request', 'access_requests', $2, $3)`,
      [input.actorId, input.id, JSON.stringify({ email: request.rows[0].email })]
    );
    await client.query('COMMIT');
    return request.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeRequest(id: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE access_requests SET status = 'revoked', updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(
      'UPDATE access_invitations SET is_revoked = true, revoked_at = COALESCE(revoked_at, NOW()) WHERE request_id = $1',
      [id]
    );
    await client.query(
      'UPDATE access_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE request_id = $1 AND revoked_at IS NULL',
      [id]
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findInvitationByHash(tokenHash: string) {
  const result = await query(
    `SELECT i.id, i.request_id, i.expires_at, i.redeemed_at, i.is_revoked,
            r.email, r.full_name, r.status
     FROM access_invitations i
     JOIN access_requests r ON i.request_id = r.id
     WHERE i.token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0];
}

export async function redeemInvitationAndCreateSession(input: {
  invitationId: string;
  tokenHash: string;
  email: string;
  expiresAt: Date;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const redeemed = await client.query(
      `UPDATE access_invitations i
       SET redeemed_at = NOW()
       WHERE i.id = $1 AND i.redeemed_at IS NULL AND i.is_revoked = false
         AND i.expires_at > NOW()
         AND EXISTS (
           SELECT 1 FROM access_requests r
           WHERE r.id = i.request_id AND r.status = 'approved'
         )
       RETURNING i.request_id`,
      [input.invitationId]
    );
    if (redeemed.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query(
      `INSERT INTO access_sessions (request_id, session_token_hash, email, expires_at)
       VALUES ($1, $2, LOWER($3), $4)`,
      [redeemed.rows[0].request_id, input.tokenHash, input.email, input.expiresAt]
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findRequestStatusByEmail(email: string) {
  const result = await query(
    'SELECT id, status FROM access_requests WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1',
    [email]
  );
  return result.rows[0];
}

export async function createAccessSession(input: {
  requestId: string;
  tokenHash: string;
  email: string;
  expiresAt: Date;
}) {
  await query(
    `INSERT INTO access_sessions (request_id, session_token_hash, email, expires_at)
     VALUES ($1, $2, LOWER($3), $4)`,
    [input.requestId, input.tokenHash, input.email, input.expiresAt]
  );
}
