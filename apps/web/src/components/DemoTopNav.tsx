import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck } from 'lucide-react';

interface DemoTopNavProps {
  currentRole: 'customer' | 'admin';
  onResetComplete?: () => void;
}

export const DemoTopNav: React.FC<DemoTopNavProps> = ({ currentRole }) => {
  const navigate = useNavigate();

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

        {/* Action Controls: Role Switcher */}
        <div className="flex items-center space-x-2">
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
