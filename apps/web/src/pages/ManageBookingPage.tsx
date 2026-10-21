import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, User, AlertCircle, CheckCircle2, XCircle, 
  Bell, Check, CalendarDays, RefreshCw, Sparkles, Search, 
  History, ArrowRight, ShieldCheck, MapPin, Tag, Phone, Mail, ChevronRight, Filter
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { ThemeToggle } from '../components/ThemeToggle';

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

export const ManageBookingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active view tab in customer dashboard
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'lookup'>('upcoming');

  // Customer Data
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [upcoming, setUpcoming] = useState<CustomerAppointment[]>([]);
  const [past, setPast] = useState<CustomerAppointment[]>([]);
  const [cancelled, setCancelled] = useState<CustomerAppointment[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Selected appointment for detail / manage modal
  const [selectedAppt, setSelectedAppt] = useState<CustomerAppointment | null>(null);

  // Rescheduling state
  const [showReschedule, setShowReschedule] = useState(false);
  const [targetDate, setTargetDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  // Cancellation state
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Manual lookup state (inside tab)
  const [lookupRef, setLookupRef] = useState(searchParams.get('ref') || '');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Load customer portal data
  const loadCustomerPortal = async (custId?: string, email?: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = custId ? `?customerId=${custId}` : email ? `?email=${encodeURIComponent(email)}` : '';
      const res: any = await apiFetch(`/demo/admin/customer-portal${q}`);
      setCustomer(res.customer);
      setAppointments(res.appointments || []);
      setUpcoming(res.upcoming || []);
      setPast(res.past || []);
      setCancelled(res.cancelled || []);
      setNotifications(res.notifications || []);

      // If URL has ref, auto-open that specific appointment
      const urlRef = searchParams.get('ref');
      if (urlRef) {
        const found = (res.appointments || []).find((a: any) => a.bookingReference === urlRef);
        if (found) {
          setSelectedAppt(found);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load customer appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if recent booking in localStorage has customer info
    const stored = localStorage.getItem('appointmo_latest_booking');
    let emailFallback: string | undefined;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.customerEmail) emailFallback = parsed.customerEmail;
      } catch (_) {}
    }

    loadCustomerPortal(undefined, emailFallback);
  }, []);

  // Poll for updates every 6 seconds to capture admin approvals / status updates in real-time
  useEffect(() => {
    if (!customer?.id) return;
    const interval = setInterval(() => {
      apiFetch<any>(`/demo/admin/customer-portal?customerId=${customer.id}`)
        .then((res) => {
          setAppointments(res.appointments || []);
          setUpcoming(res.upcoming || []);
          setPast(res.past || []);
          setCancelled(res.cancelled || []);
          setNotifications(res.notifications || []);

          if (selectedAppt) {
            const updated = (res.appointments || []).find((a: any) => a.id === selectedAppt.id);
            if (updated) setSelectedAppt(updated);
          }
        })
        .catch(() => {});
    }, 6000);

    return () => clearInterval(interval);
  }, [customer?.id, selectedAppt?.id]);

  // Load available slots when Reschedule section opens or date changes
  useEffect(() => {
    if (!showReschedule || !selectedAppt) return;

    setLoadingSlots(true);
    apiFetch<any>(`/availability?serviceId=${selectedAppt.serviceId}&staffId=${selectedAppt.staffId}&date=${targetDate}`)
      .then((res) => {
        setAvailableSlots(res.slots || []);
        setSelectedSlot(null);
      })
      .catch((err) => {
        console.error('Failed to load slots:', err);
        setAvailableSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [showReschedule, targetDate, selectedAppt]);

  // Handle Reschedule
  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedAppt) return;

    setRescheduling(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${selectedAppt.bookingReference}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          token: selectedAppt.managementToken,
          newStartTime: selectedSlot.startTime,
          reason: rescheduleReason || 'Customer requested reschedule via self-service portal'
        })
      });

      setActionSuccess(`Appointment ${selectedAppt.bookingReference} rescheduled successfully!`);
      setShowReschedule(false);
      if (customer?.id) loadCustomerPortal(customer.id);
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule appointment. The slot may be taken.');
    } finally {
      setRescheduling(false);
    }
  };

  // Handle Cancel
  const handleCancel = async () => {
    if (!selectedAppt) return;
    if (!window.confirm(`Are you sure you want to cancel appointment ${selectedAppt.bookingReference}?`)) return;

    setCancelling(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${selectedAppt.bookingReference}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          token: selectedAppt.managementToken,
          reason: cancelReason || 'Customer requested cancellation via portal'
        }),
      });

      setActionSuccess(`Appointment ${selectedAppt.bookingReference} has been cancelled.`);
      if (customer?.id) loadCustomerPortal(customer.id);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  // Handle Manual Reference Lookup inside the portal
  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupRef.trim()) return;

    setLookupLoading(true);
    setLookupError(null);

    try {
      const token = `${lookupRef.trim()}secret`;
      const res: any = await apiFetch(`/bookings/${lookupRef.trim()}?token=${token}`);
      if (res?.booking) {
        setSelectedAppt({
          ...res.booking,
          managementToken: token,
        });
        setActiveTab('upcoming');
        setActionSuccess(`Loaded appointment ${res.booking.bookingReference}`);
      }
    } catch (err: any) {
      setLookupError('Could not find that appointment reference. Please verify the code.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleMarkNotificationRead = async (notifId: number, refCode: string) => {
    try {
      await apiFetch(`/bookings/${refCode}/notifications/${notifId}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ token: `${refCode}secret` })
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* Top Customer Portal Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <AppointmoLogo size="sm" showText={false} />
            </div>

            <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 hidden sm:block"></div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold flex items-center justify-center text-xs">
                {customer?.name ? customer.name.charAt(0) : 'C'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {customer?.name || 'Customer Account'}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Active Demo User
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 font-medium">
                  {customer?.email || 'customer@example.com'} • {customer?.phone || '+63 900 000 0000'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />
            <button
              onClick={() => navigate('/browse')}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition text-xs font-semibold"
            >
              Book New
            </button>
            <button
              onClick={() => navigate('/demo/concierge')}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-200 dark:hover:bg-amber-900 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Concierge</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
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

        {/* Unread Live Notifications Feed */}
        {notifications.some(n => !n.isRead) && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold">
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Live Updates From Business</span>
            </div>
            {notifications.filter(n => !n.isRead).map((n) => (
              <div key={n.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-amber-200 dark:border-amber-800">
                <div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-[11px] text-stone-600 dark:text-stone-300">{n.message}</p>
                </div>
                <button
                  onClick={() => handleMarkNotificationRead(n.id, n.bookingReference)}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 text-[10px] font-bold shrink-0 ml-3"
                >
                  Mark Read
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-stone-600 dark:text-stone-300 text-xs font-semibold">Upcoming Bookings</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{upcoming.length}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1 font-medium">
              <Clock className="w-3 h-3" />
              <span>Ready for visit</span>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-stone-600 dark:text-stone-300 text-xs font-semibold">Completed Visits</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{past.length}</div>
            <div className="text-[10px] text-stone-600 dark:text-stone-300 mt-1 flex items-center space-x-1 font-medium">
              <History className="w-3 h-3" />
              <span>Past appointments</span>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-stone-600 dark:text-stone-300 text-xs font-semibold">Cancelled</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{cancelled.length}</div>
            <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 flex items-center space-x-1 font-medium">
              <XCircle className="w-3 h-3" />
              <span>Archived</span>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-stone-600 dark:text-stone-300 text-xs font-semibold">Total Bookings</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{appointments.length}</div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center space-x-1 font-medium">
              <Sparkles className="w-3 h-3" />
              <span>Lifetime demo activity</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'upcoming'
                  ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'history'
                  ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              History &amp; Past ({past.length + cancelled.length})
            </button>
            <button
              onClick={() => setActiveTab('lookup')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1 ${
                activeTab === 'lookup'
                  ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <Search className="w-3 h-3" />
              <span>Find by Code</span>
            </button>
          </div>

          <button
            onClick={() => loadCustomerPortal(customer?.id)}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Refresh appointments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* TAB 1: UPCOMING APPOINTMENTS */}
        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {upcoming.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center max-w-md mx-auto space-y-3">
                <CalendarDays className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">No Upcoming Appointments</h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                  You don't have any pending or confirmed bookings. Explore providers to book your next appointment.
                </p>
                <button
                  onClick={() => navigate('/browse')}
                  className="bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-300 transition"
                >
                  Explore Directory
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => { setSelectedAppt(appt); setShowReschedule(false); }}
                    className={`p-6 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
                      selectedAppt?.id === appt.id
                        ? 'bg-amber-50/40 dark:bg-stone-900 border-amber-400 dark:border-amber-400 ring-2 ring-amber-400/20'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {appt.bookingReference}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {appt.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">{appt.serviceName}</h3>
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 font-medium">{appt.businessName}</p>

                      <div className="space-y-1.5 mt-4 text-xs text-stone-700 dark:text-stone-200 bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            {new Date(appt.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                          <span>Specialist: <strong className="text-stone-900 dark:text-stone-100">{appt.staffName}</strong></span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                          <span className="truncate">{appt.branchName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 text-xs">
                      <span className="font-bold text-stone-900 dark:text-stone-100">₱{appt.price}</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                        <span>Manage &amp; Reschedule</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HISTORY & PAST */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {[...past, ...cancelled].length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center max-w-md mx-auto space-y-2">
                <History className="w-10 h-10 text-stone-400 dark:text-stone-500 mx-auto" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">No History Yet</h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">Past completed and cancelled visits will be archived here.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800 shadow-sm">
                {[...past, ...cancelled].map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => { setSelectedAppt(appt); setShowReschedule(false); }}
                    className="p-4 sm:p-5 hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{appt.bookingReference}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          appt.status === 'completed'
                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-stone-900 dark:text-stone-100">{appt.serviceName}</div>
                      <div className="text-stone-600 dark:text-stone-300 font-medium">{appt.businessName} • Specialist: {appt.staffName}</div>
                    </div>

                    <div className="flex sm:flex-col sm:items-end justify-between text-stone-600 dark:text-stone-300 font-medium">
                      <div>{new Date(appt.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="font-bold text-stone-900 dark:text-stone-100">₱{appt.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FIND APPOINTMENT BY CODE */}
        {activeTab === 'lookup' && (
          <div className="max-w-md mx-auto bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-sm">
            <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 mb-1">Find Booking by Reference</h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 mb-6 font-medium">
              Enter any booking reference code to quickly load and manage that appointment.
            </p>

            {lookupError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}

            <form onSubmit={handleManualLookup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Booking Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APT-UP-14"
                  value={lookupRef}
                  onChange={(e) => setLookupRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs uppercase font-mono focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold py-3 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition text-xs shadow disabled:opacity-50"
              >
                {lookupLoading ? 'Locating...' : 'Open Appointment'}
              </button>
            </form>
          </div>
        )}

        {/* SELECTED APPOINTMENT MANAGEMENT MODAL / DRAWER */}
        {selectedAppt && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                      {selectedAppt.bookingReference}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedAppt.status === 'confirmed'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : selectedAppt.status === 'cancelled'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200'
                    }`}>
                      {selectedAppt.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-2">{selectedAppt.serviceName}</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{selectedAppt.businessName}</p>
                </div>

                <button
                  onClick={() => setSelectedAppt(null)}
                  className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Appointment details summary card */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2.5 text-xs text-stone-700 dark:text-stone-300">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Scheduled Time</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {new Date(selectedAppt.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Staff Specialist</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedAppt.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Duration</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedAppt.durationMinutes} mins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Location</span>
                  <span className="truncate max-w-[200px] font-semibold text-stone-900 dark:text-stone-100">{selectedAppt.branchName}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Total Price</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">₱{selectedAppt.price}</span>
                </div>
              </div>

              {/* Reschedule Drawer within Modal */}
              {selectedAppt.status !== 'cancelled' && (
                <div className="border border-stone-200 dark:border-stone-700 rounded-2xl p-4 bg-white dark:bg-stone-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-900 dark:text-stone-100">
                      <CalendarDays className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                      <span>Reschedule to New Slot</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReschedule(!showReschedule)}
                      className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white underline"
                    >
                      {showReschedule ? 'Close' : 'Choose New Time'}
                    </button>
                  </div>

                  {showReschedule && (
                    <form onSubmit={handleReschedule} className="space-y-3 pt-2 text-xs">
                      <div>
                        <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">New Target Date</label>
                        <input
                          type="date"
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Available Openings</label>
                        {loadingSlots ? (
                          <p className="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-center font-medium">
                            Checking calendar openings...
                          </p>
                        ) : availableSlots.length === 0 ? (
                          <p className="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-center font-medium">
                            No open slots on this date with your specialist. Please pick another date.
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1">
                            {availableSlots.map((slot, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={`p-2 rounded-xl border text-center transition ${
                                  selectedSlot?.startTime === slot.startTime
                                    ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold border-stone-900 dark:border-amber-400'
                                    : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:border-stone-400'
                                }`}
                              >
                                {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Reason for Reschedule (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Work schedule change"
                          value={rescheduleReason}
                          onChange={(e) => setRescheduleReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={rescheduling || !selectedSlot}
                        className="w-full bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold py-2.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition text-xs shadow disabled:opacity-50"
                      >
                        {rescheduling ? 'Rescheduling...' : 'Confirm New Time'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Cancellation Option */}
              {selectedAppt.status !== 'cancelled' ? (
                <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">Cancellation Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Schedule conflict"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold py-2.5 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/60 transition text-xs flex items-center justify-center space-x-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{cancelling ? 'Cancelling...' : 'Cancel Appointment'}</span>
                  </button>
                </div>
              ) : (
                <div className="text-center p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs">
                  This appointment is marked as cancelled.
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="w-full text-center text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
