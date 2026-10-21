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

  // New Demo Business Creation Wizard Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([
    'Beauty & Wellness',
    'Dental Services',
    'Veterinary Services',
    'Professional Consultations',
    'Automotive & Detailing',
    'Health & Fitness',
  ]);
  const [createCategory, setCreateCategory] = useState('Beauty & Wellness');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const [createDescription, setCreateDescription] = useState('');
  const [createLogoUrl, setCreateLogoUrl] = useState('');
  const [createBranchName, setCreateBranchName] = useState('');
  
  // Dynamic Locations
  const [cityOptions, setCityOptions] = useState<string[]>([
    'Quezon City',
    'Makati',
    'Taguig / BGC',
    'Pasig / Ortigas',
    'San Juan / Greenhills',
    'Mandaluyong',
    'Manila',
    'Alabang / Muntinlupa',
    'Pasay',
  ]);
  const [createBranchCity, setCreateBranchCity] = useState('Quezon City');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const [createBranchAddress, setCreateBranchAddress] = useState('');
  const [createBranchPhone, setCreateBranchPhone] = useState('+63 2 8999 0001');
  const [createLatitude, setCreateLatitude] = useState('');
  const [createLongitude, setCreateLongitude] = useState('');
  const [createLocationDesc, setCreateLocationDesc] = useState('');

  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
    setCreateName(idea.title);
    setCreateCategory(idea.category);
    setIsCustomCategory(false);
    setCreateDescription(idea.description);
    setCreateBranchCity(idea.recommendedCity);
    setIsCustomCity(false);
    setCreateBranchName(`${idea.title} - Flagship`);
    setIsIdeasModalOpen(false);
    setIsCreateModalOpen(true);
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
      fetchDashboardData();
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
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
      setRescheduleAppt(null);
      fetchDashboardData();
      fetchNotifications();
    } catch (err: any) {
      setRescheduleError(err.message || 'Rescheduling failed. Slot may have been taken.');
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

  // Create Demo Business
  const handleCreateBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setCreatingBusiness(true);
    setCreateError(null);

    const finalCategory = isCustomCategory ? customCategoryInput.trim() : createCategory.trim();
    if (!finalCategory) {
      setCreateError('Please specify a category for this business');
      setCreatingBusiness(false);
      return;
    }

    const finalCity = isCustomCity ? customCityInput.trim() : createBranchCity.trim();
    if (!finalCity) {
      setCreateError('Please specify a city / location for this branch');
      setCreatingBusiness(false);
      return;
    }

    try {
      const res: any = await apiFetch('/demo/admin/create-business', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          category: finalCategory,
          description: createDescription.trim(),
          logoUrl: createLogoUrl.trim() || undefined,
          branchName: createBranchName.trim() || undefined,
          branchCity: finalCity,
          branchAddress: createBranchAddress.trim() || undefined,
          branchPhone: createBranchPhone.trim() || undefined,
          latitude: createLatitude ? parseFloat(createLatitude) : undefined,
          longitude: createLongitude ? parseFloat(createLongitude) : undefined,
          locationDescription: createLocationDesc.trim() || undefined,
        }),
      });

      setNotice(`Created new business "${res.business.name}" successfully! Switched to its admin view.`);
      setIsCreateModalOpen(false);
      setCreateName('');
      setCreateDescription('');
      setCreateLogoUrl('');
      setCreateBranchName('');
      setCreateBranchAddress('');
      setCustomCategoryInput('');
      setIsCustomCategory(false);
      setCustomCityInput('');
      setIsCustomCity(false);
      setCreateLatitude('');
      setCreateLongitude('');
      setCreateLocationDesc('');

      // Add to category/city options list if not already present
      if (!categoryOptions.includes(finalCategory)) {
        setCategoryOptions(prev => [...prev, finalCategory]);
      }
      if (!cityOptions.includes(finalCity)) {
        setCityOptions(prev => [...prev, finalCity]);
      }

      // Refresh business list & select new one
      await fetchBusinesses();
      setActiveSlug(res.business.slug);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create business');
    } finally {
      setCreatingBusiness(false);
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
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-20">
      {/* Top Banner indicating Fictional Demo Environment */}
      <div className="bg-stone-900 text-stone-200 py-2 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">Interactive Admin Demo Studio:</span>
            <span>Switch between synthetic businesses or launch your own. Real PostgreSQL storage.</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/browse')}
              className="text-stone-300 hover:text-white font-medium text-xs flex items-center space-x-1"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Smart Discovery</span>
            </button>
            <button
              onClick={() => navigate(`/demo/book?slug=${activeSlug}`)}
              className="text-white hover:text-amber-300 font-semibold underline text-xs"
            >
              Customer Booking Experience &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="bg-white border-b border-stone-200 py-3.5 px-6 shadow-sm sticky top-0 z-30">
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
                <span className="font-bold text-base text-stone-900">
                  {currentBusiness?.name || 'Loading Business...'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {currentBusiness?.category || 'Demo Business'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                {currentBusiness?.description || 'Synthetic appointment provider in Metro Manila'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Business Switcher Dropdown */}
            <div className="flex items-center space-x-1 bg-stone-50 border border-stone-200 rounded-xl px-2 py-1">
              <Building2 className="w-3.5 h-3.5 text-stone-500 ml-1" />
              <select
                value={activeSlug}
                onChange={(e) => setActiveSlug(e.target.value)}
                className="bg-transparent text-xs font-semibold text-stone-800 pr-2 py-0.5 focus:outline-none cursor-pointer"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name} ({b.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Create Demo Business Studio Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition shadow-sm"
              title="Launch a new synthetic business"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>New Business</span>
            </button>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition"
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
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-stone-200 shadow-xl z-50 overflow-hidden animate-in fade-in">
                  <div className="p-3.5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-stone-900">Studio Notifications</span>
                      <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[10px] font-semibold">
                        {unreadCount} unread
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllNotifsRead}
                        className="text-[11px] text-stone-600 hover:text-stone-900 underline font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-stone-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkNotifRead(n.id, n.appointmentId)}
                          className={`p-3.5 hover:bg-stone-50 cursor-pointer transition ${
                            !n.isRead ? 'bg-amber-50/40 font-semibold' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-stone-900 text-xs">{n.title}</span>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 font-normal mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="text-[10px] text-stone-400 mt-1">
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
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Business Operations &amp; Appointments</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Appointments sorted by <strong>creation date (newest first)</strong>. Auto-refreshes every 5 seconds.
            </p>
          </div>
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsIdeasModalOpen(true)}
              className="inline-flex items-center space-x-1.5 bg-amber-500/10 text-amber-900 border border-amber-300 text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-amber-100 transition shadow-sm"
              title="Explore high-converting appointment business ideas"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              <span>Suggested &amp; Best Business Ideas</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center space-x-1.5 bg-stone-900 text-white text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-stone-800 transition shadow"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Create New Business</span>
            </button>
          </div>
        </div>

        {/* KPI Metric Cards */}
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
                  <th className="px-5 py-3.5">Specialist</th>
                  <th className="px-5 py-3.5">Schedule</th>
                  <th className="px-5 py-3.5">Booked Date</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading && appointments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-stone-400">
                      Loading appointments from database...
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-stone-400">
                      No appointments matching this query. Try selecting "All Records".
                    </td>
                  </tr>
                ) : (
                  appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-stone-50/70 transition">
                      <td className="px-5 py-3.5 font-mono font-semibold text-stone-900">
                        <button
                          onClick={() => handleOpenDetails(appt.id)}
                          className="hover:underline text-stone-900 text-left font-bold"
                          title="Click to view details & audit history"
                        >
                          {appt.bookingReference}
                        </button>
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
                      <td className="px-5 py-3.5 text-stone-500 whitespace-nowrap text-[11px]">
                        <div>{new Date(appt.createdAt).toLocaleDateString()}</div>
                        <div className="text-stone-400">{new Date(appt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                        {/* Details Button */}
                        <button
                          onClick={() => handleOpenDetails(appt.id)}
                          className="px-2.5 py-1 rounded-lg border border-stone-200 text-stone-700 font-medium text-[11px] hover:bg-stone-100 transition"
                          title="View Details & History"
                        >
                          Details
                        </button>

                        {/* Status Actions */}
                        {appt.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleOpenReschedule(appt)}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 font-medium text-[11px] hover:bg-stone-200 transition"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-stone-900 text-white font-medium text-[11px] hover:bg-stone-800 transition"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => {
                                setCancelModalAppt(appt);
                                setCancelReason('');
                              }}
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
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setCancelModalAppt(appt);
                                setCancelReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-stone-200 text-stone-600 font-medium text-[11px] hover:bg-stone-100 transition"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {appt.status === 'cancelled' && (
                          <button
                            onClick={() => handleOpenReschedule(appt)}
                            className="px-2.5 py-1 rounded-lg border border-stone-300 text-stone-700 font-medium text-[11px] hover:bg-stone-100 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div>
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Appointment Overview</span>
                <h3 className="text-lg font-bold text-stone-900">{selectedApptDetails.bookingReference}</h3>
              </div>
              <button
                onClick={() => setSelectedApptDetails(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/70 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Service:</span>
                  <span className="font-semibold text-stone-900">{selectedApptDetails.serviceName} ({selectedApptDetails.durationMinutes} mins)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Staff Specialist:</span>
                  <span className="font-semibold text-stone-900">{selectedApptDetails.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Scheduled Time:</span>
                  <span className="font-semibold text-stone-900">
                    {new Date(selectedApptDetails.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Booked On:</span>
                  <span className="text-stone-700">{new Date(selectedApptDetails.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Price:</span>
                  <span className="font-bold text-stone-900">₱{Number(selectedApptDetails.price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span className="font-bold uppercase text-stone-900">{selectedApptDetails.status}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-800 mb-1">Customer Information</h4>
                <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-1">
                  <div><strong>Name:</strong> {selectedApptDetails.customerName}</div>
                  <div><strong>Email:</strong> {selectedApptDetails.customerEmail}</div>
                  <div><strong>Phone:</strong> {selectedApptDetails.customerPhone}</div>
                  {selectedApptDetails.notes && <div><strong>Notes:</strong> {selectedApptDetails.notes}</div>}
                  {selectedApptDetails.cancellationReason && (
                    <div className="text-rose-700 font-semibold">
                      <strong>Cancellation Reason:</strong> {selectedApptDetails.cancellationReason}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-800 mb-1">Status Audit History</h4>
                <div className="space-y-2">
                  {apptHistory.length === 0 ? (
                    <p className="text-stone-400 italic">No history records logged.</p>
                  ) : (
                    apptHistory.map((h, i) => (
                      <div key={i} className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-stone-800">
                            Status changed to <span className="uppercase">{h.newStatus}</span> by {h.changedBy}
                          </div>
                          {h.reason && <div className="text-stone-500 text-[11px] mt-0.5">{h.reason}</div>}
                        </div>
                        <span className="text-[10px] text-stone-400 shrink-0">
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
                className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SAFE RESCHEDULE */}
      {rescheduleAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Reschedule Appointment</h3>
            <p className="text-xs text-stone-500 mb-4">
              Select an available opening for {rescheduleAppt.bookingReference} ({rescheduleAppt.serviceName}).
            </p>

            {rescheduleError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => handleRescheduleDateOrStaffChange(e.target.value, rescheduleStaffId)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Staff Specialist</label>
                  <select
                    value={rescheduleStaffId}
                    onChange={(e) => handleRescheduleDateOrStaffChange(rescheduleDate, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                  >
                    {rescheduleStaffList.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1.5">Available Open Slots</label>
                {rescheduleSlots.length === 0 ? (
                  <p className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-stone-400 text-center">
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
                <label className="block font-semibold text-stone-700 mb-1">Reschedule Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Client requested afternoon change"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleAppt(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading || !selectedRescheduleSlot}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition shadow disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <XCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">Cancel Appointment?</h3>
            <p className="text-xs text-stone-500 mb-4">
              Are you sure you want to cancel booking <strong>{cancelModalAppt.bookingReference}</strong> ({cancelModalAppt.customerName})? The time slot will be released back to availability.
            </p>

            <form onSubmit={handleConfirmCancellation} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Reason for Cancellation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule conflict or client request"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalAppt(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition shadow"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE DEMO BUSINESS STUDIO WIZARD */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Business Setup Studio</h3>
                  <p className="text-xs text-stone-500">Configure and launch a fictional demo business</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-4 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBusinessSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Dental & Orthodontics, Zenith Wellness"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Selection with Add New Category */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-stone-700">Category</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(!isCustomCategory);
                        setCustomCategoryInput('');
                      }}
                      className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline"
                    >
                      {isCustomCategory ? 'Choose Existing' : '+ Add New'}
                    </button>
                  </div>
                  {isCustomCategory ? (
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Photography Studio, Pet Grooming"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-amber-300 bg-amber-50/50 text-xs focus:outline-none focus:border-stone-900"
                    />
                  ) : (
                    <select
                      value={createCategory}
                      onChange={(e) => setCreateCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                    >
                      {categoryOptions.map((cat, i) => (
                        <option key={i} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* City / Location Selection with Add Custom Location */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-stone-700">Location / City</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCity(!isCustomCity);
                        setCustomCityInput('');
                      }}
                      className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline"
                    >
                      {isCustomCity ? 'Choose City' : '+ Add Custom'}
                    </button>
                  </div>
                  {isCustomCity ? (
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Cebu IT Park, Davao City"
                      value={customCityInput}
                      onChange={(e) => setCustomCityInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-amber-300 bg-amber-50/50 text-xs focus:outline-none focus:border-stone-900"
                    />
                  ) : (
                    <select
                      value={createBranchCity}
                      onChange={(e) => setCreateBranchCity(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                    >
                      {cityOptions.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Logo / Avatar URL (Optional — auto-generates branded fallback if empty)
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://images.unsplash.com/... or image link"
                  value={createLogoUrl}
                  onChange={(e) => setCreateLogoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Business Description</label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe what services or specialties this business provides..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="border-t border-stone-100 pt-3">
                <span className="font-semibold text-stone-800 block mb-2">Initial Demonstration Branch Location</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-500 mb-1">Branch Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Flagship Branch"
                      value={createBranchName}
                      onChange={(e) => setCreateBranchName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Branch Phone</label>
                    <input
                      type="text"
                      placeholder="+63 2 8999 0001"
                      value={createBranchPhone}
                      onChange={(e) => setCreateBranchPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-stone-500 mb-1">Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 88 Commercial Ave, Level 2"
                    value={createBranchAddress}
                    onChange={(e) => setCreateBranchAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-stone-500 mb-1">Latitude (Optional)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 14.5547"
                      value={createLatitude}
                      onChange={(e) => setCreateLatitude(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Longitude (Optional)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 121.0244"
                      value={createLongitude}
                      onChange={(e) => setCreateLongitude(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Studio Generator:</strong> Upon setup, Appointmo automatically seeds an initial active service, certified lead practitioner, and Monday-Saturday working hours to immediately enable live customer bookings.
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBusiness || !createName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition shadow disabled:opacity-50"
                >
                  {creatingBusiness ? 'Configuring Studio...' : 'Launch Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: SUGGESTED & BEST BUSINESS IDEAS */}
      {isIdeasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Suggested &amp; Best Business Ideas</h3>
                  <p className="text-xs text-stone-500">High-converting appointment concepts pre-optimized for Appointmo</p>
                </div>
              </div>
              <button
                onClick={() => setIsIdeasModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs text-stone-600">
                <span className="font-semibold text-stone-900">💡 Instant Launch: </span>
                Click <strong>"Use This Idea"</strong> on any suggestion below to pre-populate the Business Setup Studio wizard with verified synthetic catalogue details, location, and service structure.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessIdeas.map((idea, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:border-amber-400 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                          {idea.category}
                        </span>
                        <span className="text-[11px] font-bold text-stone-900">
                          {idea.pricingRange}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 mb-1">{idea.title}</h4>
                      <p className="text-[11px] text-stone-500 leading-relaxed mb-3">
                        {idea.description}
                      </p>

                      <div className="space-y-1.5 mb-3 bg-stone-50 p-2.5 rounded-xl text-[10px] text-stone-600">
                        <div className="font-semibold text-stone-700">Recommended Location:</div>
                        <div className="flex items-center space-x-1 text-stone-600">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          <span>{idea.recommendedCity}</span>
                        </div>
                        <div className="font-semibold text-stone-700 pt-1">Key High-Demand Services:</div>
                        <div className="text-stone-500">
                          {idea.keyServices.join(' • ')}
                        </div>
                      </div>

                      <div className="text-[10px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100 mb-4">
                        <strong>Why it succeeds:</strong> {idea.whyItWorks}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyBusinessIdea(idea)}
                      className="w-full py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition flex items-center justify-center space-x-1.5 shadow"
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
