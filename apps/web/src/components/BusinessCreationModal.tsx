import React, { useState } from 'react';
import { X, Building2, MapPin, AlertCircle, Phone, Mail, Clock, Globe, Instagram, Tag } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface BusinessCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBusiness: any) => void;
  initialData?: {
    name?: string;
    category?: string;
    description?: string;
    city?: string;
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
  const [createPhone, setCreatePhone] = useState('+63 2 8999 0001');
  const [createEmail, setCreateEmail] = useState('');
  const [createOpeningHours, setCreateOpeningHours] = useState('9:00 AM - 6:00 PM');
  const [createWebsite, setCreateWebsite] = useState('');
  const [createInstagram, setCreateInstagram] = useState('');

  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  if (!isOpen) return null;

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
          phone: createPhone.trim() || undefined,
          email: createEmail.trim() || undefined,
          openingHours: createOpeningHours.trim() || undefined,
          website: createWebsite.trim() || undefined,
          instagram: createInstagram.trim() || undefined,
        }),
      });

      // Update options locally
      if (!categoryOptions.includes(finalCategory)) {
        setCategoryOptions((prev) => [...prev, finalCategory]);
      }
      if (!cityOptions.includes(finalCity)) {
        setCityOptions((prev) => [...prev, finalCity]);
      }

      onSuccess(res.business);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create store');
    } finally {
      setCreatingBusiness(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto text-stone-900 dark:text-stone-100">
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
                <label className="block font-semibold text-stone-700 dark:text-stone-300">City / Location</label>
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

          {/* Store Contact & Address */}
          <div className="border-t border-stone-200 dark:border-stone-800 pt-3 space-y-3">
            <span className="font-semibold text-stone-800 dark:text-stone-200 block">Store Location &amp; Contact</span>
            
            <div>
              <label className="block text-stone-500 dark:text-stone-400 mb-1">Street Address</label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-500 dark:text-stone-400 mb-1">Operating Hours</label>
                <input
                  type="text"
                  placeholder="e.g. 9:00 AM - 7:00 PM"
                  value={createOpeningHours}
                  onChange={(e) => setCreateOpeningHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-stone-500 dark:text-stone-400 mb-1">Instagram Handle</label>
                <input
                  type="text"
                  placeholder="@yourstore_ph"
                  value={createInstagram}
                  onChange={(e) => setCreateInstagram(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>
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
      </div>
    </div>
  );
};
