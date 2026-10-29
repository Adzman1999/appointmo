import { Request, Response } from 'express';
import {
  AccessServiceError,
  setUpPassword,
  signInToAccessPortal,
} from '../services/accessService';
import { submitAccessRequest } from '../services/accessRequestService';

const sendAccessError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof AccessServiceError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return res.status(500).json({ error: fallback });
};

export async function submitRequest(req: Request, res: Response) {
  try {
    const result = await submitAccessRequest(req.body);
    return res.status(result.statusCode).json(result.body);
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Please check the information you entered', details: error.errors });
    }
    console.error('Submit access request error:', error);
    return res.status(500).json({ error: 'Unable to submit your request. Please try again shortly.' });
  }
}

export async function setupPassword(req: Request, res: Response) {
  try {
    return res.json(await setUpPassword(req.body?.token, req.body?.password));
  } catch (error) {
    console.error('Setup password error:', error);
    return sendAccessError(res, error, 'Failed to set up password');
  }
}

export async function login(req: Request, res: Response) {
  try {
    return res.json(await signInToAccessPortal(req.body?.email, req.body?.password));
  } catch (error) {
    console.error('Access portal login error:', error);
    return sendAccessError(res, error, 'Login failed');
  }
}

export function getSession(req: Request, res: Response) {
  return res.json({ active: true, user: req.user });
}
