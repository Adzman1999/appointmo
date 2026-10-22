import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, Store, UserCheck, Shield, Sparkles, Building2, Phone, Mail, CheckCircle2, ChevronRight } from 'lucide-react';
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

  // Active Role tab: 'store' or 'customer'
  const initialRole = searchParams.get('role') === 'customer' ? 'customer' : 'store';
  const [role, setRole] = useState<'store' | 'customer'>(initialRole);

  // Common credentials
  const [email, setEmail] = useState('store@appointmo.demo');
  const [password, setPassword] = useState('Store2026!');
  const [name, setName] = useState('Lumière Store Manager');
  const [phone, setPhone] = useState('+63 905 242 2821');

  // Store Sign Up Details
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('Beauty & Wellness');
  const [city, setCity] = useState('Quezon City');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [openingHours, setOpeningHours] = useState('9:00 AM - 6:00 PM');
  const [socialHandle, setSocialHandle] = useState('@mystore');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switch Role helper
  const handleRoleChange = (newRole: 'store' | 'customer') => {
    setRole(newRole);
    setError(null);
    if (newRole === 'store') {
      setEmail('store@appointmo.demo');
      setPassword('Store2026!');
      setName('Lumière Store Manager');
      setPhone('+63 2 8999 0001');
    } else {
      setEmail('customer@appointmo.demo');
      setPassword('Customer2026!');
      setName('Demo Customer');
      setPhone('+63 905 242 2821');
    }
  };

  // Quick fill credential helper
  const handleQuickFill = (targetRole: 'store' | 'customer') => {
    setAuthMode('signin');
    handleRoleChange(targetRole);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === 'signin') {
        const res: any = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        localStorage.setItem('appointmo_token', res.token);
        localStorage.setItem('appointmo_user', JSON.stringify(res.user));

        if (res.user.role === 'platform_admin') {
          navigate('/admin/platform');
        } else if (res.user.role === 'customer') {
          navigate(`/manage?email=${encodeURIComponent(res.user.email)}`);
        } else {
          // Store / Business Admin
          const targetSlug = res.user.businessSlug || 'lumiere-beauty-studio';
          navigate(`/admin/dashboard?slug=${encodeURIComponent(targetSlug)}`);
        }
      } else {
        // Sign Up with Store Creation if role is store
        const res: any = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            role: role === 'store' ? 'business_admin' : 'customer',
            name: name.trim(),
            email: email.trim(),
            password,
            phone: phone.trim(),
            ...(role === 'store' ? {
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

        localStorage.setItem('appointmo_token', res.token);
        localStorage.setItem('appointmo_user', JSON.stringify(res.user));

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
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col justify-between text-stone-900 dark:text-stone-100 transition-colors">
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
        <div className="max-w-lg w-full bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-xl">
          {/* Header Role Selector Tabs */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {authMode === 'signin' ? 'Sign In to Appointmo' : 'Create an Account'}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {role === 'store' ? 'Manage your storefront, schedule & appointments' : 'Book, reschedule & track your appointment history'}
              </p>
            </div>

            <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  authMode === 'signup'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Role Segmented Controller */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-100 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 mb-6">
            <button
              type="button"
              onClick={() => handleRoleChange('store')}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition ${
                role === 'store'
                  ? 'bg-amber-400 text-stone-950 shadow'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Store Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('customer')}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition ${
                role === 'customer'
                  ? 'bg-amber-400 text-stone-950 shadow'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Customer</span>
            </button>
          </div>

          {/* Quick Demo Credentials Box */}
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Instant Demo Credentials</span>
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">Click to load</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('store')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  role === 'store' && authMode === 'signin'
                    ? 'border-amber-400 dark:border-amber-500 bg-white dark:bg-stone-900 shadow-sm'
                    : 'border-amber-200 dark:border-amber-800/80 bg-white/60 dark:bg-stone-850 hover:bg-white'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-stone-900 dark:text-stone-100 font-bold text-xs">
                  <Store className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Store Admin</span>
                </div>
                <div className="mt-1 text-[11px] font-mono text-stone-600 dark:text-stone-300 truncate">
                  store@appointmo.demo
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Pass: <span className="font-mono text-stone-700 dark:text-stone-300 font-semibold">Store2026!</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('customer')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  role === 'customer' && authMode === 'signin'
                    ? 'border-amber-400 dark:border-amber-500 bg-white dark:bg-stone-900 shadow-sm'
                    : 'border-amber-200 dark:border-amber-800/80 bg-white/60 dark:bg-stone-850 hover:bg-white'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-stone-900 dark:text-stone-100 font-bold text-xs">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Customer</span>
                </div>
                <div className="mt-1 text-[11px] font-mono text-stone-600 dark:text-stone-300 truncate">
                  customer@appointmo.demo
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Pass: <span className="font-mono text-stone-700 dark:text-stone-300 font-semibold">Customer2026!</span>
                </div>
              </button>
            </div>
          </div>

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
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
              />
            </div>

            {/* If Store Admin Sign Up: Instant Store Creation Details */}
            {authMode === 'signup' && role === 'store' && (
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
                  ? `Sign In as ${role === 'store' ? 'Store Admin' : 'Customer'}`
                  : `Create ${role === 'store' ? 'Store & Admin Account' : 'Customer Account'}`}
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
