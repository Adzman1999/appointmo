import { z } from 'zod';

export const DemoAccessRequestSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  businessName: z.string().optional().default(''),
  message: z.string().optional().default(''),
  acceptedPrivacy: z.boolean().refine(val => val === true, 'You must accept the privacy notice')
});

export type DemoAccessRequestInput = z.infer<typeof DemoAccessRequestSchema>;

export const DemoAccessStatusSchema = z.enum(['pending', 'approved', 'rejected', 'revoked']);
export type DemoAccessStatus = z.infer<typeof DemoAccessStatusSchema>;

export const AppointmentStatusSchema = z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled']);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const CreateGuestBookingSchema = z.object({
  serviceId: z.string().uuid('Valid service ID required'),
  staffId: z.string().uuid('Valid staff ID required').optional(),
  startTime: z.string().datetime({ message: 'Valid ISO start timestamp required' }),
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  customerEmail: z.string().email('Valid email address required'),
  customerPhone: z.string().min(7, 'Valid phone number required'),
  notes: z.string().optional().default('')
});

export type CreateGuestBookingInput = z.infer<typeof CreateGuestBookingSchema>;

export const ConciergeInquirySchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters'),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening', 'any']).optional(),
  maxBudget: z.number().positive().optional(),
  preferredStaffId: z.string().uuid().optional()
});

export type ConciergeInquiryInput = z.infer<typeof ConciergeInquirySchema>;

export interface BusinessProfile {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  branches: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
  }>;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  category: string;
}

export interface StaffItem {
  id: string;
  name: string;
  bio: string;
  avatarUrl?: string;
  eligibleServices: string[];
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  staffId: string;
  staffName: string;
}

export interface BookingDetails {
  id: string;
  bookingReference: string;
  status: AppointmentStatus;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  currency: string;
  staffId: string;
  staffName: string;
  branchName: string;
  branchAddress: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
  managementToken?: string;
  createdAt: string;
}

export interface RecommendationResult {
  service: ServiceItem;
  staff: StaffItem;
  slot: AvailableSlot;
  matchScore: number;
  matchReasons: string[];
}
