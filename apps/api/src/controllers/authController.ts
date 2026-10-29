import { Request, Response } from 'express';
import { AuthServiceError, registerCustomer, signIn, updateAccount } from '../services/authService';

const sendServiceError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof AuthServiceError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  return res.status(500).json({ error: `${fallback}: ${message}` });
};

export async function login(req: Request, res: Response) {
  try {
    return res.json(await signIn(req.body || {}));
  } catch (error) {
    console.error('Login error:', error);
    return sendServiceError(res, error, 'Authentication failed');
  }
}

export async function register(req: Request, res: Response) {
  try {
    return res.status(201).json(await registerCustomer(req.body || {}));
  } catch (error) {
    if (!(error instanceof AuthServiceError)) console.error('Registration error:', error);
    return sendServiceError(res, error, 'Registration failed');
  }
}

export async function updateCurrentAccount(req: Request, res: Response) {
  try {
    return res.json(await updateAccount({
      ...(req.body || {}),
      authorization: req.headers.authorization,
    }));
  } catch (error) {
    console.error('Update account error:', error);
    return sendServiceError(res, error, 'Failed to update account');
  }
}
