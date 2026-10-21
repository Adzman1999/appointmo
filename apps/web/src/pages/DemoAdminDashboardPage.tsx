import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, DollarSign, CheckCircle2, RotateCcw, 
  Search, Filter, Clock, ArrowRight, Sparkles, Building2, 
  Check, X, AlertTriangle, Shield, Bell, ChevronRight, UserCheck, 
  RefreshCw, Info, Edit3, XCircle, AlertCircle, Plus, ChevronDown, Store, MapPin, Lightbulb, TrendingUp
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { BusinessLogo } from '../components/BusinessLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { DemoTopNav } from '../components/DemoTopNav';
import { toast } from 'sonner';

export const DemoAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>('lumiere-beauty-studio');
  const [currentBusiness, setCurrentBusiness] = useState<any | null>(null);

  const [metrics, setMetrics] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Notification Feed State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Details & History Modal State
  const [selectedApptDetails, setSelectedApptDetails] = useState<any | null>(null);
  const [apptHistory, setApptHistory] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Reschedule Modal State
  const [rescheduleAppt, setRescheduleAppt] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<any | null>(null);
  const [rescheduleStaffList, setRescheduleStaffList] = useState<any[]>([]);
  const [rescheduleStaffId, setRescheduleStaffId] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Cancellation Modal State
  const [cancelModalAppt, setCancelModalAppt] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Suggested & Best Business Ideas Modal State
  const [isIdeasModalOpen, setIsIdeasModalOpen] = useState(false);

  // High-converting business concepts curated for appointment scheduling
  const businessIdeas = [
    {
      title: 'Aesthetic Skin & Laser Clinic',
      category: 'Beauty & Wellness',
      recommendedCity: 'Taguig / BGC',
      description: 'Medical-grade hydra-facials, gentle chemical peels, and laser skin rejuvenation with certified dermatological specialists.',
      pricingRange: '₱1,500 – ₱4,500',
      keyServices: ['Hydra-Facial Infusion', 'Laser Carbon Peel', 'Collagen Microneedling'],
      whyItWorks: 'High customer retention with recurring 4-week appointment cycles and premium per-session margins.',
    },
    {
      title: 'Cosmetic Dentistry & Smile Studio',
      category: 'Dental Services',
      recommendedCity: 'Makati',
      description: 'Laser teeth whitening, clear aligner consultations, and preventive ultrasonic dental prophylaxis.',
      pricingRange: '₱1,200 – ₱6,000',
      keyServices: ['Laser Teeth Whitening', 'Oral Prophylaxis', 'Aligner Consultation'],
      whyItWorks: 'High trust threshold and guaranteed booking commitments with structured lead-time requirements.',
    },
    {
      title: 'Modern Veterinary & Pet Wellness Center',
      category: 'Veterinary Services',
      recommendedCity: 'San Juan / Greenhills',
      description: 'Comprehensive annual companion wellness exams, puppy vaccinations, microchipping, and medicated grooming.',
      pricingRange: '₱650 – ₱2,200',
      keyServices: ['Comprehensive Wellness Exam', '5-in-1 Puppy Vaccine', 'Medicated Pet Grooming'],
      whyItWorks: 'Emotion-driven family spending where online appointment clarity eliminates clinic wait times.',
    },
    {
      title: 'Corporate Legal & Startup Advisory',
      category: 'Professional Consultations',
      recommendedCity: 'Pasig / Ortigas',
      description: 'Retainer consultations for SEC business registration, trademark filing, software licensing, and contract audits.',
      pricingRange: '₱2,500 – ₱7,500',
      keyServices: ['Contract Risk Review', 'Trademark & IP Consultation', 'Commercial Lease Advisory'],
      whyItWorks: 'Zero inventory, high hourly realization rate, and time-block scheduling that protects professional billable hours.',
    },
    {
      title: 'Precision Auto Detailing & Ceramic Studio',
      category: 'Automotive & Detailing',
      recommendedCity: 'Quezon City',
      description: 'Multi-stage paint correction, 9H graphene ceramic coating, and interior steam sanitation.',
      pricingRange: '₱2,000 – ₱12,000',
      keyServices: ['Multi-Stage Paint Correction', 'Ceramic Shield Coating', 'Interior Steam Sterilization'],
      whyItWorks: 'Bay capacity constraints make slot-based scheduling essential for workflow balance.',
    },
    {
      title: 'Private Athletic Recovery & Physical Therapy',
      category: 'Health & Fitness',
      recommendedCity: 'Mandaluyong',
      description: 'Targeted myofascial release, sports injury rehabilitation, cold plunge recovery, and posture optimization.',
      pricingRange: '₱1,200 – ₱3,000',
      keyServices: ['Deep Sports Recovery', 'Dry Needling Therapy', 'Kinesiology Assessment'],
      whyItWorks: 'Active professionals seeking rapid injury turnaround value punctual slot availability.',
    },
  ];

  const handleApplyBusinessIdea = (idea: typeof businessIdeas[0]) => {
    setIsIdeasModalOpen(false);
    navigate(`/?launch=true&idea=${encodeURIComponent(idea.title)}&cat=${encodeURIComponent(idea.category)}&city=${encodeURIComponent(idea.recommendedCity)}&desc=${encodeURIComponent(idea.description)}`);
  };

  const fetchBusinesses = async () => {
    try {
      const bRes: any = await apiFetch('/demo/admin/businesses');
      setBusinesses(bRes.businesses || []);
    } catch (err) {
      console.error('Failed to fetch businesses', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const mRes: any = await apiFetch(`/demo/admin/metrics?slug=${encodeURIComponent(activeSlug)}`);
      setMetrics(mRes.metrics);

      let apptUrl = `/demo/admin/appointments?slug=${encodeURIComponent(activeSlug)}&status=${statusFilter}&sort=newest`;
      if (search.trim()) {
        apptUrl += `&search=${encodeURIComponent(search.trim())}`;
      }
      const aRes: any = await apiFetch(apptUrl);
      setAppointments(aRes.appointments || []);

      const sRes: any = await apiFetch(`/demo/admin/settings?slug=${encodeURIComponent(activeSlug)}`);
      setCurrentBusiness(sRes.business || null);
    } catch (err: any) {
      console.error(err);
      setErrorNotice(err.message || 'Failed to load demo dashboard');
    }
  };

  const fetchNotifications = async () => {
    try {
      const nRes: any = await apiFetch('/demo/admin/notifications');
      setNotifications(nRes.notifications || []);
      setUnreadCount(nRes.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboardData(), fetchNotifications()]).finally(() => setLoading(false));
  }, [activeSlug, statusFilter]);

  // Periodic polling every 5 seconds to guarantee live updates without manual page reload
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSlug, statusFilter, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboardData();
  };

  // View Details and Status History
  const handleOpenDetails = async (apptId: string) => {
    setLoadingDetails(true);
    setSelectedApptDetails(null);
    setApptHistory([]);
    try {
      const res: any = await apiFetch(`/demo/admin/appointments/${apptId}`);
      setSelectedApptDetails(res.appointment);
      setApptHistory(res.history || []);
    } catch (err: any) {
      alert(err.message || 'Failed to load appointment details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Direct status update
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await apiFetch(`/demo/admin/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setNotice(`Appointment status updated to ${newStatus}`);
      toast.success('Status Updated', {
        description: `Appointment marked as ${newStatus}`
      });
      fetchDashboardData();
      fetchNotifications();
    } catch (err: any) {
      const errMsg = err.message || 'Status update failed';
      alert(errMsg);
      toast.error('Update Failed', { description: errMsg });
    }
  };

  // Open Reschedule Modal
  const handleOpenReschedule = async (appt: any) => {
    setRescheduleAppt(appt);
    setRescheduleReason('');
    setRescheduleError(null);
    setSelectedRescheduleSlot(null);

    // Default target date: tomorrow or next working day
    const d = new Date();
    d.setDate(d.getDate() + 2);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().split('T')[0];
    setRescheduleDate(dateStr);

    try {
      const stRes: any = await apiFetch(`/staff?serviceId=${appt.serviceId}`);
      setRescheduleStaffList(stRes.staff || []);
      setRescheduleStaffId(appt.staffId || (stRes.staff[0]?.id ?? ''));

      // Fetch availability
      const avRes: any = await apiFetch(`/availability?serviceId=${appt.serviceId}&date=${dateStr}&staffId=${appt.staffId}`);
      setRescheduleSlots(avRes.slots || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Fetch reschedule slots when date/staff change in modal
  const handleRescheduleDateOrStaffChange = async (newDate: string, newStaffId: string) => {
    if (!rescheduleAppt) return;
    setRescheduleDate(newDate);
    setRescheduleStaffId(newStaffId);
    setSelectedRescheduleSlot(null);
    try {
      const avRes: any = await apiFetch(`/availability?serviceId=${rescheduleAppt.serviceId}&date=${newDate}&staffId=${newStaffId}`);
      setRescheduleSlots(avRes.slots || []);
    } catch (err) {
      setRescheduleSlots([]);
    }
  };

  // Submit Reschedule
  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleAppt || !selectedRescheduleSlot) return;

    setRescheduleLoading(true);
    setRescheduleError(null);

    try {
      await apiFetch(`/demo/admin/appointments/${rescheduleAppt.id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          newStartTime: selectedRescheduleSlot.startTime,
          newStaffId: rescheduleStaffId || selectedRescheduleSlot.staffId,
          reason: rescheduleReason || 'Customer requested reschedule via Studio Admin',
        }),
      });

      setNotice(`Appointment ${rescheduleAppt.bookingReference} rescheduled successfully`);
      toast.success('Appointment Rescheduled', {
        description: `New schedule confirmed for ${rescheduleAppt.bookingReference}`
      });
      setRescheduleAppt(null);
      fetchDashboardData();
      fetchNotifications();
    } catch (err: any) {
      const errMsg = err.message || 'Rescheduling failed. Slot may have been taken.';
      setRescheduleError(errMsg);
      toast.error('Reschedule Failed', { description: errMsg });
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Submit Cancellation with reason
  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalAppt) return;

    setCancelLoading(true);
    try {
      await apiFetch(`/demo/admin/appointments/${cancelModalAppt.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'cancelled',
          reason: cancelReason || 'Cancelled by admin',
        }),
      });

      setNotice(`Appointment ${cancelModalAppt.bookingReference} has been cancelled`);
      setCancelModalAppt(null);
      fetchDashboardData();
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setCancelLoading(false);
    }
  };

  // Mark notification read
  const handleMarkNotifRead = async (id: string, apptId?: string) => {
    try {
      await apiFetch(`/demo/admin/notifications/${id}/read`, { method: 'PATCH' });
      fetchNotifications();
      if (apptId) {
        handleOpenDetails(apptId);
        setIsNotifOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mark all notifications read
  const handleMarkAllNotifsRead = async () => {
    try {
      await apiFetch('/demo/admin/notifications/mark-all-read', { method: 'POST' });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Reset Demo Data
  const handleResetDemoData = async () => {
    if (!confirm('Reset Lumière Beauty Studio demo data to original clean synthetic state (125 bookings)?')) return;
    setResetting(true);
    try {
      const res: any = await apiFetch('/demo/admin/reset', { method: 'POST' });
      setNotice(res.message);
      fetchDashboardData();
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-20 transition-colors">
      {/* Top Segmented Navigation Bar */}
      <DemoTopNav currentRole="admin" />

      {/* Main Navbar */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 py-3.5 px-6 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <BusinessLogo
              name={currentBusiness?.name || 'Demo Business'}
              category={currentBusiness?.category || ''}
              logoUrl={currentBusiness?.logoUrl}
              size="md"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-stone-900 dark:text-stone-100">
                  {currentBusiness?.name || 'Loading Business...'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                  {currentBusiness?.category || 'Demo Business'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {currentBusiness?.description || 'Synthetic appointment provider in Metro Manila'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Business Switcher Dropdown */}
            <div className="flex items-center space-x-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-2 py-1">
              <Building2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 ml-1" />
              <select
                value={activeSlug}
                onChange={(e) => setActiveSlug(e.target.value)}
                className="bg-transparent text-xs font-semibold text-stone-800 dark:text-stone-200 pr-2 py-0.5 focus:outline-none cursor-pointer"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.slug} className="dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                    {b.name} ({b.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl z-50 overflow-hidden animate-in fade-in">
                  <div className="p-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-stone-900 dark:text-stone-100">Studio Notifications</span>
                      <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-semibold">
                        {unreadCount} unread
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllNotifsRead}
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
                          onClick={() => handleMarkNotifRead(n.id, n.appointmentId)}
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
                          <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                            {new Date(n.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleResetDemoData}
              disabled={resetting}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/80 transition shadow-sm"
              title="Reset synthetic demo records to original 125 bookings"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-amber-700 dark:text-amber-400 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Resetting...' : 'Reset Demo Data'}</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-stone-800 transition text-xs font-semibold"
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
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dashboard Title & Quick Insight */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Business Operations &amp; Appointments</h1>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 font-medium">
              Appointments sorted by <strong>creation date (newest first)</strong>. Auto-refreshes every 5 seconds.
            </p>
          </div>
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsIdeasModalOpen(true)}
              className="inline-flex items-center space-x-1.5 bg-amber-500/10 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/80 transition shadow-sm"
              title="Explore high-converting appointment business ideas"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Suggested &amp; Best Business Ideas</span>
            </button>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Today's Bookings</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{metrics?.todayCount ?? '—'}</div>
            <div className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 font-medium">Confirmed appointments for today</div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Upcoming Confirmed</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">{metrics?.upcomingCount ?? '—'}</div>
            <div className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 font-medium">Scheduled next 7 days</div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Completed Sessions</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{metrics?.completedCount ?? '—'}</div>
            <div className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 font-medium">Past 30 days</div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Completed Revenue</div>
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">
              ₱{metrics ? Number(metrics.totalRevenue).toLocaleString() : '—'}
            </div>
            <div className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 font-medium">Synthetic studio earnings</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
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
                    ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
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
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          </form>
        </div>

        {/* Appointments Table */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Booking Ref</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Service</th>
                  <th className="px-5 py-3.5">Specialist</th>
                  <th className="px-5 py-3.5">Schedule</th>
                  <th className="px-5 py-3.5">Booked Date</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {loading && appointments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-stone-500 dark:text-stone-400 font-medium">
                      Loading appointments from database...
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-stone-500 dark:text-stone-400 font-medium">
                      No appointments matching this query. Try selecting "All Records".
                    </td>
                  </tr>
                ) : (
                  appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-stone-900 dark:text-stone-100">
                        <button
                          onClick={() => handleOpenDetails(appt.id)}
                          className="hover:underline text-stone-900 dark:text-amber-400 text-left font-bold"
                          title="Click to view details & audit history"
                        >
                          {appt.bookingReference}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-stone-900 dark:text-stone-100">{appt.customerName}</div>
                        <div className="text-stone-600 dark:text-stone-300 text-[11px] font-medium">{appt.customerPhone}</div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-stone-900 dark:text-stone-100">
                        {appt.serviceName}
                      </td>
                      <td className="px-5 py-3.5 text-stone-700 dark:text-stone-300 font-medium">
                        {appt.staffName}
                      </td>
                      <td className="px-5 py-3.5 text-stone-800 dark:text-stone-200 whitespace-nowrap">
                        <div className="font-semibold text-stone-900 dark:text-stone-100">{new Date(appt.startTime).toLocaleDateString()}</div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-300 font-medium">
                          {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(appt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-stone-700 dark:text-stone-300 whitespace-nowrap text-[11px] font-medium">
                        <div className="text-stone-800 dark:text-stone-200">{new Date(appt.createdAt).toLocaleDateString()}</div>
                        <div className="text-stone-600 dark:text-stone-400">{new Date(appt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-stone-900 dark:text-stone-100">
                        ₱{Number(appt.price).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            appt.status === 'confirmed'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : appt.status === 'completed'
                              ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200'
                              : appt.status === 'cancelled'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                          }`}
                        >
                          {appt.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Details Button */}
                        <button
                          onClick={() => handleOpenDetails(appt.id)}
                          className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-[11px] hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                          title="View Details & History"
                        >
                          Details
                        </button>

                        {/* Status Actions */}
                        {appt.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleOpenReschedule(appt)}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold text-[11px] hover:bg-stone-200 dark:hover:bg-stone-700 transition"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-[11px] hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow-sm"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => {
                                setCancelModalAppt(appt);
                                setCancelReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-semibold text-[11px] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {appt.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 dark:bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-800 dark:hover:bg-emerald-500 transition shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setCancelModalAppt(appt);
                                setCancelReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-semibold text-[11px] hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {appt.status === 'cancelled' && (
                          <button
                            onClick={() => handleOpenReschedule(appt)}
                            className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-[11px] hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                          >
                            Re-book
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

      {/* MODAL 1: VIEW DETAILS & AUDIT HISTORY */}
      {selectedApptDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div>
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Appointment Overview</span>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{selectedApptDetails.bookingReference}</h3>
              </div>
              <button
                onClick={() => setSelectedApptDetails(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200/70 dark:border-stone-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Service:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedApptDetails.serviceName} ({selectedApptDetails.durationMinutes} mins)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Staff Specialist:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedApptDetails.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Scheduled Time:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {new Date(selectedApptDetails.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Booked On:</span>
                  <span className="text-stone-700 dark:text-stone-300 font-medium">{new Date(selectedApptDetails.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Price:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">₱{Number(selectedApptDetails.price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Status:</span>
                  <span className="font-bold uppercase text-stone-900 dark:text-stone-100">{selectedApptDetails.status}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-800 dark:text-stone-200 mb-1">Customer Information</h4>
                <div className="p-3 bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl space-y-1 text-stone-700 dark:text-stone-200">
                  <div><strong>Name:</strong> {selectedApptDetails.customerName}</div>
                  <div><strong>Email:</strong> {selectedApptDetails.customerEmail}</div>
                  <div><strong>Phone:</strong> {selectedApptDetails.customerPhone}</div>
                  {selectedApptDetails.notes && <div><strong>Notes:</strong> {selectedApptDetails.notes}</div>}
                  {selectedApptDetails.cancellationReason && (
                    <div className="text-rose-700 dark:text-rose-400 font-semibold">
                      <strong>Cancellation Reason:</strong> {selectedApptDetails.cancellationReason}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-800 dark:text-stone-200 mb-1">Status Audit History</h4>
                <div className="space-y-2">
                  {apptHistory.length === 0 ? (
                    <p className="text-stone-500 dark:text-stone-400 italic">No history records logged.</p>
                  ) : (
                    apptHistory.map((h, i) => (
                      <div key={i} className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-stone-800 dark:text-stone-200">
                            Status changed to <span className="uppercase">{h.newStatus}</span> by {h.changedBy}
                          </div>
                          {h.reason && <div className="text-stone-600 dark:text-stone-300 text-[11px] mt-0.5">{h.reason}</div>}
                        </div>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 shrink-0">
                          {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => setSelectedApptDetails(null)}
                className="w-full py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs hover:bg-stone-800 dark:hover:bg-stone-200 transition shadow"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SAFE RESCHEDULE */}
      {rescheduleAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">Reschedule Appointment</h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 mb-4 font-medium">
              Select an available opening for <strong>{rescheduleAppt.bookingReference}</strong> ({rescheduleAppt.serviceName}).
            </p>

            {rescheduleError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs mb-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Target Date</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => handleRescheduleDateOrStaffChange(e.target.value, rescheduleStaffId)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Staff Specialist</label>
                  <select
                    value={rescheduleStaffId}
                    onChange={(e) => handleRescheduleDateOrStaffChange(rescheduleDate, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  >
                    {rescheduleStaffList.map((st) => (
                      <option key={st.id} value={st.id} className="dark:bg-stone-800">{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Available Open Slots</label>
                {rescheduleSlots.length === 0 ? (
                  <p className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 text-center font-medium">
                    No openings for this date and staff member.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                    {rescheduleSlots.map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedRescheduleSlot(slot)}
                        className={`p-2 rounded-xl border text-center transition ${
                          selectedRescheduleSlot?.startTime === slot.startTime
                            ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold border-stone-900 dark:border-amber-400'
                            : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600'
                        }`}
                      >
                        {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Reschedule Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Client requested afternoon change"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleAppt(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading || !selectedRescheduleSlot}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow disabled:opacity-50"
                >
                  {rescheduleLoading ? 'Saving...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCELLATION CONFIRMATION */}
      {cancelModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <XCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">Cancel Appointment?</h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 mb-4 font-medium">
              Are you sure you want to cancel booking <strong>{cancelModalAppt.bookingReference}</strong> ({cancelModalAppt.customerName})? The time slot will be released back to availability.
            </p>

            <form onSubmit={handleConfirmCancellation} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Reason for Cancellation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule conflict or client request"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalAppt(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 dark:bg-rose-500 text-white hover:bg-rose-700 dark:hover:bg-rose-600 transition shadow"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: SUGGESTED & BEST BUSINESS IDEAS */}
      {isIdeasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Suggested &amp; Best Business Ideas</h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">High-converting appointment concepts pre-optimized for Appointmo</p>
                </div>
              </div>
              <button
                onClick={() => setIsIdeasModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300 font-medium">
                <span className="font-semibold text-stone-900 dark:text-stone-100">💡 Instant Launch: </span>
                Click <strong>"Use This Idea"</strong> on any suggestion below to pre-populate the Business Setup Studio on the home page and launch an independent appointment page.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessIdeas.map((idea, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm hover:border-amber-400 dark:hover:border-amber-500 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                          {idea.category}
                        </span>
                        <span className="text-[11px] font-bold text-stone-900 dark:text-stone-100">
                          {idea.pricingRange}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">{idea.title}</h4>
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed mb-3 font-medium">
                        {idea.description}
                      </p>

                      <div className="space-y-1.5 mb-3 bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl text-[10px] text-stone-700 dark:text-stone-300">
                        <div className="font-semibold text-stone-800 dark:text-stone-200">Recommended Location:</div>
                        <div className="flex items-center space-x-1 text-stone-600 dark:text-stone-300">
                          <MapPin className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                          <span>{idea.recommendedCity}</span>
                        </div>
                        <div className="font-semibold text-stone-800 dark:text-stone-200 pt-1">Key High-Demand Services:</div>
                        <div className="text-stone-600 dark:text-stone-300">
                          {idea.keyServices.join(' • ')}
                        </div>
                      </div>

                      <div className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900 mb-4 font-medium">
                        <strong>Why it succeeds:</strong> {idea.whyItWorks}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyBusinessIdea(idea)}
                      className="w-full py-2 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-bold hover:bg-stone-800 dark:hover:bg-amber-300 transition flex items-center justify-center space-x-1.5 shadow"
                    >
                      <span>Use This Idea</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
