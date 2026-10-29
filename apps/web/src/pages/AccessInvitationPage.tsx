import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const AccessInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res: any = await apiFetch('/access-requests/redeem', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim() }),
      });

      localStorage.setItem('appointmo_token', res.token);
      localStorage.setItem('appointmo_user', JSON.stringify(res.user));

      navigate('/book');
    } catch (err: any) {
      setError(err.message || 'Invalid, expired, or revoked invitation token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-6 h-6" />
        </div>

        <h1 className="text-xl font-bold text-center text-stone-900 mb-2">Accept Appointmo Invitation</h1>
        <p className="text-xs text-stone-500 text-center mb-6 leading-relaxed">
          Enter the invitation token sent by the product administrator after your access request was approved.
        </p>

        {error && (
          <div className="mb-4 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleRedeem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Invitation Token</label>
            <input
              type="text"
              required
              placeholder="e.g. inv_a1b2c3d4..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:border-stone-900 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full bg-stone-900 text-white font-medium py-3 rounded-xl hover:bg-stone-800 transition flex items-center justify-center space-x-2 text-sm shadow-sm disabled:opacity-50"
          >
            <span>{loading ? 'Validating...' : 'Enter Appointmo'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-stone-100 flex items-center justify-center space-x-2 text-xs text-stone-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protected session verified on backend</span>
        </div>
      </div>
    </div>
  );
};
