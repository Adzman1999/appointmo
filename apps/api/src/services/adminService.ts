import { seedData } from '../db/seed';
import {
  findAppointmentStatus,
  findDefaultBusinessId,
  getDashboardMetricRows,
  listAppointments as listAppointmentRecords,
  recordAppointmentStatusChange,
  updateAppointmentStatus,
} from '../repositories/adminRepository';

export async function getDashboardMetrics() {
  const businessId = await findDefaultBusinessId();
  const result = await getDashboardMetricRows(businessId);
  const statusCounts: Record<string, number> = {
    completed: 0,
    confirmed: 0,
    cancelled: 0,
    pending: 0,
  };
  for (const row of result.statuses) statusCounts[row.status] = row.count;

  return {
    todayCount: result.todayCount,
    upcomingCount: statusCounts.confirmed || 0,
    completedCount: statusCounts.completed || 0,
    cancelledCount: statusCounts.cancelled || 0,
    totalRevenue: result.totalRevenue,
    servicePopularity: result.servicePopularity,
  };
}

export async function listAppointments(filters: {
  status?: any;
  search?: any;
  limit: string;
  offset: string;
}) {
  return listAppointmentRecords({
    businessId: await findDefaultBusinessId(),
    status: filters.status,
    search: filters.search,
    limit: parseInt(filters.limit, 10),
    offset: parseInt(filters.offset, 10),
  });
}

export async function changeAppointmentStatus(input: {
  appointmentId: string;
  status: unknown;
  reason: unknown;
  changedBy: string;
}) {
  const previousStatus = await findAppointmentStatus(input.appointmentId);
  if (previousStatus === undefined) return false;

  await updateAppointmentStatus(input.appointmentId, input.status);
  await recordAppointmentStatusChange({
    appointmentId: input.appointmentId,
    previousStatus,
    newStatus: input.status,
    reason: input.reason,
    changedBy: input.changedBy,
  });
  return true;
}

export async function ensureLocalSeedData() {
  await seedData();
}
