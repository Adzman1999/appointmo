import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Check, X, Clock, Store, MapPin, 
  Phone, Mail, Calendar, RefreshCw, LogOut, ArrowRight, AlertCircle, Building2, Eye, EyeOff
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from 'sonner';

interface StoreApprovalItem {
  user_id: string;
  admin_name: string;
  admin_email: string;
  registered_at: string;
  user_status: 'pending' | 'approved' | 'rejected';
  business_id: string;
  store_name: string;
  store_slug: string;
  category: string;
  city: string;
  address: string;
  store_phone: string;
  description: string;
  store_status: 'pending' | 'approved' | 'rejected';
}

export const SuperAdminApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res: any = await apiFetch('/owner/store-approvals');
      setStores(res.stores || []);
    } catch (err: any) {
      toast.error('Failed to load store requests', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleApprove = async (userId: string, storeName: string) => {
    setActionLoadingId(userId);
    try {
      const res: any = await apiFetch(`/owner/store-approvals/${userId}/approve`, {
        method: 'POST',
      });
      toast.success('Store Admin Approved', {
        description: res.message || `${storeName} can now sign in to store operations.`
      });
      fetchStores();
    } catch (err: any) {
      toast.error('Approval failed', { description: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (userId: string, storeName: string) => {
    if (!window.confirm(`Are you sure you want to reject registration for ${storeName}?`)) return;
    setActionLoadingId(userId);
    try {
      const res: any = await apiFetch(`/owner/store-approvals/${userId}/reject`, {
        method: 'POST',
      });
      toast.error('Store Registration Rejected', {
        description: res.message || `${storeName} registration has been declined.`
      });
      fetchStores();
    } catch (err: any) {
      toast.error('Rejection failed', { description: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('appointmo_token');
    localStorage.removeItem('appointmo_user');
    navigate('/admin/login');
  };

  const filteredStores = stores.filter(s => {
    if (filter === 'all') return true;
    return s.user_status === filter;
  });

  const pendingCount = stores.filter(s => s.user_status === 'pending').length;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors pb-20">
      {/* Super Admin Top Header */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-stone-900/85 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AppointmoLogo size="sm" showText={false} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-stone-900 dark:text-stone-100">Super Admin Gateway</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                  Super Admin Role
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">Store Approval &amp; Business Verification</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <ThemeToggle />

            <button
              onClick={fetchStores}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-stone-600 dark:text-stone-300"
              title="Refresh store requests"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        {/* Banner Overview */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                Store Creation Approval Queue
              </h1>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Newly created store accounts require explicit Super Admin approval before the store administrator can log in.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center space-x-2">
            <div className="px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-center">
              <div className="text-lg font-bold text-amber-900 dark:text-amber-200">{pendingCount}</div>
              <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending Review</div>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-stone-100 dark:bg-stone-800 text-center">
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100">{stores.length}</div>
              <div className="text-[10px] font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider">Total Stores</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                filter === tab
                  ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              {tab === 'all' ? 'All Registrations' : tab}
              {tab === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stores List */}
        {loading ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center text-xs text-stone-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
            <p>Loading store approval requests...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center space-y-2">
            <Building2 className="w-10 h-10 text-stone-400 mx-auto" />
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">No Store Requests Found</h3>
            <p className="text-xs text-stone-500">There are currently no store registration submissions matching this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredStores.map((item) => (
              <div
                key={item.user_id}
                className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm hover:border-stone-300 dark:hover:border-stone-700 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
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
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 font-medium">
                        Category: <strong className="text-stone-900 dark:text-stone-100">{item.category || 'General'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Actions for Pending State */}
                  <div className="flex items-center space-x-2">
                    {item.user_status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleReject(item.user_id, item.store_name)}
                          disabled={actionLoadingId === item.user_id}
                          className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApprove(item.user_id, item.store_name)}
                          disabled={actionLoadingId === item.user_id}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{actionLoadingId === item.user_id ? 'Approving...' : 'Approve Store'}</span>
                        </button>
                      </>
                    ) : item.user_status === 'approved' ? (
                      <button
                        onClick={() => handleReject(item.user_id, item.store_name)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-medium transition"
                        title="Revoke store approval"
                      >
                        Revoke Approval
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApprove(item.user_id, item.store_name)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition"
                      >
                        Re-Approve
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/80 text-xs text-stone-700 dark:text-stone-300">
                  <div className="space-y-1">
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold uppercase">Admin Contact</span>
                    <div className="font-semibold text-stone-900 dark:text-stone-100">{item.admin_name}</div>
                    <div className="text-stone-600 dark:text-stone-400 flex items-center space-x-1">
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
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold uppercase">Registration Time</span>
                    <div className="flex items-center space-x-1 text-stone-900 dark:text-stone-100">
                      <Calendar className="w-3 h-3 text-amber-500" />
                      <span>{new Date(item.registered_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-stone-500 line-clamp-1 italic">"{item.description}"</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
