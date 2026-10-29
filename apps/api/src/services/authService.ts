import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import {
  emailBelongsToAnotherAccount,
  emailInUse,
  findAccountForUpdate,
  findBusinessIdentity,
  findUserForLogin,
  registerCustomerAccount,
  updateAccount as updateAccountRecord,
} from '../repositories/authRepository';

export class AuthServiceError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

export type LoginInput = {
  email?: unknown;
  password?: unknown;
};

export async function signIn(input: LoginInput) {
  if (typeof input.email !== 'string' || !input.email.trim() || typeof input.password !== 'string' || !input.password) {
    throw new AuthServiceError('Email and password are required', 400);
  }

  const email = input.email.toLowerCase().trim();
  const user = await findUserForLogin(email);
  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
    throw new AuthServiceError('Invalid email or password', 401);
  }

  const accountStatusErrors: Record<string, string> = {
    rejected: 'Your account registration request was not approved. Please contact support.',
    suspended: 'Your account has been suspended by the administrator. Please contact support for assistance.',
    disabled: 'Your account is disabled. Please contact the platform administrator to reactivate your access.',
    deactivated: 'Your account is disabled. Please contact the platform administrator to reactivate your access.',
    revoked: 'Your account access has been revoked by the administrator.',
  };
  const statusError = accountStatusErrors[user.status];
  if (statusError) throw new AuthServiceError(statusError, 403);

  const business = user.business_id ? await findBusinessIdentity(user.business_id) : undefined;
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

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || null,
      role: user.role,
      status: user.status,
      businessId: user.business_id,
      businessSlug: business?.slug,
      businessName: business?.name,
    },
  };
}

export type RegisterInput = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
};

export async function registerCustomer(input: RegisterInput) {
  const { name, email, password, phone } = input;
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    throw new AuthServiceError('Name, email, and password are required', 400);
  }

  if (password.length < 8) {
    throw new AuthServiceError('Password must be at least 8 characters long.', 400);
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    throw new AuthServiceError('Password must contain both uppercase and lowercase letters.', 400);
  }
  if (!/[0-9]/.test(password)) {
    throw new AuthServiceError('Password must contain at least one number (0-9).', 400);
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new AuthServiceError('Password must contain at least one special character (!@#$%^&* etc.).', 400);
  }

  const emailNorm = email.toLowerCase().trim();
  if (await emailInUse(emailNorm)) {
    throw new AuthServiceError('An account with this email already exists. Please sign in instead.', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await registerCustomerAccount({
    name: name.trim(),
    email: emailNorm,
    passwordHash,
    phone: typeof phone === 'string' && phone ? phone : null,
  });

  if (!user) {
    throw new AuthServiceError('An account with this email already exists. Please sign in instead.', 409);
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

  return {
    message: 'Account created successfully! Welcome to Appointmo.',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || null,
      role: user.role,
      status: user.status,
    },
  };
}

export type UpdateAccountInput = {
  authorization?: string;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  currentPassword?: unknown;
  newPassword?: unknown;
};

export async function updateAccount(input: UpdateAccountInput) {
  if (!input.authorization?.startsWith('Bearer ')) {
    throw new AuthServiceError('Authentication required', 401);
  }

  let decoded: any;
  try {
    decoded = jwt.verify(input.authorization.split(' ')[1], config.jwtSecret);
  } catch {
    throw new AuthServiceError('Invalid or expired session token', 401);
  }

  const userId = decoded.userId || decoded.id;
  if (!userId) throw new AuthServiceError('Invalid session', 401);

  const currentUser = await findAccountForUpdate(String(userId));
  if (!currentUser) throw new AuthServiceError('User account not found', 404);

  const newPassword = typeof input.newPassword === 'string' ? input.newPassword.trim() : '';
  if (newPassword) {
    if (typeof input.currentPassword !== 'string' || !input.currentPassword) {
      throw new AuthServiceError('Current password is required to set a new password', 400);
    }
    if (!(await bcrypt.compare(input.currentPassword, currentUser.password_hash))) {
      throw new AuthServiceError('Current password does not match', 400);
    }
    if (newPassword.length < 6) {
      throw new AuthServiceError('New password must be at least 6 characters', 400);
    }
  }

  const finalEmail = (typeof input.email === 'string' && input.email ? input.email : currentUser.email).toLowerCase().trim();
  if (finalEmail !== currentUser.email && await emailBelongsToAnotherAccount(finalEmail, String(userId))) {
    throw new AuthServiceError('Email address is already in use by another account', 409);
  }

  const finalName = typeof input.name === 'string' && input.name ? input.name.trim() : currentUser.name;
  const finalPhone = input.phone !== undefined
    ? typeof input.phone === 'string' ? input.phone.trim() : ''
    : currentUser.phone;
  const passwordHash = newPassword
    ? await bcrypt.hash(newPassword, 10)
    : currentUser.password_hash;
  const updatedUser = await updateAccountRecord({
    userId: String(userId),
    name: finalName,
    email: finalEmail,
    phone: finalPhone,
    passwordHash,
  });

  if (!updatedUser) throw new AuthServiceError('User account not found', 404);

  const token = jwt.sign(
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

  return {
    message: 'Account details updated successfully',
    token,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      role: updatedUser.role,
      status: updatedUser.status,
      businessId: updatedUser.business_id,
    },
  };
}
