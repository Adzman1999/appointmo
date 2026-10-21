import React, { useState } from 'react';
import { X, Building2, MapPin, AlertCircle } from 'lucide-react';
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
    branchName?: string;
  };
}

export const BusinessCreationModal: React.FC<BusinessCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [createName, setCreateName] = useState(initialData?.name || '');
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
  const [createBranchName, setCreateBranchName] = useState(initialData?.branchName || '');

  // Dynamic Locations
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
  const [createBranchCity, setCreateBranchCity] = useState(initialData?.city || 'Quezon City');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const [createBranchAddress, setCreateBranchAddress] = useState('');
  const [createBranchPhone, setCreateBranchPhone] = useState('+63 2 8999 0001');
  const [createLatitude, setCreateLatitude] = useState('');
  const [createLongitude, setCreateLongitude] = useState('');

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
      setCreateError('Please specify a category for this business');
      setCreatingBusiness(false);
      return;
    }

    const finalCity = isCustomCity ? customCityInput.trim() : createBranchCity.trim();
    if (!finalCity) {
      setCreateError('Please specify a city / location for this branch');
      setCreatingBusiness(false);
      return;
    }

    try {
      const res: any = await apiFetch('/demo/admin/create-business', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          category: finalCategory,
          description: createDescription.trim(),
          logoUrl: createLogoUrl.trim() || undefined,
          branchName: createBranchName.trim() || undefined,
          branchCity: finalCity,
          branchAddress: createBranchAddress.trim() || undefined,
          branchPhone: createBranchPhone.trim() || undefined,
          latitude: createLatitude ? parseFloat(createLatitude) : undefined,
          longitude: createLongitude ? parseFloat(createLongitude) : undefined,
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
      setCreateError(err.message || 'Failed to create business');
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
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Launch Your Own Business</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Configure appointment calendar, services &amp; branch details</p>
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
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Business Name <span className="text-rose-500">*</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category Selection with Add New Category */}
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

            {/* City / Location Selection with Add Custom Location */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-stone-700 dark:text-stone-300">Location / City</label>
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
                  value={createBranchCity}
                  onChange={(e) => setCreateBranchCity(e.target.value)}
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
              Logo / Avatar URL (Optional — auto-generates branded fallback if empty)
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
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Business Description</label>
            <textarea
              rows={2}
              placeholder="Briefly describe what services or specialties this business provides..."
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
            />
          </div>

          <div className="border-t border-stone-200 dark:border-stone-800 pt-3">
            <span className="font-semibold text-stone-800 dark:text-stone-200 block mb-2">Initial Branch Location</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-500 dark:text-stone-400 mb-1">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Flagship Branch"
                  value={createBranchName}
                  onChange={(e) => setCreateBranchName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-stone-500 dark:text-stone-400 mb-1">Branch Phone</label>
                <input
                  type="text"
                  placeholder="+63 2 8999 0001"
                  value={createBranchPhone}
                  onChange={(e) => setCreateBranchPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-stone-500 dark:text-stone-400 mb-1">Street Address</label>
              <input
                type="text"
                placeholder="e.g. 88 Commercial Ave, Level 2"
                value={createBranchAddress}
                onChange={(e) => setCreateBranchAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-stone-500 dark:text-stone-400 mb-1">Latitude (Optional)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 14.5547"
                  value={createLatitude}
                  onChange={(e) => setCreateLatitude(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-stone-500 dark:text-stone-400 mb-1">Longitude (Optional)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 121.0244"
                  value={createLongitude}
                  onChange={(e) => setCreateLongitude(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
            <strong>Instant Studio Setup:</strong> Upon creation, Appointmo automatically seeds an initial active service, certified lead practitioner, and Monday-Saturday working hours so you can immediately begin managing and booking appointments for this business.
          </div>

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
              {creatingBusiness ? 'Configuring Business...' : 'Launch Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
