import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, Store, UserCheck, Shield, Sparkles, Building2, Phone, Mail, CheckCircle2, ChevronRight, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { LocationPicker } from '../components/LocationPicker';

export const AdminLoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Mode: 'signin' or 'signup'
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);

  // Account Type selection during Sign Up only: 'customer' or 'store'
  const initialAccountType = searchParams.get('type') === 'store' || searchParams.get('role') === 'store' ? 'store' : 'customer';
  const [accountType, setAccountType] = useState<'customer' | 'store'>(initialAccountType);

  // Common credentials - empty defaults so visitors create or type their own accounts
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Store Sign Up Details
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('Beauty & Wellness');
  const [city, setCity] = useState('Quezon City');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [openingHours, setOpeningHours] = useState('9:00 AM - 6:00 PM');
  const [socialHandle, setSocialHandle] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      if (authMode === 'signin') {
        const res: any = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password }),
        });

        localStorage.setItem('appointmo_token', res.token);
        localStorage.setItem('appointmo_user', JSON.stringify(res.user));

        if (res.user.role === 'platform_admin' || res.user.role === 'owner') {
          navigate('/superadmin');
        } else if (res.user.role === 'customer') {
          navigate(`/manage?email=${encodeURIComponent(res.user.email)}`);
        } else {
          // Store / Business Admin
          const targetSlug = res.user.businessSlug || 'lumiere-beauty-studio';
          navigate(`/admin/dashboard?slug=${encodeURIComponent(targetSlug)}`);
        }
      } else {
        // Sign Up with Store Creation if accountType is store
        const isStore = accountType === 'store';
        const res: any = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            role: isStore ? 'business_admin' : 'customer',
            name: name.trim(),
            email: email.trim(),
            password,
            phone: phone.trim(),
            ...(isStore ? {
              storeName: storeName.trim() || `${name.trim()}'s Store`,
              category,
              city,
              address: address.trim(),
              description: description.trim(),
              openingHours,
              socialHandle: socialHandle.trim(),
            } : {}),
          }),
        });

        if (res.pendingApproval) {
          setSuccessNotice(res.message);
          setAuthMode('signin');
          return;
        }

        if (res.token) {
          localStorage.setItem('appointmo_token', res.token);
          localStorage.setItem('appointmo_user', JSON.stringify(res.user));
        }

        if (res.user.role === 'customer') {
          navigate(`/manage?email=${encodeURIComponent(res.user.email)}`);
        } else {
          const targetSlug = res.user.businessSlug || 'lumiere-beauty-studio';
          navigate(`/admin/dashboard?slug=${encodeURIComponent(targetSlug)}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col justify-between text-stone-900 dark:text-stone-100 transition-colors">
      {/* Top Navbar */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <AppointmoLogo size="md" subtitle="Appointment Management" />
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={() => navigate('/')}
              className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Main Auth Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className={`w-full bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-xl transition-all duration-300 ${
          authMode === 'signup' && accountType === 'store'
            ? 'max-w-2xl sm:max-w-3xl'
            : 'max-w-md'
        }`}>
          {/* Header & Mode Switcher */}
          <div className="mb-6 space-y-4">
            {/* Top Row: Title + Description */}
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                {authMode === 'signin' ? 'Sign In to Appointmo' : 'Create an Account'}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                {authMode === 'signin' 
                  ? 'Access your appointments, store schedule, or admin console' 
                  : 'Join Appointmo as a customer or register your business'}
              </p>
            </div>

            {/* Mode Switcher Pills (Full width so text never wraps or clips) */}
            <div className="grid grid-cols-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`py-2 text-center rounded-xl text-xs font-bold transition ${
                  authMode === 'signin'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`py-2 text-center rounded-xl text-xs font-bold transition ${
                  authMode === 'signup'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Account Type Option for Registration (Only shown when signing up) */}
          {authMode === 'signup' && (
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-100 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 mb-6">
              <button
                type="button"
                onClick={() => setAccountType('customer')}
                className={`flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition ${
                  accountType === 'customer'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4 text-amber-500" />
                <span>Customer</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType('store')}
                className={`flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition ${
                  accountType === 'store'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Store className="w-4 h-4 text-amber-500" />
                <span>Business / Store</span>
              </button>
            </div>
          )}

          {successNotice && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Store Registration Under Review</p>
                <p className="mt-0.5 leading-relaxed">{successNotice}</p>
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  Your store is queued for verification and approval by the Super Admin.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* If Sign Up: ask for Name and Phone */}
            {authMode === 'signup' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria Santos"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Contact Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+63 905 242 2821"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {/* Email and Password */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 flex items-center space-x-1 font-medium transition"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* If Store Admin Sign Up: Instant Store Creation Details */}
            {authMode === 'signup' && accountType === 'store' && (
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Store Profile Details</span>
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Auto-creates your store</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Store / Brand Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zen Dental Studio, Lumina Hair Lounge"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    >
                      <option value="Beauty & Wellness">Beauty & Wellness</option>
                      <option value="Dental Services">Dental Services</option>
                      <option value="Veterinary Services">Veterinary Services</option>
                      <option value="Professional Consultations">Professional Consultations</option>
                      <option value="Automotive & Detailing">Automotive & Detailing</option>
                      <option value="Health & Fitness">Health & Fitness</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">City / Region</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    >
                      <option value="Quezon City">Quezon City</option>
                      <option value="Makati">Makati</option>
                      <option value="Taguig / BGC">Taguig / BGC</option>
                      <option value="Pasig / Ortigas">Pasig / Ortigas</option>
                      <option value="San Juan / Greenhills">San Juan / Greenhills</option>
                      <option value="Mandaluyong">Mandaluyong</option>
                      <option value="Manila">Manila</option>
                      <option value="Alabang / Muntinlupa">Alabang / Muntinlupa</option>
                      <option value="Pasay">Pasay</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Store Address / Mall Level
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Unit 204, High Street Promenade, 88 Commercial Ave"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold py-3.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition text-xs shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>
                {loading
                  ? 'Processing...'
                  : authMode === 'signin'
                  ? 'Sign In'
                  : accountType === 'store'
                  ? 'Register Store & Account'
                  : 'Create Customer Account'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle between Sign In / Sign Up */}
          <div className="mt-6 text-center text-xs text-stone-500 dark:text-stone-400">
            {authMode === 'signin' ? (
              <span>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Create one now
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Sign in here
                </button>
              </span>
            )}
          </div>
        </div>
      </main>

      {/* Footer combining Alright Reserved Year and Direct Contact Info */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-6 bg-white dark:bg-stone-900 text-xs text-stone-600 dark:text-stone-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span>© {new Date().getFullYear()} Appointmo. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
            <a href="tel:09052422821" className="flex items-center space-x-1.5 hover:text-stone-900 dark:hover:text-white transition">
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              <span>09052422821</span>
            </a>
            <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
            <a href="mailto:abdulsamadadzmani@gmail.com" className="flex items-center space-x-1.5 hover:text-stone-900 dark:hover:text-white transition">
              <Mail className="w-3.5 h-3.5 text-amber-500" />
              <span>abdulsamadadzmani@gmail.com</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
