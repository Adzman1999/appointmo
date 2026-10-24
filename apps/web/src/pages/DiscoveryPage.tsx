import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, MapPin, Sparkles, Filter, Building2, Star, 
  Clock, ArrowRight, ChevronRight, Phone, ShieldCheck, Map as MapIcon, List 
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { BusinessLogo } from '../components/BusinessLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { DemoTopNav } from '../components/DemoTopNav';

interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  locationDescription?: string;
}

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  currency: string;
  logoUrl?: string | null;
  branchCount: number;
  serviceCount: number;
  minPrice: number;
  maxPrice: number;
  rating: number;
  reviewCount: number;
  branches: Branch[];
}

export const DiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedBranch, setSelectedBranch] = useState<{ biz: Business; branch: Branch } | null>(null);

  // Fetch categories on load
  useEffect(() => {
    apiFetch<{ categories: string[] }>('/categories')
      .then(res => setCategories(res.categories || []))
      .catch(console.error);
  }, []);

  // Fetch businesses when category or search changes
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory);
    }
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }

    apiFetch<{ businesses: Business[] }>(`/businesses?${params.toString()}`)
      .then(res => {
        setBusinesses(res.businesses || []);
        if (res.businesses.length > 0 && res.businesses[0].branches.length > 0) {
          setSelectedBranch({ biz: res.businesses[0], branch: res.businesses[0].branches[0] });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategory, searchQuery]);

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    const next = new URLSearchParams(searchParams);
    if (cat === 'all') next.delete('category');
    else next.set('category', cat);
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchQuery.trim()) next.set('search', searchQuery.trim());
    else next.delete('search');
    setSearchParams(next);
  };

  // Extract all branches for Map View
  const allBranches = businesses.flatMap(b => b.branches.map(br => ({ biz: b, branch: br })));

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-24 transition-colors">
      {/* Top Segmented Navigation Bar */}
      <DemoTopNav currentRole="customer" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <AppointmoLogo size="md" subtitle="Discovery Directory" />
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={() => navigate('/manage')}
              className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
            >
              Manage My Booking
            </button>
            <button
              onClick={() => navigate('/demo/concierge')}
              className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold px-3.5 py-1.5 rounded-xl text-xs hover:bg-amber-200 dark:hover:bg-amber-900/80 transition flex items-center space-x-1.5 shadow-sm border border-amber-200 dark:border-amber-800"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Concierge Finder</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Search & Header */}
      <section className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 py-10 sm:py-14 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
            <span>Discover Verified Service Businesses Across Metro Manila</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Find and book appointments with top-rated local providers.
          </h1>

          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xl mx-auto">
            Browse genuine schedules for clinics, wellness salons, animal healthcare, and professional consultancies.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto flex items-center gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search by business name, specialty, or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold px-5 py-3 rounded-2xl hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow"
            >
              Search
            </button>
          </form>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => handleCategorySelect('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedCategory === 'all'
                  ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Controls Bar: Results count & Map/List Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {businesses.length} {businesses.length === 1 ? 'Business' : 'Businesses'} Found
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Showing real synthetic business catalogues and active branch locations.
            </p>
          </div>

          {/* Toggle View */}
          <div className="inline-flex p-1 bg-stone-200 dark:bg-stone-800 rounded-2xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-stone-900 dark:border-stone-100 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-stone-500 dark:text-stone-400">Loading business directory...</p>
          </div>
        ) : businesses.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto text-stone-500 dark:text-stone-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">No businesses match your criteria</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Try adjusting your search keyword or clearing the category filter to see available demo providers.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setSearchParams({});
              }}
              className="bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* List Mode */
          <div className="space-y-3">
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Stores are ordered by their average customer rating; review count breaks ties.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {businesses.map((biz) => (
              <div
                key={biz.id}
                className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 shadow-sm hover:border-stone-400 dark:hover:border-stone-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start space-x-3">
                      <BusinessLogo
                        name={biz.name}
                        category={biz.category}
                        logoUrl={biz.logoUrl}
                        size="md"
                        className="mt-0.5"
                      />
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                          {biz.category}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{biz.name}</h3>
                          {biz.reviewCount >= 3 && Number(biz.rating) >= 4.5 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <Star className="h-3 w-3 fill-current" /> Top Rated
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${biz.reviewCount ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800' : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border border-stone-200 dark:border-stone-700'}`}>
                      <Star className={`w-3.5 h-3.5 ${biz.reviewCount ? 'fill-amber-500 text-amber-500' : 'text-stone-400'}`} />
                      {biz.reviewCount ? <><span>{biz.rating}</span><span className="text-stone-400 dark:text-stone-500 font-normal">({biz.reviewCount})</span></> : <span>No reviews</span>}
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed mb-4">
                    {biz.description}
                  </p>

                  {/* Store location preview */}
                  <div className="space-y-1 mb-4 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                    <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                      <span>{biz.branches[0]?.address ? `${biz.branches[0].address}, ${biz.branches[0].city}` : (biz.branches[0]?.city || 'Metro Manila')}</span>
                    </div>
                  </div>

                  {/* Service pricing & count */}
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <span>{biz.serviceCount} Services Available</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      ₱{biz.minPrice} – ₱{biz.maxPrice}
                    </span>
                  </div>
                </div>

                <div className="pt-6 flex gap-2">
                  <button
                    onClick={() => navigate(`/demo/book?slug=${biz.slug}`)}
                    className="flex-1 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold py-3 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow flex items-center justify-center space-x-1.5"
                  >
                    <span>Book Appointment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => navigate(`/demo/concierge?business=${biz.slug}`)}
                    className="px-3 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/80 transition text-xs font-semibold"
                    title="Concierge Match"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </button>
                </div>
              </div>
            ))}
            </div>
          </div>
        ) : (
          /* Map View: Interactive Synthetic Map Display with Synchronized Sidebar */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Canvas / Grid Representation */}
            <div className="lg:col-span-2 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-3xl p-6 min-h-[480px] flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between bg-white/90 dark:bg-stone-800/90 backdrop-blur-md p-3 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm z-10">
                <div className="flex items-center space-x-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>Fictional Metro Manila Demonstration Map</span>
                </div>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                  Coordinates Verified (QC, Makati, BGC, Ortigas)
                </span>
              </div>

              {/* Synthetic Map Coordinate Markers Layout */}
              <div className="relative w-full h-80 my-4 bg-stone-200/60 dark:bg-stone-800/60 rounded-2xl border border-stone-300/80 dark:border-stone-700/80 p-6 flex flex-wrap items-center justify-around gap-4">
                {allBranches.map((item, idx) => (
                  <button
                    key={item.branch.id}
                    onClick={() => setSelectedBranch(item)}
                    className={`p-3 rounded-2xl border transition text-left max-w-[200px] shadow-sm transform hover:-translate-y-0.5 ${
                      selectedBranch?.branch.id === item.branch.id
                        ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 border-stone-900 dark:border-amber-400 ring-4 ring-stone-900/10'
                        : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:border-stone-500 dark:hover:border-stone-500'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1">
                      <div className={`w-2 h-2 rounded-full ${selectedBranch?.branch.id === item.branch.id ? 'bg-amber-400 dark:bg-stone-950' : 'bg-rose-500'}`} />
                      <span className="text-[10px] font-bold uppercase truncate">{item.biz.category}</span>
                    </div>
                    <div className="font-bold text-xs leading-snug line-clamp-1">{item.biz.name}</div>
                    <div className={`text-[10px] truncate mt-0.5 ${selectedBranch?.branch.id === item.branch.id ? 'text-stone-300 dark:text-stone-800' : 'text-stone-500 dark:text-stone-400'}`}>
                      {item.branch.city}
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-stone-500 dark:text-stone-400 text-center bg-white/80 dark:bg-stone-800/80 p-2 rounded-xl border border-stone-200 dark:border-stone-700">
                Click any fictional pin or branch card to view live service offerings and booking options.
              </div>
            </div>

            {/* Selected Branch Details Sidebar */}
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm flex flex-col justify-between">
              {selectedBranch ? (
                <div className="space-y-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                      {selectedBranch.biz.category}
                    </span>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{selectedBranch.biz.name}</h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">{selectedBranch.biz.description}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-stone-900 dark:text-stone-100">{selectedBranch.branch.name}</div>
                        <div className="text-stone-500 dark:text-stone-400">{selectedBranch.branch.address}</div>
                        {selectedBranch.branch.locationDescription && (
                          <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">{selectedBranch.branch.locationDescription}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>{selectedBranch.branch.phone}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                    <div className="font-semibold text-stone-900 dark:text-stone-100">Pricing &amp; Booking Rules:</div>
                    <div>• Services from <strong>₱{selectedBranch.biz.minPrice}</strong> to ₱{selectedBranch.biz.maxPrice}</div>
                    <div className="flex items-center space-x-1.5">
                      <span>• Customer reviews:</span>
                      {selectedBranch.biz.reviewCount ? <><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /><strong>{selectedBranch.biz.rating}</strong><span>({selectedBranch.biz.reviewCount})</span></> : <span>No reviews yet</span>}
                    </div>
                    <div>• Zero registration required for instant booking.</div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <button
                      onClick={() => navigate(`/demo/book?slug=${selectedBranch.biz.slug}&branchId=${selectedBranch.branch.id}`)}
                      className="w-full bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold py-3 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow flex items-center justify-center space-x-2"
                    >
                      <span>Book at this Branch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate(`/demo/concierge?business=${selectedBranch.biz.slug}`)}
                      className="w-full bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold py-2.5 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/80 transition flex items-center justify-center space-x-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Concierge Recommendations</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-xs text-stone-400">
                  Select a branch pin on the map to preview services and book.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
