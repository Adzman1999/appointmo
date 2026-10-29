import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AccessRequestSchema } from '@appointmo/shared';
import { config } from '../config';
import {
  createRequest,
  redeemInvitationAndCreateSession,
  findInvitationByHash,
  findRequestByEmail,
  listRequests as listRequestRecords,
  approveRequest as approveRequestRecord,
  resubmitRequest,
  revokeRequest as revokeRequestRecord,
} from '../repositories/accessRequestRepository';

export class AccessRequestServiceError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'AccessRequestServiceError';
  }
}

const accessRequestConfirmation = "Thanks for reaching out! We've received your request. You'll receive an email when your access is ready.";

export async function submitAccessRequest(input: unknown) {
  const parsed = AccessRequestSchema.parse(input);
  const email = parsed.email.toLowerCase().trim();
  const existing = await findRequestByEmail(email);
  if (existing?.status === 'pending' || existing?.status === 'approved') {
    return {
      statusCode: 200,
      body: {
        message: accessRequestConfirmation,
        status: existing.status,
        requestId: existing.id,
      },
    };
  }

  const requestInput = {
    fullName: parsed.fullName,
    email,
    businessName: parsed.businessName,
    message: parsed.message,
  };
  const request = existing
    ? await resubmitRequest(requestInput)
    : await createRequest(requestInput);
  return {
    statusCode: 201,
    body: {
      message: accessRequestConfirmation,
      status: 'pending',
      request,
    },
  };
}

export function listAccessRequests(status?: string) {
  return listRequestRecords(status);
}

export async function approveAccessRequest(id: string, actorId: string) {
  const rawInvitationToken = 'inv_' + crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
  const tokenHint = rawInvitationToken.slice(0, 8) + '...';
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const request = await approveRequestRecord({ id, actorId, tokenHash, tokenHint, expiresAt });
  if (!request) return null;

  return {
    message: 'Access request approved successfully',
    invitationToken: rawInvitationToken,
    expiresAt: expiresAt.toISOString(),
    invitationUrl: `/access/redeem?token=${rawInvitationToken}`,
  };
}

export async function revokeAccessRequest(id: string) {
  return revokeRequestRecord(id);
}

export async function redeemAccessInvitation(token: unknown) {
  if (typeof token !== 'string' || !token) {
    throw new AccessRequestServiceError('Invitation token is required', 400);
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const invitation = await findInvitationByHash(tokenHash);
  if (!invitation) {
    throw new AccessRequestServiceError('Invalid or non-existent invitation token', 404);
  }
  if (invitation.is_revoked || invitation.status === 'revoked') {
    throw new AccessRequestServiceError('This invitation has been revoked by the administrator', 403);
  }
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw new AccessRequestServiceError('This invitation token has expired', 403);
  }
  if (invitation.redeemed_at || invitation.status !== 'approved') {
    throw new AccessRequestServiceError('This invitation has already been used or is no longer active', 403);
  }

  const sessionToken = jwt.sign(
    {
      userId: invitation.request_id,
      email: invitation.email,
      name: invitation.full_name,
      role: 'access_guest',
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const redeemed = await redeemInvitationAndCreateSession({
    invitationId: invitation.id,
    tokenHash: crypto.createHash('sha256').update(sessionToken).digest('hex'),
    email: invitation.email,
    expiresAt,
  });
  if (!redeemed) {
    throw new AccessRequestServiceError('This invitation has already been used, revoked, or expired', 403);
  }

  return {
    message: 'Invitation accepted',
    token: sessionToken,
    user: {
      email: invitation.email,
      name: invitation.full_name,
      role: 'access_guest',
    },
  };
}
