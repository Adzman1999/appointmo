import { describe, it, expect } from 'vitest';
import { AccessRequestSchema, CreateGuestBookingSchema, ConciergeInquirySchema } from '../src';

describe('Shared Zod Schemas Validation', () => {
  it('validates AccessRequestSchema properly', () => {
    const valid = {
      fullName: 'Dr. Jane Smith',
      email: 'jane@smith.example.com',
      businessName: 'Smith Dermatology',
      message: 'Access request',
      acceptedPrivacy: true,
    };
    expect(() => AccessRequestSchema.parse(valid)).not.toThrow();

    const invalid = {
      fullName: 'A',
      email: 'not-an-email',
      acceptedPrivacy: false,
    };
    expect(() => AccessRequestSchema.parse(invalid)).toThrow();
  });

  it('validates CreateGuestBookingSchema properly', () => {
    const valid = {
      serviceId: '11111111-1111-1111-1111-111111111111',
      startTime: new Date().toISOString(),
      customerName: 'Juan Dela Cruz',
      customerEmail: 'juan@example.ph',
      customerPhone: '+63 917 123 4567',
    };
    expect(() => CreateGuestBookingSchema.parse(valid)).not.toThrow();

    const invalid = {
      serviceId: 'not-a-uuid',
      startTime: 'invalid-date',
    };
    expect(() => CreateGuestBookingSchema.parse(invalid)).toThrow();
  });

  it('validates ConciergeInquirySchema properly', () => {
    const valid = {
      query: 'I want a massage tomorrow',
      preferredTimeOfDay: 'afternoon',
      maxBudget: 1500,
    };
    expect(() => ConciergeInquirySchema.parse(valid)).not.toThrow();
  });
});
