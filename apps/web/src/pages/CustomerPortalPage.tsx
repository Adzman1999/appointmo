import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, User, AlertCircle, CheckCircle2, 
  Bell, CalendarDays, RefreshCw, Sparkles,
  MapPin, Phone, Mail, LogOut, ChevronRight, Check
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from 'sonner';

interface CustomerAppointment {
  id: string;
  bookingReference: string;
  status: string;
  startTime: string;
  endTime: string;
  price: string | number;
  currency: string;
  notes?: string;
  createdAt: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  staffId: string;
  staffName: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  managementToken: string;
}

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export const CustomerPortalPage: React.FC = () => {
  const navigate = useNavigate();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'notifications'>('upcoming');

  // Customer & Appointments Data
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [upcoming, setUpcoming] = useState<CustomerAppointment[]>([]);
  const [past, setPast] = useState<CustomerAppointment[]>([]);
  const [cancelled, setCancelled] = useState<CustomerAppointment[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Selected appointment for details modal
  const [selectedAppt, setSelectedAppt] = useState<CustomerAppointment | null>(null);

  // Notification dropdown
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Load authenticated customer data
  const loadCustomerData = async () => {
    const token = localStorage.getItem('appointmo_token');
    const storedUserRaw = localStorage.getItem('appointmo_user');

    if (!token) {
      navigate('/admin/login');
      return;
    }

    if (storedUserRaw) {
      try {
        const u = JSON.parse(storedUserRaw);
        setCustomer({
          id: u.id || '',
          name: u.name || 'Customer Account',
          email: u.email || '',
          phone: u.phone || '',
          createdAt: new Date().toISOString()
        });
      } catch (_) {}
    }

    try {
      setLoading(true);
      setError(null);
      const res: any = await apiFetch('/customer/me');
      setCustomer(res.customer);
      setAppointments(res.appointments || []);
      setUpcoming(res.upcoming || []);
      setPast(res.past || []);
      setCancelled(res.cancelled || []);
      setNotifications(res.notifications || []);
    } catch (err: any) {
      console.error('Failed to load customer profile:', err);
      if (err.status === 401 || err.message?.includes('Unauthorized')) {
        handleSignOut();
      } else {
        setError(err.message || 'Failed to load your account appointments.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, []);

  // Real-time polling every 5 seconds for appointment status changes
  useEffect(() => {
    const token = localStorage.getItem('appointmo_token');
    if (!token) return;

    const interval = setInterval(() => {
      apiFetch<any>('/customer/me')
        .then((res) => {
          setCustomer(res.customer);
          setAppointments(res.appointments || []);
          setUpcoming(res.upcoming || []);
          setPast(res.past || []);
          setCancelled(res.cancelled || []);
          setNotifications(res.notifications || []);
          if (selectedAppt) {
            const found = (res.appointments || []).find((a: any) => a.id === selectedAppt.id);
            if (found) setSelectedAppt(found);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedAppt?.id]);

  const handleSignOut = () => {
    localStorage.removeItem('appointmo_token');
    localStorage.removeItem('appointmo_user');
    localStorage.removeItem('appointmo_auth');
    localStorage.removeItem('appointmo_latest_booking');
    navigate('/admin/login');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleCancelBooking = async (appt: CustomerAppointment) => {
    if (!window.confirm(`Are you sure you want to cancel appointment ${appt.bookingReference}?`)) {
      return;
    }
    try {
      await apiFetch(`/bookings/${appt.bookingReference}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          token: appt.managementToken || `${appt.bookingReference}secret`,
          reason: 'Customer requested cancellation via portal'
        })
      });
      toast.success('Appointment Cancelled');
      setActionSuccess(`Appointment ${appt.bookingReference} has been cancelled.`);
      setSelectedAppt(null);
      loadCustomerData();
    } catch (err: any) {
      toast.error('Cancellation failed', { description: err.message });
      setError(err.message || 'Failed to cancel appointment.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <AppointmoLogo size="sm" showText={false} />
            </div>

            <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 hidden sm:block"></div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold flex items-center justify-center text-xs">
                {customer?.name ? customer.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {customer?.name || 'Customer Account'}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Verified Customer
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 font-medium">
                  {customer?.email || ''}{customer?.phone ? ` • ${customer.phone}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl z-50 overflow-hidden">
                  <div className="p-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
                    <span className="font-bold text-xs text-stone-900 dark:text-stone-100">Notifications</span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">{unreadCount} unread</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-stone-500 dark:text-stone-400">No notifications yet.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/40">
                          <p className="font-semibold text-stone-900 dark:text-stone-100">{n.title}</p>
                          <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />

            <button
              onClick={() => navigate('/browse')}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition text-xs font-semibold"
            >
              Book New
            </button>

            <button
              onClick={() => navigate('/concierge')}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-200 dark:hover:bg-amber-900 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Concierge</span>
            </button>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pt-8">
        {/* Banner Alerts */}
        {actionSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-100 text-xs font-bold">Dismiss</button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 dark:hover:text-rose-100 text-xs font-bold">Dismiss</button>
          </div>
        )}

        {/* Dashboard Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-stone-600 dark:text-stone-300 text-xs font-semibold">Upcoming Bookings</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{upcoming.length}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Ready for visit</div>
          </div>
          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-stone-600 dark:text-stone-300 text-xs font-semibold">Completed Visits</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{past.length}</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 font-medium">Past appointments</div>
          </div>
          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-stone-600 dark:text-stone-300 text-xs font-semibold">Cancelled</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{cancelled.length}</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 font-medium">Archived</div>
          </div>
          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-stone-600 dark:text-stone-300 text-xs font-semibold">Total Bookings</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{appointments.length}</div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center space-x-1 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lifetime account activity</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 mb-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
              activeTab === 'upcoming'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Upcoming ({upcoming.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>History & Past ({past.length + cancelled.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
              activeTab === 'notifications'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications ({notifications.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs text-stone-500 dark:text-stone-400">Loading your account appointments...</p>
          </div>
        ) : activeTab === 'upcoming' ? (
          <div>
            {upcoming.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">No Upcoming Appointments</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    You don't have any pending or confirmed bookings. Explore providers to book your next appointment.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/browse')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow transition"
                >
                  Explore Directory
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map(appt => (
                  <div 
                    key={appt.id}
                    onClick={() => setSelectedAppt(appt)}
                    className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm hover:border-amber-400 dark:hover:border-amber-600 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-semibold">
                            {appt.bookingReference}
                          </span>
                          <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm mt-1">{appt.serviceName}</h4>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{appt.businessName} • {appt.branchName}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          appt.status === 'confirmed' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}>
                          {appt.status}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 space-y-1.5 text-xs">
                        <div className="flex items-center space-x-2 text-stone-700 dark:text-stone-300">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{new Date(appt.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-stone-700 dark:text-stone-300">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appt.durationMinutes} mins)</span>
                        </div>
                        <div className="flex items-center space-x-2 text-stone-700 dark:text-stone-300">
                          <User className="w-3.5 h-3.5 text-stone-400" />
                          <span>Specialist: {appt.staffName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-3 border-t border-stone-100 dark:border-stone-800">
                      <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                        {appt.currency} {Number(appt.price).toFixed(2)}
                      </span>
                      <button className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'history' ? (
          <div className="space-y-4">
            {[...past, ...cancelled].length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center max-w-md mx-auto text-xs text-stone-500">
                No past or archived appointments found.
              </div>
            ) : (
              [...past, ...cancelled].map(appt => (
                <div 
                  key={appt.id}
                  onClick={() => setSelectedAppt(appt)}
                  className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-stone-300 dark:hover:border-stone-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] text-stone-400">{appt.bookingReference}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        appt.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-stone-900 dark:text-stone-100">{appt.serviceName}</p>
                    <p className="text-xs text-stone-500">{appt.businessName} • {new Date(appt.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-xs text-stone-500">No notifications on file.</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="p-4 flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-stone-900 dark:text-stone-100">{n.title}</h5>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">{n.message}</p>
                    <span className="text-[10px] text-stone-400 mt-1 inline-block">
                      {new Date(n.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Appointment Detail Modal */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-bold">
                  {selectedAppt.bookingReference}
                </span>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 mt-1">{selectedAppt.serviceName}</h3>
                <p className="text-xs text-stone-500">{selectedAppt.businessName}</p>
              </div>
              <button onClick={() => setSelectedAppt(null)} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm font-bold">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-stone-400" />
                <span>{new Date(selectedAppt.startTime).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-stone-400" />
                <span>{new Date(selectedAppt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({selectedAppt.durationMinutes} mins)</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-stone-400" />
                <span>Specialist: {selectedAppt.staffName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-stone-400" />
                <span>{selectedAppt.branchName} • {selectedAppt.branchAddress}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              {selectedAppt.status !== 'cancelled' && selectedAppt.status !== 'completed' ? (
                <button
                  type="button"
                  onClick={() => handleCancelBooking(selectedAppt)}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs"
                >
                  Cancel Booking
                </button>
              ) : <div></div>}
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                className="px-5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
