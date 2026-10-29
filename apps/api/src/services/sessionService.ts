import { findAccessSession } from '../repositories/sessionRepository';

export class SessionServiceError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'SessionServiceError';
  }
}

export async function verifyAccessSession(tokenHash: string) {
  const session = await findAccessSession(tokenHash);
  if (!session) throw new SessionServiceError('Session not recognized or expired', 401);
  if (session.revoked_at || session.request_status === 'revoked') {
    throw new SessionServiceError('Access has been revoked', 403);
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    throw new SessionServiceError('Access session has expired', 401);
  }
}
