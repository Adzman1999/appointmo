import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, DollarSign, CheckCircle2, Search, Filter, LogOut } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const BusinessDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const mRes: any = await apiFetch('/admin/metrics');
      setMetrics(mRes.metrics);

      let apptUrl = `/admin/appointments?status=${statusFilter}`;
      if (search.trim()) {
        apptUrl += `&search=${encodeURIComponent(search.trim())}`;
      }
      const aRes: any = await apiFetch(apptUrl);
      setAppointments(aRes.appointments || []);
    } catch (err: any) {
      console.error(err);
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
      await apiFetch(`/admin/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setNotice(`Appointment status updated to ${newStatus}`);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('appointmo_token');
    localStorage.removeItem('appointmo_user');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-20 transition-colors">
      {/* Top Navbar */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 py-3.5 px-6 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-base text-stone-900 dark:text-stone-100">Lumière Beauty Studio</span>
            <span className="text-xs text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">Quezon City Branch</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/platform')}
              className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
            >
              Platform Requests
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center space-x-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {notice && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex justify-between items-center">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-emerald-900 dark:text-emerald-100 font-bold">×</button>
          </div>
        )}

        {/* Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Today's Appointments</span>
              <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{metrics.todayCount}</div>
            </div>
            <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Upcoming Confirmed</span>
              <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{metrics.upcomingCount}</div>
            </div>
            <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Completed Bookings</span>
              <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{metrics.completedCount}</div>
            </div>
            <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Completed Revenue</span>
              <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">₱{Number(metrics.totalRevenue).toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Appointment Table Container */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Appointment Records ({appointments.length})</h2>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  placeholder="Search customer, ref, or service..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              </form>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Service</th>
                  <th className="py-3 px-3">Staff</th>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-400 dark:text-stone-500">
                      No appointments matching query.
                    </td>
                  </tr>
                ) : (
                  appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-3 font-mono font-semibold text-stone-900 dark:text-stone-100">{a.bookingReference}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-stone-900 dark:text-stone-100">{a.customerName}</div>
                        <div className="text-[10px] text-stone-400 dark:text-stone-500">{a.customerPhone}</div>
                      </td>
                      <td className="py-3 px-3 text-stone-700 dark:text-stone-300">{a.serviceName}</td>
                      <td className="py-3 px-3 text-stone-600 dark:text-stone-400">{a.staffName}</td>
                      <td className="py-3 px-3 text-stone-500 dark:text-stone-400 text-[11px]">
                        {new Date(a.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-900 dark:text-stone-100">₱{a.price}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] uppercase ${
                          a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          a.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        {a.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(a.id, 'completed')}
                              className="px-2 py-0.5 rounded bg-stone-900 text-white text-[10px] hover:bg-stone-800"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(a.id, 'cancelled')}
                              className="px-2 py-0.5 rounded border border-rose-200 text-rose-600 text-[10px] hover:bg-rose-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
