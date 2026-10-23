import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, Store, UserCheck, Shield, Sparkles, Building2, Phone, Mail, CheckCircle2, ChevronRight, Eye, EyeOff, ShieldAlert, Globe } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { LocationPicker } from '../components/LocationPicker';
import { SUPPORTED_COUNTRIES, getCountryByName, normalizePhoneNumber, formatFormalName, validateFullPhoneNumber, validateStrongPassword } from '../lib/countryConfig';
import { CountryPhoneInput } from '../components/CountryPhoneInput';
import { FormalNameFields } from '../components/FormalNameFields';

export const AdminLoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Mode: 'signin' or 'signup'
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);

  // Common credentials
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('Philippines');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    const modeParam = searchParams.get('mode');
    if (modeParam === 'signup' || modeParam === 'signin') {
      setAuthMode(modeParam);
    }
  }, [searchParams]);

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
          navigate('/customer/portal');
        } else {
          // Store / Business Admin
          const targetSlug = res.user.businessSlug || 'lumiere-beauty-studio';
          navigate(`/admin/dashboard?slug=${encodeURIComponent(targetSlug)}`);
        }
      } else {
        // Customer Sign Up: Validate requirements strictly
        if (!firstName.trim() || !lastName.trim()) {
          setError('First name and last name are required.');
          setLoading(false);
          return;
        }

        const phoneValidation = validateFullPhoneNumber(phone, selectedCountry, true);
        if (!phoneValidation.isValid) {
          setError(phoneValidation.error || 'Please provide a valid complete phone number.');
          setLoading(false);
          return;
        }

        const passVal = validateStrongPassword(password);
        if (!passVal.isValid) {
          setError(passVal.error || 'Please provide a strong password.');
          setLoading(false);
          return;
        }

        const fullName = formatFormalName({ firstName, middleName, lastName });
        const countryCfg = getCountryByName(selectedCountry);
        const normalizedPhone = normalizePhoneNumber(phone, countryCfg.code);

        const res: any = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: fullName,
            email: email.trim(),
            password,
            phone: normalizedPhone,
            country: selectedCountry,
          }),
        });

        // Clear all form input fields completely upon successful sign up
        setFirstName('');
        setMiddleName('');
        setLastName('');
        setPhone('');
        setPassword('');
        setEmail('');

        // If backend returned immediate token & user session, log in directly to customer portal!
        if (res.token && res.user) {
          localStorage.setItem('appointmo_token', res.token);
          localStorage.setItem('appointmo_user', JSON.stringify(res.user));
          navigate('/customer/portal');
          return;
        }

        setSuccessNotice(res.message || 'Account created successfully! Please sign in with your credentials.');
        setAuthMode('signin');
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
        <div className="w-full bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 sm:p-8 shadow-xl transition-all duration-300 max-w-lg">
          {/* Header & Mode Switcher */}
          <div className="mb-6 space-y-4">
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                {authMode === 'signin' ? 'Sign In to Appointmo' : 'Create an Account'}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                {authMode === 'signin' 
                  ? 'Access your appointments, store schedule, or admin console' 
                  : 'Register as a customer to manage and book appointments'}
              </p>
            </div>

            {/* Mode Switcher Pills (Sign In vs Sign Up) */}
            <div className="grid grid-cols-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setError(null);
                }}
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
                onClick={() => {
                  setAuthMode('signup');
                  setError(null);
                }}
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

          {successNotice && (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Success</p>
                <p className="mt-0.5 leading-relaxed">{successNotice}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* If Sign Up: ask for Formal Name, Country, and Phone */}
            {authMode === 'signup' && (
              <div className="space-y-3">
                <FormalNameFields
                  firstName={firstName}
                  middleName={middleName}
                  lastName={lastName}
                  onFirstNameChange={setFirstName}
                  onMiddleNameChange={setMiddleName}
                  onLastNameChange={setLastName}
                  required={true}
                  layout="stacked"
                />

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Country <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setPhone(''); // reset phone when switching countries for clean format
                      }}
                      className="w-full h-10 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    >
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.emojiFlag ? `${c.emojiFlag} ` : ''}{c.name} ({c.dialCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                        Mobile Phone <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className="text-[10px] text-stone-400">
                        Max {getCountryByName(selectedCountry).nationalPhoneLength} digits
                      </span>
                    </div>
                    <CountryPhoneInput
                      countryNameOrCode={selectedCountry}
                      value={phone}
                      onChange={(val) => setPhone(val)}
                      required
                    />
                  </div>
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
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 pr-11 rounded-xl border ${
                    authMode === 'signup' && password.length > 0 && !validateStrongPassword(password).isValid
                      ? 'border-amber-400 dark:border-amber-500 focus:border-amber-500'
                      : 'border-stone-300 dark:border-stone-700 focus:border-stone-900 dark:focus:border-amber-400'
                  } bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none`}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword((prev) => !prev);
                  }}
                  className="absolute right-2.5 z-10 p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 pointer-events-none" /> : <Eye className="w-4 h-4 pointer-events-none" />}
                </button>
              </div>

              {/* Password strength criteria indicator for Sign Up */}
              {authMode === 'signup' && (
                <div className="mt-2 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-[11px] space-y-1.5">
                  <div className="font-semibold text-stone-700 dark:text-stone-300">
                    Password Requirements:
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span className={password.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-400'}>
                      {password.length >= 8 ? '✓' : '○'} Min. 8 characters
                    </span>
                    <span className={/[A-Z]/.test(password) ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-400'}>
                      {/[A-Z]/.test(password) ? '✓' : '○'} Uppercase letter
                    </span>
                    <span className={/[a-z]/.test(password) ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-400'}>
                      {/[a-z]/.test(password) ? '✓' : '○'} Lowercase letter
                    </span>
                    <span className={/[0-9]/.test(password) ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-400'}>
                      {/[0-9]/.test(password) ? '✓' : '○'} One number (0-9)
                    </span>
                    <span className={/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-400'}>
                      {/[^A-Za-z0-9]/.test(password) ? '✓' : '○'} One special char
                    </span>
                  </div>
                  {password.length > 0 && !validateStrongPassword(password).isValid && (
                    <p className="text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                      {validateStrongPassword(password).error}
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !email.trim() ||
                !password ||
                (authMode === 'signup' &&
                  (!firstName.trim() ||
                    !lastName.trim() ||
                    !validateFullPhoneNumber(phone, selectedCountry, true).isValid ||
                    !validateStrongPassword(password).isValid))
              }
              className="w-full bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold py-3.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition text-xs shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>
                {loading
                  ? 'Processing...'
                  : authMode === 'signin'
                  ? 'Sign In'
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
                  onClick={() => {
                    setAuthMode('signup');
                    setError(null);
                  }}
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
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                  }}
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
