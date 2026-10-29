import { query } from '../db';

export async function findAccessSession(tokenHash: string) {
  const result = await query(
    `SELECT s.id, s.revoked_at, s.expires_at, r.status AS request_status
     FROM access_sessions s
     JOIN access_requests r ON s.request_id = r.id
     WHERE s.session_token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0];
}
