import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, DollarSign, CheckCircle2, RotateCcw, 
  Search, Filter, Clock, ArrowRight, Sparkles, Building2, 
  Check, X, AlertTriangle, Shield 
} from 'lucide-react';
import { apiFetch } from '../lib/api';

export const DemoAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const mRes: any = await apiFetch('/demo/admin/metrics');
      setMetrics(mRes.metrics);

      let apptUrl = `/demo/admin/appointments?status=${statusFilter}`;
      if (search.trim()) {
        apptUrl += `&search=${encodeURIComponent(search.trim())}`;
      }
      const aRes: any = await apiFetch(apptUrl);
      setAppointments(aRes.appointments || []);
    } catch (err: any) {
      console.error(err);
      setErrorNotice(err.message || 'Failed to load demo dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await apiFetch(`/demo/admin/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setNotice(`Appointment status updated to ${newStatus}`);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleResetDemoData = async () => {
    if (!confirm('Reset Lumière Beauty Studio demo data to original clean synthetic state (125 bookings)?')) return;
    setResetting(true);
    try {
      const res: any = await apiFetch('/demo/admin/reset', { method: 'POST' });
      setNotice(res.message);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-20">
      {/* Top Banner indicating Fictional Demo Environment */}
      <div className="bg-stone-900 text-stone-200 py-2 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">Interactive Admin Demo:</span>
            <span>Operating on fictional synthetic business (Lumière Beauty Studio). No real accounts or customers.</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/demo/book')}
              className="text-white hover:text-amber-300 font-semibold underline text-xs"
            >
              Switch to Customer Booking Demo &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="bg-white border-b border-stone-200 py-3.5 px-6 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-base shadow">
              L
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-stone-900">Lumière Beauty Studio</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Fictional Studio Demo
                </span>
              </div>
              <p className="text-[11px] text-stone-500">Suite 404, Fictional Innovation Tower, Quezon City</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleResetDemoData}
              disabled={resetting}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition shadow-sm"
              title="Reset synthetic demo records to original 125 bookings"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-amber-700 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Resetting...' : 'Reset Demo Data'}</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition text-xs font-semibold"
            >
              Exit to Home
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Notice Alerts */}
        {notice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dashboard Title & Quick Insight */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Salon Operations &amp; Appointments</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Real-time schedule derived from PostgreSQL bookings, synthetic staff working hours, and genuine availability.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/demo/concierge')}
              className="inline-flex items-center space-x-1.5 bg-stone-900 text-white text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-stone-800 transition shadow"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Test Concierge Booking</span>
            </button>
          </div>
        </div>

        {/* KPI Metric Cards (Calculated directly from DB) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Today's Bookings</div>
            <div className="text-2xl font-bold text-stone-900 mt-2">{metrics?.todayCount ?? '—'}</div>
            <div className="text-[11px] text-stone-400 mt-1">Confirmed appointments for today</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Upcoming Confirmed</div>
            <div className="text-2xl font-bold text-emerald-700 mt-2">{metrics?.upcomingCount ?? '—'}</div>
            <div className="text-[11px] text-stone-400 mt-1">Scheduled next 7 days</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Completed Sessions</div>
            <div className="text-2xl font-bold text-stone-900 mt-2">{metrics?.completedCount ?? '—'}</div>
            <div className="text-[11px] text-stone-400 mt-1">Past 30 days</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Completed Revenue</div>
            <div className="text-2xl font-bold text-stone-900 mt-2">
              ₱{metrics ? Number(metrics.totalRevenue).toLocaleString() : '—'}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">Synthetic studio earnings</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'all', label: 'All Records' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'pending', label: 'Pending' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  statusFilter === f.key
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search customer, service, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900 transition"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          </form>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Booking Ref</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Service</th>
                  <th className="px-5 py-3.5">Staff</th>
                  <th className="px-5 py-3.5">Schedule</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading && appointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-stone-400">
                      Loading appointments from database...
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-stone-400">
                      No appointments matching this query. Try selecting "All Records".
                    </td>
                  </tr>
                ) : (
                  appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-stone-50/70 transition">
                      <td className="px-5 py-3.5 font-mono font-semibold text-stone-900">
                        {appt.bookingReference}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-stone-900">{appt.customerName}</div>
                        <div className="text-stone-400 text-[11px]">{appt.customerPhone}</div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-stone-800">
                        {appt.serviceName}
                      </td>
                      <td className="px-5 py-3.5 text-stone-600">
                        {appt.staffName}
                      </td>
                      <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">
                        <div>{new Date(appt.startTime).toLocaleDateString()}</div>
                        <div className="text-[11px] text-stone-400">
                          {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(appt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-stone-900">
                        ₱{Number(appt.price).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            appt.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : appt.status === 'completed'
                              ? 'bg-stone-100 text-stone-700'
                              : appt.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {appt.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {appt.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-stone-900 text-white font-medium text-[11px] hover:bg-stone-800 transition"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 font-medium text-[11px] hover:bg-rose-50 transition"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {appt.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-medium text-[11px] hover:bg-emerald-800 transition"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                              className="px-2.5 py-1 rounded-lg border border-stone-200 text-stone-600 font-medium text-[11px] hover:bg-stone-100 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {appt.status === 'cancelled' && (
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                            className="px-2.5 py-1 rounded-lg border border-stone-300 text-stone-700 font-medium text-[11px] hover:bg-stone-100 transition"
                          >
                            Re-Open
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
