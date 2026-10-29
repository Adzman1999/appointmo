import { Request, Response } from 'express';
import { changeAppointmentStatus, ensureLocalSeedData, getDashboardMetrics, listAppointments } from '../services/adminService';

export async function getMetrics(_req: Request, res: Response) {
  try {
    return res.json({ metrics: await getDashboardMetrics() });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
}

export async function getAppointments(req: Request, res: Response) {
  try {
    const { status, search, limit = '50', offset = '0' } = req.query;
    const appointments = await listAppointments({
      status,
      search,
      limit: limit as string,
      offset: offset as string,
    });
    return res.json({ appointments });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
}

export async function updateAppointmentStatus(req: Request, res: Response) {
  try {
    const { status, reason } = req.body || {};
    const updated = await changeAppointmentStatus({
      appointmentId: req.params.id,
      status,
      reason,
      changedBy: req.user?.email || 'admin',
    });
    if (!updated) return res.status(404).json({ error: 'Appointment not found' });
    return res.json({ message: 'Appointment status updated', newStatus: status });
  } catch {
    return res.status(500).json({ error: 'Failed to update appointment status' });
  }
}

export async function ensureSeedData(req: Request, res: Response) {
  try {
    console.log(`Preparing local seed data requested by ${req.user?.email}...`);
    await ensureLocalSeedData();
    return res.json({
      message: 'Seed accounts and the baseline store are ready. Existing appointments and customer records were preserved.',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to prepare local seed data' });
  }
}
