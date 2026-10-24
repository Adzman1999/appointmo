import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Sparkles, ArrowRight, CheckCircle2, Calendar, Clock, 
  User, AlertCircle, HelpCircle, DollarSign, ShieldCheck,
  Building2, Award, Zap, ThumbsUp
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AppointmoLogo } from '../components/AppointmoLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { DemoTopNav } from '../components/DemoTopNav';
import { FormalNameFields } from '../components/FormalNameFields';
import { CountryPhoneInput } from '../components/CountryPhoneInput';
import { formatFormalName, parseFormalName, validateFullPhoneNumber, normalizePhoneNumber, getCountryByName } from '../lib/countryConfig';

export const ConciergePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slugParam = searchParams.get('slug') || 'lumiere-beauty-studio';

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>(slugParam);
  const [query, setQuery] = useState('I want a facial tomorrow afternoon under ₱1,500 suitable for sensitive skin');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [extracted, setExtracted] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Booking modal/step
  const [bookingRec, setBookingRec] = useState<any | null>(null);
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerMiddleName, setCustomerMiddleName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-fill from logged-in customer account
    const storedUserRaw = localStorage.getItem('appointmo_user');
    if (storedUserRaw) {
      try {
        const u = JSON.parse(storedUserRaw);
        if (u.name && !customerFirstName) {
          const parsed = parseFormalName(u.name);
          setCustomerFirstName(parsed.firstName);
          setCustomerMiddleName(parsed.middleName || '');
          setCustomerLastName(parsed.lastName);
        }
        if (u.email && !customerEmail) setCustomerEmail(u.email);
        if (u.phone && !customerPhone) setCustomerPhone(u.phone);
      } catch (_) {}
    }

    apiFetch('/demo/admin/businesses')
      .then((res: any) => {
        const list = res.businesses || [];
        setBusinesses(list);
        if (list.length > 0) {
          // If the current selectedSlug is not in the list or is hardcoded default, set to first available store
          const found = list.some((b: any) => b.slug === slugParam);
          if (found) {
            setSelectedSlug(slugParam);
          } else {
            setSelectedSlug(list[0].slug);
          }
        }
      })
      .catch((err) => console.error(err));
  }, [slugParam]);

  const handleInquire = async (e?: React.FormEvent, customQuery?: string, customSlug?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery !== undefined ? customQuery : query;
    const activeTargetSlug = customSlug || selectedSlug;
    if (!activeQuery.trim()) return;

    setLoading(true);
    setError(null);
    setBookingSuccess(null);

    try {
      const res: any = await apiFetch(`/concierge?slug=${encodeURIComponent(activeTargetSlug)}`, {
        method: 'POST',
        body: JSON.stringify({ query: activeQuery }),
      });

      setRecommendations(res.recommendations || []);
      setAlternatives(res.alternatives || []);
      setExtracted(res.extractedPreferences || null);
    } catch (err: any) {
      setError(err.message || 'Concierge engine failed to interpret request.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingRec) return;

    if (!customerFirstName.trim() || !customerLastName.trim()) {
      setBookingError('First name and last name are required.');
      return;
    }

    if (!customerEmail.trim()) {
      setBookingError('Email address is required.');
      return;
    }

    const phoneVal = validateFullPhoneNumber(customerPhone, 'Philippines', true);
    if (!phoneVal.isValid) {
      setBookingError(phoneVal.error || 'Please provide a valid complete phone number.');
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    const formalFullName = formatFormalName({
      firstName: customerFirstName,
      middleName: customerMiddleName,
      lastName: customerLastName,
    });
    const normalizedPhone = normalizePhoneNumber(customerPhone, 'PH');

    try {
      const res: any = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: bookingRec.serviceId,
          staffId: bookingRec.staffId,
          startTime: bookingRec.slot.startTime,
          customerName: formalFullName,
          customerEmail: customerEmail.trim(),
          customerPhone: normalizedPhone,
          notes: notes ? `[Concierge Note] ${notes.trim()}` : '[Concierge Recommendation]',
        }),
      });

      setBookingSuccess(res.booking);
      setBookingRec(null);
      // Clear fields upon booking completion
      setCustomerFirstName('');
      setCustomerMiddleName('');
      setCustomerLastName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setNotes('');
    } catch (err: any) {
      setBookingError(err.message || 'Could not complete booking. Slot may have been taken.');
    } finally {
      setBookingLoading(false);
    }
  };

  const sampleQueries = [
    { text: 'I want a facial tomorrow afternoon under ₱1,500 suitable for sensitive skin', slug: 'lumiere-beauty-studio' },
    { text: 'Teeth cleaning and whitening tomorrow morning under ₱3,500', slug: 'apex-dental-ortho' },
    { text: 'Comprehensive veterinary checkup and vaccination for my puppy', slug: 'paws-whiskers-clinic' },
    { text: 'Corporate contract and intellectual property legal consultation', slug: 'vanguard-legal-advisory' },
    { text: 'Relaxation massage this weekend under ₱1,500', slug: 'lumiere-beauty-studio' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-20 transition-colors">
      {/* Top Segmented Navigation Bar */}
      <DemoTopNav currentRole="customer" />

      {/* Top Bar */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 py-4 px-6 mb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <AppointmoLogo size="sm" showText={false} />
            </div>

            <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 hidden sm:block"></div>

            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">Explainable Concierge Booking</h1>
                <p className="text-xs text-stone-500 dark:text-stone-400">Multi-business appointment recommendation engine with live slot checking</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={() => navigate('/browse')}
              className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              Browse Directory
            </button>
            <button
              onClick={() => navigate('/demo/book')}
              className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              Quick Booking
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-8">
        {/* Inquire Box */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Conversational Assistant</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                Help Me Find the Right Appointment
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Tell us your goals, budget, or preferred schedule. Concierge matches against actual provider catalogues and availability.
              </p>
            </div>

            {/* Business Scope Selector */}
            <div className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-2.5 shrink-0">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-400 mb-1">
                Target Business
              </label>
              <div className="flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <select
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-stone-800 dark:text-stone-200 pr-1 py-0.5 focus:outline-none cursor-pointer"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.slug} className="dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <form onSubmit={(e) => handleInquire(e)} className="space-y-4">
            <div className="relative">
              <textarea
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. I want a facial tomorrow afternoon under ₱1,500 suitable for sensitive skin"
                className="w-full p-4 pr-24 rounded-2xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition leading-relaxed"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-3 bottom-4 bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition flex items-center space-x-1.5 shadow disabled:opacity-50"
              >
                <span>{loading ? 'Analyzing...' : 'Find Matches'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-stone-400 font-medium">Try asking:</span>
              {sampleQueries.map((sq, i) => {
                const targetBizSlug = businesses.length > 0 ? (businesses.find(b => b.slug === sq.slug)?.slug || selectedSlug || businesses[0].slug) : sq.slug;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(sq.text);
                      setSelectedSlug(targetBizSlug);
                      handleInquire(undefined, sq.text, targetBizSlug);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-900 dark:hover:text-amber-200 transition text-[11px]"
                  >
                    {sq.text.length > 40 ? sq.text.substring(0, 40) + '...' : sq.text}
                  </button>
                );
              })}
            </div>
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Booking Completed Card */}
        {bookingSuccess && (
          <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-4 animate-in fade-in shadow-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h3 className="text-lg font-bold">Appointment Confirmed via Concierge!</h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Your appointment is recorded directly in PostgreSQL. You can verify it right now on the Admin Demo dashboard.
            </p>
            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-700 text-xs space-y-2 font-mono">
              <div>Booking Reference: <strong className="text-stone-900 dark:text-stone-100 font-bold">{bookingSuccess.bookingReference}</strong></div>
              <div>Service: <span className="text-stone-800 dark:text-stone-200">{bookingRec?.serviceName || 'Confirmed Service'}</span></div>
              <div>Price: <span className="text-stone-800 dark:text-stone-200">₱{bookingSuccess.priceSnapshot}</span></div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigate(`/manage?ref=${bookingSuccess.bookingReference}&token=${bookingSuccess.managementToken}`)}
                className="px-4 py-2 rounded-xl bg-emerald-800 dark:bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-900 dark:hover:bg-emerald-500 transition shadow"
              >
                Manage My Booking &rarr;
              </button>
              <button
                onClick={() => navigate('/demo/admin')}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-700 transition"
              >
                View on Admin Demo Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Extracted preferences pill */}
        {extracted && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800/80 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
            <span className="font-semibold text-stone-800 dark:text-stone-100">Interpreted Goal:</span>
            {extracted.budget && <span className="px-2 py-0.5 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-medium">Budget: &le; ₱{extracted.budget}</span>}
            <span className="px-2 py-0.5 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-medium">Target Date: {extracted.targetDate}</span>
            <span className="px-2 py-0.5 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-medium">Time Frame: {extracted.timeOfDay}</span>
            {extracted.sensitiveSkin && <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium">Sensitive Skin Care</span>}
          </div>
        )}

        {/* Recommendation Cards */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                Recommended Options ({recommendations.length} Matches)
              </h3>
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Live availability verified
              </span>
            </div>

            <div className="space-y-4">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm hover:border-stone-400 dark:hover:border-stone-700 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[11px] font-semibold">
                          <span>{rec.category}</span>
                          <span>•</span>
                          <span>{rec.durationMinutes} mins</span>
                        </div>
                        {rec.badge && (
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            rec.badge === 'Best Match' 
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700' 
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                          }`}>
                            {rec.badge === 'Best Match' && <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                            {rec.badge === 'Top Value' && <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                            <span>{rec.badge}</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-stone-900 dark:text-stone-100">{rec.serviceName}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-stone-900 dark:text-stone-100">₱{rec.price.toLocaleString()}</div>
                      <div className="text-[11px] text-stone-400">Guaranteed rate</div>
                    </div>
                  </div>

                  {/* Explainable reasons */}
                  <div className="bg-stone-50 dark:bg-stone-800/60 rounded-2xl p-4 border border-stone-200/80 dark:border-stone-700/80 mb-5 text-xs space-y-1.5">
                    <div className="font-semibold text-stone-800 dark:text-stone-200 text-[11px] uppercase tracking-wider">
                      Why this option matches:
                    </div>
                    {rec.matchReasons.map((r: string, rIdx: number) => (
                      <div key={rIdx} className="flex items-center space-x-2 text-stone-700 dark:text-stone-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>

                  {/* Slot Details & Action */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center space-x-4 text-xs text-stone-600 dark:text-stone-300 w-full sm:w-auto">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-4 h-4 text-stone-400" />
                        <span>{new Date(rec.slot.startTime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-stone-400" />
                        <span>
                          {new Date(rec.slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <User className="w-4 h-4 text-stone-400" />
                        <span>{rec.staffName}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setBookingRec(rec);
                        setBookingError(null);
                      }}
                      className="w-full sm:w-auto bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition flex items-center justify-center space-x-2 shadow"
                    >
                      <span>Book Recommended Slot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternatives (if any) */}
        {alternatives.length > 0 && recommendations.length < 2 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Closest Available Alternatives
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {alternatives.map((alt, i) => (
                <div key={i} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs space-y-2">
                  <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">{alt.serviceName}</div>
                  <div className="text-stone-600 dark:text-stone-300">₱{alt.price} • {alt.durationMinutes} mins</div>
                  <div className="text-stone-500 dark:text-stone-400">Slot: {new Date(alt.slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with {alt.staffName}</div>
                  <button
                    onClick={() => setBookingRec(alt)}
                    className="w-full mt-2 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold transition"
                  >
                    Select Alternative
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {bookingRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 sm:p-7 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">Confirm Concierge Booking</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Enter your synthetic customer contact info to confirm this demo appointment.
            </p>

            <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 mb-4 text-xs space-y-1">
              <div className="font-semibold text-stone-800 dark:text-stone-200">{bookingRec.serviceName}</div>
              <div className="text-stone-500 dark:text-stone-400">₱{bookingRec.price} • Specialist: {bookingRec.staffName}</div>
              <div className="text-stone-500 dark:text-stone-400">
                Time: {new Date(bookingRec.slot.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs mb-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmBooking} className="space-y-3 text-xs">
              <FormalNameFields
                firstName={customerFirstName}
                middleName={customerMiddleName}
                lastName={customerLastName}
                onFirstNameChange={setCustomerFirstName}
                onMiddleNameChange={setCustomerMiddleName}
                onLastNameChange={setCustomerLastName}
                required={true}
                labels={{
                  first: 'First Name',
                  middle: 'Middle Initial / Name',
                  last: 'Last Name',
                }}
              />

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Email Address <span className="text-rose-500 font-bold">* (Required)</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-stone-700 dark:text-stone-300">
                    Phone Number <span className="text-rose-500 font-bold">* (Required)</span>
                  </label>
                  <span className="text-[10px] text-stone-400">
                    +63 • Max 10 digits
                  </span>
                </div>
                <CountryPhoneInput
                  countryNameOrCode="Philippines"
                  value={customerPhone}
                  onChange={(val) => setCustomerPhone(val)}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Special Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Any allergies or preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingRec(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    bookingLoading ||
                    !customerFirstName.trim() ||
                    !customerLastName.trim() ||
                    !customerEmail.trim() ||
                    !validateFullPhoneNumber(customerPhone, 'Philippines', true).isValid
                  }
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition shadow disabled:opacity-50"
                >
                  {bookingLoading ? 'Reserving...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
