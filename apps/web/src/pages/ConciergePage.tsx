import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, ArrowRight, CheckCircle2, Calendar, Clock, 
  User, AlertCircle, HelpCircle, DollarSign, ShieldCheck 
} from 'lucide-react';
import { apiFetch } from '../lib/api';

export const ConciergePage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('I want a facial tomorrow afternoon under ₱1,500 suitable for sensitive skin');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [extracted, setExtracted] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Booking modal/step
  const [bookingRec, setBookingRec] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleInquire = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setBookingSuccess(null);

    try {
      const res: any = await apiFetch('/concierge', {
        method: 'POST',
        body: JSON.stringify({ query }),
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

    setBookingLoading(true);
    setBookingError(null);

    try {
      const res: any = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: bookingRec.serviceId,
          staffId: bookingRec.staffId,
          startTime: bookingRec.slot.startTime,
          customerName,
          customerEmail,
          customerPhone,
          notes: notes ? `[Concierge Note] ${notes}` : '[Concierge Recommendation]',
        }),
      });

      setBookingSuccess(res.booking);
      setBookingRec(null);
    } catch (err: any) {
      setBookingError(err.message || 'Could not complete booking. Slot may have been taken.');
    } finally {
      setBookingLoading(false);
    }
  };

  const sampleQueries = [
    'I want a facial tomorrow afternoon under ₱1,500 suitable for sensitive skin',
    'Relaxation massage this weekend under 1200',
    'Manicure and pedicure tomorrow morning',
    'Deep cleansing facial under ₱2,000 with extraction',
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Top Bar */}
      <div className="bg-white border-b border-stone-200 py-4 px-6 mb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-900">Concierge Booking</h1>
              <p className="text-xs text-stone-500">Intelligent service discovery matched against real synthetic availability</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/demo/book')}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 transition"
            >
              Switch to Quick Booking
            </button>
            <button
              onClick={() => navigate('/demo/admin')}
              className="text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition"
            >
              View in Admin Demo &rarr;
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-8">
        {/* Inquire Box */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm">
          <div className="mb-4">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Tell Us What You Need</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-stone-900">
              Help Me Find the Right Appointment
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              No need to browse our entire catalogue. Describe your goals, preferred date, budget, or preferences, and our concierge will recommend verified open slots.
            </p>
          </div>

          <form onSubmit={handleInquire} className="space-y-4">
            <div className="relative">
              <textarea
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. I want a facial tomorrow afternoon under ₱1,500 suitable for sensitive skin"
                className="w-full p-4 pr-24 rounded-2xl border border-stone-300 text-sm focus:outline-none focus:border-stone-900 transition leading-relaxed"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-3 bottom-4 bg-stone-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-stone-800 transition flex items-center space-x-1.5 shadow disabled:opacity-50"
              >
                <span>{loading ? 'Analyzing...' : 'Find Matches'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-stone-400 font-medium">Try asking:</span>
              {sampleQueries.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuery(sq);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] transition text-left"
                >
                  "{sq}"
                </button>
              ))}
            </div>
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Booking Completed Card */}
        {bookingSuccess && (
          <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-4 animate-in fade-in shadow-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <h3 className="text-lg font-bold">Appointment Confirmed via Concierge!</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your appointment is recorded directly in PostgreSQL. You can verify it right now on the Admin Demo dashboard.
            </p>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-xs space-y-2 font-mono">
              <div>Booking Reference: <strong className="text-stone-900 font-bold">{bookingSuccess.bookingReference}</strong></div>
              <div>Service: <span className="text-stone-800">{bookingRec?.serviceName || 'Confirmed Service'}</span></div>
              <div>Price: <span className="text-stone-800">₱{bookingSuccess.priceSnapshot}</span></div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigate(`/manage?ref=${bookingSuccess.bookingReference}&token=${bookingSuccess.managementToken}`)}
                className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 transition shadow"
              >
                Manage My Booking &rarr;
              </button>
              <button
                onClick={() => navigate('/demo/admin')}
                className="px-4 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 text-xs font-semibold hover:bg-stone-50 transition"
              >
                View on Admin Demo Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Extracted preferences pill */}
        {extracted && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 bg-stone-100 p-3 rounded-2xl border border-stone-200">
            <span className="font-semibold text-stone-800">Interpreted Goal:</span>
            {extracted.budget && <span className="px-2 py-0.5 rounded-full bg-white border border-stone-200 font-medium">Budget: &le; ₱{extracted.budget}</span>}
            <span className="px-2 py-0.5 rounded-full bg-white border border-stone-200 font-medium">Target Date: {extracted.targetDate}</span>
            <span className="px-2 py-0.5 rounded-full bg-white border border-stone-200 font-medium">Time Frame: {extracted.timeOfDay}</span>
            {extracted.sensitiveSkin && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">Sensitive Skin Care</span>}
          </div>
        )}

        {/* Recommendation Cards */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-600">
                Recommended Options ({recommendations.length} Matches)
              </h3>
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Live availability verified
              </span>
            </div>

            <div className="space-y-4">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm hover:border-stone-400 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[11px] font-semibold mb-1.5">
                        <span>{rec.category}</span>
                        <span>•</span>
                        <span>{rec.durationMinutes} mins</span>
                      </div>
                      <h4 className="text-lg font-bold text-stone-900">{rec.serviceName}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-stone-900">₱{rec.price.toLocaleString()}</div>
                      <div className="text-[11px] text-stone-400">Guaranteed rate</div>
                    </div>
                  </div>

                  {/* Explainable reasons */}
                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 mb-5 text-xs space-y-1.5">
                    <div className="font-semibold text-stone-800 text-[11px] uppercase tracking-wider">
                      Why this option matches:
                    </div>
                    {rec.matchReasons.map((r: string, rIdx: number) => (
                      <div key={rIdx} className="flex items-center space-x-2 text-stone-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>

                  {/* Slot Details & Action */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-stone-100">
                    <div className="flex items-center space-x-4 text-xs text-stone-600 w-full sm:w-auto">
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
                      className="w-full sm:w-auto bg-stone-900 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-stone-800 transition flex items-center justify-center space-x-2 shadow"
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
              Closest Available Alternatives
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {alternatives.map((alt, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-stone-200 text-xs space-y-2">
                  <div className="font-bold text-stone-900 text-sm">{alt.serviceName}</div>
                  <div className="text-stone-600">₱{alt.price} • {alt.durationMinutes} mins</div>
                  <div className="text-stone-500">Slot: {new Date(alt.slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with {alt.staffName}</div>
                  <button
                    onClick={() => setBookingRec(alt)}
                    className="w-full mt-2 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold transition"
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
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Confirm Concierge Booking</h3>
            <p className="text-xs text-stone-500 mb-4">
              Enter your synthetic customer contact info to confirm this demo appointment.
            </p>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 mb-4 text-xs space-y-1">
              <div className="font-semibold text-stone-800">{bookingRec.serviceName}</div>
              <div className="text-stone-500">₱{bookingRec.price} • Specialist: {bookingRec.staffName}</div>
              <div className="text-stone-500">
                Time: {new Date(bookingRec.slot.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmBooking} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+63 900 000 0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Special Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Any allergies or preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900 transition resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingRec(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading || !customerName || !customerEmail || !customerPhone}
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
