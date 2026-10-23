import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Check, X, Clock, Store, MapPin, 
  Phone, Mail, Calendar, RefreshCw, LogOut, ArrowRight, AlertCircle, Building2, Eye, EyeOff,
  Bell, KeyRound, Users, UserX, UserCheck, Search, ShieldAlert, Sparkles, ExternalLink,
  ChevronDown, ChevronUp, Layers, Scissors, UserCog, CheckCircle2, Globe, Tag, DollarSign
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { Pagination } from '../components/Pagination';
import { toast } from 'sonner';

interface RecentCredentials {
  email: string;
  temporaryPassword?: string;
  grantedAt?: string;
  grantedBy?: string;
  role?: string;
  loginUrl?: string;
}

interface StoreApprovalItem {
  user_id: string;
  admin_name: string;
  admin_email: string;
  registered_at: string;
  user_status: 'pending' | 'approved' | 'rejected';
  recent_credentials?: RecentCredentials | null;
  business_id: string;
  store_name: string;
  store_slug: string;
  category: string;
  city: string;
  address: string;
  store_phone: string;
  store_email?: string;
  currency?: string;
  timezone?: string;
  description: string;
  logo_url?: string;
  opening_hours?: string;
  tagline?: string;
  website?: string;
  instagram?: string;
  social_handle?: string;
  booking_policies?: any;
  store_status: 'pending' | 'approved' | 'rejected';
  service_count?: number;
  staff_count?: number;
}

interface CustomerItem {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  status: 'approved' | 'suspended' | 'disabled' | 'revoked';
  status_reason?: string | null;
  registered_at: string;
  updated_at: string;
  primary_store_name?: string;
  primary_store_slug?: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  last_booking_date?: string | null;
}

export const SuperAdminApprovalPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'stores' | 'customers'>('stores');

  // Stores state
  const [stores, setStores] = useState<StoreApprovalItem[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeSearch, setStoreSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

  // Customers state
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'approved' | 'suspended' | 'disabled' | 'revoked'>('all');

  // Super Admin Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null);

  // Pagination states
  const STORES_PER_PAGE = 6;
  const [storePage, setStorePage] = useState(1);

  const CUSTOMERS_PER_PAGE = 8;
  const [customerPage, setCustomerPage] = useState(1);

  useEffect(() => {
    setStorePage(1);
  }, [storeFilter, storeSearch]);

  useEffect(() => {
    setCustomerPage(1);
  }, [customerFilter, customerSearch]);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Store Approval Modal
  const [approveModalItem, setApproveModalItem] = useState<StoreApprovalItem | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [autoGenPassword, setAutoGenPassword] = useState(true);

  // Modern Confirmation Popup Modal
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText?: string;
    variant: 'danger' | 'warning' | 'primary' | 'success';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    onConfirm: () => {},
  });

  // Customer Management Action Modal
  const [customerModalData, setCustomerModalData] = useState<{
    customer: CustomerItem;
    targetStatus: 'approved' | 'suspended' | 'disabled' | 'revoked';
    reason: string;
  } | null>(null);

  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const res: any = await apiFetch('/owner/store-approvals');
      setStores(res.stores || []);
    } catch (err: any) {
      toast.error('Failed to load store requests', { description: err.message });
    } finally {
      setLoadingStores(false);
    }
  };

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res: any = await apiFetch('/owner/customers');
      setCustomers(res.customers || []);
    } catch (err: any) {
      toast.error('Failed to load customers', { description: err.message });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res: any = await apiFetch('/owner/notifications');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch super admin notifications', err);
    }
  };

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

  useEffect(() => {
    fetchStores();
    fetchCustomers();
    fetchNotifications();

    // Auto-refresh notifications every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // When clicking a notification item: close dropdown, auto-remove from list, and open full details modal
  const handleClickNotification = async (notif: any) => {
    setSelectedNotif(notif);
    setIsNotifOpen(false);
    // Auto remove viewed notification from the active list
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    if (!notif.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      await apiFetch(`/owner/notifications/${notif.id}/read`, { method: 'PATCH' });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    setNotifications([]);
    setUnreadCount(0);
    setIsNotifOpen(false);
    try {
      await apiFetch(`/owner/notifications/mark-all-read`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  // Store Approval Handlers
  const handleOpenApproveModal = (item: StoreApprovalItem) => {
    setApproveModalItem(item);
    setCustomPassword('');
    setAutoGenPassword(true);
  };

  const handleConfirmApproval = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!approveModalItem) return;

    const item = approveModalItem;
    setActionLoadingId(item.user_id);
    try {
      const res: any = await apiFetch(`/owner/store-approvals/${item.user_id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          customPassword: autoGenPassword ? undefined : customPassword.trim(),
        }),
      });
      toast.success('Store Admin Approved & Email Dispatched', {
        description: res.message || `${item.store_name} credentials delivered to ${item.admin_email}.`,
      });
      setApproveModalItem(null);
      fetchStores();
      fetchNotifications();
    } catch (err: any) {
      toast.error('Approval failed', { description: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectStorePrompt = (userId: string, storeName: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Reject Store Registration',
      description: `Are you sure you want to decline registration for "${storeName}"? The store owner will not be granted access to the store management dashboard.`,
      confirmText: 'Reject Store',
      cancelText: 'Keep Pending',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoadingId(userId);
        try {
          const res: any = await apiFetch(`/owner/store-approvals/${userId}/reject`, {
            method: 'POST',
          });
          toast.error('Store Registration Rejected', {
            description: res.message || `${storeName} registration has been declined.`
          });
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
          fetchStores();
          fetchNotifications();
        } catch (err: any) {
          toast.error('Rejection failed', { description: err.message });
        } finally {
          setActionLoadingId(null);
        }
      }
    });
  };

  // Customer Management Handlers
  const handleOpenCustomerModal = (customer: CustomerItem, targetStatus: 'approved' | 'suspended' | 'disabled' | 'revoked') => {
    setCustomerModalData({
      customer,
      targetStatus,
      reason: ''
    });
  };

  const handleConfirmCustomerStatusChange = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customerModalData) return;

    const { customer, targetStatus, reason } = customerModalData;
    setActionLoadingId(customer.user_id);
    try {
      const res: any = await apiFetch(`/owner/customers/${customer.user_id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: targetStatus,
          reason: reason.trim() || undefined
        })
      });

      const label = targetStatus === 'approved' 
        ? 'Reactivated' 
        : targetStatus === 'suspended' 
        ? 'Suspended' 
        : targetStatus === 'disabled' 
        ? 'Disabled' 
        : 'Access Revoked';

      toast.success(`Customer Account ${label}`, {
        description: res.message || `Customer ${customer.email} is now ${targetStatus}.`
      });

      setCustomerModalData(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error('Failed to update customer status', { description: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Sign Out of Super Admin',
      description: 'Are you sure you want to sign out from the Super Admin portal?',
      confirmText: 'Sign Out',
      cancelText: 'Stay Signed In',
      variant: 'danger',
      onConfirm: () => {
        localStorage.removeItem('appointmo_token');
        localStorage.removeItem('appointmo_user');
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        navigate('/admin/login');
      }
    });
  };

  // Filters
  const filteredStores = stores.filter(s => {
    const matchesFilter = storeFilter === 'all' || s.user_status === storeFilter;
    const q = storeSearch.trim().toLowerCase();
    const matchesSearch = !q ||
      (s.store_name && s.store_name.toLowerCase().includes(q)) ||
      (s.store_slug && s.store_slug.toLowerCase().includes(q)) ||
      (s.admin_name && s.admin_name.toLowerCase().includes(q)) ||
      (s.admin_email && s.admin_email.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const filteredCustomers = customers.filter(c => {
    const matchesFilter = customerFilter === 'all' || c.status === customerFilter;
    const matchesSearch = !customerSearch.trim() || 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.toLowerCase().includes(customerSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingStoresCount = stores.filter(s => s.user_status === 'pending').length;
  const suspendedCustomersCount = customers.filter(c => c.status === 'suspended' || c.status === 'revoked' || c.status === 'disabled').length;

  const totalStorePages = Math.ceil(filteredStores.length / STORES_PER_PAGE);
  const paginatedStores = filteredStores.slice((storePage - 1) * STORES_PER_PAGE, storePage * STORES_PER_PAGE);

  const totalCustomerPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice((customerPage - 1) * CUSTOMERS_PER_PAGE, customerPage * CUSTOMERS_PER_PAGE);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors pb-20">
      {/* Super Admin Top Header */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-stone-900/85 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AppointmoLogo size="sm" showText={false} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-stone-900 dark:text-stone-100">Super Admin Gateway</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                  Super Admin Role
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">Store Verification, Full Profiles &amp; Governance</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <ThemeToggle />

            {/* Notification Bell with Click-Outside Ref */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-stone-600 dark:text-stone-300"
                title="Super Admin Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl z-50 overflow-hidden animate-in fade-in">
                  <div className="p-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-stone-900 dark:text-stone-100">Super Admin Alerts</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                        {unreadCount} unread
                      </span>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleMarkAllNotifsRead}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-stone-500 dark:text-stone-400 font-medium">
                        No new notifications.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleClickNotification(n)}
                          className={`p-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer transition ${
                            !n.isRead ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-stone-900 dark:text-stone-100 text-xs font-bold">{n.title}</span>
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
                fetchStores();
                fetchCustomers();
                fetchNotifications();
              }}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-stone-600 dark:text-stone-300"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStores || loadingCustomers ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold transition border border-rose-200 dark:border-rose-900"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-8 space-y-6">
        {/* Banner Overview */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                Super Admin Master Center
              </h1>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Review full store business profiles, verify contact &amp; operational parameters, and oversee customer account privileges.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-2.5">
            <div className="px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-center">
              <div className="text-lg font-bold text-amber-900 dark:text-amber-200">{pendingStoresCount}</div>
              <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending Stores</div>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-stone-100 dark:bg-stone-800 text-center">
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100">{stores.length}</div>
              <div className="text-[10px] font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider">Total Stores</div>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-center">
              <div className="text-lg font-bold text-sky-900 dark:text-sky-200">{customers.length}</div>
              <div className="text-[10px] font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">Customers</div>
            </div>
          </div>
        </div>

        {/* Primary View Tab Switcher */}
        <div className="flex items-center space-x-3 border-b border-stone-200 dark:border-stone-800 pb-3">
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition ${
              activeTab === 'stores'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Store Businesses &amp; Approvals</span>
            {pendingStoresCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-[10px]">
                {pendingStoresCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition ${
              activeTab === 'customers'
                ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-md'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Accounts &amp; Governance</span>
            {suspendedCustomersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px]">
                {suspendedCustomersCount} flagged
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: STORES & FULL PROFILES */}
        {activeTab === 'stores' && (
          <div className="space-y-4">
            {/* Filter Tabs and Search Bar for Stores */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStoreFilter(tab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                      storeFilter === tab
                        ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm'
                        : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    {tab === 'all' ? 'All Registrations' : tab}
                    {tab === 'pending' && pendingStoresCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                        {pendingStoresCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search Stores Input */}
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="Search stores, email, slug, city..."
                    className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition"
                  />
                  {storeSearch && (
                    <button
                      onClick={() => setStoreSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <span className="text-xs text-stone-500 whitespace-nowrap hidden md:inline">
                  {filteredStores.length} {filteredStores.length === 1 ? 'store' : 'stores'}
                </span>
              </div>
            </div>

            {/* Stores List */}
            {loadingStores ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center text-xs text-stone-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                <p>Loading stores and profiles...</p>
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center space-y-2">
                <Building2 className="w-10 h-10 text-stone-400 mx-auto" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">No Store Requests Found</h3>
                <p className="text-xs text-stone-500">There are currently no store registration submissions matching this filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {paginatedStores.map((item) => {
                    const isExpanded = expandedStoreId === item.user_id;
                    const grantedTimestamp = item.recent_credentials?.grantedAt;

                  return (
                    <div
                      key={item.user_id}
                      className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm hover:border-stone-300 dark:hover:border-stone-700 transition space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start space-x-3.5">
                          {item.logo_url ? (
                            <img
                              src={item.logo_url}
                              alt={item.store_name}
                              className="w-12 h-12 rounded-2xl object-cover border border-stone-200 dark:border-stone-700 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                              <Store className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                                {item.store_name || 'Untitled Store'}
                              </h2>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                                /{item.store_slug || 'pending-slug'}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.user_status === 'approved'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                  : item.user_status === 'pending'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                              }`}>
                                {item.user_status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-400 mt-1 font-medium">
                              <span>Category: <strong className="text-stone-900 dark:text-stone-100">{item.category || 'General'}</strong></span>
                              <span>•</span>
                              <span>Hours: <strong className="text-stone-900 dark:text-stone-100">{item.opening_hours || '9:00 AM - 6:00 PM'}</strong></span>
                              {grantedTimestamp && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                                    <span>Granted On: {new Date(grantedTimestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions for Store */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setExpandedStoreId(isExpanded ? null : item.user_id)}
                            className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 transition flex items-center space-x-1.5"
                          >
                            <span>{isExpanded ? 'Hide Store Info' : 'View Full Store Info'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {item.user_status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleRejectStorePrompt(item.user_id, item.store_name)}
                                disabled={actionLoadingId === item.user_id}
                                className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                              <button
                                onClick={() => handleOpenApproveModal(item)}
                                disabled={actionLoadingId === item.user_id}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{actionLoadingId === item.user_id ? 'Approving...' : 'Approve Store'}</span>
                              </button>
                            </>
                          ) : item.user_status === 'approved' ? (
                            <button
                              onClick={() => handleRejectStorePrompt(item.user_id, item.store_name)}
                              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-medium transition"
                              title="Revoke store approval"
                            >
                              Revoke Approval
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenApproveModal(item)}
                              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition"
                            >
                              Re-Approve Store
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Primary Overview Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/80 text-xs text-stone-700 dark:text-stone-300">
                        <div className="space-y-1">
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold uppercase">Store Owner / Admin</span>
                          <div className="font-semibold text-stone-900 dark:text-stone-100">{item.admin_name}</div>
                          <div className="text-stone-600 dark:text-stone-400 flex items-center space-x-1 font-mono text-[11px]">
                            <Mail className="w-3 h-3 text-amber-500" />
                            <span>{item.admin_email}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold uppercase">Location &amp; Phone</span>
                          <div className="flex items-center space-x-1 font-semibold text-stone-900 dark:text-stone-100 truncate">
                            <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{item.address || item.city || 'Metro Manila'}</span>
                          </div>
                          <div className="text-stone-600 dark:text-stone-400 flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-amber-500" />
                            <span>{item.store_phone || 'None provided'}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold uppercase">Timestamps &amp; Catalog</span>
                          <div className="flex items-center space-x-1 text-stone-900 dark:text-stone-100">
                            <Calendar className="w-3 h-3 text-amber-500" />
                            <span>Created: {new Date(item.registered_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                          <div className="text-stone-600 dark:text-stone-400 flex items-center space-x-3 mt-1">
                            <span>Services: <strong>{item.service_count ?? 0}</strong></span>
                            <span>•</span>
                            <span>Staff Specialists: <strong>{item.staff_count ?? 0}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Expandable FULL STORE INFO (Credentials omitted for store privacy) */}
                      {isExpanded && (
                        <div className="p-5 rounded-2xl bg-amber-50/40 dark:bg-stone-800/90 border border-amber-200/80 dark:border-stone-700 space-y-4 animate-in fade-in">
                          <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-4 h-4 text-amber-500" />
                              <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                                Comprehensive Store Business Profile
                              </h4>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {/* Business Profile & Brand Info */}
                            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-2.5">
                              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                                Identity &amp; Branding
                              </span>
                              <div className="space-y-1.5 text-stone-700 dark:text-stone-300">
                                <div>
                                  <span className="text-stone-500">Business Name:</span>{' '}
                                  <strong className="text-stone-900 dark:text-stone-100">{item.store_name}</strong>
                                </div>
                                <div>
                                  <span className="text-stone-500">Tagline / Brand Statement:</span>{' '}
                                  <strong className="text-stone-900 dark:text-stone-100">{item.tagline || 'None configured'}</strong>
                                </div>
                                <div>
                                  <span className="text-stone-500">Full Description:</span>{' '}
                                  <p className="italic text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-lg border border-stone-200/60 dark:border-stone-800">
                                    {item.description || 'No detailed description provided.'}
                                  </p>
                                </div>
                                <div className="pt-1 flex flex-wrap items-center gap-3">
                                  {item.website && (
                                    <span className="flex items-center space-x-1 text-stone-600 dark:text-stone-400">
                                      <Globe className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="font-mono">{item.website}</span>
                                    </span>
                                  )}
                                  {item.social_handle && (
                                    <span className="flex items-center space-x-1 text-stone-600 dark:text-stone-400 font-mono">
                                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                                      <span>@{item.social_handle.replace(/^@/, '')}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Operational & Approval Governance */}
                            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-2.5">
                              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                                Operations &amp; Verification Status
                              </span>
                              <div className="space-y-1.5 text-stone-700 dark:text-stone-300">
                                <div className="flex justify-between items-center">
                                  <span className="text-stone-500">Operating Schedule:</span>
                                  <strong className="text-stone-900 dark:text-stone-100 font-semibold">{item.opening_hours || '9:00 AM - 6:00 PM'}</strong>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-stone-500">Operating City:</span>
                                  <span className="font-semibold text-stone-900 dark:text-stone-100">{item.city || 'Metro Manila'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-stone-500">Currency &amp; Timezone:</span>
                                  <span className="font-mono text-stone-900 dark:text-stone-100">{item.currency || 'PHP'} • {item.timezone || 'Asia/Manila'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-stone-500">Active Offerings:</span>
                                  <span className="font-semibold text-stone-900 dark:text-stone-100">{item.service_count ?? 0} Services • {item.staff_count ?? 0} Staff</span>
                                </div>

                                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-stone-500">Store Verification:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      item.user_status === 'approved' 
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    }`}>
                                      {item.user_status}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-stone-500">Granted On:</span>
                                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                                      {grantedTimestamp 
                                        ? new Date(grantedTimestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                                        : item.user_status === 'approved' 
                                        ? 'Approved' 
                                        : 'Awaiting Super Admin Review'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-4 shadow-sm">
                <Pagination
                  currentPage={storePage}
                  totalPages={totalStorePages}
                  totalItems={filteredStores.length}
                  itemsPerPage={STORES_PER_PAGE}
                  onPageChange={setStorePage}
                  itemName="store registrations"
                />
              </div>
            </div>
          )}
          </div>
        )}

        {/* TAB 2: CUSTOMER GOVERNANCE */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search customers by name, email, or phone number..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
                {(['all', 'approved', 'suspended', 'disabled', 'revoked'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCustomerFilter(tab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                      customerFilter === tab
                        ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {tab === 'approved' ? 'Active' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Customers Table / Cards */}
            {loadingCustomers ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center text-xs text-stone-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                <p>Loading customer accounts...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center space-y-2">
                <Users className="w-10 h-10 text-stone-400 mx-auto" />
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">No Customer Accounts Found</h3>
                <p className="text-xs text-stone-500">No customer profiles match your current search and filter criteria.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3.5 font-bold">Customer Info</th>
                        <th className="px-4 py-3.5 font-bold">Contact</th>
                        <th className="px-4 py-3.5 font-bold">Status</th>
                        <th className="px-4 py-3.5 font-bold">Booking History</th>
                        <th className="px-4 py-3.5 font-bold">Registered</th>
                        <th className="px-5 py-3.5 font-bold text-right">Super Admin Governance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {paginatedCustomers.map((cust) => {
                        const isSuspended = cust.status === 'suspended';
                        const isDisabled = cust.status === 'disabled';
                        const isRevoked = cust.status === 'revoked';
                        const isActive = cust.status === 'approved';

                        return (
                          <tr key={cust.user_id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition">
                            <td className="px-5 py-4">
                              <div className="font-bold text-stone-900 dark:text-stone-100 text-xs">{cust.name}</div>
                              <div className="text-stone-500 dark:text-stone-400 text-[11px] font-mono">{cust.email}</div>
                              {cust.status_reason && (
                                <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 italic">
                                  Reason: {cust.status_reason}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <div className="text-stone-700 dark:text-stone-300 font-medium">{cust.phone || 'None'}</div>
                              {cust.primary_store_name && (
                                <div className="text-[10px] text-stone-500">Store: {cust.primary_store_name}</div>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isActive
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                  : isSuspended
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300'
                                  : isDisabled
                                  ? 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                              }`}>
                                {isActive ? 'Active' : cust.status}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <div className="font-semibold text-stone-800 dark:text-stone-200">
                                {cust.total_bookings} total ({cust.completed_bookings} completed)
                              </div>
                              <div className="text-[10px] text-stone-500">
                                Last: {cust.last_booking_date ? new Date(cust.last_booking_date).toLocaleDateString() : 'Never'}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-stone-600 dark:text-stone-400 text-[11px]">
                              {new Date(cust.registered_at).toLocaleDateString()}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {!isActive && (
                                  <button
                                    onClick={() => handleOpenCustomerModal(cust, 'approved')}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 transition"
                                    title="Reactivate customer account"
                                  >
                                    Reactivate
                                  </button>
                                )}

                                {!isSuspended && (
                                  <button
                                    onClick={() => handleOpenCustomerModal(cust, 'suspended')}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-[11px] font-semibold border border-amber-200 dark:border-amber-800 transition"
                                    title="Temporarily suspend customer"
                                  >
                                    Suspend
                                  </button>
                                )}

                                {!isDisabled && (
                                  <button
                                    onClick={() => handleOpenCustomerModal(cust, 'disabled')}
                                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 text-[11px] font-semibold transition"
                                    title="Disable customer login"
                                  >
                                    Disable
                                  </button>
                                )}

                                {!isRevoked && (
                                  <button
                                    onClick={() => handleOpenCustomerModal(cust, 'revoked')}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-[11px] font-semibold border border-rose-200 dark:border-rose-900 transition"
                                    title="Permanently revoke access & invalidate sessions"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-stone-50/50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
                  <Pagination
                    currentPage={customerPage}
                    totalPages={totalCustomerPages}
                    totalItems={filteredCustomers.length}
                    itemsPerPage={CUSTOMERS_PER_PAGE}
                    onPageChange={setCustomerPage}
                    itemName="customer accounts"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Approve Store Modal */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Approve Store &amp; Admin</h3>
                  <p className="text-xs text-stone-500">Authorize this store to start receiving bookings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4 text-xs">
              <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 space-y-2">
                <div className="flex justify-between items-center text-stone-700 dark:text-stone-300">
                  <span className="font-sans font-medium text-stone-500">Store Name:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{approveModalItem.store_name}</span>
                </div>
                <div className="flex justify-between items-center text-stone-700 dark:text-stone-300">
                  <span className="font-sans font-medium text-stone-500">Store Owner:</span>
                  <span className="text-stone-900 dark:text-stone-100 font-semibold">{approveModalItem.admin_name}</span>
                </div>
                <div className="flex justify-between items-center text-stone-700 dark:text-stone-300">
                  <span className="font-sans font-medium text-stone-500">Store Sign-In Email:</span>
                  <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">{approveModalItem.admin_email}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                <strong>Authorization:</strong> The store owner configured their own sign-in password during store registration. Approving will immediately unlock their account, elevate their role to <strong>Store Admin</strong>, and allow them to sign in at <code>/#/admin/login</code>.
              </div>

              <div>
                <label className="flex items-center space-x-2 text-stone-600 dark:text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!autoGenPassword}
                    onChange={(e) => setAutoGenPassword(!e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Optionally override and set a new password for the store owner</span>
                </label>

                {!autoGenPassword && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      placeholder="e.g. NewCustomPass2026!"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    />
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveModalItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === approveModalItem.user_id}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{actionLoadingId === approveModalItem.user_id ? 'Authorizing...' : 'Confirm & Authorize Store'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Status Governance Modal */}
      {customerModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  customerModalData.targetStatus === 'approved'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : customerModalData.targetStatus === 'suspended'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                }`}>
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {customerModalData.targetStatus === 'approved' ? 'Reactivate Customer Account' :
                     customerModalData.targetStatus === 'suspended' ? 'Suspend Customer Account' :
                     customerModalData.targetStatus === 'disabled' ? 'Disable Customer Login' :
                     'Revoke Customer Access'}
                  </h3>
                  <p className="text-xs text-stone-500">Super Admin account governance action</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomerModalData(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCustomerStatusChange} className="space-y-4 text-xs">
              <div className="bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 space-y-1.5 font-medium">
                <div>
                  <span className="text-stone-500">Customer:</span>{' '}
                  <strong className="text-stone-900 dark:text-stone-100">{customerModalData.customer.name}</strong>
                </div>
                <div>
                  <span className="text-stone-500">Email:</span>{' '}
                  <span className="font-mono text-stone-900 dark:text-stone-100">{customerModalData.customer.email}</span>
                </div>
                <div>
                  <span className="text-stone-500">Action:</span>{' '}
                  <strong className={`uppercase ${
                    customerModalData.targetStatus === 'approved' ? 'text-emerald-600' :
                    customerModalData.targetStatus === 'suspended' ? 'text-amber-600' :
                    'text-rose-600'
                  }`}>
                    Set status to '{customerModalData.targetStatus}'
                  </strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Administrative Note or Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Repeated no-shows or requested account closure..."
                  value={customerModalData.reason}
                  onChange={(e) => setCustomerModalData({ ...customerModalData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>

              {customerModalData.targetStatus !== 'approved' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-[11px] text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
                  <strong>Notice:</strong> This customer will immediately be prohibited from signing into their Appointmo account.
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomerModalData(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === customerModalData.customer.user_id}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-white transition shadow flex items-center justify-center space-x-1.5 disabled:opacity-50 ${
                    customerModalData.targetStatus === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : customerModalData.targetStatus === 'suspended'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  <span>{actionLoadingId === customerModalData.customer.user_id ? 'Applying...' : 'Confirm Action'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Confirmation Popup Modal (Light & Dark Mode) */}
      {confirmModalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmModalConfig.variant === 'danger'
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : confirmModalConfig.variant === 'warning'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
              }`}>
                {confirmModalConfig.variant === 'danger' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : confirmModalConfig.variant === 'warning' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {confirmModalConfig.title}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {confirmModalConfig.description}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs transition"
              >
                {confirmModalConfig.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => confirmModalConfig.onConfirm()}
                className={`flex-1 py-2.5 rounded-xl font-bold text-white text-xs transition shadow flex items-center justify-center space-x-1.5 ${
                  confirmModalConfig.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : confirmModalConfig.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                <span>{confirmModalConfig.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Full Info Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-sm">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                    {selectedNotif.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>
                      {new Date(selectedNotif.createdAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700 text-stone-800 dark:text-stone-200 leading-relaxed font-normal whitespace-pre-line">
                {selectedNotif.message}
              </div>

              {selectedNotif.type && (
                <div className="flex items-center justify-between text-[11px] px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  <span>Category:</span>
                  <span className="font-mono uppercase font-bold text-stone-800 dark:text-stone-200">{selectedNotif.type}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-bold hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
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
