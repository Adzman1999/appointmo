import { describe, it, expect } from 'vitest';
import { DemoAccessRequestSchema, CreateGuestBookingSchema, ConciergeInquirySchema } from '../src';

describe('Shared Zod Schemas Validation', () => {
  it('validates DemoAccessRequestSchema properly', () => {
    const valid = {
      fullName: 'Dr. Jane Smith',
      email: 'jane@smith.demo',
      businessName: 'Smith Dermatology',
      message: 'Demo inquiry',
      acceptedPrivacy: true,
    };
    expect(() => DemoAccessRequestSchema.parse(valid)).not.toThrow();

    const invalid = {
      fullName: 'A',
      email: 'not-an-email',
      acceptedPrivacy: false,
    };
    expect(() => DemoAccessRequestSchema.parse(invalid)).toThrow();
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
