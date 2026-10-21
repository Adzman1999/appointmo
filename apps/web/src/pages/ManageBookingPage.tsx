import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, AlertCircle, CheckCircle2, XCircle, Bell, Check, CalendarDays, RefreshCw, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { ThemeToggle } from '../components/ThemeToggle';

export const ManageBookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [ref, setRef] = useState(searchParams.get('ref') || '');
  const [token, setToken] = useState(searchParams.get('token') || '');

  const [booking, setBooking] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cancellation state
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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

  const fetchBookingAndNotifications = async (currentRef: string, currentToken: string) => {
    try {
      const [bookingRes, notifRes]: [any, any] = await Promise.all([
        apiFetch(`/bookings/${currentRef.trim()}?token=${currentToken.trim()}`),
        apiFetch(`/bookings/${currentRef.trim()}/notifications?token=${currentToken.trim()}`)
      ]);
      if (bookingRes?.booking) {
        setBooking(bookingRes.booking);
      }
      setNotifications(notifRes?.notifications || []);
    } catch (e) {
      // Non-blocking for periodic polling
    }
  };

  const fetchNotifications = async (currentRef: string, currentToken: string) => {
    try {
      const res: any = await apiFetch(`/bookings/${currentRef.trim()}/notifications?token=${currentToken.trim()}`);
      setNotifications(res.notifications || []);
    } catch (e) {
      // Non-blocking
    }
  };

  const handleLookup = async (targetRef?: string, targetToken?: string) => {
    const activeRef = (targetRef || ref).trim();
    let activeToken = (targetToken || token).trim();

    // Check localStorage fallback if token isn't provided in URL/input
    if (!activeToken) {
      const stored = localStorage.getItem('appointmo_latest_booking');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.bookingReference === activeRef && parsed.managementToken) {
            activeToken = parsed.managementToken;
            setToken(activeToken);
          }
        } catch (_) {}
      }
    }

    // Check seeded token pattern fallback for demo (e.g. APT-UP-01 -> APT-UP-01secret)
    if (!activeToken && activeRef.startsWith('APT-')) {
      activeToken = `${activeRef}secret`;
      setToken(activeToken);
    }

    if (!activeRef || !activeToken) return;

    setLoading(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res: any = await apiFetch(`/bookings/${activeRef}?token=${activeToken}`);
      setBooking(res.booking);
      await fetchNotifications(activeRef, activeToken);
    } catch (err: any) {
      setError(err.message || 'Could not find booking. Please check reference and secret token.');
      setBooking(null);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load on mount: If ref/token provided in URL, or in localStorage, or auto-fetch active demo booking
  useEffect(() => {
    const urlRef = searchParams.get('ref');
    const urlToken = searchParams.get('token');

    if (urlRef && urlToken) {
      handleLookup(urlRef, urlToken);
      return;
    }

    if (urlRef && !urlToken) {
      // Look up via stored token or demo fallback
      handleLookup(urlRef);
      return;
    }

    // Check if user recently booked on this device
    const stored = localStorage.getItem('appointmo_latest_booking');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.bookingReference && parsed.managementToken) {
          setRef(parsed.bookingReference);
          setToken(parsed.managementToken);
          handleLookup(parsed.bookingReference, parsed.managementToken);
          return;
        }
      } catch (_) {}
    }

    // Direct access to demo customer booking: fetch active upcoming demo appointment so customer doesn't have to type anything!
    setLoading(true);
    apiFetch<any>('/demo/admin/demo-active-booking')
      .then((data) => {
        if (data?.bookingReference && data?.token) {
          setRef(data.bookingReference);
          setToken(data.token);
          handleLookup(data.bookingReference, data.token);
        }
      })
      .catch(() => {
        // Fallback to manual form if no bookings exist
      })
      .finally(() => setLoading(false));
  }, []);

  // Poll for notifications and status updates if booking is active
  useEffect(() => {
    if (!booking || !ref || !token) return;
    const interval = setInterval(() => {
      fetchBookingAndNotifications(ref, token);
    }, 5000);
    return () => clearInterval(interval);
  }, [booking, ref, token]);

  // Load available slots when Reschedule section opens or date changes
  useEffect(() => {
    if (!showReschedule || !booking) return;

    setLoadingSlots(true);
    apiFetch<any>(`/availability?serviceId=${booking.serviceId}&staffId=${booking.staffId}&date=${targetDate}`)
      .then((res) => {
        setAvailableSlots(res.slots || []);
        setSelectedSlot(null);
      })
      .catch((err) => {
        console.error('Failed to load slots:', err);
        setAvailableSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [showReschedule, targetDate, booking]);

  const handleMarkNotificationRead = async (notifId: number) => {
    try {
      await apiFetch(`/bookings/${ref.trim()}/notifications/${notifId}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ token: token.trim() })
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
    } catch (err) {
      // ignore
    }
  };

  const handleRescheduleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setRescheduling(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${ref.trim()}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          token: token.trim(),
          newStartTime: selectedSlot.startTime,
          reason: rescheduleReason || 'Customer requested reschedule via portal'
        })
      });

      setActionSuccess('Your appointment has been rescheduled successfully.');
      setShowReschedule(false);
      handleLookup();
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule appointment. The slot may be taken.');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    setCancelling(true);
    setError(null);

    try {
      await apiFetch(`/bookings/${ref.trim()}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ token: token.trim(), reason: cancelReason || 'Customer requested cancellation' }),
      });

      setActionSuccess('Your appointment has been cancelled.');
      handleLookup();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 py-10 px-4 flex flex-col items-center justify-center transition-colors">
      {/* Top Bar with Logo & Theme Toggle */}
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <div className="cursor-pointer" onClick={() => navigate('/')}>
          <AppointmoLogo size="md" subtitle="Customer Self-Service Hub" />
        </div>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <button
            onClick={() => navigate('/browse')}
            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition text-xs font-semibold"
          >
            Directory
          </button>
        </div>
      </div>

      <div className="max-w-lg w-full bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Manage Appointment</h1>
          {booking && (
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {booking.bookingReference}
            </span>
          )}
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
          Customer self-service portal: view details, reschedule to open slots, cancel, and receive instant updates.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Live Admin Action Alert */}
        {notifications.some(n => !n.isRead) && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-2.5 animate-pulse">
            <Bell className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">New update from business:</span>{' '}
              {notifications.find(n => !n.isRead)?.title} - {notifications.find(n => !n.isRead)?.message}
            </div>
          </div>
        )}

        {loading && !booking ? (
          <div className="py-12 text-center text-xs text-stone-500 dark:text-stone-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-400 dark:text-stone-600" />
            <p>Loading your appointment details...</p>
          </div>
        ) : !booking ? (
          <form onSubmit={(e) => { e.preventDefault(); handleLookup(); }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Booking Reference</label>
              <input
                type="text"
                required
                placeholder="e.g. APT-UP-01"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs uppercase font-mono focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Secret Token <span className="text-stone-400 font-normal">(Auto-filled in demo mode)</span>
              </label>
              <input
                type="text"
                placeholder="Management token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold py-3 rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition text-xs shadow disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Find Appointment'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2.5 text-xs text-stone-700 dark:text-stone-300">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200 dark:border-stone-700">
                <span className="text-stone-400 dark:text-stone-500">Status</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                  booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                  booking.status === 'cancelled' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200'
                }`}>
                  {booking.status}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-400 dark:text-stone-500">Service</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{booking.serviceName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-400 dark:text-stone-500">Specialist</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{booking.staffName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-400 dark:text-stone-500">Scheduled Time</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {new Date(booking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-400 dark:text-stone-500">Customer</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{booking.customerName}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
                <span className="text-stone-400 dark:text-stone-500">Price Snapshot</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">₱{booking.price}</span>
              </div>
            </div>

            {/* In-App Customer Notifications Feed */}
            {notifications.length > 0 && (
              <div className="border border-stone-200 dark:border-stone-700 rounded-2xl p-4 bg-stone-50/50 dark:bg-stone-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
                    <Bell className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                    <span>Appointment Updates &amp; Alerts</span>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
                    {notifications.filter(n => !n.isRead).length} new
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-2.5 rounded-xl border text-xs transition ${
                        notif.isRead
                          ? 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                          : 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-medium'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-stone-900 dark:text-stone-100">{notif.title}</p>
                          <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">{notif.message}</p>
                          <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <button
                            onClick={() => handleMarkNotificationRead(notif.id)}
                            className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-semibold flex items-center space-x-0.5 ml-2 shrink-0"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                            <span>Read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rescheduling Panel */}
            {booking.status !== 'cancelled' && (
              <div className="border border-stone-200 dark:border-stone-700 rounded-2xl p-4 bg-white dark:bg-stone-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-900 dark:text-stone-100">
                    <CalendarDays className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                    <span>Reschedule Appointment</span>
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
                  <form onSubmit={handleRescheduleBooking} className="space-y-3 pt-2 text-xs">
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
                        <p className="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-400 text-center">
                          Checking available openings...
                        </p>
                      ) : availableSlots.length === 0 ? (
                        <p className="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 text-center">
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
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Reason for Rescheduling (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Schedule adjustment"
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

            {booking.status !== 'cancelled' ? (
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
                  onClick={handleCancelBooking}
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

            <button
              onClick={() => {
                setBooking(null);
                setNotifications([]);
                setRef('');
                setToken('');
              }}
              className="w-full text-center text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition"
            >
              Lookup another appointment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
