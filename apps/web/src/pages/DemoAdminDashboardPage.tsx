import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Calendar, Users, DollarSign, CheckCircle2, 
  Search, Filter, Clock, ArrowRight, Sparkles, Building2, 
  Check, X, AlertTriangle, Shield, Bell, ChevronRight, UserCheck, 
  RefreshCw, Info, Edit3, XCircle, AlertCircle, Plus, ChevronDown, Store, MapPin, Lightbulb, TrendingUp, LogOut,
  Settings, Image, Scissors, Briefcase, Power, Save
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { BusinessLogo } from '../components/BusinessLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { DemoTopNav } from '../components/DemoTopNav';
import { Pagination } from '../components/Pagination';
import { toast } from 'sonner';

export const DemoAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Active Admin View Tab: 'appointments' or 'setup'
  const [activeTab, setActiveTab] = useState<'appointments' | 'setup'>('appointments');

  const [businesses, setBusinesses] = useState<any[]>([]);
  // Resolve active store slug from URL or user context, default to lumiere-beauty-studio
  const urlSlug = searchParams.get('slug');
  const storedUser = (() => {
    try {
      const u = localStorage.getItem('appointmo_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  const [activeSlug, setActiveSlug] = useState<string>(
    urlSlug || storedUser?.businessSlug || 'lumiere-beauty-studio'
  );
  const [currentBusiness, setCurrentBusiness] = useState<any | null>(null);

  // Settings & Store Setup State
  const [storeServices, setStoreServices] = useState<any[]>([]);
  const [storeStaff, setStoreStaff] = useState<any[]>([]);
  const [storeWorkingHours, setStoreWorkingHours] = useState<any[]>([]);
  
  // Edit Form Fields
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editOpeningHours, setEditOpeningHours] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editSocialHandle, setEditSocialHandle] = useState('');
  const [editStatus, setEditStatus] = useState<'approved' | 'closed' | 'pending'>('approved');
  const [savingSettings, setSavingSettings] = useState(false);

  // Pending State Calculation
  const isPending = currentBusiness?.status === 'pending' || editStatus === 'pending' || (storedUser?.role === 'business_admin' && storedUser?.status === 'pending');

  // Quick Staff Creation Form
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffBio, setNewStaffBio] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);

  // Quick Service Creation Form
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('45');
  const [newServiceCategory, setNewServiceCategory] = useState('General');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [addingService, setAddingService] = useState(false);

  const [metrics, setMetrics] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Notification Feed State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null);

  // Pagination states
  const APPTS_PER_PAGE = 10;
  const [apptPage, setApptPage] = useState(1);

  const SERVICES_PER_PAGE = 6;
  const [servicePage, setServicePage] = useState(1);

  const STAFF_PER_PAGE = 5;
  const [staffPage, setStaffPage] = useState(1);

  useEffect(() => {
    setApptPage(1);
  }, [statusFilter, search, activeSlug]);

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
      setStoreServices(sRes.services || []);
      setStoreStaff(sRes.staff || []);
      setStoreWorkingHours(sRes.workingHours || []);

      if (sRes.business) {
        setEditName(sRes.business.name || '');
        setEditTagline(sRes.business.tagline || '');
        setEditDescription(sRes.business.description || '');
        setEditLogoUrl(sRes.business.logoUrl || '');
        setEditPhone(sRes.business.phone || '');
        setEditEmail(sRes.business.email || '');
        setEditAddress(sRes.business.address || '');
        setEditCity(sRes.business.city || '');
        setEditOpeningHours(sRes.business.openingHours || '');
        setEditWebsite(sRes.business.website || '');
        setEditSocialHandle(sRes.business.socialHandle || '');
        setEditStatus(sRes.business.status || 'approved');
      }
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
    if (isPending) {
      toast.warning('Action Blocked', {
        description: 'Your store is currently pending review and approval (1 to 2 business days). Status updates are locked.'
      });
      return;
    }
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
    if (isPending) {
      toast.warning('Action Blocked', {
        description: 'Your store is currently pending review and approval (1 to 2 business days). Rescheduling is locked.'
      });
      return;
    }
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
    if (isPending) {
      toast.warning('Action Blocked', {
        description: 'Your store is currently pending review and approval (1 to 2 business days). Rescheduling is locked.'
      });
      return;
    }
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
    if (isPending) {
      toast.warning('Action Blocked', {
        description: 'Your store is currently pending review and approval (1 to 2 business days). Cancellation is locked.'
      });
      return;
    }
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

  // View notification full info
  const handleViewNotification = async (notif: any) => {
    setSelectedNotif(notif);
    setIsNotifOpen(false);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await apiFetch(`/demo/admin/notifications/${notif.id}/read`, { method: 'PATCH' });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Mark all notifications read
  const handleMarkAllNotifsRead = async () => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await apiFetch(`/demo/admin/notifications/mark-all-read`, { method: 'POST' });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Save Store Settings
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) {
      toast.warning('Action Blocked', {
        description: 'Your store is currently pending review and approval (1 to 2 business days). Settings cannot be modified until approved.'
      });
      return;
    }
    setSavingSettings(true);
    try {
      const res: any = await apiFetch(`/demo/admin/settings?slug=${encodeURIComponent(activeSlug)}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          tagline: editTagline.trim(),
          description: editDescription.trim(),
          logoUrl: editLogoUrl.trim() || null,
          phone: editPhone.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
          city: editCity.trim(),
          openingHours: editOpeningHours.trim(),
          website: editWebsite.trim() || null,
          socialHandle: editSocialHandle.trim() || null,
          status: editStatus,
        }),
      });

      toast.success('Store Settings Saved', {
        description: 'Store logo, details, operational status, and contact info updated.',
      });
      if (res.business) {
        setCurrentBusiness(res.business);
      }
      fetchDashboardData();
    } catch (err: any) {
      toast.error('Failed to save store settings', { description: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  // Add Staff Specialist
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) {
      toast.warning('Action Blocked', {
        description: 'Your store is currently pending review and approval (1 to 2 business days). Adding staff is locked.'
      });
      return;
    }
    if (!newStaffName.trim()) return;
    setAddingStaff(true);
    try {
      await apiFetch(`/demo/admin/staff?slug=${encodeURIComponent(activeSlug)}`, {
        method: 'POST',
        body: JSON.stringify({
          name: newStaffName.trim(),
          bio: newStaffBio.trim() || 'Store specialist and consultant',
        }),
      });
      toast.success('Staff specialist added successfully');
      setNewStaffName('');
      setNewStaffBio('');
      setShowAddStaffModal(false);
      fetchDashboardData();
    } catch (err: any) {
      toast.error('Failed to add staff', { description: err.message });
    } finally {
      setAddingStaff(false);
    }
  };

  // Add Service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) {
      toast.warning('Action Blocked', {
        description: 'Your store is currently pending review and approval (1 to 2 business days). Adding services is locked.'
      });
      return;
    }
    if (!newServiceName.trim() || !newServicePrice) return;
    setAddingService(true);
    try {
      await apiFetch(`/demo/admin/services?slug=${encodeURIComponent(activeSlug)}`, {
        method: 'POST',
        body: JSON.stringify({
          name: newServiceName.trim(),
          price: Number(newServicePrice),
          durationMinutes: Number(newServiceDuration) || 45,
          category: newServiceCategory.trim() || 'General',
          description: newServiceDesc.trim() || 'Store appointment service',
        }),
      });
      toast.success('Service menu item added successfully');
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDesc('');
      setShowAddServiceModal(false);
      fetchDashboardData();
    } catch (err: any) {
      toast.error('Failed to add service', { description: err.message });
    } finally {
      setAddingService(false);
    }
  };

  const totalApptPages = Math.ceil(appointments.length / APPTS_PER_PAGE);
  const paginatedAppointments = appointments.slice((apptPage - 1) * APPTS_PER_PAGE, apptPage * APPTS_PER_PAGE);

  const totalServicePages = Math.ceil(storeServices.length / SERVICES_PER_PAGE);
  const paginatedServices = storeServices.slice((servicePage - 1) * SERVICES_PER_PAGE, servicePage * SERVICES_PER_PAGE);

  const totalStaffPages = Math.ceil(storeStaff.length / STAFF_PER_PAGE);
  const paginatedStaff = storeStaff.slice((staffPage - 1) * STAFF_PER_PAGE, staffPage * STAFF_PER_PAGE);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-20 transition-colors">
      {/* Top Segmented Navigation Bar with Global Reset */}
      <DemoTopNav 
        currentRole="admin" 
        onResetComplete={() => {
          fetchDashboardData();
          fetchNotifications();
        }}
      />

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
                {isPending && (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 shadow-sm flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Pending Verification</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {currentBusiness?.description || 'Synthetic appointment provider in Metro Manila'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher Tabs (Appointments vs Store Setup) */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setActiveTab('appointments')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'appointments'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Appointments</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('setup')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'setup'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-amber-500" />
                <span>Store Setup &amp; Menu</span>
              </button>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

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
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium text-[10px]">View info &rarr;</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('appointmo_auth');
                localStorage.removeItem('appointmo_token');
                localStorage.removeItem('appointmo_user');
                navigate('/admin/login');
              }}
              title="Sign Out"
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center space-x-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[11px] font-semibold hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Prominent Pending Review Banner */}
        {isPending && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start sm:items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-base">
                    Store Status: Pending Approval &amp; Verification
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-stone-950 shadow-sm">
                    Wait 1 – 2 Business Days
                  </span>
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 max-w-3xl leading-relaxed">
                  Your store has been created and is currently under review. Please wait <strong>1 to 2 business days</strong> for verification and activation. During review, your dashboard is in <strong>read-only preview mode</strong>: store settings, staff, services, and appointment management actions are locked, and customer bookings are temporarily disabled until authorized.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center space-x-2 self-start md:self-auto">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-800 dark:text-amber-300 bg-amber-500/10 flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Read-Only Preview</span>
              </span>
            </div>
          </div>
        )}
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

        {/* View Content: Appointments vs Store Setup */}
        {activeTab === 'setup' ? (
          /* =========================================================================
             STORE SETUP & MANAGEMENT MENU UI
             ========================================================================= */
          <div className="space-y-6 animate-in fade-in">
            {/* Header / Intro */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                  <Settings className="w-6 h-6 text-amber-500" />
                  <span>Store Setup &amp; Settings</span>
                </h1>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 font-medium">
                  Customize your store logo, branding description, staff specialists, appointment slots, and operational status.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  editStatus === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : editStatus === 'closed'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  Store Status: {editStatus === 'approved' ? 'Active / Open' : editStatus === 'closed' ? 'Temporarily Closed' : 'Under Review'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Brand Identity, Logo & Status */}
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleSaveStoreSettings} className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
                  <div className="border-b border-stone-100 dark:border-stone-800 pb-3 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                      <Store className="w-4 h-4 text-amber-500" />
                      <span>Store Profile &amp; Branding</span>
                    </h2>
                    <span className="text-[11px] text-stone-500 font-mono">Slug: {activeSlug}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Store / Business Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        disabled={isPending}
                        className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Tagline / Catchphrase</label>
                      <input
                        type="text"
                        value={editTagline}
                        onChange={(e) => setEditTagline(e.target.value)}
                        placeholder="e.g. Premium Aesthetic Treatments"
                        disabled={isPending}
                        className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Store Description &amp; About</label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Describe what services you offer, your studio vibe, and what clients can expect..."
                      disabled={isPending}
                      className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                    />
                  </div>

                  {/* Logo URL with Live Preview */}
                  <div className="p-4 rounded-2xl bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 text-xs space-y-2.5 transition-colors">
                    <label className="block font-semibold text-stone-800 dark:text-stone-200">Store Logo URL</label>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {editLogoUrl ? (
                          <img src={editLogoUrl} alt="Store Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                        )}
                      </div>
                      <input
                        type="url"
                        value={editLogoUrl}
                        onChange={(e) => setEditLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        disabled={isPending}
                        className={`flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                      />
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
                      Provide an image link to replace the default lettermark logo.
                    </p>
                  </div>

                  {/* Contact & Hours */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Store Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        disabled={isPending}
                        className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Store Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        disabled={isPending}
                        className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Operating Hours / Slots</label>
                      <input
                        type="text"
                        value={editOpeningHours}
                        onChange={(e) => setEditOpeningHours(e.target.value)}
                        placeholder="e.g. 9:00 AM - 6:00 PM (Mon-Sat)"
                        disabled={isPending}
                        className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">City / Region</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        disabled={isPending}
                        className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Full Studio Address</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        disabled={isPending}
                        className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Store Operational Status Radio / Toggle */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-2 text-xs">
                      Manage Store Operational Status
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setEditStatus('approved')}
                        className={`p-3 rounded-2xl border text-left text-xs transition ${
                          editStatus === 'approved'
                            ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                            : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                        } ${isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold">
                          <Power className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Open for Bookings</span>
                        </div>
                        <p className="text-[11px] mt-1 text-stone-500">Clients can view calendar and book appointments.</p>
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setEditStatus('closed')}
                        className={`p-3 rounded-2xl border text-left text-xs transition ${
                          editStatus === 'closed'
                            ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                            : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                        } ${isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Temporarily Closed</span>
                        </div>
                        <p className="text-[11px] mt-1 text-stone-500">Halt new appointments while preserving existing bookings.</p>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingSettings || isPending}
                      className="px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-bold hover:bg-stone-800 dark:hover:bg-amber-300 transition flex items-center space-x-2 shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isPending ? 'Locked (Pending Review)' : savingSettings ? 'Saving Changes...' : 'Save Store Profile'}</span>
                    </button>
                  </div>
                </form>

                {/* Service Menu & Pricing UI */}
                <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                        <Scissors className="w-4 h-4 text-amber-500" />
                        <span>Services &amp; Pricing Menu</span>
                      </h2>
                      <p className="text-[11px] text-stone-500">Active services bookable by customers.</p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (isPending) {
                          toast.warning('Action Blocked', {
                            description: 'Adding services is locked while your store is pending review.'
                          });
                          return;
                        }
                        setShowAddServiceModal(true);
                      }}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Service</span>
                    </button>
                  </div>

                  <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                    {storeServices.length === 0 ? (
                      <div className="py-6 text-center text-stone-400">No services created yet.</div>
                    ) : (
                      paginatedServices.map((svc) => (
                        <div key={svc.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                              <span>{svc.name}</span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                                {svc.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">{svc.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                              ₱{Number(svc.price).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-stone-500 font-medium">
                              {svc.durationMinutes} mins
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Pagination
                    currentPage={servicePage}
                    totalPages={totalServicePages}
                    totalItems={storeServices.length}
                    itemsPerPage={SERVICES_PER_PAGE}
                    onPageChange={setServicePage}
                    itemName="services"
                  />
                </div>
              </div>

              {/* Right Column: Staff Specialists & Appointment Slots / Working Hours */}
              <div className="space-y-6">
                {/* Staff Specialists Management */}
                <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                        <Users className="w-4 h-4 text-amber-500" />
                        <span>Staff Specialists</span>
                      </h2>
                      <p className="text-[11px] text-stone-500">Manage practitioners assigned to bookings.</p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (isPending) {
                          toast.warning('Action Blocked', {
                            description: 'Adding staff is locked while your store is pending review.'
                          });
                          return;
                        }
                        setShowAddStaffModal(true);
                      }}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Staff</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {storeStaff.length === 0 ? (
                      <div className="py-6 text-center text-stone-400">No staff specialists listed.</div>
                    ) : (
                      paginatedStaff.map((st) => (
                        <div key={st.id} className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                              {st.name?.substring(0, 1) || 'S'}
                            </div>
                            <div>
                              <div className="font-bold text-stone-900 dark:text-stone-100">{st.name}</div>
                              <div className="text-[10px] text-stone-500">{st.bio || 'Store Specialist'}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <Pagination
                    currentPage={staffPage}
                    totalPages={totalStaffPages}
                    totalItems={storeStaff.length}
                    itemsPerPage={STAFF_PER_PAGE}
                    onPageChange={setStaffPage}
                    itemName="specialists"
                  />
                </div>

                {/* Appointment Slots & Working Schedule */}
                <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 text-xs">
                  <div className="pb-3 border-b border-stone-100 dark:border-stone-800">
                    <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>Appointment Slots &amp; Hours</span>
                    </h2>
                    <p className="text-[11px] text-stone-500">Weekly schedule slots configured for booking.</p>
                  </div>

                  <div className="space-y-2">
                    {[
                      { day: 'Monday', time: '9:00 AM - 6:00 PM', status: 'Available' },
                      { day: 'Tuesday', time: '9:00 AM - 6:00 PM', status: 'Available' },
                      { day: 'Wednesday', time: '9:00 AM - 6:00 PM', status: 'Available' },
                      { day: 'Thursday', time: '9:00 AM - 6:00 PM', status: 'Available' },
                      { day: 'Friday', time: '9:00 AM - 6:00 PM', status: 'Available' },
                      { day: 'Saturday', time: '9:00 AM - 6:00 PM', status: 'Available' },
                      { day: 'Sunday', time: 'Rest Day / Closed', status: 'Closed' },
                    ].map((slot, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1.5 border-b border-stone-100 dark:border-stone-800">
                        <span className="font-semibold text-stone-700 dark:text-stone-300">{slot.day}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-stone-500 font-mono text-[11px]">{slot.time}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            slot.status === 'Available' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                          }`}>
                            {slot.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-500 pt-2 italic">
                    Appointment slots are automatically spaced in 45-minute increments based on active service duration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             ORIGINAL APPOINTMENTS VIEW
             ========================================================================= */
          <>
            {/* Dashboard Title & Quick Insight */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Business Operations &amp; Appointments</h1>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 font-medium">
                  Appointments sorted by <strong>creation date (newest first)</strong>. Auto-refreshes every 5 seconds.
                </p>
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
                  paginatedAppointments.map((appt) => (
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
                              disabled={isPending}
                              onClick={() => handleOpenReschedule(appt)}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold text-[11px] hover:bg-stone-200 dark:hover:bg-stone-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Reschedule
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => handleUpdateStatus(appt.id, 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-[11px] hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Complete
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => {
                                if (isPending) {
                                  toast.warning('Action Blocked', {
                                    description: 'Cancellation is locked while your store is pending review.'
                                  });
                                  return;
                                }
                                setCancelModalAppt(appt);
                                setCancelReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-semibold text-[11px] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {appt.status === 'pending' && (
                          <>
                            <button
                              disabled={isPending}
                              onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 dark:bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-800 dark:hover:bg-emerald-500 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Approve
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => {
                                if (isPending) {
                                  toast.warning('Action Blocked', {
                                    description: 'Decline is locked while your store is pending review.'
                                  });
                                  return;
                                }
                                setCancelModalAppt(appt);
                                setCancelReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-semibold text-[11px] hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {appt.status === 'cancelled' && (
                          <button
                            disabled={isPending}
                            onClick={() => handleOpenReschedule(appt)}
                            className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-[11px] hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="p-4 bg-stone-50/50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
            <Pagination
              currentPage={apptPage}
              totalPages={totalApptPages}
              totalItems={appointments.length}
              itemsPerPage={APPTS_PER_PAGE}
              onPageChange={setApptPage}
              itemName="appointments"
            />
          </div>
        </div>
          </>
        )}
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
                    className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-5 shadow-sm hover:border-amber-400 dark:hover:border-amber-500 transition flex flex-col justify-between"
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
      {/* MODAL 6: ADD STAFF MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Add Staff Specialist</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Staff Member Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Role &amp; Bio</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Aesthetician &amp; Skin Specialist"
                  value={newStaffBio}
                  onChange={(e) => setNewStaffBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStaff}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
                >
                  {addingStaff ? 'Adding...' : 'Add Specialist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: ADD SERVICE MODAL */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Scissors className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Add Service to Menu</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddServiceModal(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe Hydra-Facial"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Price (₱ PHP)</label>
                  <input
                    type="number"
                    required
                    placeholder="1500"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    placeholder="45"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Facial &amp; Skin Care"
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  placeholder="What is included in this session..."
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingService}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
                >
                  {addingService ? 'Saving...' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTIFICATION FULL INFO MODAL */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 max-w-lg w-full shadow-2xl relative">
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
                <div className="grid grid-cols-2 gap-3 text-xs">
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
                    const apptId = selectedNotif.appointmentId!;
                    setSelectedNotif(null);
                    handleOpenDetails(apptId);
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
    </div>
  );
};
