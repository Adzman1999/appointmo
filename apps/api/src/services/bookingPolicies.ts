export const getCustomerChangeCutoffHours = (bookingPolicies: unknown): number => {
  let policies = bookingPolicies;
  if (typeof policies === 'string') {
    try {
      policies = JSON.parse(policies);
    } catch {
      return 0;
    }
  }

  const configuredHours = Number((policies as { customerChangeCutoffHours?: unknown } | null)?.customerChangeCutoffHours);
  return Number.isFinite(configuredHours) ? Math.min(168, Math.max(0, configuredHours)) : 0;
};

export const getCustomerChangeBlockMessage = (startTime: unknown, cutoffHours: number): string | null => {
  const appointmentStart = Date.parse(String(startTime ?? ''));
  if (!Number.isFinite(appointmentStart)) return null;

  const timeUntilStart = appointmentStart - Date.now();
  if (timeUntilStart <= 0) return 'Appointments cannot be changed after they start.';
  if (cutoffHours > 0 && timeUntilStart <= cutoffHours * 60 * 60 * 1000) {
    return `This store requires at least ${cutoffHours} hour(s) of notice to cancel or reschedule.`;
  }
  return null;
};
