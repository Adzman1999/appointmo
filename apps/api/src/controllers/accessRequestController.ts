import { Request, Response } from 'express';
import {
  AccessRequestServiceError,
  approveAccessRequest,
  listAccessRequests,
  redeemAccessInvitation,
  revokeAccessRequest,
  submitAccessRequest,
} from '../services/accessRequestService';

export async function submitRequest(req: Request, res: Response) {
  try {
    const result = await submitAccessRequest(req.body);
    return res.status(result.statusCode).json(result.body);
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Unable to submit your access request' });
  }
}

export async function listRequests(req: Request, res: Response) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    return res.json({ requests: await listAccessRequests(status) });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch access requests' });
  }
}

export async function approveRequest(req: Request, res: Response) {
  try {
    const result = await approveAccessRequest(req.params.id, req.user?.userId || 'admin');
    if (!result) return res.status(404).json({ error: 'Request not found' });
    return res.json(result);
  } catch (error) {
    console.error('Approve access request error:', error);
    return res.status(500).json({ error: 'Failed to approve request' });
  }
}

export async function revokeRequest(req: Request, res: Response) {
  try {
    const revoked = await revokeAccessRequest(req.params.id);
    if (!revoked) return res.status(404).json({ error: 'Request not found' });
    return res.json({ message: 'Access request and related invitations revoked successfully' });
  } catch {
    return res.status(500).json({ error: 'Failed to revoke request' });
  }
}

export async function redeemInvitation(req: Request, res: Response) {
  try {
    return res.json(await redeemAccessInvitation(req.body?.token));
  } catch (error) {
    if (error instanceof AccessRequestServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to redeem invitation' });
  }
}
