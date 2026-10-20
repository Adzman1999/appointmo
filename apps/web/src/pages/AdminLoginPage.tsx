import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@appointmo.demo');
  const [password, setPassword] = useState('AppointmoAdmin2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res: any = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('appointmo_token', res.token);
      localStorage.setItem('appointmo_user', JSON.stringify(res.user));

      if (res.user.role === 'platform_admin') {
        navigate('/admin/platform');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5" />
        </div>

        <h1 className="text-xl font-bold text-center text-stone-900 mb-1">Administrative Login</h1>
        <p className="text-xs text-stone-500 text-center mb-6">
          Access the business dashboard or platform demo requests review.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 text-white font-semibold py-3 rounded-xl hover:bg-stone-800 transition text-xs shadow flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-100 text-[11px] text-stone-400 space-y-1">
          <p className="font-semibold text-stone-600">Demo Accounts Available:</p>
          <p>• Platform Admin: <span className="font-mono text-stone-700">admin@appointmo.demo</span> / <span className="font-mono text-stone-700">AppointmoAdmin2026!</span></p>
          <p>• Salon Owner: <span className="font-mono text-stone-700">owner@lumiere.demo</span> / <span className="font-mono text-stone-700">Lumiere2026!</span></p>
        </div>
      </div>
    </div>
  );
};
