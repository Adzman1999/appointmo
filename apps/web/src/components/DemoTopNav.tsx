import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, UserCheck, Sparkles, Building2, RotateCcw } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { toast } from 'sonner';

interface DemoTopNavProps {
  currentRole: 'customer' | 'admin';
  onResetComplete?: () => void;
}

export const DemoTopNav: React.FC<DemoTopNavProps> = ({ currentRole, onResetComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [resetting, setResetting] = useState(false);

  const handleGlobalReset = async () => {
    if (!window.confirm('Reset all demo data? This will restore original synthetic bookings, services, and clear custom test data.')) {
      return;
    }

    setResetting(true);
    try {
      await apiFetch('/demo/admin/reset', { method: 'POST' });
      localStorage.removeItem('appointmo_latest_booking');
      toast.success('Demo Data Reset', {
        description: 'All appointments and synthetic records have been restored to initial state.'
      });
      if (onResetComplete) {
        onResetComplete();
      } else {
        // Reload current page to refresh state cleanly
        window.location.reload();
      }
    } catch (err: any) {
      toast.error('Reset Failed', { description: err.message || 'Could not reset dataset.' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-stone-900 text-stone-300 py-2.5 px-4 sm:px-6 border-b border-stone-800 text-xs select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Current Context Pill & Explanation */}
        <div className="flex items-center space-x-2.5 text-stone-300">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
          <span className="font-semibold text-white">Interactive Demo:</span>
          {currentRole === 'customer' ? (
            <span className="text-stone-300">
              Customer Experience • Self-service booking, discovery &amp; appointment history.
            </span>
          ) : (
            <span className="text-stone-300">
              Business Admin Studio • Schedule coordination, status approvals &amp; real-time feed.
            </span>
          )}
        </div>

        {/* Action Controls: Global Reset Button & Role Switcher */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleGlobalReset}
            disabled={resetting}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-stone-700 bg-stone-800/80 text-stone-300 hover:text-white hover:bg-stone-700/80 transition text-xs font-semibold shadow-sm disabled:opacity-50"
            title="Reset all synthetic appointments and demo records to initial state"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting...' : 'Reset Data'}</span>
          </button>

          {/* Clean Segmented Switcher Control */}
          <div className="flex items-center bg-stone-950/80 p-1 rounded-xl border border-stone-800 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (currentRole !== 'customer') {
                  navigate('/browse');
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                currentRole === 'customer'
                  ? 'bg-amber-400 text-stone-950 shadow-sm font-bold'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Customer View</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentRole !== 'admin') {
                  navigate('/demo/admin');
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                currentRole === 'admin'
                  ? 'bg-amber-400 text-stone-950 shadow-sm font-bold'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Business Admin View</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
