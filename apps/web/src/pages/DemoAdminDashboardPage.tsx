import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Calendar, Users, Coins, CheckCircle2, 
  Search, Filter, Clock, ArrowRight, Sparkles, Building2, 
  Check, X, AlertTriangle, Shield, Bell, ChevronRight, ChevronLeft, UserCheck,
  RefreshCw, Info, Edit3, XCircle, AlertCircle, Plus, ChevronDown, Store, MapPin, Lightbulb, TrendingUp, LogOut,
  Settings, Image, Scissors, Briefcase, Power, Save, Globe, Share2, Mail, Phone, Sliders, ShieldCheck, ShieldAlert,
  User, Lock, Eye, EyeOff, Receipt, Wallet, Award, FileSpreadsheet
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { BusinessLogo } from '../components/BusinessLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { DemoTopNav } from '../components/DemoTopNav';
import { Pagination } from '../components/Pagination';
import { SUPPORTED_COUNTRIES, getCountryByName, getCurrencySymbol, formatPhoneNumberLive, normalizePhoneNumber, formatFormalName, parseFormalName, validateFullPhoneNumber } from '../lib/countryConfig';
import { CountryPhoneInput } from '../components/CountryPhoneInput';
import { FormalNameFields } from '../components/FormalNameFields';
import { toast } from 'sonner';

type StaffScheduleDay = {
  dayOfWeek: number;
  day: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
};

const STAFF_SCHEDULE_DAYS = [
  { dayOfWeek: 1, day: 'Monday' },
  { dayOfWeek: 2, day: 'Tuesday' },
  { dayOfWeek: 3, day: 'Wednesday' },
  { dayOfWeek: 4, day: 'Thursday' },
  { dayOfWeek: 5, day: 'Friday' },
  { dayOfWeek: 6, day: 'Saturday' },
  { dayOfWeek: 0, day: 'Sunday' },
];

const defaultStaffSchedule = (): StaffScheduleDay[] => STAFF_SCHEDULE_DAYS.map(({ dayOfWeek, day }) => ({
  dayOfWeek,
  day,
  isWorking: dayOfWeek !== 0,
  startTime: '09:00',
  endTime: '18:00',
  breakStart: dayOfWeek === 0 ? '' : '12:00',
  breakEnd: dayOfWeek === 0 ? '' : '13:00',
}));

export const DemoAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Active Admin View Tab: 'appointments' or 'setup'
  const [activeTab, setActiveTab] = useState<'appointments' | 'setup'>('appointments');
  // Store Setup Sub-Navigation Menu
  const [setupSubTab, setSetupSubTab] = useState<'profile' | 'services' | 'staff' | 'customers' | 'hris' | 'schedule' | 'policies' | 'account'>('profile');
  const [setupDropdownOpen, setSetupDropdownOpen] = useState(false);
  const [activeProfileSection, setActiveProfileSection] = useState('profile-brand-identity');
  const setupDropdownRef = useRef<HTMLDivElement>(null);
  const profileSwiperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeSetupDropdown = (event: MouseEvent) => {
      if (!setupDropdownRef.current?.contains(event.target as Node)) setSetupDropdownOpen(false);
    };
    document.addEventListener('mousedown', closeSetupDropdown);
    return () => document.removeEventListener('mousedown', closeSetupDropdown);
  }, []);

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
  const [storeCustomers, setStoreCustomers] = useState<any[]>([]);
  const [loadingStoreCustomers, setLoadingStoreCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [editingStoreCustomer, setEditingStoreCustomer] = useState<any | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  
  // Edit Form Fields (Matching "Launch Your Own Store" Creation Form)
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editCategory, setEditCategory] = useState('Beauty & Wellness');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const categoryOptions = [
    'Beauty & Wellness',
    'Dental Services',
    'Veterinary Services',
    'Professional Consultations',
    'Automotive & Detailing',
    'Health & Fitness',
  ];

  const defaultPhConfig = getCountryByName('Philippines');
  const [editCountry, setEditCountry] = useState('Philippines');
  const [editCurrency, setEditCurrency] = useState('PHP');
  const [editTimezone, setEditTimezone] = useState('Asia/Manila');
  const [editStateProvince, setEditStateProvince] = useState(defaultPhConfig.defaultState || 'Metro Manila');
  const [editPostalCode, setEditPostalCode] = useState('');

  const [editCity, setEditCity] = useState(defaultPhConfig.defaultCity || 'Quezon City');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const [cityOptions, setCityOptions] = useState<string[]>(defaultPhConfig.cities || [
    'Quezon City',
    'Makati',
    'Taguig / BGC',
    'Pasig / Ortigas',
  ]);

  const [editDescription, setEditDescription] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLatitude, setEditLatitude] = useState<number | undefined>(undefined);
  const [editLongitude, setEditLongitude] = useState<number | undefined>(undefined);
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('18:00');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isTimeModified, setIsTimeModified] = useState(false);
  const isSettingsDirtyRef = useRef(false);
  const [isSettingsDirty, setIsSettingsDirtyState] = useState(false);
  const setIsSettingsDirty = (val: boolean) => {
    isSettingsDirtyRef.current = val;
    setIsSettingsDirtyState(val);
  };
  const [editOpeningHours, setEditOpeningHours] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editSocialHandle, setEditSocialHandle] = useState('');
  const [editStatus, setEditStatus] = useState<'approved' | 'closed' | 'pending'>('approved');

  // Weekly Schedule State (Mon-Sun)
  const defaultWeeklySchedule = [
    { day: 'Monday', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Tuesday', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Wednesday', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Thursday', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Friday', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Saturday', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Sunday', isWorking: false, startTime: '09:00', endTime: '18:00' },
  ];
  const [weeklySchedule, setWeeklySchedule] = useState(defaultWeeklySchedule);

  const handleCountryChange = (cName: string) => {
    setIsSettingsDirty(true);
    setEditCountry(cName);
    const cfg = getCountryByName(cName);
    setEditCurrency(cfg.currency);
    setEditTimezone(cfg.defaultTimezone);

    // Sync province/state to country default if configured
    if (cfg.defaultState) {
      setEditStateProvince(cfg.defaultState);
    }

    // Do not autofill phone number; allow user to type based on national/international country length
    // Smart sync cities list to this country
    if (cfg.cities && cfg.cities.length > 0) {
      setCityOptions(cfg.cities);
      setEditCity(cfg.defaultCity || cfg.cities[0]);
      setIsCustomCity(false);
      setCustomCityInput('');
    } else if (cfg.defaultCity) {
      setCityOptions([cfg.defaultCity]);
      setEditCity(cfg.defaultCity);
      setIsCustomCity(false);
    }
  };

  const validateTimeRange = (start: string, end: string) => {
    if (!start || !end) {
      setTimeError(null);
      return true;
    }
    if (start >= end) {
      setTimeError('Invalid time range: Opening time must be earlier than closing time.');
      return false;
    }
    setTimeError(null);
    return true;
  };

  // Helper to format 24-hr time range to 12-hr AM/PM string
  const formatTimeRange = (start: string, end: string) => {
    const formatSingle = (timeStr: string) => {
      if (!timeStr) return '';
      const [hours, mins] = timeStr.split(':').map(Number);
      if (isNaN(hours)) return timeStr;
      const period = hours >= 12 ? 'PM' : 'AM';
      const adjHours = hours % 12 || 12;
      const adjMins = mins ? String(mins).padStart(2, '0') : '00';
      return `${adjHours}:${adjMins} ${period}`;
    };
    return `${formatSingle(start || '09:00')} - ${formatSingle(end || '18:00')}`;
  };

  // Synchronize store weekly schedule operating hours to match Section 5 (Daily Operating Hours)
  const syncWeeklyScheduleWithStoreHours = (newStart: string, newEnd: string) => {
    setWeeklySchedule(prev => prev.map(slot => ({
      ...slot,
      startTime: newStart,
      endTime: newEnd,
    })));
  };

  // Suggested Booking Configurations
  const [requireApproval, setRequireApproval] = useState(false);
  const [minLeadHours, setMinLeadHours] = useState(2);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(60);
  const [slotInterval, setSlotInterval] = useState(45);
  const [autoReminderEmail, setAutoReminderEmail] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Admin Account Profile State
  const [accountName, setAccountName] = useState(storedUser?.name || '');
  const [accountEmail, setAccountEmail] = useState(storedUser?.email || '');
  const [accountPhone, setAccountPhone] = useState(storedUser?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [updatingAccount, setUpdatingAccount] = useState(false);

  // HRIS & Payroll Records State
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollStaffId, setPayrollStaffId] = useState('');
  const [payPeriodStart, setPayPeriodStart] = useState('');
  const [payPeriodEnd, setPayPeriodEnd] = useState('');
  const [basePay, setBasePay] = useState('');
  const [commissionPay, setCommissionPay] = useState('');
  const [bonuses, setBonuses] = useState('');
  const [deductions, setDeductions] = useState('');
  const [payrollNotes, setPayrollNotes] = useState('');
  const [recordingPayroll, setRecordingPayroll] = useState(false);

  // Detailed Staff Profile Modal (for HRIS management)
  const [editingStaffMember, setEditingStaffMember] = useState<any | null>(null);
  const [staffScheduleTarget, setStaffScheduleTarget] = useState<any | null>(null);
  const [staffScheduleDraft, setStaffScheduleDraft] = useState<StaffScheduleDay[]>(defaultStaffSchedule);
  const [staffScheduleServiceIds, setStaffScheduleServiceIds] = useState<string[]>([]);
  const [loadingStaffSchedule, setLoadingStaffSchedule] = useState(false);
  const [savingStaffSchedule, setSavingStaffSchedule] = useState(false);
  const [editStaffFirstName, setEditStaffFirstName] = useState('');
  const [editStaffMiddleName, setEditStaffMiddleName] = useState('');
  const [editStaffLastName, setEditStaffLastName] = useState('');
  const [editStaffPosition, setEditStaffPosition] = useState('Specialist');
  const [editStaffEmploymentType, setEditStaffEmploymentType] = useState('Full-Time');
  const [editStaffBaseSalary, setEditStaffBaseSalary] = useState('25000');
  const [editStaffCommissionRate, setEditStaffCommissionRate] = useState('10');
  const [editStaffHireDate, setEditStaffHireDate] = useState('');
  const [editStaffEmail, setEditStaffEmail] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffEmergencyName, setEditStaffEmergencyName] = useState('');
  const [editStaffEmergencyPhone, setEditStaffEmergencyPhone] = useState('');
  const [savingStaffHris, setSavingStaffHris] = useState(false);

  // Helper to split existing emergency contact into name and phone
  const parseStaffEmergency = (raw?: string) => {
    if (!raw) return { name: '', phone: '' };
    const phoneRegex = /(\+?\d[\d\s\-()]{7,}\d)/;
    const match = raw.match(phoneRegex);
    if (match) {
      const phone = match[0].trim();
      let name = raw.replace(match[0], '').replace(/[-–—()]/g, ' ').replace(/\s+/g, ' ').trim();
      const parenMatch = raw.match(/^([^(]+(?:\([a-zA-Z\s]+\))?)/);
      if (parenMatch && !parenMatch[1].includes(phone)) {
        name = parenMatch[1].replace(/[-–—:]/g, '').trim();
      }
      return { name, phone };
    }
    return { name: raw.trim(), phone: '' };
  };

  // Pending State Calculation
  const isPending = currentBusiness?.status === 'pending' || editStatus === 'pending' || (storedUser?.role === 'business_admin' && storedUser?.status === 'pending');

  // Quick Staff Creation Form
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffFirstName, setNewStaffFirstName] = useState('');
  const [newStaffMiddleName, setNewStaffMiddleName] = useState('');
  const [newStaffLastName, setNewStaffLastName] = useState('');
  const [newStaffBio, setNewStaffBio] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);

  // Quick Service Creation Form (with Time Picker & Category Selection)
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [removingServiceId, setRemovingServiceId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDurationHours, setNewServiceDurationHours] = useState('0');
  const [newServiceDurationMinutes, setNewServiceDurationMinutes] = useState('45');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationMinutes, setCustomDurationMinutes] = useState('45');
  const [newServiceCategory, setNewServiceCategory] = useState('Beauty & Wellness');
  const [isNewCustomCategory, setIsNewCustomCategory] = useState(false);
  const [newCustomCategoryInput, setNewCustomCategoryInput] = useState('');
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
  const notifRef = useRef<HTMLDivElement>(null);
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null);

  // Click outside to close notifications dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };

    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  // Pagination states
  const APPTS_PER_PAGE = 10;
  const [apptPage, setApptPage] = useState(1);

  const SERVICES_PER_PAGE = 6;
  const [servicePage, setServicePage] = useState(1);

  const STAFF_PER_PAGE = 5;
  const [staffPage, setStaffPage] = useState(1);

  const CUSTOMERS_PER_PAGE = 8;
  const [customerPage, setCustomerPage] = useState(1);

  useEffect(() => {
    setApptPage(1);
  }, [statusFilter, search, activeSlug]);

  useEffect(() => {
    setCustomerPage(1);
  }, [customerSearch, activeSlug]);

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
        // Protect user-edited form state from being clobbered by background polling
        if (!isSettingsDirtyRef.current) {
          setEditName(sRes.business.name || '');
          setEditTagline(sRes.business.tagline || '');
          setEditCategory(sRes.business.category || 'Beauty & Wellness');
          setEditDescription(sRes.business.description || '');
          setEditLogoUrl(sRes.business.logoUrl || '');
          setEditPhone(sRes.business.phone || '');
          setEditEmail(sRes.business.email || '');
          setEditAddress(sRes.business.address || '');
          const bCountry = sRes.business.country || 'Philippines';
          setEditCountry(bCountry);
          const bCountryCfg = getCountryByName(bCountry);
          setEditCurrency(sRes.business.currency || bCountryCfg.currency);
          setEditTimezone(sRes.business.timezone || bCountryCfg.defaultTimezone);
          setEditStateProvince(sRes.business.stateProvince || bCountryCfg.defaultState || '');
          setEditPostalCode(sRes.business.postalCode || '');

          // Populate city options corresponding to the country
          const availableCities = bCountryCfg.cities || [bCountryCfg.defaultCity || 'Quezon City'];
          const bCity = sRes.business.city || bCountryCfg.defaultCity || 'Quezon City';
          if (!availableCities.includes(bCity)) {
            setCityOptions([...availableCities, bCity]);
          } else {
            setCityOptions(availableCities);
          }
          setEditCity(bCity);
          setEditOpeningHours(sRes.business.openingHours || '9:00 AM - 6:00 PM');
          setEditWebsite(sRes.business.website || '');
          setEditSocialHandle(sRes.business.socialHandle || '');
          setEditStatus(sRes.business.status || 'approved');

          if (sRes.business.weeklySchedule) {
            const ws = typeof sRes.business.weeklySchedule === 'string'
              ? JSON.parse(sRes.business.weeklySchedule)
              : sRes.business.weeklySchedule;
            if (Array.isArray(ws) && ws.length === 7) {
              setWeeklySchedule(ws);
            }
          }

          if (sRes.business.bookingPolicies) {
            const bp = typeof sRes.business.bookingPolicies === 'string'
              ? JSON.parse(sRes.business.bookingPolicies)
              : sRes.business.bookingPolicies;
            if (bp.requireApproval !== undefined) setRequireApproval(bp.requireApproval);
            if (bp.minLeadHours !== undefined) setMinLeadHours(bp.minLeadHours);
            if (bp.maxAdvanceDays !== undefined) setMaxAdvanceDays(bp.maxAdvanceDays);
            if (bp.slotInterval !== undefined) setSlotInterval(bp.slotInterval);
            if (bp.autoReminderEmail !== undefined) setAutoReminderEmail(bp.autoReminderEmail);
          }
        }

        // Only overwrite start/end time from server if the user hasn't modified it locally
        if (!isTimeModified && !isSettingsDirtyRef.current && sRes.business.openingHours) {
          const parts = sRes.business.openingHours.split('-').map((s: string) => s.trim());
          if (parts.length === 2) {
            const parseTo24 = (t: string) => {
              const match = t.match(/(\d+):?(\d*)\s*(AM|PM)?/i);
              if (match) {
                let h = parseInt(match[1]);
                const m = match[2] ? parseInt(match[2]) : 0;
                const ampm = match[3] ? match[3].toUpperCase() : '';
                if (ampm === 'PM' && h < 12) h += 12;
                if (ampm === 'AM' && h === 12) h = 0;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              }
              return '09:00';
            };
            setEditStartTime(parseTo24(parts[0]));
            setEditEndTime(parseTo24(parts[1]));
          }
        }
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
    if (activeTab === 'setup' && setupSubTab === 'hris') {
      fetchPayroll();
    }
  }, [activeTab, setupSubTab, activeSlug]);

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

  // View notification full info: open modal, auto-remove from notification list
  const handleViewNotification = async (notif: any) => {
    setSelectedNotif(notif);
    setIsNotifOpen(false);
    // Auto remove from notification list once viewed
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    if (!notif.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    try {
      await apiFetch(`/demo/admin/notifications/${notif.id}/read`, { method: 'PATCH' });
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

    if (!validateTimeRange(editStartTime, editEndTime)) {
      toast.error('Invalid Time Range', {
        description: 'Opening time must be earlier than closing time.'
      });
      return;
    }

    if (!editName.trim()) {
      toast.error('Store Name Required', { description: 'Please enter a name for your store.' });
      return;
    }

    // Phone validation if entered
    if (editPhone.trim()) {
      const phoneVal = validateFullPhoneNumber(editPhone, editCountry, false);
      if (!phoneVal.isValid) {
        toast.error('Invalid Contact Phone', { description: phoneVal.error });
        return;
      }
    }

    const finalCategory = isCustomCategory ? customCategoryInput.trim() : editCategory.trim();
    const finalCity = isCustomCity ? customCityInput.trim() : editCity.trim();
    const formattedHours = formatTimeRange(editStartTime, editEndTime);

    setSavingSettings(true);
    try {
      const res: any = await apiFetch(`/demo/admin/settings?slug=${encodeURIComponent(activeSlug)}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          tagline: editTagline.trim(),
          category: finalCategory || 'Beauty & Wellness',
          description: editDescription.trim(),
          currency: editCurrency,
          timezone: editTimezone,
          logoUrl: editLogoUrl.trim() || null,
          phone: normalizePhoneNumber(editPhone, getCountryByName(editCountry).code),
          email: editEmail.trim(),
          address: editAddress.trim(),
          city: finalCity || 'Quezon City',
          country: editCountry,
          stateProvince: editStateProvince.trim() || null,
          postalCode: editPostalCode.trim() || null,
          openingHours: formattedHours,
          weeklySchedule,
          website: editWebsite.trim() || null,
          socialHandle: editSocialHandle.trim() || null,
          status: editStatus,
          bookingPolicies: {
            requireApproval,
            minLeadHours: Number(minLeadHours) || 2,
            maxAdvanceDays: Number(maxAdvanceDays) || 60,
            slotInterval: Number(slotInterval) || 45,
            autoReminderEmail,
          },
        }),
      });

      toast.success('Store Settings Saved', {
        description: 'Store profile, configurations, and operational parameters updated successfully.',
      });
      setIsTimeModified(false);
      setIsSettingsDirty(false);
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
    if (!newStaffFirstName.trim() || !newStaffLastName.trim()) {
      toast.error('First name and last name are required for staff specialist.');
      return;
    }
    const staffFullName = formatFormalName({
      firstName: newStaffFirstName,
      middleName: newStaffMiddleName,
      lastName: newStaffLastName,
    });
    setAddingStaff(true);
    try {
      await apiFetch(`/demo/admin/staff?slug=${encodeURIComponent(activeSlug)}`, {
        method: 'POST',
        body: JSON.stringify({
          name: staffFullName,
          bio: newStaffBio.trim() || 'Store specialist and consultant',
        }),
      });
      toast.success('Staff specialist added', {
        description: 'Assign their services and weekly hours from Schedule & Services to make them bookable.',
      });
      setNewStaffFirstName('');
      setNewStaffMiddleName('');
      setNewStaffLastName('');
      setNewStaffBio('');
      setShowAddStaffModal(false);
      fetchDashboardData();
    } catch (err: any) {
      toast.error('Failed to add staff', { description: err.message });
    } finally {
      setAddingStaff(false);
    }
  };

  const handleOpenStaffSchedule = async (staff: any) => {
    setStaffScheduleTarget(staff);
    setLoadingStaffSchedule(true);
    setStaffScheduleDraft(defaultStaffSchedule());
    setStaffScheduleServiceIds([]);
    try {
      const res: any = await apiFetch(`/demo/admin/staff/${staff.id}/schedule?slug=${encodeURIComponent(activeSlug)}`);
      const scheduleByDay = new Map<number, any>(
        (res.weeklySchedule || []).map((day: any) => [Number(day.dayOfWeek), day])
      );
      setStaffScheduleDraft(STAFF_SCHEDULE_DAYS.map(({ dayOfWeek, day }) => {
        const value = scheduleByDay.get(dayOfWeek);
        return {
          dayOfWeek,
          day,
          isWorking: value ? Boolean(value.isWorking) : dayOfWeek !== 0,
          startTime: value?.startTime || '09:00',
          endTime: value?.endTime || '18:00',
          breakStart: value?.breakStart || '',
          breakEnd: value?.breakEnd || '',
        };
      }));
      setStaffScheduleServiceIds(res.serviceIds || []);
    } catch (err: any) {
      setStaffScheduleTarget(null);
      toast.error('Could not load staff schedule', { description: err.message });
    } finally {
      setLoadingStaffSchedule(false);
    }
  };

  const handleSaveStaffSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffScheduleTarget) return;
    setSavingStaffSchedule(true);
    try {
      await apiFetch(`/demo/admin/staff/${staffScheduleTarget.id}/schedule?slug=${encodeURIComponent(activeSlug)}`, {
        method: 'PUT',
        body: JSON.stringify({
          serviceIds: staffScheduleServiceIds,
          weeklySchedule: staffScheduleDraft,
        }),
      });
      toast.success('Staff schedule saved', {
        description: `${staffScheduleTarget.name} will only appear for assigned services during these hours.`,
      });
      setStaffScheduleTarget(null);
      fetchDashboardData();
    } catch (err: any) {
      toast.error('Failed to save staff schedule', { description: err.message });
    } finally {
      setSavingStaffSchedule(false);
    }
  };

  // Fetch HRIS Payroll records
  const fetchPayroll = async () => {
    setLoadingPayroll(true);
    try {
      const res: any = await apiFetch(`/demo/admin/payroll?slug=${encodeURIComponent(activeSlug)}`);
      setPayrollRecords(res.payroll || []);
    } catch (err: any) {
      console.error('Failed to load payroll:', err);
    } finally {
      setLoadingPayroll(false);
    }
  };

  const fetchStoreCustomers = async () => {
    setLoadingStoreCustomers(true);
    try {
      const res: any = await apiFetch(`/demo/admin/customers?slug=${encodeURIComponent(activeSlug)}`);
      setStoreCustomers(res.customers || []);
    } catch (err: any) {
      toast.error('Failed to load customer accounts', { description: err.message });
    } finally {
      setLoadingStoreCustomers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'setup' && setupSubTab === 'customers') {
      fetchStoreCustomers();
    }
  }, [activeTab, setupSubTab, activeSlug]);

  const openStoreCustomerEditor = (customer: any) => {
    setEditingStoreCustomer(customer);
    setEditCustomerName(customer.name || '');
    setEditCustomerPhone(customer.phone || '');
  };

  const handleSaveStoreCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStoreCustomer) return;
    setSavingCustomer(true);
    try {
      const res: any = await apiFetch(
        `/demo/admin/customers/${editingStoreCustomer.id}?slug=${encodeURIComponent(activeSlug)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: editCustomerName.trim(), phone: editCustomerPhone.trim() }),
        }
      );
      setStoreCustomers((customers) => customers.map((customer) =>
        customer.id === res.customer.id ? { ...customer, ...res.customer } : customer
      ));
      toast.success('Customer contact updated', {
        description: `Saved the contact details for ${res.customer.name}.`,
      });
      setEditingStoreCustomer(null);
    } catch (err: any) {
      toast.error('Failed to update customer account', { description: err.message });
    } finally {
      setSavingCustomer(false);
    }
  };

  // Update Account Profile
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Password mismatch', { description: 'New password and confirmation password must match.' });
      return;
    }
    setUpdatingAccount(true);
    try {
      const res: any = await apiFetch('/auth/account', {
        method: 'PUT',
        body: JSON.stringify({
          name: accountName.trim(),
          email: accountEmail.trim(),
          phone: accountPhone.trim(),
          currentPassword: currentPassword.trim() || undefined,
          newPassword: newPassword.trim() || undefined,
        }),
      });

      if (res.token) {
        localStorage.setItem('appointmo_token', res.token);
      }
      if (res.user) {
        localStorage.setItem('appointmo_user', JSON.stringify({
          ...storedUser,
          ...res.user,
        }));
      }

      toast.success('Account Updated', {
        description: res.message || 'Your account credentials and details have been updated successfully.'
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error('Failed to update account', { description: err.message });
    } finally {
      setUpdatingAccount(false);
    }
  };

  // Add Service (with Duration time picker and Custom Category)
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) {
      toast.warning('Action Blocked', {
        description: 'Your store is pending review, so service changes are temporarily locked.'
      });
      return;
    }
    if (!newServiceName.trim() || !newServicePrice) return;

    const totalMinutes = isCustomDuration
      ? Number(customDurationMinutes)
      : (Number(newServiceDurationHours) * 60) + Number(newServiceDurationMinutes);
    if (totalMinutes <= 0 || isNaN(totalMinutes)) {
      toast.error('Invalid Duration', { description: 'Please enter or select a duration greater than 0 minutes.' });
      return;
    }

    const finalCategory = isNewCustomCategory ? newCustomCategoryInput.trim() : newServiceCategory.trim();
    if (!finalCategory) {
      toast.error('Category Required', { description: 'Please choose or enter a category for this service.' });
      return;
    }

    setAddingService(true);
    try {
      await apiFetch(editingServiceId
        ? `/demo/admin/services/${editingServiceId}?slug=${encodeURIComponent(activeSlug)}`
        : `/demo/admin/services?slug=${encodeURIComponent(activeSlug)}`, {
        method: editingServiceId ? 'PUT' : 'POST',
        body: JSON.stringify({
          name: newServiceName.trim(),
          price: Number(newServicePrice),
          durationMinutes: totalMinutes,
          category: finalCategory,
          description: newServiceDesc.trim() || 'Store appointment service',
        }),
      });
      toast.success(editingServiceId ? 'Service changes saved and synced to booking' : 'Service added and synced to booking');
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDurationHours('0');
      setNewServiceDurationMinutes('45');
      setIsCustomDuration(false);
      setCustomDurationMinutes('45');
      setIsNewCustomCategory(false);
      setNewCustomCategoryInput('');
      setNewServiceDesc('');
      setShowAddServiceModal(false);
      setEditingServiceId(null);
      fetchDashboardData();
    } catch (err: any) {
      toast.error(editingServiceId ? 'Failed to save service' : 'Failed to add service', { description: err.message });
    } finally {
      setAddingService(false);
    }
  };

  const openServiceEditor = (service: any) => {
    setEditingServiceId(service.id);
    setNewServiceName(service.name || '');
    setNewServicePrice(String(service.price ?? ''));
    setCustomDurationMinutes(String(service.durationMinutes || 45));
    setIsCustomDuration(true);
    const knownCategory = categoryOptions.includes(service.category);
    setIsNewCustomCategory(!knownCategory);
    setNewCustomCategoryInput(knownCategory ? '' : (service.category || ''));
    setNewServiceCategory(knownCategory ? service.category : (categoryOptions[0] || 'Beauty & Wellness'));
    setNewServiceDesc(service.description || '');
    setShowAddServiceModal(true);
  };

  const handleRemoveService = async (service: any) => {
    if (!window.confirm(`Remove “${service.name}” from your booking menu? Existing appointments will keep their service history.`)) return;
    setRemovingServiceId(service.id);
    try {
      await apiFetch(`/demo/admin/services/${service.id}?slug=${encodeURIComponent(activeSlug)}`, { method: 'DELETE' });
      toast.success('Service removed from booking and synced');
      if (paginatedServices.length === 1 && servicePage > 1) setServicePage((page) => page - 1);
      await fetchDashboardData();
    } catch (err: any) {
      toast.error('Failed to remove service', { description: err.message });
    } finally {
      setRemovingServiceId(null);
    }
  };

  // Save / Update Staff Member HRIS Details
  const handleSaveStaffHris = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffMember) return;

    if (!editStaffFirstName.trim() || !editStaffLastName.trim()) {
      toast.error('First name and last name are required for staff profile.');
      return;
    }

    // Phone validation if entered
    if (editStaffPhone.trim()) {
      const phoneVal = validateFullPhoneNumber(editStaffPhone, editCountry, false);
      if (!phoneVal.isValid) {
        toast.error('Invalid Staff Phone', { description: phoneVal.error });
        return;
      }
    }

    // Emergency phone validation if entered
    if (editStaffEmergencyPhone.trim()) {
      const emVal = validateFullPhoneNumber(editStaffEmergencyPhone, editCountry, false);
      if (!emVal.isValid) {
        toast.error('Invalid Emergency Phone', { description: emVal.error });
        return;
      }
    }

    setSavingStaffHris(true);

    // Combine formal name
    const finalStaffName = formatFormalName({
      firstName: editStaffFirstName,
      middleName: editStaffMiddleName,
      lastName: editStaffLastName,
    });

    // Combine emergency contact name and phone formatted
    let combinedEmergency: string | null = null;
    const cleanEmergencyName = editStaffEmergencyName.trim();
    const cleanEmergencyPhone = editStaffEmergencyPhone.trim();
    if (cleanEmergencyName && cleanEmergencyPhone) {
      combinedEmergency = `${cleanEmergencyName} (${cleanEmergencyPhone})`;
    } else if (cleanEmergencyName) {
      combinedEmergency = cleanEmergencyName;
    } else if (cleanEmergencyPhone) {
      combinedEmergency = cleanEmergencyPhone;
    }

    try {
      await apiFetch(`/demo/admin/staff/${editingStaffMember.id}?slug=${encodeURIComponent(activeSlug)}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: finalStaffName,
          bio: editingStaffMember.bio,
          position: editStaffPosition.trim() || 'Specialist',
          employmentType: editStaffEmploymentType,
          baseSalary: Number(editStaffBaseSalary) || 0,
          commissionRate: Number(editStaffCommissionRate) || 0,
          hireDate: editStaffHireDate,
          email: editStaffEmail.trim() || null,
          phone: editStaffPhone.trim() || null,
          emergencyContact: combinedEmergency,
        }),
      });
      toast.success('Employee HR Record Updated', {
        description: `Compensation and employee information saved for ${editingStaffMember.name}.`
      });
      setEditingStaffMember(null);
      fetchDashboardData();
    } catch (err: any) {
      toast.error('Failed to update employee details', { description: err.message });
    } finally {
      setSavingStaffHris(false);
    }
  };

  // Record Payroll / Salary Payment
  const handleRecordPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollStaffId || !payPeriodStart || !payPeriodEnd) {
      toast.error('Required fields missing', { description: 'Please select staff and complete pay period dates.' });
      return;
    }
    setRecordingPayroll(true);
    try {
      await apiFetch(`/demo/admin/payroll?slug=${encodeURIComponent(activeSlug)}`, {
        method: 'POST',
        body: JSON.stringify({
          staffId: payrollStaffId,
          payPeriodStart,
          payPeriodEnd,
          basePay: Number(basePay) || 0,
          commissionPay: Number(commissionPay) || 0,
          bonuses: Number(bonuses) || 0,
          deductions: Number(deductions) || 0,
          paymentStatus: 'paid',
          notes: payrollNotes.trim() || 'Bi-monthly compensation disbursement',
        }),
      });
      toast.success('Salary Payment Recorded', {
        description: 'Employee payroll transaction and payslip ledger updated.'
      });
      setShowPayrollModal(false);
      setPayrollStaffId('');
      setBasePay('');
      setCommissionPay('');
      setBonuses('');
      setDeductions('');
      setPayrollNotes('');
      fetchPayroll();
    } catch (err: any) {
      toast.error('Failed to record payroll', { description: err.message });
    } finally {
      setRecordingPayroll(false);
    }
  };

  const totalApptPages = Math.ceil(appointments.length / APPTS_PER_PAGE);
  const paginatedAppointments = appointments.slice((apptPage - 1) * APPTS_PER_PAGE, apptPage * APPTS_PER_PAGE);

  const totalServicePages = Math.ceil(storeServices.length / SERVICES_PER_PAGE);
  const paginatedServices = storeServices.slice((servicePage - 1) * SERVICES_PER_PAGE, servicePage * SERVICES_PER_PAGE);

  const totalStaffPages = Math.ceil(storeStaff.length / STAFF_PER_PAGE);
  const paginatedStaff = storeStaff.slice((staffPage - 1) * STAFF_PER_PAGE, staffPage * STAFF_PER_PAGE);

  const filteredStoreCustomers = storeCustomers.filter((customer) => {
    const searchTerm = customerSearch.trim().toLowerCase();
    if (!searchTerm) return true;
    return [customer.name, customer.email, customer.phone].some((value) =>
      String(value || '').toLowerCase().includes(searchTerm)
    );
  });
  const totalCustomerPages = Math.ceil(filteredStoreCustomers.length / CUSTOMERS_PER_PAGE);
  const paginatedStoreCustomers = filteredStoreCustomers.slice(
    (customerPage - 1) * CUSTOMERS_PER_PAGE,
    customerPage * CUSTOMERS_PER_PAGE
  );
  const setupSectionLabels: Record<typeof setupSubTab, string> = {
    profile: 'Profile & Branding',
    services: 'Services & Pricing',
    staff: 'Staff Specialists',
    customers: 'Customer Accounts',
    hris: 'HRIS & Payroll',
    schedule: 'Schedule & Hours',
    policies: 'Booking Policies',
    account: 'Admin Security',
  };
  const setupMenuItems = [
    { id: 'profile', group: 'Store', label: 'Profile & Branding', icon: Store, count: null },
    { id: 'services', group: 'Store', label: 'Services & Pricing', icon: Scissors, count: storeServices.length },
    { id: 'schedule', group: 'Store', label: 'Schedule & Hours', icon: Clock, count: null },
    { id: 'policies', group: 'Store', label: 'Booking Policies', icon: Sliders, count: null },
    { id: 'staff', group: 'Team', label: 'Staff Specialists', icon: Users, count: storeStaff.length },
    { id: 'hris', group: 'Team', label: 'HRIS & Payroll', icon: Wallet, count: null },
    { id: 'customers', group: 'Customers', label: 'Customer Accounts', icon: User, count: storeCustomers.length },
    { id: 'account', group: 'Account', label: 'Admin Security', icon: ShieldCheck, count: null },
  ];
  const setupMenuGroups = ['Store', 'Team', 'Customers', 'Account'];
  const profileSectionItems = [
    { id: 'profile-brand-identity', label: 'Brand & Identity', icon: Building2 },
    { id: 'profile-country-currency', label: 'Country & Currency', icon: Globe },
    { id: 'profile-location-address', label: 'Location & Address', icon: MapPin },
    { id: 'profile-contact-social', label: 'Contact & Social', icon: Phone },
    { id: 'profile-operating-hours', label: 'Operating Hours', icon: Clock },
  ];
  const scrollProfileSwiper = (direction: -1 | 1) => {
    profileSwiperRef.current?.scrollBy({ left: direction * 250, behavior: 'smooth' });
  };
  const jumpToProfileSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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
            <div className="relative" ref={notifRef}>
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
                  Organize your store branding, services catalog, team specialists, availability schedule, and automated booking configurations.
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

            {/* Grouped icon dropdown for major settings areas */}
            <div className="relative z-20" ref={setupDropdownRef} onKeyDown={(event) => { if (event.key === 'Escape') setSetupDropdownOpen(false); }}>
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={setupDropdownOpen}
                onClick={() => setSetupDropdownOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3 text-left shadow-sm transition hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                    {React.createElement(setupMenuItems.find((item) => item.id === setupSubTab)?.icon || Settings, { className: 'h-5 w-5' })}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-extrabold uppercase tracking-[0.16em] text-stone-400">Settings menu · {setupMenuItems.find((item) => item.id === setupSubTab)?.group}</span>
                    <span className="mt-0.5 block truncate text-sm font-bold text-stone-900 dark:text-stone-100">{setupSectionLabels[setupSubTab]}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                  <span className="hidden sm:inline">Choose section</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${setupDropdownOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {setupDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 max-h-[min(65vh,34rem)] overflow-y-auto rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 shadow-xl ring-1 ring-black/5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {setupMenuGroups.map((group) => (
                      <section key={group} className="rounded-xl bg-stone-50 dark:bg-stone-800/60 p-2">
                        <h3 className="px-2 pb-1.5 pt-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-stone-400">{group}</h3>
                        <div className="space-y-1">
                          {setupMenuItems.filter((item) => item.group === group).map((item) => {
                            const IconComponent = item.icon;
                            const isSelected = setupSubTab === item.id;
                            return (
                              <button key={item.id} type="button" aria-current={isSelected ? 'page' : undefined} onClick={() => { setSetupSubTab(item.id as typeof setupSubTab); setSetupDropdownOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${isSelected ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200' : 'text-stone-700 hover:bg-white dark:text-stone-300 dark:hover:bg-stone-800'}`}>
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-stone-950' : 'bg-white text-stone-500 dark:bg-stone-900 dark:text-stone-300'}`}><IconComponent className="h-4 w-4" /></span>
                                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{item.label}</span>
                                {item.count !== null && <span className="rounded-full bg-stone-200 px-1.5 py-0.5 text-[9px] font-bold text-stone-600 dark:bg-stone-700 dark:text-stone-300">{item.count}</span>}
                                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                  <p className="mt-2 px-1 text-[10px] text-stone-400">Select a section to open its settings.</p>
                </div>
              )}
            </div>

            {/* Setup Views by Sub-Tab */}
            {setupSubTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                {/* Brand Identity & Contact */}
                <div className="lg:col-span-2 space-y-6">
                  <form onSubmit={handleSaveStoreSettings} className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
                    <div className="border-b border-stone-100 dark:border-stone-800 pb-3 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                        <Store className="w-4 h-4 text-amber-500" />
                        <span>Store Profile &amp; Branding Details</span>
                      </h2>
                      <span className="text-[11px] text-stone-500 font-mono">Slug: {activeSlug}</span>
                    </div>

                    {/* Swipeable shortcuts for fields in this profile form */}
                    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3 px-1">
                        <div>
                          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-stone-400">Profile details</p>
                          <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">Swipe or tap to jump to the fields you want to update.</p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button type="button" onClick={() => scrollProfileSwiper(-1)} aria-label="Previous profile sections" className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-amber-400 hover:text-amber-600 transition"><ChevronLeft className="h-4 w-4" /></button>
                          <button type="button" onClick={() => scrollProfileSwiper(1)} aria-label="Next profile sections" className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-amber-400 hover:text-amber-600 transition"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <div ref={profileSwiperRef} role="tablist" aria-label="Store profile detail sections" className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory touch-pan-x pb-1">
                        {profileSectionItems.map((item) => {
                          const IconComponent = item.icon;
                          const isSelected = activeProfileSection === item.id;
                          return (
                            <button key={item.id} type="button" role="tab" aria-selected={isSelected} onClick={(event) => { setActiveProfileSection(item.id); jumpToProfileSection(item.id); event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }} className={`flex min-w-[148px] snap-start items-center gap-2 rounded-xl border px-3 py-2 text-left transition sm:min-w-[164px] ${isSelected ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50' : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 hover:border-amber-300'}`}>
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-stone-950' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300'}`}><IconComponent className="h-4 w-4" /></span>
                              <span className={`truncate text-[11px] font-bold ${isSelected ? 'text-amber-900 dark:text-amber-200' : 'text-stone-700 dark:text-stone-200'}`}>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1 px-1 text-[10px] text-stone-400 sm:hidden">Swipe to see all profile sections</p>
                    </div>

                    {/* Section 1: Store Brand & Identity */}
                    <div id="profile-brand-identity" className="scroll-mt-24 bg-stone-50/70 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                        <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                          1. Store Brand &amp; Identity
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Store / Business Name <span className="text-rose-500 font-bold">* (Required)</span>
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setEditName(e.target.value);
                            }}
                            placeholder="e.g. Atelier Skin Clinic"
                            required
                            disabled={isPending}
                            className={`w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Tagline / Catchphrase <span className="text-stone-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={editTagline}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setEditTagline(e.target.value);
                            }}
                            placeholder="e.g. Your Premier Sanctuary for Holistic Wellness & Style"
                            disabled={isPending}
                            className={`w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Category */}
                      <div className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-stone-700 dark:text-stone-300">
                            Category <span className="text-rose-500 font-bold">* (Required)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingsDirty(true);
                              setIsCustomCategory(!isCustomCategory);
                              setCustomCategoryInput('');
                            }}
                            className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline"
                          >
                            {isCustomCategory ? 'Choose Existing' : '+ Add New Category'}
                          </button>
                        </div>
                        {isCustomCategory ? (
                          <input
                            type="text"
                            required
                            autoFocus
                            placeholder="e.g. Photography Studio"
                            value={customCategoryInput}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setCustomCategoryInput(e.target.value);
                            }}
                            disabled={isPending}
                            className="h-10 w-full min-w-0 box-border px-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                          />
                        ) : (
                          <select
                            value={editCategory}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setEditCategory(e.target.value);
                            }}
                            disabled={isPending}
                            className="h-10 w-full min-w-0 box-border px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                          >
                            {categoryOptions.map((cat, i) => (
                              <option key={i} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Store Description */}
                      <div className="text-xs">
                        <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                          Store Description <span className="text-stone-400 font-normal">(Optional)</span>
                        </label>
                        <textarea
                          rows={3}
                          value={editDescription}
                          onChange={(e) => {
                            setIsSettingsDirty(true);
                            setEditDescription(e.target.value);
                          }}
                          placeholder="Briefly describe what services, atmosphere, or specialties your store provides..."
                          disabled={isPending}
                          className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                        />
                      </div>

                      {/* Logo URL with Live Preview */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs space-y-2.5 transition-colors">
                        <label className="block font-semibold text-stone-800 dark:text-stone-200">
                          Logo / Store Cover URL <span className="text-stone-400 font-normal">(Optional)</span>
                        </label>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {editLogoUrl ? (
                              <img src={editLogoUrl} alt="Store Logo" className="w-full h-full object-cover" />
                            ) : (
                              <Image className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                            )}
                          </div>
                          <input
                            type="url"
                            value={editLogoUrl}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setEditLogoUrl(e.target.value);
                            }}
                            placeholder="e.g. https://images.unsplash.com/... or image link"
                            disabled={isPending}
                            className={`flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                          />
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
                          Provide an image link to replace the default lettermark logo.
                        </p>
                      </div>
                    </div>

                    {/* Section 2: Country & Currency */}
                    <div id="profile-country-currency" className="scroll-mt-24 bg-stone-50/70 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                        <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                          2. Country &amp; Currency Settings
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Country <span className="text-rose-500 font-bold">* (Required)</span>
                          </label>
                          <select
                            value={editCountry}
                            onChange={(e) => handleCountryChange(e.target.value)}
                            disabled={isPending}
                            className="h-10 w-full min-w-0 box-border px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                          >
                            {SUPPORTED_COUNTRIES.map((c) => (
                              <option key={c.code} value={c.name}>
                                {c.emojiFlag ? `${c.emojiFlag} ` : ''}{c.name} ({c.dialCode})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Store Currency <span className="text-stone-400 font-normal">(Auto-synced)</span>
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={`${editCurrency} (${getCurrencySymbol(editCurrency).trim()})`}
                            className="h-10 w-full min-w-0 box-border px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Physical Location & Address */}
                    <div id="profile-location-address" className="scroll-mt-24 bg-stone-50/70 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                        <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                          3. Physical Location &amp; Address
                        </span>
                      </div>

                      {/* City Selection (Strictly cities based on Country) */}
                      <div className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-stone-700 dark:text-stone-300">
                            City <span className="text-rose-500 font-bold">* (Required)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingsDirty(true);
                              setIsCustomCity(!isCustomCity);
                              setCustomCityInput('');
                            }}
                            className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline"
                          >
                            {isCustomCity ? 'Choose City List' : '+ Add Custom City'}
                          </button>
                        </div>
                        {isCustomCity ? (
                          <input
                            type="text"
                            required
                            autoFocus
                            placeholder="e.g. Cebu City, Davao City"
                            value={customCityInput}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setCustomCityInput(e.target.value);
                            }}
                            disabled={isPending}
                            className="h-10 w-full min-w-0 box-border px-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                          />
                        ) : (
                          <select
                            value={editCity}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setEditCity(e.target.value);
                            }}
                            disabled={isPending}
                            className="h-10 w-full min-w-0 box-border px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                          >
                            {cityOptions.map((c, i) => (
                              <option key={i} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Province / State <span className="text-stone-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Metro Manila, Cebu, California"
                            value={editStateProvince}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setEditStateProvince(e.target.value);
                            }}
                            disabled={isPending}
                            className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Postal / ZIP Code <span className="text-stone-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 1100, 6000, 90210"
                            value={editPostalCode}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setEditPostalCode(e.target.value);
                            }}
                            disabled={isPending}
                            className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                          />
                        </div>
                      </div>

                      <div className="text-xs">
                        <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                          Detailed Street Address / Unit / Mall Level <span className="text-stone-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => {
                            setIsSettingsDirty(true);
                            setEditAddress(e.target.value);
                          }}
                          placeholder="e.g. Level 2, Grand Promenade Mall, 88 Commercial Ave"
                          disabled={isPending}
                          className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Section 4: Contact & Social Media Channels */}
                    <div id="profile-contact-social" className="scroll-mt-24 bg-stone-50/70 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                        <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                          4. Contact &amp; Online Channels
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block font-semibold text-stone-700 dark:text-stone-300">
                              Contact Phone <span className="text-stone-400 font-normal">(Optional)</span>
                            </label>
                            {editCountry && (
                              <span className="text-[10px] text-stone-400">
                                Preserved {getCountryByName(editCountry).dialCode} • Max {getCountryByName(editCountry).nationalPhoneLength} digits
                              </span>
                            )}
                          </div>
                          <CountryPhoneInput
                            countryNameOrCode={editCountry}
                            value={editPhone}
                            onChange={(val) => {
                              setIsSettingsDirty(true);
                              setEditPhone(val);
                            }}
                            disabled={isPending}
                            placeholder={getCountryByName(editCountry).code === 'PH' ? '905 242 2821' : undefined}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Store Email <span className="text-stone-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setEditEmail(e.target.value);
                            }}
                            placeholder="contact@yourstore.demo"
                            disabled={isPending}
                            className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Official Website <span className="text-stone-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="url"
                            value={editWebsite}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setEditWebsite(e.target.value);
                            }}
                            placeholder="https://yourbrand.com"
                            disabled={isPending}
                            className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Social Media Handle <span className="text-stone-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={editSocialHandle}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              setEditSocialHandle(e.target.value);
                            }}
                            placeholder="@yourbrand"
                            disabled={isPending}
                            className={`w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Daily Operating Hours */}
                    <div id="profile-operating-hours" className="scroll-mt-24 bg-stone-50/70 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                          <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                            5. Daily Operating Hours
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/40">
                          Auto-syncs to Weekly Schedule
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                            Opening Time <span className="text-rose-500 font-bold">* (Required)</span>
                          </span>
                          <input
                            type="time"
                            required
                            value={editStartTime}
                            onChange={(e) => {
                              const newStart = e.target.value;
                              setIsSettingsDirty(true);
                              setIsTimeModified(true);
                              setEditStartTime(newStart);
                              validateTimeRange(newStart, editEndTime);
                              syncWeeklyScheduleWithStoreHours(newStart, editEndTime);
                            }}
                            disabled={isPending}
                            className={`w-full px-3 py-2.5 rounded-xl border ${
                              timeError ? 'border-rose-400 dark:border-rose-600 bg-rose-50/30' : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800'
                            } text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                          />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                            Closing Time <span className="text-rose-500 font-bold">* (Required)</span>
                          </span>
                          <input
                            type="time"
                            required
                            value={editEndTime}
                            onChange={(e) => {
                              const newEnd = e.target.value;
                              setIsSettingsDirty(true);
                              setIsTimeModified(true);
                              setEditEndTime(newEnd);
                              validateTimeRange(editStartTime, newEnd);
                              syncWeeklyScheduleWithStoreHours(editStartTime, newEnd);
                            }}
                            disabled={isPending}
                            className={`w-full px-3 py-2.5 rounded-xl border ${
                              timeError ? 'border-rose-400 dark:border-rose-600 bg-rose-50/30' : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800'
                            } text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 ${isPending ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''}`}
                          />
                        </div>
                      </div>
                      {timeError && (
                        <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center space-x-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{timeError}</span>
                        </p>
                      )}
                    </div>

                    {/* Operational Status Switcher */}
                    <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-2 text-xs">
                        Store Operational Status
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setIsSettingsDirty(true);
                            setEditStatus('approved');
                          }}
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
                          onClick={() => {
                            setIsSettingsDirty(true);
                            setEditStatus('closed');
                          }}
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
                </div>

                {/* Right Side Overview Card */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 text-xs">
                    <div className="flex items-center space-x-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center font-bold text-lg">
                        {editName ? editName.charAt(0) : 'S'}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">{editName || 'Store Name'}</h3>
                        <p className="text-[11px] text-stone-500">{editTagline || 'Store Tagline'}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-stone-700 dark:text-stone-300">
                      <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                        <span className="text-stone-500">Live URL Slug:</span>
                        <span className="font-mono font-bold text-stone-900 dark:text-stone-100">/{activeSlug}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                        <span className="text-stone-500">Category:</span>
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{currentBusiness?.category || 'Beauty & Wellness'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                        <span className="text-stone-500">Phone:</span>
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{editPhone || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                        <span className="text-stone-500">Email:</span>
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{editEmail || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-stone-500">Location:</span>
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{editCity || 'Quezon City'}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 text-[11px] text-stone-600 dark:text-stone-400 flex items-start space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span><strong>Pro Tip:</strong> Keeping your contact and social channels up to date helps clients verify your brand credentials before making their bookings.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Services & Pricing Menu */}
            {setupSubTab === 'services' && (
              <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                      <Scissors className="w-4 h-4 text-amber-500" />
                      <span>Services &amp; Pricing Menu</span>
                    </h2>
                    <p className="text-[11px] text-stone-500">Manage client-bookable service offerings, durations, and session prices.</p>
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
                      setEditingServiceId(null);
                      setNewServiceName('');
                      setNewServicePrice('');
                      setNewServiceDurationHours('0');
                      setNewServiceDurationMinutes('45');
                      setIsCustomDuration(false);
                      setCustomDurationMinutes('45');
                      setIsNewCustomCategory(false);
                      setNewCustomCategoryInput('');
                      setNewServiceDesc('');
                      setShowAddServiceModal(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Service</span>
                  </button>
                </div>

                <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                  {storeServices.length === 0 ? (
                    <div className="py-12 text-center text-stone-400">No services configured yet. Click "Add New Service" above.</div>
                  ) : (
                    paginatedServices.map((svc) => (
                      <div key={svc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 dark:hover:bg-stone-800/40 px-2 rounded-xl transition">
                        <div>
                          <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                            <span>{svc.name}</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                              {svc.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">{svc.description}</p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <div className="text-right">
                            <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                              {getCurrencySymbol(editCurrency)}{Number(svc.price).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-stone-500 font-medium">
                              {svc.durationMinutes} mins session
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button type="button" disabled={isPending || removingServiceId === svc.id} onClick={() => openServiceEditor(svc)} className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:border-amber-500 hover:text-amber-600 disabled:opacity-50" aria-label={`Edit ${svc.name}`}>
                              Edit
                            </button>
                            <button type="button" disabled={isPending || removingServiceId === svc.id} onClick={() => handleRemoveService(svc)} className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/70 text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50" aria-label={`Remove ${svc.name}`}>
                              {removingServiceId === svc.id ? 'Removing…' : 'Remove'}
                            </button>
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
            )}

            {/* Sub-Tab 3: Staff Specialists */}
            {setupSubTab === 'staff' && (
              <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                      <Users className="w-4 h-4 text-amber-500" />
                      <span>Staff Specialists &amp; Team Members</span>
                    </h2>
                    <p className="text-[11px] text-stone-500">Assign each specialist the services they provide and the hours customers can book them.</p>
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
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Specialist</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {storeStaff.length === 0 ? (
                    <div className="col-span-2 py-12 text-center text-stone-400">No staff members listed yet.</div>
                  ) : (
                    paginatedStaff.map((st) => (
                      <div key={st.id} className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
                            {st.name?.substring(0, 1) || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center space-x-2">
                              <span>{st.name}</span>
                              {st.position && (
                                <span className="text-[10px] bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded-md font-medium">
                                  {st.position}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500">{st.bio || 'Store Specialist'}</div>
                            {st.baseSalary > 0 && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                Base: {getCurrencySymbol(editCurrency)}{Number(st.baseSalary).toLocaleString()} /mo • Comm: {st.commissionRate || 0}%
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleOpenStaffSchedule(st)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[10px] font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition disabled:opacity-50"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Schedule &amp; Services</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaffMember(st);
                              const parsedFormal = parseFormalName(st.name || '');
                              setEditStaffFirstName(parsedFormal.firstName);
                              setEditStaffMiddleName(parsedFormal.middleName || '');
                              setEditStaffLastName(parsedFormal.lastName);
                              setEditStaffPosition(st.position || 'Specialist');
                              setEditStaffEmploymentType(st.employmentType || 'Full-Time');
                              setEditStaffBaseSalary(String(st.baseSalary || '25000'));
                              setEditStaffCommissionRate(String(st.commissionRate || '10'));
                              setEditStaffHireDate(st.hireDate ? st.hireDate.substring(0, 10) : '');
                              setEditStaffEmail(st.email || '');
                              setEditStaffPhone(st.phone || '');
                              const parsedEm = parseStaffEmergency(st.emergencyContact);
                              setEditStaffEmergencyName(parsedEm.name);
                              setEditStaffEmergencyPhone(parsedEm.phone);
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 font-semibold hover:border-amber-500 hover:text-amber-600 transition flex items-center space-x-1"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
                            Active
                          </span>
                        </div>
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
            )}

            {setupSubTab === 'customers' && (
              <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-500" />
                      <span>Customer Accounts</span>
                    </h2>
                    <p className="text-[11px] text-stone-500 mt-0.5">View customers who booked with this store and update their contact details.</p>
                  </div>
                  <label className="relative block w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      value={customerSearch}
                      onChange={(event) => setCustomerSearch(event.target.value)}
                      placeholder="Search name, email, or phone"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
                    />
                  </label>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-xs text-left">
                    <thead className="text-[10px] uppercase tracking-wide text-stone-500 bg-stone-50 dark:bg-stone-800/60">
                      <tr>
                        <th className="px-3 py-2.5 font-bold">Customer</th>
                        <th className="px-3 py-2.5 font-bold">Phone</th>
                        <th className="px-3 py-2.5 font-bold">Bookings</th>
                        <th className="px-3 py-2.5 font-bold">Upcoming</th>
                        <th className="px-3 py-2.5 font-bold">Last booking</th>
                        <th className="px-3 py-2.5 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {loadingStoreCustomers ? (
                        <tr><td colSpan={6} className="py-12 text-center text-stone-500">Loading customer accounts…</td></tr>
                      ) : paginatedStoreCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-stone-500">
                            {customerSearch.trim() ? 'No customers match your search.' : 'No customer accounts yet. Customers appear here after booking with this store.'}
                          </td>
                        </tr>
                      ) : paginatedStoreCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/30">
                          <td className="px-3 py-3">
                            <div className="font-bold text-stone-900 dark:text-stone-100">{customer.name}</div>
                            <div className="text-[11px] text-stone-500 mt-0.5">{customer.email}</div>
                          </td>
                          <td className="px-3 py-3 text-stone-700 dark:text-stone-300">{customer.phone || '—'}</td>
                          <td className="px-3 py-3 font-semibold text-stone-800 dark:text-stone-200">{Number(customer.bookingCount || 0)}</td>
                          <td className="px-3 py-3 text-stone-700 dark:text-stone-300">{Number(customer.upcomingBookings || 0)}</td>
                          <td className="px-3 py-3 text-stone-600 dark:text-stone-400">
                            {customer.lastBookingAt
                              ? new Date(customer.lastBookingAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'No bookings yet'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => openStoreCustomerEditor(customer)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Manage</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={customerPage}
                  totalPages={totalCustomerPages}
                  totalItems={filteredStoreCustomers.length}
                  itemsPerPage={CUSTOMERS_PER_PAGE}
                  onPageChange={setCustomerPage}
                  itemName="customers"
                />
              </div>
            )}

            {/* Sub-Tab 5: Appointment Slots & Working Hours */}
            {setupSubTab === 'schedule' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                <div className="lg:col-span-2 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-5 text-xs">
                  <div className="pb-3 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Store Weekly Schedule &amp; Service Availability</span>
                      </h2>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Customize working days (e.g. Weekdays only, or select operating days) and daily hours.
                      </p>
                      <div className="mt-1.5 flex items-center space-x-2 text-[11px]">
                        <span className="text-stone-500">Store Hours (Section 5):</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                          {formatTimeRange(editStartTime, editEndTime)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setIsSettingsDirty(true);
                          setWeeklySchedule(prev => prev.map(item => ({
                            ...item,
                            startTime: editStartTime,
                            endTime: editEndTime,
                          })));
                          toast.success('Hours Synced', {
                            description: `Applied ${formatTimeRange(editStartTime, editEndTime)} to all days in schedule.`
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition flex items-center space-x-1"
                        title="Sync all days to Section 5 Daily Operating Hours"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Sync Store Hours</span>
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setIsSettingsDirty(true);
                          setWeeklySchedule(prev => prev.map((item, idx) => ({
                            ...item,
                            startTime: editStartTime,
                            endTime: editEndTime,
                            isWorking: idx < 5, // Mon-Fri
                          })));
                          toast.info('Schedule Preset', { description: `Applied Weekdays Only (${formatTimeRange(editStartTime, editEndTime)}).` });
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:border-amber-400 hover:text-amber-600 transition"
                      >
                        Weekdays Only
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setIsSettingsDirty(true);
                          setWeeklySchedule(prev => prev.map(item => ({
                            ...item,
                            startTime: editStartTime,
                            endTime: editEndTime,
                            isWorking: true, // All 7 days
                          })));
                          toast.info('Schedule Preset', { description: `Applied Full Week (${formatTimeRange(editStartTime, editEndTime)}).` });
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:border-amber-400 hover:text-amber-600 transition"
                      >
                        All 7 Days
                      </button>
                    </div>
                  </div>

                  {/* Day by Day Configurator */}
                  <div className="space-y-3">
                    {weeklySchedule.map((slot, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3.5 rounded-2xl border transition-all ${
                          slot.isWorking 
                            ? 'bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700' 
                            : 'bg-stone-50 dark:bg-stone-900/60 border-stone-100 dark:border-stone-800/60 opacity-60'
                        } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={slot.isWorking}
                            disabled={isPending}
                            onChange={(e) => {
                              setIsSettingsDirty(true);
                              const updated = [...weeklySchedule];
                              updated[idx].isWorking = e.target.checked;
                              setWeeklySchedule(updated);
                            }}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-stone-900 dark:text-stone-100 text-xs block">
                              {slot.day}
                            </span>
                            <span className="text-[10px] text-stone-500">
                              {slot.isWorking ? 'Store Open & Bookable' : 'Closed / Off Day'}
                            </span>
                          </div>
                        </div>

                        {slot.isWorking ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="time"
                              value={slot.startTime}
                              disabled={isPending}
                              onChange={(e) => {
                                setIsSettingsDirty(true);
                                const updated = [...weeklySchedule];
                                updated[idx].startTime = e.target.value;
                                setWeeklySchedule(updated);
                              }}
                              className="px-2 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:outline-none"
                            />
                            <span className="text-stone-400">to</span>
                            <input
                              type="time"
                              value={slot.endTime}
                              disabled={isPending}
                              onChange={(e) => {
                                setIsSettingsDirty(true);
                                const updated = [...weeklySchedule];
                                updated[idx].endTime = e.target.value;
                                setWeeklySchedule(updated);
                              }}
                              className="px-2 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 py-1 px-3 bg-stone-100 dark:bg-stone-800 rounded-xl">
                            Rest Day / Closed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-3 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      disabled={savingSettings || isPending}
                      onClick={handleSaveStoreSettings}
                      className="px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow flex items-center space-x-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingSettings ? 'Saving...' : 'Save Weekly Schedule'}</span>
                    </button>
                  </div>

                  <div className="pt-2 text-[11px] text-stone-500 space-y-1">
                    <p>• Slots are dynamically spaced based on each service's duration.</p>
                    <p>• Confirmed bookings automatically block out corresponding staff availability.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3 text-xs">
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Slot Allocation Settings</span>
                    </h3>
                    <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                      Default session intervals between bookable customer appointments:
                    </p>
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 font-semibold text-amber-900 dark:text-amber-200">
                      Standard slot increment: <strong>{slotInterval} minutes</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 5: Suggested Config & Policies */}
            {setupSubTab === 'policies' && (
              <form onSubmit={handleSaveStoreSettings} className="space-y-6 animate-in fade-in">
                <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
                  <div className="border-b border-stone-100 dark:border-stone-800 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                        <Sliders className="w-4 h-4 text-amber-500" />
                        <span>Suggested Store Booking &amp; Operational Configurations</span>
                      </h2>
                      <p className="text-[11px] text-stone-500">Fine-tune automated booking policies, advance lead times, and client confirmations.</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Recommended Preset
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Booking Mode */}
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-stone-900 dark:text-stone-100">Booking Confirmation Mode</label>
                        <input
                          type="checkbox"
                          checked={requireApproval}
                          onChange={(e) => {
                            setIsSettingsDirty(true);
                            setRequireApproval(e.target.checked);
                          }}
                          disabled={isPending}
                          className="w-4 h-4 text-amber-500 rounded border-stone-300"
                        />
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        {requireApproval 
                          ? 'Manual Approval: Every client booking arrives as "pending" and requires admin confirmation.'
                          : 'Instant Booking: Eligible appointments are auto-confirmed as soon as client selects a free slot.'}
                      </p>
                    </div>

                    {/* Minimum Lead Time */}
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-2">
                      <label className="font-bold text-stone-900 dark:text-stone-100 block">
                        Minimum Lead Notice (Hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="72"
                        value={minLeadHours}
                        onChange={(e) => {
                          setIsSettingsDirty(true);
                          setMinLeadHours(Number(e.target.value));
                        }}
                        disabled={isPending}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none"
                      />
                      <p className="text-[10px] text-stone-500">
                        Prevents last-minute bookings. Clients must book at least {minLeadHours} hour(s) in advance.
                      </p>
                    </div>

                    {/* Max Advance Booking Days */}
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-2">
                      <label className="font-bold text-stone-900 dark:text-stone-100 block">
                        Max Advance Booking Window (Days)
                      </label>
                      <input
                        type="number"
                        min="7"
                        max="365"
                        value={maxAdvanceDays}
                        onChange={(e) => {
                          setIsSettingsDirty(true);
                          setMaxAdvanceDays(Number(e.target.value));
                        }}
                        disabled={isPending}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none"
                      />
                      <p className="text-[10px] text-stone-500">
                        Limits future calendar visibility up to {maxAdvanceDays} days ahead.
                      </p>
                    </div>

                    {/* Slot Interval */}
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-2">
                      <label className="font-bold text-stone-900 dark:text-stone-100 block">
                        Time Slot Intervals (Minutes)
                      </label>
                      <select
                        value={slotInterval}
                        onChange={(e) => {
                          setIsSettingsDirty(true);
                          setSlotInterval(Number(e.target.value));
                        }}
                        disabled={isPending}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none"
                      >
                        <option value={15}>15 Minutes</option>
                        <option value={30}>30 Minutes</option>
                        <option value={45}>45 Minutes (Recommended)</option>
                        <option value={60}>60 Minutes</option>
                      </select>
                      <p className="text-[10px] text-stone-500">
                        Grid spacing for customer slot pickers.
                      </p>
                    </div>

                    {/* Automated Reminders */}
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-3 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-bold text-stone-900 dark:text-stone-100">Automated Notification &amp; Audit Log</label>
                          <p className="text-[11px] text-stone-500">
                            Dispatches real-time studio notifications and logs timestamped audit records for all booking status changes.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoReminderEmail}
                          onChange={(e) => {
                            setIsSettingsDirty(true);
                            setAutoReminderEmail(e.target.checked);
                          }}
                          disabled={isPending}
                          className="w-4 h-4 text-amber-500 rounded border-stone-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="submit"
                      disabled={savingSettings || isPending}
                      className="px-6 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-bold hover:bg-stone-800 dark:hover:bg-amber-300 transition flex items-center space-x-2 shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isPending ? 'Locked (Pending Review)' : savingSettings ? 'Saving Configurations...' : 'Save Suggested Configurations'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Sub-Tab: HRIS & Payroll Records */}
            {setupSubTab === 'hris' && (
              <div className="space-y-6 animate-in fade-in">
                {/* HRIS Overview Header & Action */}
                <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                      <Wallet className="w-4 h-4 text-amber-500" />
                      <span>HRIS Staff Compensation &amp; Payroll Management</span>
                    </h2>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Record employee base salaries, commission tiers, and manage payroll disbursements.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (storeStaff.length > 0) {
                        setPayrollStaffId(storeStaff[0].id);
                        setBasePay(String(storeStaff[0].baseSalary || 25000));
                        setCommissionPay('0');
                        setBonuses('0');
                        setDeductions('0');
                      }
                      const today = new Date();
                      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                      setPayPeriodStart(firstDay);
                      setPayPeriodEnd(lastDay);
                      setShowPayrollModal(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow self-start sm:self-auto"
                  >
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>Record Salary Payment</span>
                  </button>
                </div>

                {/* Staff Roster & Compensation Table */}
                <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                      Employee HR Directory &amp; Salary Structure
                    </h3>
                    <span className="text-[11px] text-stone-500 font-medium">
                      {storeStaff.length} Employees Registered
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-100 dark:border-stone-800 text-stone-400 text-[11px]">
                          <th className="py-2.5 font-semibold">Employee</th>
                          <th className="py-2.5 font-semibold">Position &amp; Type</th>
                          <th className="py-2.5 font-semibold">Monthly Base</th>
                          <th className="py-2.5 font-semibold">Commission</th>
                          <th className="py-2.5 font-semibold">Contact Info</th>
                          <th className="py-2.5 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {storeStaff.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-stone-400">
                              No employees found. Add staff in the Staff Specialists tab first.
                            </td>
                          </tr>
                        ) : (
                          storeStaff.map((staff) => (
                            <tr key={staff.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition">
                              <td className="py-3 pr-3">
                                <div className="font-bold text-stone-900 dark:text-stone-100">{staff.name}</div>
                                <div className="text-[11px] text-stone-500">{staff.bio || 'Store Specialist'}</div>
                              </td>
                              <td className="py-3 pr-3">
                                <div className="font-semibold text-stone-800 dark:text-stone-200">{staff.position || 'Specialist'}</div>
                                <span className="inline-block mt-0.5 text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded-full">
                                  {staff.employmentType || 'Full-Time'}
                                </span>
                              </td>
                              <td className="py-3 pr-3 font-semibold text-stone-900 dark:text-stone-100">
                                {getCurrencySymbol(editCurrency)}{Number(staff.baseSalary || 0).toLocaleString()}
                              </td>
                              <td className="py-3 pr-3 font-semibold text-amber-700 dark:text-amber-400">
                                {staff.commissionRate || 0}% per booking
                              </td>
                              <td className="py-3 pr-3 text-stone-500 text-[11px]">
                                <div>{staff.email || 'No email registered'}</div>
                                <div>{staff.phone || 'No phone'}</div>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStaffMember(staff);
                                    const parsedFormal = parseFormalName(staff.name || '');
                                    setEditStaffFirstName(parsedFormal.firstName);
                                    setEditStaffMiddleName(parsedFormal.middleName || '');
                                    setEditStaffLastName(parsedFormal.lastName);
                                    setEditStaffPosition(staff.position || 'Specialist');
                                    setEditStaffEmploymentType(staff.employmentType || 'Full-Time');
                                    setEditStaffBaseSalary(String(staff.baseSalary || '25000'));
                                    setEditStaffCommissionRate(String(staff.commissionRate || '10'));
                                    setEditStaffHireDate(staff.hireDate ? staff.hireDate.substring(0, 10) : '');
                                    setEditStaffEmail(staff.email || '');
                                    setEditStaffPhone(staff.phone || '');
                                    const parsedEm = parseStaffEmergency(staff.emergencyContact);
                                    setEditStaffEmergencyName(parsedEm.name);
                                    setEditStaffEmergencyPhone(parsedEm.phone);
                                  }}
                                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-700 dark:text-stone-300 font-semibold text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                                >
                                  Edit HR Info
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payroll Ledger */}
                <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center space-x-1.5">
                      <Receipt className="w-3.5 h-3.5 text-amber-500" />
                      <span>Payroll Disbursement Ledger</span>
                    </h3>
                    <button
                      type="button"
                      onClick={fetchPayroll}
                      className="text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {loadingPayroll ? (
                    <div className="py-12 text-center text-stone-400 text-xs">Loading payroll ledger...</div>
                  ) : payrollRecords.length === 0 ? (
                    <div className="py-12 text-center text-stone-400 text-xs">
                      No payroll disbursements recorded yet. Click "Record Salary Payment" above to create one.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-stone-100 dark:border-stone-800 text-stone-400 text-[11px]">
                            <th className="py-2.5 font-semibold">Staff Member</th>
                            <th className="py-2.5 font-semibold">Pay Period</th>
                            <th className="py-2.5 font-semibold">Base Pay</th>
                            <th className="py-2.5 font-semibold">Commission</th>
                            <th className="py-2.5 font-semibold">Net Pay</th>
                            <th className="py-2.5 font-semibold">Status</th>
                            <th className="py-2.5 font-semibold">Disbursed At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                          {payrollRecords.map((rec) => (
                            <tr key={rec.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition">
                              <td className="py-3 font-bold text-stone-900 dark:text-stone-100">
                                {rec.staffName || 'Staff Member'}
                              </td>
                              <td className="py-3 text-stone-600 dark:text-stone-400 text-[11px]">
                                {rec.payPeriodStart} to {rec.payPeriodEnd}
                              </td>
                              <td className="py-3 font-semibold text-stone-800 dark:text-stone-200">
                                {getCurrencySymbol(editCurrency)}{Number(rec.basePay).toLocaleString()}
                              </td>
                              <td className="py-3 font-semibold text-amber-700 dark:text-amber-400">
                                {getCurrencySymbol(editCurrency)}{Number(rec.commissionPay).toLocaleString()}
                              </td>
                              <td className="py-3 font-bold text-emerald-700 dark:text-emerald-400">
                                {getCurrencySymbol(editCurrency)}{Number(rec.netPay).toLocaleString()}
                              </td>
                              <td className="py-3">
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                  {rec.paymentStatus}
                                </span>
                              </td>
                              <td className="py-3 text-stone-500 text-[11px]">
                                {new Date(rec.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-Tab: Admin Account & Security Settings */}
            {setupSubTab === 'account' && (
              <div className="max-w-2xl animate-in fade-in">
                <form onSubmit={handleUpdateAccount} className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
                  <div className="border-b border-stone-100 dark:border-stone-800 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                        <User className="w-4 h-4 text-amber-500" />
                        <span>Admin Account &amp; Credentials</span>
                      </h2>
                      <p className="text-[11px] text-stone-500">Update your store manager login credentials, contact info, and security password.</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {storedUser?.role || 'Admin'}
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Full Name <span className="text-rose-500 font-bold">* (Required)</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Store Manager Name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                          Email Address <span className="text-rose-500 font-bold">* (Required)</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={accountEmail}
                          onChange={(e) => setAccountEmail(e.target.value)}
                          placeholder="admin@appointmo.demo"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                          Phone Number <span className="text-stone-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={accountPhone}
                          onChange={(e) => setAccountPhone(e.target.value)}
                          placeholder="+63 917 123 4567"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-4">
                      <div className="flex items-center space-x-2 text-stone-800 dark:text-stone-200 font-bold text-xs">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Change Account Password (Leave blank to keep unchanged)</span>
                      </div>

                      <div>
                        <label className="block text-stone-500 dark:text-stone-400 mb-1">
                          Current Password <span className="text-stone-400 font-normal">(Optional — required only if changing password)</span>
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type={showCurrentPass ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter your current password"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 pr-11"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowCurrentPass((prev) => !prev);
                            }}
                            className="absolute right-2.5 z-10 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition cursor-pointer"
                            title={showCurrentPass ? 'Hide password' : 'Show password'}
                            aria-label={showCurrentPass ? 'Hide password' : 'Show password'}
                          >
                            {showCurrentPass ? <EyeOff className="w-4 h-4 pointer-events-none" /> : <Eye className="w-4 h-4 pointer-events-none" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-stone-500 dark:text-stone-400 mb-1">
                            New Password <span className="text-stone-400 font-normal">(Optional, Min. 6 chars)</span>
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type={showNewPass ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Minimum 6 characters"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 pr-11"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowNewPass((prev) => !prev);
                              }}
                              className="absolute right-2.5 z-10 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition cursor-pointer"
                              title={showNewPass ? 'Hide password' : 'Show password'}
                              aria-label={showNewPass ? 'Hide password' : 'Show password'}
                            >
                              {showNewPass ? <EyeOff className="w-4 h-4 pointer-events-none" /> : <Eye className="w-4 h-4 pointer-events-none" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-stone-500 dark:text-stone-400 mb-1">
                            Confirm New Password <span className="text-stone-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                    <button
                      type="submit"
                      disabled={updatingAccount}
                      className="px-6 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-bold hover:bg-stone-800 dark:hover:bg-amber-300 transition flex items-center space-x-2 shadow disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{updatingAccount ? 'Updating Account...' : 'Save Account Settings'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
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
            <div className="2xl font-bold text-stone-900 dark:text-stone-100 mt-2">
              {getCurrencySymbol(editCurrency)}{metrics ? Number(metrics.totalRevenue).toLocaleString() : '—'}
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
                        <div className="font-semibold text-stone-900 dark:text-stone-100">{appt.recipientName || appt.customerName}</div>
                        {appt.recipientName && (
                          <div className="text-stone-500 dark:text-stone-400 text-[10px]">Booked by {appt.customerName}</div>
                        )}
                        <div className="text-stone-600 dark:text-stone-300 text-[11px] font-medium">{appt.recipientPhone || appt.customerPhone}</div>
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
                        {getCurrencySymbol(appt.currency || editCurrency)}{Number(appt.price).toLocaleString()}
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

      {editingStoreCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleSaveStoreCustomer} className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Manage Customer</h3>
                <p className="text-[11px] text-stone-500 mt-1">Update this customer’s contact details for {currentBusiness?.name || 'this store'}.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStoreCustomer(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                aria-label="Close customer editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1.5">
                <span className="font-semibold text-stone-700 dark:text-stone-300">Customer name</span>
                <input
                  required
                  maxLength={255}
                  value={editCustomerName}
                  onChange={(event) => setEditCustomerName(event.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="font-semibold text-stone-700 dark:text-stone-300">Sign-in email</span>
                <input
                  value={editingStoreCustomer.email || ''}
                  readOnly
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 cursor-not-allowed"
                />
                <span className="block text-[10px] text-stone-500">Customers manage the email and password used to sign in.</span>
              </label>
              <label className="block space-y-1.5">
                <span className="font-semibold text-stone-700 dark:text-stone-300">Phone number</span>
                <input
                  required
                  maxLength={50}
                  value={editCustomerPhone}
                  onChange={(event) => setEditCustomerPhone(event.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStoreCustomer(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCustomer || isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingCustomer ? 'Saving…' : 'Save Contact'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

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
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {getCurrencySymbol(selectedApptDetails.currency || editCurrency)}{Number(selectedApptDetails.price).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Status:</span>
                  <span className="font-bold uppercase text-stone-900 dark:text-stone-100">{selectedApptDetails.status}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-800 dark:text-stone-200 mb-1">Booking Contact</h4>
                <div className="p-3 bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl space-y-1 text-stone-700 dark:text-stone-200">
                  <div><strong>Name:</strong> {selectedApptDetails.customerName}</div>
                  <div><strong>Email:</strong> {selectedApptDetails.customerEmail}</div>
                  <div><strong>Phone:</strong> {selectedApptDetails.customerPhone}</div>
                </div>
              </div>

              {selectedApptDetails.recipientName && (
                <div>
                  <h4 className="font-bold text-stone-800 dark:text-stone-200 mb-1">Person Receiving the Service</h4>
                  <div className="p-3 bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl space-y-1 text-stone-700 dark:text-stone-200">
                    <div><strong>Name:</strong> {selectedApptDetails.recipientName}</div>
                    {selectedApptDetails.recipientEmail && <div><strong>Email:</strong> {selectedApptDetails.recipientEmail}</div>}
                    {selectedApptDetails.recipientPhone && <div><strong>Phone:</strong> {selectedApptDetails.recipientPhone}</div>}
                  </div>
                </div>
              )}
              {(selectedApptDetails.notes || selectedApptDetails.cancellationReason) && (
                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl space-y-1 text-stone-700 dark:text-stone-200">
                  {selectedApptDetails.notes && <div><strong>Notes:</strong> {selectedApptDetails.notes}</div>}
                  {selectedApptDetails.cancellationReason && (
                    <div className="text-rose-700 dark:text-rose-400 font-semibold">
                      <strong>Cancellation Reason:</strong> {selectedApptDetails.cancellationReason}
                    </div>
                  )}
                </div>
              )}

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
              <div className="bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300 font-medium flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">Instant Launch: </span>
                  Click <strong>"Use This Idea"</strong> on any suggestion below to pre-populate the Business Setup Studio on the home page and launch an independent appointment page.
                </div>
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
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 sm:p-7 max-w-lg w-full shadow-2xl">
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
              <FormalNameFields
                firstName={newStaffFirstName}
                middleName={newStaffMiddleName}
                lastName={newStaffLastName}
                onFirstNameChange={setNewStaffFirstName}
                onMiddleNameChange={setNewStaffMiddleName}
                onLastNameChange={setNewStaffLastName}
                required={true}
                labels={{
                  first: 'Staff First Name',
                  middle: 'Middle Initial / Name',
                  last: 'Staff Last Name',
                }}
              />

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Role &amp; Bio <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
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

      {/* MODAL: STAFF SERVICES & WEEKLY SCHEDULE */}
      {staffScheduleTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 sm:p-7 max-w-4xl w-full shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Schedule &amp; Services</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{staffScheduleTarget.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStaffScheduleTarget(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                aria-label="Close staff schedule"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffSchedule} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                {loadingStaffSchedule ? (
                  <div className="py-12 text-center text-xs text-stone-500">Loading staff schedule...</div>
                ) : (
                  <>
                    <section className="space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Services this staff member can provide</h4>
                        <p className="text-[11px] text-stone-500 mt-1">Customers will only see this staff member for selected services.</p>
                      </div>
                      {storeServices.length === 0 ? (
                        <p className="rounded-xl bg-stone-50 dark:bg-stone-800 p-3 text-xs text-stone-500">Add a service before assigning one to this staff member.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {storeServices.map((service) => (
                            <label key={service.id} className="flex items-start gap-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 p-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={staffScheduleServiceIds.includes(service.id)}
                                onChange={(event) => setStaffScheduleServiceIds((current) => (
                                  event.target.checked
                                    ? [...new Set([...current, service.id])]
                                    : current.filter((id) => id !== service.id)
                                ))}
                                className="mt-0.5 h-4 w-4 rounded text-amber-500 focus:ring-amber-400"
                              />
                              <span className="text-xs text-stone-800 dark:text-stone-200">
                                <span className="font-semibold">{service.name}</span>
                                <span className="block text-[10px] text-stone-500 mt-0.5">{service.durationMinutes} min</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">Weekly working hours</h4>
                        <p className="text-[11px] text-stone-500 mt-1">Bookable time is limited to both the store hours and this staff schedule. Breaks block appointment slots.</p>
                      </div>
                      <div className="space-y-2">
                        {staffScheduleDraft.map((day, index) => (
                          <div key={day.dayOfWeek} className={`grid grid-cols-1 lg:grid-cols-[150px_1fr] gap-3 rounded-2xl border p-3 ${day.isWorking ? 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/60' : 'border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 opacity-70'}`}>
                            <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
                              <input
                                type="checkbox"
                                checked={day.isWorking}
                                onChange={(event) => setStaffScheduleDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, isWorking: event.target.checked } : item))}
                                className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400"
                              />
                              {day.day}
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <label className="text-[10px] text-stone-500">
                                Shift starts
                                <input type="time" value={day.startTime} disabled={!day.isWorking} onChange={(event) => setStaffScheduleDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1.5 text-xs text-stone-800 dark:text-stone-200 disabled:opacity-50" />
                              </label>
                              <label className="text-[10px] text-stone-500">
                                Shift ends
                                <input type="time" value={day.endTime} disabled={!day.isWorking} onChange={(event) => setStaffScheduleDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, endTime: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1.5 text-xs text-stone-800 dark:text-stone-200 disabled:opacity-50" />
                              </label>
                              <label className="text-[10px] text-stone-500">
                                Break starts
                                <input type="time" value={day.breakStart} disabled={!day.isWorking} onChange={(event) => setStaffScheduleDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, breakStart: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1.5 text-xs text-stone-800 dark:text-stone-200 disabled:opacity-50" />
                              </label>
                              <label className="text-[10px] text-stone-500">
                                Break ends
                                <input type="time" value={day.breakEnd} disabled={!day.isWorking} onChange={(event) => setStaffScheduleDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, breakEnd: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1.5 text-xs text-stone-800 dark:text-stone-200 disabled:opacity-50" />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-stone-100 dark:border-stone-800">
                <button type="button" disabled={savingStaffSchedule} onClick={() => setStaffScheduleTarget(null)} className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={loadingStaffSchedule || savingStaffSchedule || isPending} className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow disabled:opacity-50">
                  {savingStaffSchedule ? 'Saving...' : 'Save Schedule & Services'}
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
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{editingServiceId ? 'Edit Service' : 'Add Service to Menu'}</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowAddServiceModal(false); setEditingServiceId(null); }}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Service Name <span className="text-rose-500 font-bold">* (Required)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe Hydra-Facial"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Price ({getCurrencySymbol(editCurrency).trim()} {editCurrency}) <span className="text-rose-500 font-bold">* (Required)</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 overflow-hidden focus-within:border-stone-900 dark:focus-within:border-amber-400">
                    <span className="px-3 py-2 bg-stone-100 dark:bg-stone-700/60 text-stone-700 dark:text-stone-200 font-bold text-xs border-r border-stone-200 dark:border-stone-700 select-none">
                      {getCurrencySymbol(editCurrency)}
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="1500"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none text-xs"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-stone-700 dark:text-stone-300">
                      Duration <span className="text-rose-500 font-bold">* (Required)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomDuration(!isCustomDuration)}
                      className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                    >
                      {isCustomDuration ? 'Preset Picker' : 'Custom Mins'}
                    </button>
                  </div>

                  {isCustomDuration ? (
                    <div className="relative flex items-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 overflow-hidden focus-within:border-stone-900 dark:focus-within:border-amber-400">
                      <input
                        type="number"
                        min="5"
                        max="720"
                        step="5"
                        placeholder="e.g. 75"
                        value={customDurationMinutes}
                        onChange={(e) => setCustomDurationMinutes(e.target.value)}
                        className="w-full px-3 py-2 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none text-xs"
                      />
                      <span className="px-3 py-2 bg-stone-100 dark:bg-stone-700/60 text-stone-500 dark:text-stone-300 text-xs border-l border-stone-200 dark:border-stone-700 select-none">
                        mins
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <select
                          value={newServiceDurationHours}
                          onChange={(e) => setNewServiceDurationHours(e.target.value)}
                          className="w-full px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none"
                        >
                          <option value="0">0 hrs</option>
                          <option value="1">1 hr</option>
                          <option value="2">2 hrs</option>
                          <option value="3">3 hrs</option>
                          <option value="4">4 hrs</option>
                        </select>
                      </div>
                      <div>
                        <select
                          value={newServiceDurationMinutes}
                          onChange={(e) => setNewServiceDurationMinutes(e.target.value)}
                          className="w-full px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none"
                        >
                          <option value="15">15 mins</option>
                          <option value="30">30 mins</option>
                          <option value="45">45 mins</option>
                          <option value="60">60 mins</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-stone-700 dark:text-stone-300">
                    Category <span className="text-rose-500 font-bold">* (Required)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCustomCategory(!isNewCustomCategory);
                      setNewCustomCategoryInput('');
                    }}
                    className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline"
                  >
                    {isNewCustomCategory ? 'Choose Existing' : '+ Add New Category'}
                  </button>
                </div>
                {isNewCustomCategory ? (
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Nails & Pedicure"
                    value={newCustomCategoryInput}
                    onChange={(e) => setNewCustomCategoryInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                ) : (
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  >
                    {categoryOptions.map((cat, i) => (
                      <option key={i} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Short Description <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
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
                  onClick={() => { setShowAddServiceModal(false); setEditingServiceId(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingService}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
                >
                  {addingService ? 'Saving...' : editingServiceId ? 'Save Changes' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STAFF HRIS PROFILE */}
      {editingStaffMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    HR Profile: {editingStaffMember.name}
                  </h3>
                  <p className="text-[11px] text-stone-500">Configure position, salary tier, and emergency contacts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaffMember(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffHris} className="space-y-4 text-xs">
              <FormalNameFields
                firstName={editStaffFirstName}
                middleName={editStaffMiddleName}
                lastName={editStaffLastName}
                onFirstNameChange={setEditStaffFirstName}
                onMiddleNameChange={setEditStaffMiddleName}
                onLastNameChange={setEditStaffLastName}
                required={true}
                labels={{
                  first: 'Staff First Name',
                  middle: 'Middle Initial / Name',
                  last: 'Staff Last Name',
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Position / Title <span className="text-rose-500 font-bold">* (Required)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editStaffPosition}
                    onChange={(e) => setEditStaffPosition(e.target.value)}
                    placeholder="e.g. Senior Aesthetician"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Employment Type</label>
                  <select
                    value={editStaffEmploymentType}
                    onChange={(e) => setEditStaffEmploymentType(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contractor / Consultant">Contractor / Consultant</option>
                    <option value="Probationary">Probationary</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Monthly Base Pay ({getCurrencySymbol(editCurrency).trim()})
                  </label>
                  <input
                    type="number"
                    value={editStaffBaseSalary}
                    onChange={(e) => setEditStaffBaseSalary(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={editStaffCommissionRate}
                    onChange={(e) => setEditStaffCommissionRate(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Hire / Start Date</label>
                <input
                  type="date"
                  value={editStaffHireDate}
                  onChange={(e) => setEditStaffHireDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Staff Work Email <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={editStaffEmail}
                    onChange={(e) => setEditStaffEmail(e.target.value)}
                    placeholder="staff@store.com"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-stone-700 dark:text-stone-300">
                      Phone Number <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    {editCountry && (
                      <span className="text-[10px] text-stone-400">
                        {getCountryByName(editCountry).dialCode} • Max {getCountryByName(editCountry).nationalPhoneLength} digits
                      </span>
                    )}
                  </div>
                  <CountryPhoneInput
                    countryNameOrCode={editCountry}
                    value={editStaffPhone}
                    onChange={(val) => setEditStaffPhone(val)}
                    placeholder={getCountryByName(editCountry).code === 'PH' ? '905 242 2821' : undefined}
                  />
                </div>
              </div>

              {/* Separated Emergency Contact Fields */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-xs flex items-center space-x-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>Emergency Contact Details</span>
                  </span>
                  <span className="text-[10px] text-stone-400">(Optional for HR records)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Contact Person & Relationship
                    </label>
                    <input
                      type="text"
                      value={editStaffEmergencyName}
                      onChange={(e) => setEditStaffEmergencyName(e.target.value)}
                      placeholder="e.g. Juan Santos (Spouse)"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-stone-700 dark:text-stone-300">
                        Emergency Phone Number
                      </label>
                      {editCountry && (
                        <span className="text-[10px] text-stone-400">
                          {getCountryByName(editCountry).dialCode}
                        </span>
                      )}
                    </div>
                    <CountryPhoneInput
                      countryNameOrCode={editCountry}
                      value={editStaffEmergencyPhone}
                      onChange={(val) => setEditStaffEmergencyPhone(val)}
                      placeholder={getCountryByName(editCountry).code === 'PH' ? '905 242 2821' : undefined}
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStaffMember(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStaffHris}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
                >
                  {savingStaffHris ? 'Saving...' : 'Save HR Info'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD SALARY PAYMENT */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Record Salary &amp; Payroll</h3>
                  <p className="text-[11px] text-stone-500">Generate a compensation payslip entry for staff member</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPayrollModal(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayroll} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Select Employee</label>
                <select
                  required
                  value={payrollStaffId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setPayrollStaffId(sid);
                    const st = storeStaff.find(s => s.id === sid);
                    if (st) {
                      setBasePay(String(st.baseSalary || 25000));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                >
                  <option value="">Choose Staff Member</option>
                  {storeStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.position || 'Specialist'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Pay Period Start</label>
                  <input
                    type="date"
                    required
                    value={payPeriodStart}
                    onChange={(e) => setPayPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Pay Period End</label>
                  <input
                    type="date"
                    required
                    value={payPeriodEnd}
                    onChange={(e) => setPayPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Base Pay ({getCurrencySymbol(editCurrency).trim()})
                  </label>
                  <input
                    type="number"
                    value={basePay}
                    onChange={(e) => setBasePay(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Commission Pay ({getCurrencySymbol(editCurrency).trim()})
                  </label>
                  <input
                    type="number"
                    value={commissionPay}
                    onChange={(e) => setCommissionPay(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Bonuses / Incentives ({getCurrencySymbol(editCurrency).trim()})
                  </label>
                  <input
                    type="number"
                    value={bonuses}
                    onChange={(e) => setBonuses(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Deductions / Tax ({getCurrencySymbol(editCurrency).trim()})
                  </label>
                  <input
                    type="number"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Notes / Payslip Memo</label>
                <input
                  type="text"
                  value={payrollNotes}
                  onChange={(e) => setPayrollNotes(e.target.value)}
                  placeholder="e.g. Regular monthly payroll disbursement"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-stone-100 dark:bg-stone-800/80 rounded-xl flex justify-between items-center text-xs">
                <span className="font-semibold text-stone-600 dark:text-stone-400">Estimated Net Pay:</span>
                <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                  {getCurrencySymbol(editCurrency)}{(
                    (Number(basePay) || 0) +
                    (Number(commissionPay) || 0) +
                    (Number(bonuses) || 0) -
                    (Number(deductions) || 0)
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPayrollModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayroll}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
                >
                  {recordingPayroll ? 'Recording...' : 'Disburse & Record'}
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
