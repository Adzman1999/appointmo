import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, User, AlertCircle, CheckCircle2, XCircle, 
  Bell, Check, CalendarDays, RefreshCw, Sparkles, Search, 
  History, ArrowRight, ShieldCheck, MapPin, Tag, Phone, Mail, ChevronRight, Filter, Download, ExternalLink, Repeat, Info, LogOut
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

export const ManageBookingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active view tab in customer dashboard
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'notifications' | 'lookup'>('upcoming');

  // Search filter across appointments list
  const [searchFilter, setSearchFilter] = useState('');

  // Business store filter (e.g. 'all' or business name/slug)
  const [storeFilter, setStoreFilter] = useState('all');

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

  // Notification dropdown state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Calendar export helper functions
  const downloadIcsFile = (appt: CustomerAppointment) => {
    const start = new Date(appt.startTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const end = new Date(appt.endTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const summary = `${appt.serviceName} at ${appt.businessName}`;
    const description = `Appointment Booking Ref: ${appt.bookingReference}\\nSpecialist: ${appt.staffName}\\nLocation: ${appt.branchAddress || appt.branchName}`;
    const location = `${appt.branchName}, ${appt.branchAddress || ''}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Appointmo//Scheduling System//EN',
      'BEGIN:VEVENT',
      `UID:${appt.bookingReference}@appointmo.com`,
      `DTSTAMP:${start}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${appt.bookingReference}-appointment.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Calendar file downloaded (.ics)');
  };

  const getGoogleCalendarUrl = (appt: CustomerAppointment) => {
    const start = new Date(appt.startTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const end = new Date(appt.endTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(`${appt.serviceName} - ${appt.businessName}`);
    const details = encodeURIComponent(`Booking Reference: ${appt.bookingReference}\nSpecialist: ${appt.staffName}\nService: ${appt.serviceName}`);
    const location = encodeURIComponent(`${appt.branchName}, ${appt.branchAddress || ''}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  };

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
        let found = (res.appointments || []).find((a: any) => a.bookingReference === urlRef);
        if (found) {
          setSelectedAppt(found);
        } else {
          // If not in standard customer demo list, fetch via direct lookup
          const token = searchParams.get('token') || `${urlRef}secret`;
          apiFetch<any>(`/bookings/${urlRef}?token=${token}`)
            .then(directRes => {
              if (directRes?.booking) {
                const loaded = { ...directRes.booking, managementToken: token };
                setSelectedAppt(loaded);
                // Also prepend to appointments list so it is immediately visible in the portal table
                setUpcoming(prev => {
                  if (prev.some(x => x.bookingReference === urlRef)) return prev;
                  return [loaded, ...prev];
                });
                setAppointments(prev => {
                  if (prev.some(x => x.bookingReference === urlRef)) return prev;
                  return [loaded, ...prev];
                });
              }
            })
            .catch(() => {});
        }
      }

      // Check if user has other booked appointments stored in browser session across different stores
      try {
        const listRaw = localStorage.getItem('appointmo_user_bookings');
        if (listRaw) {
          const list: any[] = JSON.parse(listRaw);
          const currentRefs = new Set((res.appointments || []).map((a: any) => a.bookingReference));
          const missing = list.filter(item => !currentRefs.has(item.bookingReference));
          
          if (missing.length > 0) {
            Promise.allSettled(
              missing.map(item => apiFetch<any>(`/bookings/${item.bookingReference}?token=${item.managementToken || `${item.bookingReference}secret`}`))
            ).then(results => {
              const extraAppts: any[] = [];
              results.forEach((r, idx) => {
                if (r.status === 'fulfilled' && r.value?.booking) {
                  extraAppts.push({
                    ...r.value.booking,
                    managementToken: missing[idx].managementToken || `${missing[idx].bookingReference}secret`
                  });
                }
              });

              if (extraAppts.length > 0) {
                setAppointments(prev => [...extraAppts, ...prev]);
                setUpcoming(prev => {
                  const newUpcoming = extraAppts.filter(a => a.status === 'confirmed' || a.status === 'pending');
                  return [...newUpcoming, ...prev];
                });
                setPast(prev => {
                  const newPast = extraAppts.filter(a => a.status === 'completed');
                  return [...newPast, ...prev];
                });
                setCancelled(prev => {
                  const newCancelled = extraAppts.filter(a => a.status === 'cancelled');
                  return [...newCancelled, ...prev];
                });
              }
            });
          }
        }
      } catch (_) {}
    } catch (err: any) {
      setError(err.message || 'Failed to load customer appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Prioritize ?email= from query parameters (e.g. from login redirect)
    const urlEmail = searchParams.get('email');
    if (urlEmail) {
      loadCustomerPortal(undefined, urlEmail.trim());
      return;
    }

    // 2. Check logged-in user in localStorage
    const storedUserRaw = localStorage.getItem('appointmo_user');
    if (storedUserRaw) {
      try {
        const u = JSON.parse(storedUserRaw);
        if (u.email && u.role === 'customer') {
          loadCustomerPortal(undefined, u.email.trim());
          return;
        }
      } catch (_) {}
    }

    // 3. Check if recent booking in localStorage has customer info
    const stored = localStorage.getItem('appointmo_latest_booking');
    let emailFallback: string | undefined;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.customerEmail) emailFallback = parsed.customerEmail;
      } catch (_) {}
    }

    loadCustomerPortal(undefined, emailFallback);
  }, [searchParams]);

  // Poll for updates every 4 seconds to capture admin approvals / status updates / new appointments in real-time
  useEffect(() => {
    if (!customer?.id && !customer?.email) return;
    const interval = setInterval(() => {
      const q = customer.id ? `?customerId=${customer.id}` : `?email=${encodeURIComponent(customer.email)}`;
      apiFetch<any>(`/demo/admin/customer-portal${q}`)
        .then((res) => {
          setAppointments(res.appointments || []);
          setUpcoming(res.upcoming || []);
          setPast(res.past || []);
          setCancelled(res.cancelled || []);
          setNotifications(res.notifications || []);

          if (selectedAppt) {
            const updated = (res.appointments || []).find((a: any) => a.id === selectedAppt.id);
            if (updated) {
              setSelectedAppt(prev => ({
                ...updated,
                managementToken: prev?.managementToken || updated.managementToken
              }));
            }
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [customer?.id, customer?.email, selectedAppt?.id]);

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

    // Check if token is available in selectedAppt or in localStorage user bookings
    let tokenToSend = selectedAppt.managementToken;
    if (!tokenToSend) {
      try {
        const stored = localStorage.getItem('appointmo_user_bookings');
        if (stored) {
          const list = JSON.parse(stored);
          const found = list.find((b: any) => b.bookingReference === selectedAppt.bookingReference);
          if (found?.managementToken) tokenToSend = found.managementToken;
        }
      } catch (_) {}
    }
    if (!tokenToSend) {
      tokenToSend = `${selectedAppt.bookingReference}secret`;
    }

    setRescheduling(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${selectedAppt.bookingReference}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          token: tokenToSend,
          newStartTime: selectedSlot.startTime,
          reason: rescheduleReason || 'Customer requested reschedule via self-service portal'
        })
      });

      setActionSuccess(`Appointment ${selectedAppt.bookingReference} rescheduled successfully!`);
      toast.success('Appointment Rescheduled', {
        description: `New slot confirmed for ${selectedAppt.bookingReference}`
      });
      setShowReschedule(false);
      if (customer?.id) loadCustomerPortal(customer.id);
    } catch (err: any) {
      const errMsg = err.message || 'Failed to reschedule appointment. The slot may be taken.';
      setError(errMsg);
      toast.error('Reschedule Failed', { description: errMsg });
    } finally {
      setRescheduling(false);
    }
  };

  // Handle Cancel
  const handleCancel = async () => {
    if (!selectedAppt) return;
    if (!window.confirm(`Are you sure you want to cancel appointment ${selectedAppt.bookingReference}?`)) return;

    let tokenToSend = selectedAppt.managementToken;
    if (!tokenToSend) {
      try {
        const stored = localStorage.getItem('appointmo_user_bookings');
        if (stored) {
          const list = JSON.parse(stored);
          const found = list.find((b: any) => b.bookingReference === selectedAppt.bookingReference);
          if (found?.managementToken) tokenToSend = found.managementToken;
        }
      } catch (_) {}
    }
    if (!tokenToSend) {
      tokenToSend = `${selectedAppt.bookingReference}secret`;
    }

    setCancelling(true);
    setError(null);
    try {
      await apiFetch(`/bookings/${selectedAppt.bookingReference}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          token: tokenToSend,
          reason: cancelReason || 'Customer requested cancellation via portal'
        }),
      });

      setActionSuccess(`Appointment ${selectedAppt.bookingReference} has been cancelled.`);
      toast.info('Appointment Cancelled', {
        description: `Booking ${selectedAppt.bookingReference} has been cancelled.`
      });
      if (customer?.id) loadCustomerPortal(customer.id);
    } catch (err: any) {
      const errMsg = err.message || 'Failed to cancel appointment.';
      setError(errMsg);
      toast.error('Cancellation Failed', { description: errMsg });
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
        toast.success('Appointment Located!', {
          description: `Loaded ${res.booking.bookingReference} (${res.booking.serviceName})`
        });
      }
    } catch (err: any) {
      const errMsg = 'Could not find that appointment reference. Please verify the code.';
      setLookupError(errMsg);
      toast.error('Not Found', { description: errMsg });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleMarkNotificationRead = async (notifId: string | number, refCode?: string) => {
    // Immediately mark as read in local state
    setNotifications(prev => prev.map(n => String(n.id) === String(notifId) ? { ...n, isRead: true } : n));
    try {
      if (refCode) {
        await apiFetch(`/bookings/${refCode}/notifications/${notifId}/read`, {
          method: 'PATCH',
          body: JSON.stringify({ token: `${refCode}secret` })
        });
      } else {
        await apiFetch(`/demo/admin/notifications/${notifId}/read`, {
          method: 'PATCH',
        });
      }
    } catch (_) {
      // In demo mode, fallback to demo/admin endpoint
      apiFetch(`/demo/admin/notifications/${notifId}/read`, { method: 'PATCH' }).catch(() => {});
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    for (const n of unread) {
      try {
        if (n.bookingReference) {
          apiFetch(`/bookings/${n.bookingReference}/notifications/${n.id}/read`, {
            method: 'PATCH',
            body: JSON.stringify({ token: `${n.bookingReference}secret` })
          }).catch(() => {});
        } else {
          apiFetch(`/demo/admin/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
        }
      } catch (_) {}
    }
    toast.success('All notifications marked as read');
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-24 transition-colors">
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
                    Customer Account
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 font-medium">
                  {customer?.email || ''}{customer?.phone ? ` • ${customer.phone}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Notification Bell Dropdown Container */}
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

              {/* Notification Popover Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl z-50 overflow-hidden animate-in fade-in">
                  <div className="p-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-stone-900 dark:text-stone-100">Live Updates</span>
                      <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-semibold">
                        {unreadCount} unread
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[11px] text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white underline font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-stone-500 dark:text-stone-400 font-medium">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 transition flex items-start justify-between gap-3 ${
                            !n.isRead ? 'bg-amber-50/50 dark:bg-amber-950/30' : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                          }`}
                        >
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs">{n.title}</span>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-600 dark:text-stone-300 font-normal leading-relaxed">
                              {n.message}
                            </p>
                            {n.bookingReference && (
                              <span className="inline-block mt-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                                {n.bookingReference}
                              </span>
                            )}
                          </div>
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkNotificationRead(n.id, n.bookingReference);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px] font-bold shrink-0 transition cursor-pointer active:scale-95"
                            >
                              Mark Read
                            </button>
                          )}
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
              onClick={() => {
                localStorage.removeItem('appointmo_token');
                localStorage.removeItem('appointmo_user');
                localStorage.removeItem('appointmo_auth');
                navigate('/admin/login');
              }}
              title="Sign Out"
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            >
              <LogOut className="w-4 h-4" />
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
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lifetime account activity</span>
            </div>
          </div>
        </div>

        {/* Tab Controls and In-Portal Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3 mb-6">
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                activeTab === 'upcoming'
                  ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm font-bold'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                activeTab === 'history'
                  ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm font-bold'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              History &amp; Past ({past.length + cancelled.length})
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 flex items-center space-x-1.5 ${
                activeTab === 'notifications'
                  ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm font-bold'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'notifications'
                    ? 'bg-white text-stone-950 dark:bg-stone-950 dark:text-amber-400'
                    : 'bg-amber-500 text-white'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('lookup')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 flex items-center space-x-1.5 ${
                activeTab === 'lookup'
                  ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm font-bold'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find by Code</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab !== 'lookup' && (
              <>
                {/* Store Filter Dropdown */}
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-semibold focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 cursor-pointer"
                >
                  <option value="all">All Stores / Businesses</option>
                  {Array.from(new Set(appointments.map(a => a.businessName))).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                <div className="relative flex-1 sm:w-52">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Filter ref, service..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
              </>
            )}
            <button
              onClick={() => {
                loadCustomerPortal(customer?.id);
                toast.success('Appointments refreshed');
              }}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
              title="Refresh appointments"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* TAB 1: UPCOMING APPOINTMENTS */}
        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {upcoming.filter(a => {
              if (storeFilter !== 'all' && a.businessName !== storeFilter) return false;
              if (!searchFilter.trim()) return true;
              const q = searchFilter.toLowerCase();
              return (
                a.bookingReference.toLowerCase().includes(q) ||
                a.serviceName.toLowerCase().includes(q) ||
                a.businessName.toLowerCase().includes(q) ||
                a.staffName.toLowerCase().includes(q)
              );
            }).length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center max-w-md mx-auto space-y-3">
                <CalendarDays className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                  {searchFilter || storeFilter !== 'all' ? 'No Matching Appointments' : 'No Upcoming Appointments'}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                  {searchFilter || storeFilter !== 'all'
                    ? 'No appointments matched the current store and search filters. Try resetting filters.'
                    : "You don't have any pending or confirmed bookings. Explore providers to book your next appointment."
                  }
                </p>
                {searchFilter || storeFilter !== 'all' ? (
                  <button
                    onClick={() => { setSearchFilter(''); setStoreFilter('all'); }}
                    className="bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-300 transition"
                  >
                    Reset Filters
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/browse')}
                    className="bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-300 transition"
                  >
                    Explore Directory
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming
                  .filter(a => {
                    if (storeFilter !== 'all' && a.businessName !== storeFilter) return false;
                    if (!searchFilter.trim()) return true;
                    const q = searchFilter.toLowerCase();
                    return (
                      a.bookingReference.toLowerCase().includes(q) ||
                      a.serviceName.toLowerCase().includes(q) ||
                      a.businessName.toLowerCase().includes(q) ||
                      a.staffName.toLowerCase().includes(q)
                    );
                  })
                  .map((appt) => (
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          appt.status === 'confirmed'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : appt.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-300'
                        }`}>
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
            {[...past, ...cancelled].filter(a => {
              if (storeFilter !== 'all' && a.businessName !== storeFilter) return false;
              if (!searchFilter.trim()) return true;
              const q = searchFilter.toLowerCase();
              return (
                a.bookingReference.toLowerCase().includes(q) ||
                a.serviceName.toLowerCase().includes(q) ||
                a.businessName.toLowerCase().includes(q) ||
                a.staffName.toLowerCase().includes(q)
              );
            }).length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center max-w-md mx-auto space-y-2">
                <History className="w-10 h-10 text-stone-400 dark:text-stone-500 mx-auto" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                  {searchFilter || storeFilter !== 'all' ? 'No Matching Records' : 'No History Yet'}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                  {searchFilter || storeFilter !== 'all'
                    ? 'No past visits matched the current filters.'
                    : 'Past completed and cancelled visits will be archived here.'
                  }
                </p>
                {(searchFilter || storeFilter !== 'all') && (
                  <button
                    onClick={() => { setSearchFilter(''); setStoreFilter('all'); }}
                    className="mt-2 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-300 transition"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800 shadow-sm">
                {[...past, ...cancelled]
                  .filter(a => {
                    if (storeFilter !== 'all' && a.businessName !== storeFilter) return false;
                    if (!searchFilter.trim()) return true;
                    const q = searchFilter.toLowerCase();
                    return (
                      a.bookingReference.toLowerCase().includes(q) ||
                      a.serviceName.toLowerCase().includes(q) ||
                      a.businessName.toLowerCase().includes(q) ||
                      a.staffName.toLowerCase().includes(q)
                    );
                  })
                  .map((appt) => (
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
                      <div>
                        {new Date(appt.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="text-stone-500 dark:text-stone-400 ml-1.5 font-normal">
                          {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="font-bold text-stone-900 dark:text-stone-100">₱{appt.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DEDICATED NOTIFICATIONS CONTAINER */}
        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/70 dark:bg-stone-800/40">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    Activity &amp; Booking Updates
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Real-time status changes, confirmation notices, and announcements from businesses.
                  </p>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllNotificationsRead}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-300 transition shrink-0"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {notifications.length === 0 ? (
                <div className="p-12 text-center max-w-sm mx-auto space-y-2">
                  <Bell className="w-8 h-8 text-stone-400 dark:text-stone-500 mx-auto" />
                  <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">No notifications</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    When stores update or confirm your appointments, notices will be stored here.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      !n.isRead ? 'bg-amber-50/40 dark:bg-amber-950/20' : 'hover:bg-stone-50/60 dark:hover:bg-stone-800/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-stone-900 dark:text-stone-100">{n.title}</span>
                        {!n.isRead && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                            New
                          </span>
                        )}
                        {n.bookingReference && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold">
                            {n.bookingReference}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed max-w-2xl">
                        {n.message}
                      </p>
                      {n.createdAt && (
                        <p className="text-[10px] text-stone-400 dark:text-stone-500">
                          {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {n.bookingReference && (
                        <button
                          type="button"
                          onClick={() => {
                            const found = appointments.find(a => a.bookingReference === n.bookingReference);
                            if (found) {
                              setSelectedAppt(found);
                              setShowReschedule(false);
                            } else {
                              setLookupRef(n.bookingReference);
                              setActiveTab('lookup');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition"
                        >
                          View Booking
                        </button>
                      )}
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkNotificationRead(n.id, n.bookingReference)}
                          className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 text-xs font-bold transition cursor-pointer active:scale-95"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. APT-UP-14"
                    value={lookupRef}
                    onChange={(e) => setLookupRef(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs uppercase font-mono focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText) {
                          setLookupRef(clipText.trim());
                          toast.success('Pasted from clipboard!', { description: clipText.trim() });
                        }
                      } catch (_) {
                        toast.error('Unable to paste', { description: 'Please paste code directly into input.' });
                      }
                    }}
                    className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition shrink-0"
                    title="Paste from clipboard"
                  >
                    Paste
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={lookupLoading || !lookupRef.trim()}
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
                        : selectedAppt.status === 'pending'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
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

              {/* Suggested Appointment Quick Actions: Calendar Export & Preparation Guide */}
              <div className="space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-stone-900 dark:text-stone-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Smart Appointment Actions</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadIcsFile(selectedAppt)}
                    className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition"
                    title="Export .ics file for Apple Calendar or Outlook"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-500" />
                    <span>Download .ics</span>
                  </button>

                  <a
                    href={getGoogleCalendarUrl(selectedAppt)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                    <span>Google Calendar</span>
                  </a>
                </div>

                {/* Appointment Prep & Arrival Guide */}
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl text-[11px] text-amber-950 dark:text-amber-200 space-y-1.5">
                  <div className="font-bold flex items-center space-x-1.5 text-xs text-amber-900 dark:text-amber-300">
                    <Info className="w-3.5 h-3.5" />
                    <span>Arrival &amp; Preparation Notice</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-stone-700 dark:text-stone-300">
                    <li>Please arrive 10-15 minutes prior to scheduled time.</li>
                    <li>Bring or show your booking reference: <strong className="font-mono">{selectedAppt.bookingReference}</strong></li>
                    <li>Free cancellation or reschedule is available up to 2 hours before start.</li>
                  </ul>
                </div>
              </div>

              {/* Reschedule & Cancellation Options or Status Notice */}
              {selectedAppt.status === 'completed' ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-center space-y-1">
                    <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Appointment Completed</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      This service has concluded. We hope you enjoyed your experience!
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedAppt(null);
                      navigate(`/browse?business=${encodeURIComponent(selectedAppt.businessSlug || '')}&service=${encodeURIComponent(selectedAppt.serviceId || '')}`);
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 py-3 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Rebook This Service Again</span>
                  </button>
                </div>
              ) : selectedAppt.status === 'cancelled' ? (
                <div className="text-center p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs">
                  This appointment is marked as cancelled.
                </div>
              ) : (
                <>
                  {/* Reschedule Drawer within Modal */}
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

                  {/* Cancellation Option */}
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
                </>
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
