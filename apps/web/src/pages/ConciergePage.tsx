import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, Calendar, Clock, User, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const ConciergePage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('I want a facial tomorrow afternoon under ₱1,500');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [extracted, setExtracted] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInquire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res: any = await apiFetch('/concierge', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });

      setRecommendations(res.recommendations || []);
      setExtracted(res.extractedPreferences || null);
    } catch (err: any) {
      setError(err.message || 'Concierge engine failed to interpret request.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    'I want a facial tomorrow afternoon under ₱1,500',
    'Relaxation massage this weekend under 1200',
    'Manicure and pedicure tomorrow morning',
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
              <h1 className="text-base font-bold text-stone-900">Appointmo Concierge</h1>
              <p className="text-xs text-stone-500">Natural-language recommendation engine with genuine availability</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/demo/book')}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 transition"
          >
            Switch to Quick Booking
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Inquire Box */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm mb-8">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            Describe what you need in plain English:
          </label>
          <form onSubmit={handleInquire} className="space-y-3">
            <div className="relative">
              <textarea
                rows={2}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. I need a relaxing massage tomorrow afternoon under ₱1,200"
                className="w-full p-3.5 pr-24 rounded-2xl border border-stone-300 text-sm focus:outline-none focus:border-stone-900 transition"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-3 bottom-3 bg-stone-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-stone-800 transition flex items-center space-x-1.5 shadow"
              >
                <span>{loading ? 'Analyzing...' : 'Find Matches'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-stone-400">Try asking:</span>
              {sampleQueries.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuery(sq)}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] transition"
                >
                  "{sq}"
                </button>
              ))}
            </div>
          </form>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-6 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Scored &amp; Validated Options ({recommendations.length})
              </h2>
              {extracted && (
                <span className="text-[11px] text-stone-500">
                  Target date: <span className="font-semibold text-stone-700">{extracted.targetDate}</span>
                </span>
              )}
            </div>

            <div className="space-y-4">
              {recommendations.map((rec, i) => {
                const timeStr = new Date(rec.slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={i} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:border-stone-300 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold mb-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{rec.matchScore}% Match Confidence</span>
                        </div>
                        <h3 className="text-lg font-bold text-stone-900">{rec.serviceName}</h3>
                        <p className="text-xs text-stone-500">{rec.category} • {rec.durationMinutes} minutes</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-stone-900">₱{rec.price}</span>
                      </div>
                    </div>

                    {/* Reasons list */}
                    <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 mb-4 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                        Why this was recommended:
                      </span>
                      {rec.matchReasons.map((reason: string, rIdx: number) => (
                        <div key={rIdx} className="text-xs text-stone-700 flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>

                    {/* Selected Slot Preview & Direct Book Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
                      <div className="flex items-center space-x-4 text-xs text-stone-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-semibold text-stone-800">{timeStr}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-stone-400" />
                          <span>{rec.staffName}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/demo/book')}
                        className="bg-stone-900 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-stone-800 transition flex items-center justify-center space-x-1.5"
                      >
                        <span>Select this Recommended Option</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
