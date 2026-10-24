import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Building2, MapPin, AlertCircle, Phone, Mail, Clock, Globe, Tag, Sparkles, CheckCircle2, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { SUPPORTED_COUNTRIES, getCountryByName, getCurrencySymbol, normalizePhoneNumber, formatFormalName, validateFullPhoneNumber, validateStrongPassword } from '../lib/countryConfig';
import { CountryPhoneInput } from './CountryPhoneInput';
import { FormalNameFields } from './FormalNameFields';

interface BusinessCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBusiness: any) => void;
  initialData?: {
    name?: string;
    tagline?: string;
    category?: string;
    description?: string;
    city?: string;
    services?: Array<{ name: string; price: number; duration: string }>;
  };
}

export const BusinessCreationModal: React.FC<BusinessCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState(initialData?.name || '');
  const [createTagline, setCreateTagline] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([
    'Beauty & Wellness',
    'Dental Services',
    'Veterinary Services',
    'Professional Consultations',
    'Automotive & Detailing',
    'Health & Fitness',
  ]);
  const [createCategory, setCreateCategory] = useState(initialData?.category || 'Beauty & Wellness');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const [createDescription, setCreateDescription] = useState(initialData?.description || '');
  const [createLogoUrl, setCreateLogoUrl] = useState('');

  // Store Owner / Administrator Details
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerMiddleName, setOwnerMiddleName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Store Location & Contact Details
  const defaultCountryCfg = getCountryByName('Philippines');
  const [selectedCountry, setSelectedCountry] = useState('Philippines');
  const [selectedCurrency, setSelectedCurrency] = useState('PHP');
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Manila');
  const [createStateProvince, setCreateStateProvince] = useState(defaultCountryCfg.defaultState || 'Metro Manila');
  const [createPostalCode, setCreatePostalCode] = useState('');

  const [cityOptions, setCityOptions] = useState<string[]>(defaultCountryCfg.cities || [
    'Quezon City',
    'Makati',
    'Taguig / BGC',
    'Pasig / Ortigas',
  ]);
  const [createCity, setCreateCity] = useState(initialData?.city || defaultCountryCfg.defaultCity || 'Quezon City');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createLatitude, setCreateLatitude] = useState<number | undefined>(undefined);
  const [createLongitude, setCreateLongitude] = useState<number | undefined>(undefined);
  const [createPhone, setCreatePhone] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createStartTime, setCreateStartTime] = useState('09:00');
  const [createEndTime, setCreateEndTime] = useState('18:00');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [createWebsite, setCreateWebsite] = useState('');
  const [createSocialHandle, setCreateSocialHandle] = useState('');

  // Handle Country selection change: automatically update currency, timezone, dial code, cities list, and state
  const handleCountryChange = (countryName: string) => {
    setSelectedCountry(countryName);
    const cfg = getCountryByName(countryName);
    setSelectedCurrency(cfg.currency);
    setSelectedTimezone(cfg.defaultTimezone);

    // Sync state/province if empty or previously at default
    if (cfg.defaultState) {
      setCreateStateProvince(cfg.defaultState);
    }

    // Do not autofill contact phone with fake numbers; keep empty or let user input according to country format
    // Smart sync cities list to this country
    if (cfg.cities && cfg.cities.length > 0) {
      setCityOptions(cfg.cities);
      setCreateCity(cfg.defaultCity || cfg.cities[0]);
      setIsCustomCity(false);
      setCustomCityInput('');
    } else if (cfg.defaultCity) {
      setCityOptions([cfg.defaultCity]);
      setCreateCity(cfg.defaultCity);
      setIsCustomCity(false);
    }
  };

  // Validate start and end time
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

  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submittedStoreNotice, setSubmittedStoreNotice] = useState<{
    business: any;
    message: string;
  } | null>(null);

  // Stepped wizard state: 1 = Owner Admin Account, 2 = Brand & Identity, 3 = Location, Contact & Hours
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Sync state whenever initialData or modal open status changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setCreateName(initialData.name || '');
        setCreateTagline(initialData.tagline || '');
        setCreateCategory(initialData.category || 'Beauty & Wellness');
        setCreateDescription(initialData.description || '');
        if (initialData.city) setCreateCity(initialData.city);
      } else {
        setCreateName('');
        setCreateTagline('');
        setCreateCategory('Beauty & Wellness');
        setCreateDescription('');
      }
      setCreateError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Format 24-hr time string (e.g. "09:00", "18:00") into friendly display e.g. "9:00 AM - 6:00 PM"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setCreatingBusiness(true);
    setCreateError(null);

    const finalCategory = isCustomCategory ? customCategoryInput.trim() : createCategory.trim();
    if (!finalCategory) {
      setCreateError('Please specify a category for this store');
      setCreatingBusiness(false);
      return;
    }

    const finalCity = isCustomCity ? customCityInput.trim() : createCity.trim();
    if (!finalCity) {
      setCreateError('Please specify a city / location for this store');
      setCreatingBusiness(false);
      return;
    }

    if (!ownerFirstName.trim() || !ownerLastName.trim()) {
      setCreateError('Please provide the store owner first name and last name');
      setCreatingBusiness(false);
      return;
    }

    if (!ownerEmail.trim()) {
      setCreateError('Please provide an owner email address');
      setCreatingBusiness(false);
      return;
    }

    const passVal = validateStrongPassword(ownerPassword);
    if (!passVal.isValid) {
      setCreateError(passVal.error || 'Please provide a strong admin password.');
      setCreatingBusiness(false);
      return;
    }

    if (ownerPassword !== ownerConfirmPassword) {
      setCreateError('Passwords do not match. Please verify your confirm password.');
      setCreatingBusiness(false);
      return;
    }

    // Phone validation if entered
    if (createPhone.trim()) {
      const phoneVal = validateFullPhoneNumber(createPhone, selectedCountry, false);
      if (!phoneVal.isValid) {
        setCreateError(phoneVal.error || 'Please provide a valid contact phone number.');
        setCreatingBusiness(false);
        return;
      }
    }

    if (!validateTimeRange(createStartTime, createEndTime)) {
      setCreateError('Opening time must be earlier than closing time.');
      setCreatingBusiness(false);
      return;
    }

    const formattedOpeningHours = formatTimeRange(createStartTime, createEndTime);
    const finalOwnerName = formatFormalName({
      firstName: ownerFirstName,
      middleName: ownerMiddleName,
      lastName: ownerLastName,
    });

    try {
      const res: any = await apiFetch('/demo/admin/create-business', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          category: finalCategory,
          tagline: createTagline.trim() || undefined,
          description: createDescription.trim() || undefined,
          currency: selectedCurrency,
          timezone: selectedTimezone,
          logoUrl: createLogoUrl.trim() || undefined,
          ownerName: finalOwnerName,
          ownerEmail: (ownerEmail || createEmail).trim() || undefined,
          ownerPassword: ownerPassword.trim(),
          country: selectedCountry,
          stateProvince: createStateProvince.trim() || undefined,
          postalCode: createPostalCode.trim() || undefined,
          city: finalCity,
          address: createAddress.trim() || undefined,
          latitude: createLatitude,
          longitude: createLongitude,
          phone: createPhone.trim() ? normalizePhoneNumber(createPhone, getCountryByName(selectedCountry).code) : undefined,
          email: (ownerEmail || createEmail).trim() || undefined,
          openingHours: formattedOpeningHours,
          website: createWebsite.trim() || undefined,
          socialHandle: createSocialHandle.trim() || undefined,
          instagram: createSocialHandle.trim() || undefined,
        }),
      });

      // Update options locally
      if (!categoryOptions.includes(finalCategory)) {
        setCategoryOptions((prev) => [...prev, finalCategory]);
      }
      if (!cityOptions.includes(finalCity)) {
        setCityOptions((prev) => [...prev, finalCity]);
      }

      setSubmittedStoreNotice({
        business: res.business,
        message: res.message || 'Your store is successfully created! Please wait 1 to 2 business days for review and approval before full access is granted.',
      });

      // Clear all form inputs after successful creation
      setCreateName('');
      setCreateTagline('');
      setCreateDescription('');
      setCreateLogoUrl('');
      setOwnerFirstName('');
      setOwnerMiddleName('');
      setOwnerLastName('');
      setOwnerEmail('');
      setOwnerPassword('');
      setCreateStateProvince('');
      setCreatePostalCode('');
      setCreateAddress('');
      setCreatePhone('');
      setCreateEmail('');
      setCreateWebsite('');
      setCreateSocialHandle('');
      setCustomCategoryInput('');
      setCustomCityInput('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create store');
    } finally {
      setCreatingBusiness(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-2xl sm:max-w-3xl w-full shadow-2xl max-h-[92vh] overflow-y-auto text-stone-900 dark:text-stone-100">
        {submittedStoreNotice ? (
          <div className="text-center py-6 sm:py-8 space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                Store Successfully Created!
              </h3>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 py-1.5 px-3.5 rounded-full inline-block">
                Status: Pending Approval &amp; Verification
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-stone-800/60 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 max-w-lg mx-auto text-left text-xs space-y-3">
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-700 pb-2">
                <span className="text-stone-600 dark:text-stone-300 font-medium">Store Name:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{submittedStoreNotice.business?.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-700 pb-2">
                <span className="text-stone-600 dark:text-stone-300 font-medium">Category:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{submittedStoreNotice.business?.category}</span>
              </div>
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-700 pb-2">
                <span className="text-stone-600 dark:text-stone-300 font-medium">Contact Email:</span>
                <span className="font-mono text-stone-800 dark:text-stone-200">{createEmail.trim() || 'Provided in store form'}</span>
              </div>
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                <strong>Notice:</strong> Your store is successfully created! Please allow <strong>1 to 2 business days</strong> for review and verification. Once approved, you can sign in directly with your email and password.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const targetEmail = createEmail.trim();
                  setSubmittedStoreNotice(null);
                  onClose();
                  navigate(`/admin/login?mode=signin${targetEmail ? `&email=${encodeURIComponent(targetEmail)}` : ''}`);
                }}
                className="bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold px-6 py-2.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow text-xs flex items-center space-x-2"
              >
                <span>Done, Go to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Launch Your Own Store</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Set up your brand identity, business hours &amp; contact info</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {createError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs mb-4 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Step Progress Wizard Header */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              onClick={() => setWizardStep(1)}
              className={`py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition font-bold ${
                wizardStep === 1
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-[11px] flex items-center justify-center">1</span>
              <span className="hidden sm:inline">Owner Account</span>
            </button>
            <button
              type="button"
              onClick={() => setWizardStep(2)}
              className={`py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition font-bold ${
                wizardStep === 2
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-[11px] flex items-center justify-center">2</span>
              <span className="hidden sm:inline">Store Brand</span>
            </button>
            <button
              type="button"
              onClick={() => setWizardStep(3)}
              className={`py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition font-bold ${
                wizardStep === 3
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-[11px] flex items-center justify-center">3</span>
              <span className="hidden sm:inline">Location & Hours</span>
            </button>
          </div>

          {/* Chunk / Step 1: Store Owner & Administrator Credentials */}
          {wizardStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-amber-50/60 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold text-amber-950 dark:text-amber-200 text-sm">
                    Step 1: Owner &amp; Administrator Account
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
                  Create your primary administrator account to sign in and manage store operations.
                </p>
                <div className="space-y-3">
                  <FormalNameFields
                    firstName={ownerFirstName}
                    middleName={ownerMiddleName}
                    lastName={ownerLastName}
                    onFirstNameChange={setOwnerFirstName}
                    onMiddleNameChange={setOwnerMiddleName}
                    onLastNameChange={setOwnerLastName}
                    required={true}
                    labels={{
                      first: 'Owner First Name',
                      middle: 'Owner Middle Name / Initial',
                      last: 'Owner Last Name',
                    }}
                  />

                  <div className="pt-1">
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Owner Email / Sign-In <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="owner@yourstore.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Admin Password <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          placeholder="Min. 8 characters"
                          value={ownerPassword}
                          onChange={(e) => setOwnerPassword(e.target.value)}
                          className={`w-full pl-3 pr-10 py-2 rounded-xl border ${
                            ownerPassword.length > 0 && !validateStrongPassword(ownerPassword).isValid
                              ? 'border-amber-400 dark:border-amber-500 focus:border-amber-500'
                              : 'border-stone-300 dark:border-stone-700 focus:border-stone-900 dark:focus:border-amber-400'
                          } bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none transition-colors`}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowPassword((prev) => !prev);
                          }}
                          className="absolute right-2 z-10 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5 pointer-events-none" /> : <Eye className="w-3.5 h-3.5 pointer-events-none" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Confirm Admin Password <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Re-enter password"
                          value={ownerConfirmPassword}
                          onChange={(e) => setOwnerConfirmPassword(e.target.value)}
                          className={`w-full pl-3 pr-10 py-2 rounded-xl border ${
                            ownerConfirmPassword.length > 0 && ownerConfirmPassword !== ownerPassword
                              ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500'
                              : ownerConfirmPassword.length > 0 && ownerConfirmPassword === ownerPassword
                              ? 'border-emerald-500 dark:border-emerald-400'
                              : 'border-stone-300 dark:border-stone-700 focus:border-stone-900 dark:focus:border-amber-400'
                          } bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none transition-colors`}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowConfirmPassword((prev) => !prev);
                          }}
                          className="absolute right-2 z-10 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition cursor-pointer"
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5 pointer-events-none" /> : <Eye className="w-3.5 h-3.5 pointer-events-none" />}
                        </button>
                      </div>
                      {ownerConfirmPassword.length > 0 && ownerConfirmPassword !== ownerPassword && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                          Passwords do not match.
                        </p>
                      )}
                      {ownerConfirmPassword.length > 0 && ownerConfirmPassword === ownerPassword && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                          ✓ Passwords match.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password strength criteria indicator (matches sign up) */}
                  <div className="mt-2 p-3 bg-stone-100/80 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 text-[11px] space-y-1.5">
                    <div className="font-semibold text-stone-700 dark:text-stone-300">
                      Password Requirements:
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span className={ownerPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-400'}>
                        {ownerPassword.length >= 8 ? '✓' : '○'} Min. 8 characters
                      </span>
                      <span className={/[A-Z]/.test(ownerPassword) ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-400'}>
                        {/[A-Z]/.test(ownerPassword) ? '✓' : '○'} Uppercase letter
                      </span>
                      <span className={/[a-z]/.test(ownerPassword) ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-400'}>
                        {/[a-z]/.test(ownerPassword) ? '✓' : '○'} Lowercase letter
                      </span>
                      <span className={/[0-9]/.test(ownerPassword) ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-400'}>
                        {/[0-9]/.test(ownerPassword) ? '✓' : '○'} One number (0-9)
                      </span>
                      <span className={/[^A-Za-z0-9]/.test(ownerPassword) ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-400'}>
                        {/[^A-Za-z0-9]/.test(ownerPassword) ? '✓' : '○'} One special char
                      </span>
                    </div>
                    {ownerPassword.length > 0 && !validateStrongPassword(ownerPassword).isValid && (
                      <p className="text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                        {validateStrongPassword(ownerPassword).error}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={
                    !ownerFirstName.trim() || 
                    !ownerLastName.trim() || 
                    !ownerEmail.trim() || 
                    !validateStrongPassword(ownerPassword).isValid ||
                    ownerPassword !== ownerConfirmPassword
                  }
                  onClick={() => setWizardStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow flex items-center space-x-2 disabled:opacity-40"
                >
                  <span>Next: Store Brand</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Chunk / Step 2: Store Identity & Branding */}
          {wizardStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-stone-50/70 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3.5">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                    Step 2: Store Brand &amp; Identity
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Store / Business Name <span className="text-rose-500 font-bold">* (Required)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lumina Hair &amp; Nail Lounge, Zen Dental Studio"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Tagline / Catchphrase <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Your Premier Sanctuary for Holistic Wellness &amp; Style"
                    value={createTagline}
                    onChange={(e) => setCreateTagline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-stone-700 dark:text-stone-300">
                      Category <span className="text-rose-500 font-bold">* (Required)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
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
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="w-full h-10 px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    />
                  ) : (
                    <select
                      value={createCategory}
                      onChange={(e) => setCreateCategory(e.target.value)}
                      className="w-full h-10 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
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
                    Logo / Store Cover URL <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://images.unsplash.com/... or image link"
                    value={createLogoUrl}
                    onChange={(e) => setCreateLogoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Store Description <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Briefly describe what services, atmosphere, or specialties your store provides..."
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>

                {/* Country & Currency Setting */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Country <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => handleCountryChange(e.target.value)}
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
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Store Currency <span className="text-stone-400 font-normal">(Auto-synced)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${selectedCurrency} (${getCurrencySymbol(selectedCurrency).trim()})`}
                      className="w-full h-10 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!createName.trim() || (isCustomCategory ? !customCategoryInput.trim() : !createCategory)}
                  onClick={() => setWizardStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow flex items-center space-x-2 disabled:opacity-40"
                >
                  <span>Next: Location & Hours</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Chunk / Step 3: Physical Location, Contact & Operating Hours */}
          {wizardStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-stone-50/70 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3.5">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                    Step 3: Location &amp; Contact Details
                  </span>
                </div>

                {/* City Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-stone-700 dark:text-stone-300">
                      City / Municipality <span className="text-rose-500 font-bold">* (Required)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCity(!isCustomCity);
                        setCustomCityInput('');
                      }}
                      className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline"
                    >
                      {isCustomCity ? 'Choose List' : '+ Add Custom City'}
                    </button>
                  </div>
                  {isCustomCity ? (
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Cebu City, Davao City"
                      value={customCityInput}
                      onChange={(e) => setCustomCityInput(e.target.value)}
                      className="w-full h-10 px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    />
                  ) : (
                    <select
                      value={createCity}
                      onChange={(e) => setCreateCity(e.target.value)}
                      className="w-full h-10 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    >
                      {cityOptions.map((c, i) => (
                        <option key={i} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Province / State <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Metro Manila, Cebu, California"
                      value={createStateProvince}
                      onChange={(e) => setCreateStateProvince(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Postal / ZIP Code <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1100, 6000, 90210"
                      value={createPostalCode}
                      onChange={(e) => setCreatePostalCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Detailed Street Address / Unit / Mall Level <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Level 2, Grand Promenade Mall, 88 Commercial Ave"
                    value={createAddress}
                    onChange={(e) => setCreateAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>

                {/* Contact phone & Store inquiry email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Contact Phone <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <CountryPhoneInput
                      countryNameOrCode={selectedCountry}
                      value={createPhone}
                      onChange={(val) => setCreatePhone(val)}
                      placeholder={getCountryByName(selectedCountry).code === 'PH' ? '905 242 2821' : undefined}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Store Email (Inquiries) <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="contact@yourstore.com"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                    <span className="font-bold text-stone-900 dark:text-stone-100">Daily Operating Hours</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Opening Time <span className="text-rose-500 font-bold">*</span>
                      </span>
                      <input
                        type="time"
                        required
                        value={createStartTime}
                        onChange={(e) => {
                          setCreateStartTime(e.target.value);
                          validateTimeRange(e.target.value, createEndTime);
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border ${
                          timeError ? 'border-rose-400 bg-rose-50/30' : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800'
                        } text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400`}
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Closing Time <span className="text-rose-500 font-bold">*</span>
                      </span>
                      <input
                        type="time"
                        required
                        value={createEndTime}
                        onChange={(e) => {
                          setCreateEndTime(e.target.value);
                          validateTimeRange(createStartTime, e.target.value);
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border ${
                          timeError ? 'border-rose-400 bg-rose-50/30' : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800'
                        } text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400`}
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
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  Back
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      creatingBusiness ||
                      !createName.trim() ||
                      !ownerFirstName.trim() ||
                      !ownerLastName.trim() ||
                      !ownerEmail.trim() ||
                      !validateStrongPassword(ownerPassword).isValid ||
                      ownerPassword !== ownerConfirmPassword ||
                      (createPhone.trim() ? !validateFullPhoneNumber(createPhone, selectedCountry, false).isValid : false) ||
                      timeError !== null
                    }
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow disabled:opacity-50"
                  >
                    {creatingBusiness ? 'Setting up Store...' : 'Launch Store'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
        </>
        )}
      </div>
    </div>
  );
};
