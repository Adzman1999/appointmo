import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, User, AlertCircle, CheckCircle2, 
  Bell, CalendarDays, RefreshCw, Sparkles, Star,
  MapPin, Phone, Mail, LogOut, ChevronRight, Check
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { Pagination } from '../components/Pagination';
import { RecordListToolbar } from '../components/RecordListToolbar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from 'sonner';

interface CustomerAppointment {
  id: string;
  bookingReference: string;
  status: string;
  startTime: string;
  endTime: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  price: string | number;
  currency: string;
  notes?: string;
  createdAt: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  staffId: string;
  staffName: string;
  customerChangeCutoffHours?: number;
  businessId: string;
  businessName: string;
  businessSlug: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  managementToken: string;
  storeRating?: number | null;
  staffRating?: number | null;
  reviewComment?: string | null;
}

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

const matchesRecordSearch = (values: any[], search: string) => {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return values.some((value) => String(value ?? '').toLowerCase().includes(term));
};

export const CustomerPortalPage: React.FC = () => {
  const navigate = useNavigate();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'reviews' | 'notifications'>('upcoming');

  // Customer & Appointments Data
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [upcoming, setUpcoming] = useState<CustomerAppointment[]>([]);
  const [past, setPast] = useState<CustomerAppointment[]>([]);
  const [cancelled, setCancelled] = useState<CustomerAppointment[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [upcomingSearch, setUpcomingSearch] = useState('');
  const [upcomingStatusFilter, setUpcomingStatusFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [reviewSearch, setReviewSearch] = useState('');
  const [notificationSearch, setNotificationSearch] = useState('');
  const [notificationReadFilter, setNotificationReadFilter] = useState('all');
  const [notificationPreviewSearch, setNotificationPreviewSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Selected appointment for details modal
  const [selectedAppt, setSelectedAppt] = useState<CustomerAppointment | null>(null);
  const [cancelModalAppt, setCancelModalAppt] = useState<CustomerAppointment | null>(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [ratingAppt, setRatingAppt] = useState<CustomerAppointment | null>(null);
  const [storeRating, setStoreRating] = useState(5);
  const [staffRating, setStaffRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Selected notification for full details modal (same as Admin & Super Admin)
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null);

  // Notification dropdown
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notificationPreviewPage, setNotificationPreviewPage] = useState(1);
  const notifRef = React.useRef<HTMLDivElement>(null);

  const UPCOMING_PER_PAGE = 6;
  const HISTORY_PER_PAGE = 8;
  const REVIEWS_PER_PAGE = 6;
  const NOTIFICATIONS_PER_PAGE = 8;
  const NOTIFICATION_PREVIEW_PER_PAGE = 4;
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [notificationPage, setNotificationPage] = useState(1);

  // Close notification popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const requiresCustomerSignIn = err.message?.toLowerCase().includes('customer account');
      if (err.status === 401 || err.status === 403 || err.message?.includes('Unauthorized') || requiresCustomerSignIn) {
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
  const reviewableAppointments = past.filter((appt) => appt.status === 'completed' && !appt.storeRating);
  const completedVisitCount = appointments.filter((appt) => appt.status === 'completed').length;
  const allHistoryAppointments = [...past, ...cancelled].sort(
    (left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime()
  );
  const filteredUpcomingAppointments = upcoming.filter((appt) => {
    const matchesSearch = matchesRecordSearch([
      appt.bookingReference, appt.serviceName, appt.businessName, appt.branchName,
      appt.staffName, appt.recipientName,
    ], upcomingSearch);
    return matchesSearch && (upcomingStatusFilter === 'all' || appt.status === upcomingStatusFilter);
  });
  const filteredHistoryAppointments = allHistoryAppointments.filter((appt) => {
    const matchesSearch = matchesRecordSearch([
      appt.bookingReference, appt.serviceName, appt.businessName, appt.branchName,
      appt.staffName, appt.recipientName,
    ], historySearch);
    return matchesSearch && (historyStatusFilter === 'all' || appt.status === historyStatusFilter);
  });
  const filteredReviewableAppointments = reviewableAppointments.filter((appt) =>
    matchesRecordSearch([appt.bookingReference, appt.serviceName, appt.businessName, appt.staffName], reviewSearch)
  );
  const filteredCustomerNotifications = notifications.filter((notification) => {
    const matchesSearch = matchesRecordSearch([
      notification.title, notification.message, notification.bookingReference, notification.serviceName,
    ], notificationSearch);
    const matchesReadState = notificationReadFilter === 'all'
      || (notificationReadFilter === 'unread' ? !notification.isRead : notification.isRead);
    return matchesSearch && matchesReadState;
  });
  const filteredCustomerNotificationPreview = notifications.filter((notification) =>
    matchesRecordSearch([
      notification.title, notification.message, notification.bookingReference, notification.serviceName,
    ], notificationPreviewSearch)
  );

  const totalUpcomingPages = Math.ceil(filteredUpcomingAppointments.length / UPCOMING_PER_PAGE);
  const paginatedUpcomingAppointments = filteredUpcomingAppointments.slice(
    (upcomingPage - 1) * UPCOMING_PER_PAGE,
    upcomingPage * UPCOMING_PER_PAGE
  );
  const totalHistoryPages = Math.ceil(filteredHistoryAppointments.length / HISTORY_PER_PAGE);
  const paginatedHistoryAppointments = filteredHistoryAppointments.slice(
    (historyPage - 1) * HISTORY_PER_PAGE,
    historyPage * HISTORY_PER_PAGE
  );
  const totalReviewPages = Math.ceil(filteredReviewableAppointments.length / REVIEWS_PER_PAGE);
  const paginatedReviewableAppointments = filteredReviewableAppointments.slice(
    (reviewPage - 1) * REVIEWS_PER_PAGE,
    reviewPage * REVIEWS_PER_PAGE
  );
  const totalNotificationPages = Math.ceil(filteredCustomerNotifications.length / NOTIFICATIONS_PER_PAGE);
  const paginatedCustomerNotifications = filteredCustomerNotifications.slice(
    (notificationPage - 1) * NOTIFICATIONS_PER_PAGE,
    notificationPage * NOTIFICATIONS_PER_PAGE
  );
  const totalNotificationPreviewPages = Math.ceil(filteredCustomerNotificationPreview.length / NOTIFICATION_PREVIEW_PER_PAGE);
  const paginatedNotificationPreview = filteredCustomerNotificationPreview.slice(
    (notificationPreviewPage - 1) * NOTIFICATION_PREVIEW_PER_PAGE,
    notificationPreviewPage * NOTIFICATION_PREVIEW_PER_PAGE
  );

  useEffect(() => setUpcomingPage(1), [upcomingSearch, upcomingStatusFilter]);
  useEffect(() => setHistoryPage(1), [historySearch, historyStatusFilter]);
  useEffect(() => setReviewPage(1), [reviewSearch]);
  useEffect(() => {
    setNotificationPage(1);
  }, [notificationSearch, notificationReadFilter]);
  useEffect(() => setNotificationPreviewPage(1), [notificationPreviewSearch]);
  useEffect(() => {
    setUpcomingPage((page) => Math.min(page, Math.max(totalUpcomingPages, 1)));
    setHistoryPage((page) => Math.min(page, Math.max(totalHistoryPages, 1)));
    setReviewPage((page) => Math.min(page, Math.max(totalReviewPages, 1)));
    setNotificationPage((page) => Math.min(page, Math.max(totalNotificationPages, 1)));
    setNotificationPreviewPage((page) => Math.min(page, Math.max(totalNotificationPreviewPages, 1)));
  }, [totalUpcomingPages, totalHistoryPages, totalReviewPages, totalNotificationPages, totalNotificationPreviewPages]);
  const customerMenuItems = [
    { id: 'upcoming', title: 'Upcoming', count: upcoming.length, icon: Calendar },
    { id: 'history', title: 'History', count: past.length + cancelled.length, icon: CalendarDays },
    { id: 'reviews', title: 'Reviews', count: reviewableAppointments.length, icon: Star },
    { id: 'notifications', title: 'Notifications', count: unreadCount, icon: Bell },
  ];
  const activeSection = {
    upcoming: { title: 'Upcoming appointments', description: 'Review your confirmed and pending bookings.' },
    history: { title: 'Booking history', description: 'Look back at completed and cancelled appointments.' },
    reviews: { title: 'Rate your visits', description: 'Share feedback about completed appointments.' },
    notifications: { title: 'Notifications', description: `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}.` },
  }[activeTab];

  // View notification full details modal & mark as read
  const handleViewNotification = async (notif: any) => {
    setSelectedNotif(notif);
    setIsNotifOpen(false);
    // Optimistically mark as read
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    try {
      await apiFetch(`/customer/notifications/${notif.id}/read`, { method: 'PATCH' });
    } catch (_) {}
  };

  // Mark all notifications as read
  const handleMarkAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await apiFetch('/customer/notifications/mark-all-read', { method: 'POST' });
      toast.success('All notifications marked as read');
    } catch (_) {}
  };

  const handleCancelBooking = async (appt: CustomerAppointment) => {
    setCancelModalAppt(appt);
  };

  const handleConfirmCancelBooking = async () => {
    if (!cancelModalAppt) return;
    const appt = cancelModalAppt;
    setCancellingAppointmentId(appt.id);
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
      setCancelModalAppt(null);
      setSelectedAppt(null);
      await loadCustomerData();
    } catch (err: any) {
      toast.error('Cancellation failed', { description: err.message });
      setError(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancellingAppointmentId(null);
    }
  };

  const isCustomerChangeCutoffReached = (appt: CustomerAppointment) => {
    const appointmentStart = new Date(appt.startTime).getTime();
    const cutoffHours = Number(appt.customerChangeCutoffHours) || 0;
    return appointmentStart <= Date.now() || (cutoffHours > 0 && appointmentStart - Date.now() <= cutoffHours * 60 * 60 * 1000);
  };

  const openRatingForm = (appt: CustomerAppointment) => {
    setSelectedAppt(null);
    setRatingAppt(appt);
    setStoreRating(5);
    setStaffRating(5);
    setReviewComment('');
  };

  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ratingAppt) return;
    setSubmittingReview(true);
    try {
      const response: any = await apiFetch('/customer/reviews', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: ratingAppt.id,
          storeRating,
          staffRating,
          comment: reviewComment.trim(),
        }),
      });
      const reviewedAppointment = {
        ...ratingAppt,
        storeRating: Number(response.review.storeRating),
        staffRating: Number(response.review.staffRating),
        reviewComment: response.review.comment || null,
      };
      setAppointments((current) => current.map((appt) => appt.id === reviewedAppointment.id ? reviewedAppointment : appt));
      setPast((current) => current.map((appt) => appt.id === reviewedAppointment.id ? reviewedAppointment : appt));
      toast.success('Rating saved', { description: 'Your store and specialist ratings are now recorded.' });
      setRatingAppt(null);
    } catch (err: any) {
      toast.error('Could not submit your rating', { description: err.message });
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <AppointmoLogo size="sm" showText={false} />
            </div>

            <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 hidden sm:block"></div>

            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 shrink-0 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold flex items-center justify-center text-xs">
                {customer?.name ? customer.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="max-w-[125px] truncate text-sm font-bold text-stone-900 dark:text-stone-100 sm:max-w-[220px]">
                    {customer?.name || 'Customer Account'}
                  </h1>
                  <span className="hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 sm:inline-flex">
                    Verified Customer
                  </span>
                </div>
                <p className="hidden max-w-[280px] truncate text-[11px] text-stone-600 dark:text-stone-300 font-medium md:block">
                  {customer?.email || ''}{customer?.phone ? ` · ${customer.phone}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                title="Notifications"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-80 sm:w-96 sm:max-w-none bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl z-50 overflow-hidden animate-in fade-in">
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
                  <div className="border-b border-stone-100 p-3 dark:border-stone-800">
                    <RecordListToolbar
                      searchValue={notificationPreviewSearch}
                      onSearchChange={setNotificationPreviewSearch}
                      searchPlaceholder="Search updates"
                    />
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-stone-500 dark:text-stone-400">No notifications yet.</div>
                    ) : filteredCustomerNotificationPreview.length === 0 ? (
                      <div className="p-6 text-center text-stone-500 dark:text-stone-400">No updates match this search or filter.</div>
                    ) : (
                      paginatedNotificationPreview.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleViewNotification(n)}
                          className={`p-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer transition ${
                            !n.isRead ? 'bg-amber-50/40 dark:bg-amber-950/30 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-stone-900 dark:text-stone-100 text-xs">{n.title}</span>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-600 dark:text-stone-300 font-normal mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 flex items-center justify-between">
                            <span>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                              {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium text-[10px]">View info &rarr;</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-3 pb-3">
                    <Pagination
                      currentPage={notificationPreviewPage}
                      totalPages={totalNotificationPreviewPages}
                      totalItems={filteredCustomerNotificationPreview.length}
                      itemsPerPage={NOTIFICATION_PREVIEW_PER_PAGE}
                      onPageChange={setNotificationPreviewPage}
                      itemName="updates"
                    />
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />

            <button
              onClick={() => navigate('/browse')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-2.5 py-2 text-xs font-bold text-stone-950 transition hover:bg-amber-400 sm:px-3"
              aria-label="Book a new appointment"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">Book New</span>
            </button>

            <button
              onClick={() => navigate('/concierge')}
              aria-label="Open concierge"
              title="Concierge"
              className="hidden items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 px-2 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800 sm:inline-flex sm:px-3"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Concierge</span>
            </button>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              aria-label="Sign out"
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <nav aria-label="Customer account navigation" className="border-t border-stone-200 dark:border-stone-800">
          <div className="mx-auto grid max-w-6xl grid-cols-4 gap-1 px-1.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
            {customerMenuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  title={item.title}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`flex min-w-0 min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 transition sm:min-h-10 sm:flex-row sm:gap-2 sm:px-3 ${
                    isSelected
                      ? 'border-stone-900 bg-stone-900 text-white shadow-sm dark:border-amber-400 dark:bg-amber-400 dark:text-stone-950'
                      : 'border-transparent text-stone-600 hover:border-stone-200 hover:bg-stone-50 dark:text-stone-300 dark:hover:border-stone-700 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="relative shrink-0">
                    <Icon className="h-4 w-4" />
                    {item.count > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-bold text-stone-950 sm:hidden">
                        {item.count > 9 ? '9+' : item.count}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate text-[10px] font-bold sm:text-[11px]">{item.title}</span>
                  <span className={`hidden rounded-full px-1.5 py-0.5 text-[9px] font-bold sm:inline-flex ${
                    item.count > 0
                      ? isSelected ? 'bg-white/15 dark:bg-stone-950/15' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : isSelected ? 'bg-white/15 dark:bg-stone-950/15' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                  }`}>{item.count}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6">
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

        <div className="space-y-6">
            {/* Dashboard Top Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-4">
                <div className="text-xs font-semibold text-stone-600 dark:text-stone-300">Upcoming</div>
                <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{upcoming.length}</div>
                <div className="mt-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Bookings ahead</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-4">
                <div className="text-xs font-semibold text-stone-600 dark:text-stone-300">Completed</div>
                <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{completedVisitCount}</div>
                <div className="mt-1 text-[10px] font-medium text-stone-500 dark:text-stone-400">Finished visits</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-4">
                <div className="text-xs font-semibold text-stone-600 dark:text-stone-300">Cancelled</div>
                <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{cancelled.length}</div>
                <div className="mt-1 text-[10px] font-medium text-stone-500 dark:text-stone-400">Archived bookings</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-4">
                <div className="text-xs font-semibold text-stone-600 dark:text-stone-300">All bookings</div>
                <div className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{appointments.length}</div>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Account activity</span>
                </div>
              </div>
            </div>

            <div className="border-b border-stone-200 pb-3 dark:border-stone-800">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">{activeSection.title}</h2>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{activeSection.description}</p>
            </div>

            {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs text-stone-500 dark:text-stone-400">Loading your account appointments...</p>
          </div>
        ) : activeTab === 'upcoming' ? (
          <div className="space-y-4">
            {upcoming.length === 0 ? (
              <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-12">
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
              <>
                <RecordListToolbar
                  searchValue={upcomingSearch}
                  onSearchChange={setUpcomingSearch}
                  searchPlaceholder="Search booking, store, service, or specialist"
                  filter={{
                    label: 'Filter upcoming appointments by status',
                    value: upcomingStatusFilter,
                    onChange: setUpcomingStatusFilter,
                    options: [
                      { value: 'all', label: 'All statuses' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'confirmed', label: 'Confirmed' },
                    ],
                  }}
                />
                {filteredUpcomingAppointments.length === 0 ? (
                  <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                    No upcoming bookings match your search or status filter.
                  </div>
                ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedUpcomingAppointments.map(appt => (
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
                        {appt.recipientName && (
                          <div className="flex items-center space-x-2 text-stone-700 dark:text-stone-300">
                            <User className="w-3.5 h-3.5 text-stone-400" />
                            <span>For: {appt.recipientName}</span>
                          </div>
                        )}
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
                <Pagination
                  currentPage={upcomingPage}
                  totalPages={totalUpcomingPages}
                  totalItems={filteredUpcomingAppointments.length}
                  itemsPerPage={UPCOMING_PER_PAGE}
                  onPageChange={setUpcomingPage}
                  itemName="upcoming appointments"
                />
              </>
            )}
          </div>
        ) : activeTab === 'history' ? (
          <div className="space-y-4">
            {allHistoryAppointments.length === 0 ? (
              <div className="mx-auto max-w-md rounded-3xl border border-stone-200 bg-white p-6 text-center text-xs text-stone-500 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-12">
                No past or archived appointments found.
              </div>
            ) : (
              <>
                <RecordListToolbar
                  searchValue={historySearch}
                  onSearchChange={setHistorySearch}
                  searchPlaceholder="Search booking, store, service, or specialist"
                  filter={{
                    label: 'Filter booking history by status',
                    value: historyStatusFilter,
                    onChange: setHistoryStatusFilter,
                    options: [
                      { value: 'all', label: 'All statuses' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'confirmed', label: 'Confirmed' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'cancelled', label: 'Cancelled' },
                    ],
                  }}
                />
                {filteredHistoryAppointments.length === 0 ? (
                  <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                    No booking history matches your search or status filter.
                  </div>
                ) : (
              <div className="space-y-4">
              {paginatedHistoryAppointments.map(appt => (
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
              ))}
              </div>
                )}
                <Pagination
                  currentPage={historyPage}
                  totalPages={totalHistoryPages}
                  totalItems={filteredHistoryAppointments.length}
                  itemsPerPage={HISTORY_PER_PAGE}
                  onPageChange={setHistoryPage}
                  itemName="past appointments"
                />
              </>
            )}
          </div>
        ) : activeTab === 'reviews' ? (
          <div className="space-y-3">
            {reviewableAppointments.length === 0 ? (
              <div className="mx-auto max-w-lg space-y-2 rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-10">
                <Star className="w-7 h-7 text-amber-500 mx-auto" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100">No visits to rate</h3>
                <p className="text-xs text-stone-500">After a completed appointment, you can rate the store and the specialist here.</p>
              </div>
            ) : (
              <>
                <RecordListToolbar
                  searchValue={reviewSearch}
                  onSearchChange={setReviewSearch}
                  searchPlaceholder="Search visits by store, service, or specialist"
                />
                {filteredReviewableAppointments.length === 0 ? (
                  <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                    No visits to rate match your search.
                  </div>
                ) : (
              <div className="space-y-3">
              {paginatedReviewableAppointments.map((appt) => (
              <div key={appt.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm text-stone-900 dark:text-stone-100">{appt.serviceName}</p>
                  <p className="text-xs text-stone-500">{appt.businessName} · {appt.staffName} · {new Date(appt.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <button type="button" onClick={() => openRatingForm(appt)} className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 dark:bg-amber-400 px-3.5 py-2 text-xs font-bold text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-300">
                  <Star className="w-3.5 h-3.5" /> Rate visit
                </button>
              </div>
              ))}
              </div>
                )}
                <Pagination
                  currentPage={reviewPage}
                  totalPages={totalReviewPages}
                  totalItems={filteredReviewableAppointments.length}
                  itemsPerPage={REVIEWS_PER_PAGE}
                  onPageChange={setReviewPage}
                  itemName="visits to review"
                />
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <RecordListToolbar
              searchValue={notificationSearch}
              onSearchChange={setNotificationSearch}
              searchPlaceholder="Search notifications"
              filter={{
                label: 'Filter notifications by read state',
                value: notificationReadFilter,
                onChange: setNotificationReadFilter,
                options: [
                  { value: 'all', label: 'All updates' },
                  { value: 'unread', label: 'Unread' },
                  { value: 'read', label: 'Read' },
                ],
              }}
            />
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 sm:p-12">No notifications on file.</div>
            ) : filteredCustomerNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 sm:p-12">No notifications match your search or filter.</div>
            ) : (
              paginatedCustomerNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleViewNotification(n)}
                  className={`p-4 flex items-start justify-between cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/60 transition ${
                    !n.isRead ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-bold text-xs text-stone-900 dark:text-stone-100">{n.title}</h5>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-stone-400 mt-1 inline-block">
                      {new Date(n.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <button className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                    View info &rarr;
                  </button>
                </div>
              ))
            )}
            </div>
            {filteredCustomerNotifications.length > 0 && (
              <Pagination
                currentPage={notificationPage}
                totalPages={totalNotificationPages}
                totalItems={filteredCustomerNotifications.length}
                itemsPerPage={NOTIFICATIONS_PER_PAGE}
                onPageChange={setNotificationPage}
                itemName="notifications"
              />
            )}
          </div>
        )}
        </div>
      </main>

      <ConfirmDialog
        open={Boolean(cancelModalAppt)}
        title="Cancel this appointment?"
        description={cancelModalAppt && (
          <>
            Cancel <strong>{cancelModalAppt.bookingReference}</strong> for {cancelModalAppt.serviceName} at {cancelModalAppt.businessName}? The time will return to the store&apos;s available schedule.
          </>
        )}
        confirmLabel="Cancel appointment"
        cancelLabel="Keep appointment"
        loading={Boolean(cancelModalAppt && cancellingAppointmentId === cancelModalAppt.id)}
        onClose={() => setCancelModalAppt(null)}
        onConfirm={handleConfirmCancelBooking}
      />

      {/* NOTIFICATION FULL INFO MODAL (Matches Store Admin & Super Admin) */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-white p-4 shadow-2xl relative dark:border-stone-800 dark:bg-stone-900 sm:p-7">
            <div className="flex items-start justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="pr-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Notification Details
                </span>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  {selectedNotif.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {new Date(selectedNotif.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            <div className="py-5 space-y-4">
              <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                  {selectedNotif.message}
                </p>
              </div>

              {(selectedNotif.bookingReference || selectedNotif.serviceName) && (
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  {selectedNotif.bookingReference && (
                    <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80">
                      <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 block mb-0.5">
                        Booking Ref
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                        {selectedNotif.bookingReference}
                      </span>
                    </div>
                  )}
                  {selectedNotif.serviceName && (
                    <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80">
                      <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 block mb-0.5">
                        Service
                      </span>
                      <span className="font-medium text-stone-900 dark:text-stone-100 truncate block">
                        {selectedNotif.serviceName}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition"
              >
                Close
              </button>
              {selectedNotif.appointmentId && (
                <button
                  type="button"
                  onClick={() => {
                    const foundAppt = appointments.find(a => a.id === selectedNotif.appointmentId);
                    setSelectedNotif(null);
                    if (foundAppt) {
                      setSelectedAppt(foundAppt);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
                >
                  View Appointment Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-white p-4 shadow-2xl dark:border-stone-800 dark:bg-stone-900 sm:p-6 space-y-4">
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
              {selectedAppt.recipientName && (
                <div className="rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 p-3 space-y-1">
                  <div className="font-bold text-stone-800 dark:text-stone-200">Person receiving the service</div>
                  <div>{selectedAppt.recipientName}</div>
                  {selectedAppt.recipientEmail && <div className="text-stone-500">{selectedAppt.recipientEmail}</div>}
                  {selectedAppt.recipientPhone && <div className="text-stone-500">{selectedAppt.recipientPhone}</div>}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              {selectedAppt.status !== 'cancelled' && selectedAppt.status !== 'completed' ? (
                <button
                  type="button"
                  onClick={() => handleCancelBooking(selectedAppt)}
                  disabled={isCustomerChangeCutoffReached(selectedAppt)}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel Booking
                </button>
              ) : selectedAppt.status === 'completed' && !selectedAppt.storeRating ? (
                <button type="button" onClick={() => openRatingForm(selectedAppt)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <Star className="w-3.5 h-3.5" /> Rate store & specialist
                </button>
              ) : selectedAppt.storeRating ? (
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Rated · Store {selectedAppt.storeRating}/5 · Specialist {selectedAppt.staffRating}/5</span>
              ) : <div></div>}
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                className="px-5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs"
              >
                Close
              </button>
            </div>
            {selectedAppt.status !== 'cancelled' && selectedAppt.status !== 'completed' && isCustomerChangeCutoffReached(selectedAppt) && (
              <p className="mt-3 text-right text-[11px] text-stone-500">
                The store&apos;s cancellation window for this appointment has closed.
              </p>
            )}
          </div>
        </div>
      )}

      {ratingAppt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm">
          <form onSubmit={handleSubmitReview} className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-stone-200 bg-white p-4 shadow-2xl dark:border-stone-800 dark:bg-stone-900 sm:p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Share your experience</span>
                <h3 className="mt-1 font-bold text-stone-900 dark:text-stone-100">{ratingAppt.serviceName}</h3>
                <p className="text-xs text-stone-500">{ratingAppt.businessName} · {ratingAppt.staffName}</p>
              </div>
              <button type="button" onClick={() => setRatingAppt(null)} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200" aria-label="Close rating form">✕</button>
            </div>

            {[
              { label: `Store · ${ratingAppt.businessName}`, value: storeRating, setValue: setStoreRating },
              { label: `Specialist · ${ratingAppt.staffName}`, value: staffRating, setValue: setStaffRating },
            ].map((rating) => (
              <fieldset key={rating.label}>
                <legend className="text-xs font-bold text-stone-700 dark:text-stone-300">{rating.label}</legend>
                <div className="mt-1 flex items-center gap-1" role="group" aria-label={rating.label}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" onClick={() => rating.setValue(value)} aria-label={`${value} star${value === 1 ? '' : 's'}`} className="rounded-md p-1 hover:bg-amber-50 dark:hover:bg-amber-950/40">
                      <Star className={`h-6 w-6 ${value <= rating.value ? 'fill-amber-400 text-amber-500' : 'text-stone-300 dark:text-stone-600'}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-xs text-stone-500">{rating.value}/5</span>
                </div>
              </fieldset>
            ))}

            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
              Comment <span className="font-normal text-stone-400">(optional)</span>
              <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={1000} rows={3} placeholder="What should other customers know?" className="mt-1 w-full resize-y rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-xs font-normal text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:outline-none" />
            </label>

            <div className="flex justify-end gap-2 border-t border-stone-100 dark:border-stone-800 pt-3">
              <button type="button" disabled={submittingReview} onClick={() => setRatingAppt(null)} className="rounded-xl border border-stone-200 dark:border-stone-700 px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={submittingReview} className="rounded-xl bg-stone-900 dark:bg-amber-400 px-4 py-2 text-xs font-bold text-white dark:text-stone-950 disabled:opacity-50">{submittingReview ? 'Sending…' : 'Submit rating'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
