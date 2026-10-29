import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { completePasswordSetup, findSetupToken, findUserByEmail } from '../repositories/accessRepository';
import { createAccessSession, findRequestStatusByEmail } from '../repositories/accessRequestRepository';

export class AccessServiceError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'AccessServiceError';
  }
}

const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export async function setUpPassword(token: unknown, password: unknown) {
  if (typeof token !== 'string' || !token || typeof password !== 'string' || !password) {
    throw new AccessServiceError('Token and new password are required', 400);
  }
  if (password.length < 8) {
    throw new AccessServiceError('Password must be at least 8 characters long', 400);
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const setupToken = await findSetupToken(tokenHash);
  if (!setupToken) throw new AccessServiceError('Invalid or expired setup link', 400);
  if (setupToken.used_at) {
    throw new AccessServiceError('This setup link has already been used. Please sign in with your password.', 400);
  }
  if (new Date(setupToken.expires_at).getTime() < Date.now()) {
    throw new AccessServiceError('This setup link has expired. Please contact support or request access again.', 400);
  }

  const accessRequest = await findRequestStatusByEmail(setupToken.email);
  if (accessRequest?.status === 'revoked') {
    throw new AccessServiceError('Access for this account has been revoked.', 403);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  const sessionToken = jwt.sign(
    {
      userId: setupToken.user_id,
      email: setupToken.email,
      name: setupToken.name,
      role: setupToken.role || 'access_guest',
      businessId: setupToken.business_id,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
  const tokenSession = accessRequest?.id
    ? {
        requestId: accessRequest.id,
        tokenHash: crypto.createHash('sha256').update(sessionToken).digest('hex'),
        email: setupToken.email,
        expiresAt,
      }
    : undefined;

  const completed = await completePasswordSetup({
    tokenId: setupToken.id,
    userId: setupToken.user_id,
    passwordHash,
    accessSession: tokenSession,
  });
  if (!completed) throw new AccessServiceError('This setup link has expired or has already been used.', 400);

  return {
    message: 'Password set successfully! Welcome to Appointmo.',
    token: sessionToken,
    user: {
      id: setupToken.user_id,
      email: setupToken.email,
      name: setupToken.name,
      role: setupToken.role || 'access_guest',
    },
  };
}

export async function signInToAccessPortal(emailInput: unknown, passwordInput: unknown) {
  if (typeof emailInput !== 'string' || !emailInput.trim() || typeof passwordInput !== 'string' || !passwordInput) {
    throw new AccessServiceError('Email and password are required', 400);
  }

  const email = emailInput.toLowerCase().trim();
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(passwordInput, user.password_hash))) {
    throw new AccessServiceError('Invalid email or password', 401);
  }

  let requestId: string | null = null;
  if (user.role === 'access_guest') {
    const accessRequest = await findRequestStatusByEmail(email);
    if (!accessRequest) throw new AccessServiceError('Access request has not been submitted or approved yet.', 403);
    if (accessRequest.status === 'pending') throw new AccessServiceError('Your access request is currently pending review.', 403);
    if (accessRequest.status === 'rejected') throw new AccessServiceError('Your access request was not approved.', 403);
    if (accessRequest.status === 'revoked') throw new AccessServiceError('Your access has been revoked by the administrator.', 403);
    requestId = accessRequest.id;
  }

  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.business_id,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  if (requestId) {
    await createAccessSession({
      requestId,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      email: user.email,
      expiresAt,
    });
  }

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
