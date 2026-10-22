import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, AlertCircle, Phone, Mail, Clock, Globe, Tag, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { LocationPicker } from './LocationPicker';

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

  // Store Location & Contact Details
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
  const [createCity, setCreateCity] = useState(initialData?.city || 'Quezon City');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createLatitude, setCreateLatitude] = useState<number | undefined>(undefined);
  const [createLongitude, setCreateLongitude] = useState<number | undefined>(undefined);
  const [createPhone, setCreatePhone] = useState('+63 2 8999 0001');
  const [createEmail, setCreateEmail] = useState('');
  const [createStartTime, setCreateStartTime] = useState('09:00');
  const [createEndTime, setCreateEndTime] = useState('18:00');
  const [createWebsite, setCreateWebsite] = useState('');
  const [createSocialHandle, setCreateSocialHandle] = useState('');

  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submittedStoreNotice, setSubmittedStoreNotice] = useState<{
    business: any;
    message: string;
  } | null>(null);

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

    const formattedOpeningHours = formatTimeRange(createStartTime, createEndTime);

    try {
      const res: any = await apiFetch('/demo/admin/create-business', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          category: finalCategory,
          tagline: createTagline.trim() || undefined,
          description: createDescription.trim() || undefined,
          logoUrl: createLogoUrl.trim() || undefined,
          city: finalCity,
          address: createAddress.trim() || undefined,
          latitude: createLatitude,
          longitude: createLongitude,
          phone: createPhone.trim() || undefined,
          email: createEmail.trim() || undefined,
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
        message: res.message || 'Your store is successfully created! Please wait 1 to 2 business days for Super Admin approval before full access is granted.',
      });
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
                Status: Pending Super Admin Approval
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
                <strong>Notice:</strong> Your store is successfully created! Please wait <strong>1 to 2 business days</strong> for the Super Admin to review and fully approve your store. A confirmation email and login instructions have been sent to your email address.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const biz = submittedStoreNotice.business;
                  setSubmittedStoreNotice(null);
                  onSuccess(biz);
                }}
                className="bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-bold px-6 py-2.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow text-xs flex items-center space-x-1.5"
              >
                <span>Proceed to Store</span>
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Store Name & Tagline */}
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Store / Business Name <span className="text-rose-500">*</span>
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
              Tagline / Catchphrase (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Your Premier Sanctuary for Holistic Wellness &amp; Style"
              value={createTagline}
              onChange={(e) => setCreateTagline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-stone-700 dark:text-stone-300">Category</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(!isCustomCategory);
                    setCustomCategoryInput('');
                  }}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline"
                >
                  {isCustomCategory ? 'Choose Existing' : '+ Add New'}
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
                  className="w-full px-3 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              ) : (
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                >
                  {categoryOptions.map((cat, i) => (
                    <option key={i} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* City / Primary Location */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1">
                  <label className="block font-semibold text-stone-700 dark:text-stone-300">City / Location</label>
                  {initialData?.city && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-md">
                      AI Suggested
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCity(!isCustomCity);
                    setCustomCityInput('');
                  }}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline"
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
                  className="w-full px-3 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              ) : (
                <select
                  value={createCity}
                  onChange={(e) => setCreateCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                >
                  {cityOptions.map((c, i) => (
                    <option key={i} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Logo / Store Cover URL (Optional — auto-generates branded fallback if empty)
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
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Store Description</label>
            <textarea
              rows={2}
              placeholder="Briefly describe what services, atmosphere, or specialties your store provides..."
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
            />
          </div>

          {/* Suggested Sample Services from Concierge (if generated) */}
          {initialData?.services && initialData.services.length > 0 && (
            <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Suggested Initial Services to Provision:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {initialData.services.map((s, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-200/80 dark:border-amber-900/40 text-stone-900 dark:text-stone-100 text-[11px]">
                    <div className="font-bold truncate">{s.name}</div>
                    <div className="flex justify-between text-stone-600 dark:text-stone-400 text-[10px] mt-0.5">
                      <span>{s.duration}</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-300">₱{s.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Store Contact & Address */}
          <div className="border-t border-stone-200 dark:border-stone-800 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-800 dark:text-stone-200 block">Store Location &amp; Map Pin</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Interactive Map Search &amp; Pinning</span>
            </div>

            {/* Real Map Search & Interactive Pin Placement */}
            <div>
              <LocationPicker
                initialLat={14.5547}
                initialLng={121.0244}
                onLocationSelect={(loc) => {
                  setCreateLatitude(loc.lat);
                  setCreateLongitude(loc.lng);
                  if (loc.address) {
                    setCreateAddress(loc.address);
                  }
                  if (loc.city && !cityOptions.includes(loc.city)) {
                    setCityOptions(prev => [...prev, loc.city!]);
                    setCreateCity(loc.city);
                  } else if (loc.city) {
                    setCreateCity(loc.city);
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-stone-500 dark:text-stone-400 mb-1">
                Street Address / Unit / Mall Level (Auto-filled from pin or enter manually)
              </label>
              <input
                type="text"
                placeholder="e.g. Level 2, Grand Promenade Mall, 88 Commercial Ave"
                value={createAddress}
                onChange={(e) => setCreateAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-500 dark:text-stone-400 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+63 2 8999 0001"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-stone-500 dark:text-stone-400 mb-1">Store Email (Optional)</label>
                <input
                  type="email"
                  placeholder="contact@yourstore.demo"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>
            </div>

            {/* Operating Hours as Start Time & End Time */}
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Operating Hours (Daily Opening &amp; Closing)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block mb-0.5">Opening Time</span>
                  <input
                    type="time"
                    required
                    value={createStartTime}
                    onChange={(e) => setCreateStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block mb-0.5">Closing Time</span>
                  <input
                    type="time"
                    required
                    value={createEndTime}
                    onChange={(e) => setCreateEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-500 dark:text-stone-400 mb-1">Social Media Handle (Any Platform)</label>
                <input
                  type="text"
                  placeholder="e.g. @yourstore, fb.com/yourstore, or tiktok.com/@store"
                  value={createSocialHandle}
                  onChange={(e) => setCreateSocialHandle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-stone-500 dark:text-stone-400 mb-1">Website URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://yourstore.ph"
                  value={createWebsite}
                  onChange={(e) => setCreateWebsite(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
            <strong>Instant Store Setup:</strong> Upon creation, Appointmo automatically configures an initial consultation service, lead specialist, and standard working hours so you can immediately begin scheduling and managing appointments for this store.
          </div> */}

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingBusiness || !createName.trim()}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow disabled:opacity-50"
            >
              {creatingBusiness ? 'Setting up Store...' : 'Launch Store'}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
};
