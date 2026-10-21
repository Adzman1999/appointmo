import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, AlertCircle, CheckCircle2, XCircle, Bell, Check, CalendarDays, RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';

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

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ref.trim() || !token.trim()) return;

    setLoading(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res: any = await apiFetch(`/bookings/${ref.trim()}?token=${token.trim()}`);
      setBooking(res.booking);
      await fetchNotifications(ref, token);
    } catch (err: any) {
      setError(err.message || 'Could not find booking. Please check reference and secret token.');
      setBooking(null);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('ref') && searchParams.get('token')) {
      handleLookup();
    }
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
    <div className="min-h-screen bg-stone-50 py-12 px-4 flex flex-col items-center justify-center">
      <div className="mb-6 cursor-pointer" onClick={() => navigate('/')}>
        <AppointmoLogo size="lg" subtitle="Customer Self-Service Hub" />
      </div>

      <div className="max-w-lg w-full bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm">
        <h1 className="text-xl font-bold text-stone-900 mb-1 text-center">Manage Appointment</h1>
        <p className="text-xs text-stone-500 mb-6 text-center">
          Self-service portal: view details, reschedule to new open slots, cancel, and track updates in real-time.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Live Admin Action Alert */}
        {notifications.some(n => !n.isRead) && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5 animate-pulse">
            <Bell className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">New update from business:</span>{' '}
              {notifications.find(n => !n.isRead)?.title} - {notifications.find(n => !n.isRead)?.message}
            </div>
          </div>
        )}

        {!booking ? (
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Booking Reference</label>
              <input
                type="text"
                required
                placeholder="e.g. APT-1234"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs uppercase font-mono focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Secret Management Token</label>
              <input
                type="text"
                required
                placeholder="Management token provided upon booking"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:border-stone-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white font-semibold py-3 rounded-xl hover:bg-stone-800 transition text-xs shadow disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Find Appointment'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 text-xs text-stone-700">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                <span className="text-stone-400">Status</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                  booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                  booking.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-stone-200 text-stone-800'
                }`}>
                  {booking.status}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-400">Service</span>
                <span className="font-semibold text-stone-900">{booking.serviceName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-400">Specialist</span>
                <span className="font-medium text-stone-900">{booking.staffName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-400">Scheduled Time</span>
                <span className="font-medium text-stone-900">
                  {new Date(booking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-400">Customer</span>
                <span className="font-medium text-stone-900">{booking.customerName}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-stone-200">
                <span className="text-stone-400">Price Snapshot</span>
                <span className="font-bold text-stone-900">₱{booking.price}</span>
              </div>
            </div>

            {/* In-App Customer Notifications Feed */}
            {notifications.length > 0 && (
              <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-800">
                    <Bell className="w-3.5 h-3.5 text-stone-600" />
                    <span>Appointment Updates &amp; Alerts</span>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500">
                    {notifications.filter(n => !n.isRead).length} new
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-2.5 rounded-xl border text-xs transition ${
                        notif.isRead ? 'bg-white border-stone-200 text-stone-600' : 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-medium'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-stone-900">{notif.title}</p>
                          <p className="text-[11px] text-stone-600 mt-0.5">{notif.message}</p>
                          <p className="text-[10px] text-stone-400 mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <button
                            onClick={() => handleMarkNotificationRead(notif.id)}
                            className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center space-x-0.5 ml-2 shrink-0"
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
              <div className="border border-stone-200 rounded-2xl p-4 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-900">
                    <CalendarDays className="w-4 h-4 text-stone-600" />
                    <span>Reschedule Appointment</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReschedule(!showReschedule)}
                    className="text-xs font-semibold text-stone-700 hover:text-stone-900 underline"
                  >
                    {showReschedule ? 'Close' : 'Choose New Time'}
                  </button>
                </div>

                {showReschedule && (
                  <form onSubmit={handleRescheduleBooking} className="space-y-3 pt-2 text-xs">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">New Target Date</label>
                      <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Available Openings</label>
                      {loadingSlots ? (
                        <p className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-400 text-center">
                          Checking available openings...
                        </p>
                      ) : availableSlots.length === 0 ? (
                        <p className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-500 text-center">
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
                                  ? 'bg-stone-900 text-white font-bold border-stone-900'
                                  : 'bg-white text-stone-800 border-stone-200 hover:border-stone-400'
                              }`}
                            >
                              {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Reason for Rescheduling (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Schedule adjustment"
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900 text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={rescheduling || !selectedSlot}
                      className="w-full bg-stone-900 text-white font-semibold py-2.5 rounded-xl hover:bg-stone-800 transition text-xs shadow disabled:opacity-50"
                    >
                      {rescheduling ? 'Rescheduling...' : 'Confirm New Time'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {booking.status !== 'cancelled' ? (
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <label className="block text-xs font-semibold text-stone-700">Cancellation Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule conflict"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="w-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold py-2.5 rounded-xl hover:bg-rose-100 transition text-xs flex items-center justify-center space-x-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{cancelling ? 'Cancelling...' : 'Cancel Appointment'}</span>
                </button>
              </div>
            ) : (
              <div className="text-center p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
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
              className="w-full text-center text-xs text-stone-500 hover:text-stone-800 transition"
            >
              Lookup another appointment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
