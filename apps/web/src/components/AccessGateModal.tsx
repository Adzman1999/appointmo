import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, KeyRound, Mail, Sparkles, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface AccessGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: 'request' | 'verify';
}

export const AccessGateModal: React.FC<AccessGateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'verify',
}) => {
  const [tab, setTab] = useState<'request' | 'verify'>(initialTab);

  // Passcode verification state
  const [passcode, setPasscode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Request form state (optional backup)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [message, setMessage] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError(null);

    try {
      const res: any = await apiFetch('/access/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          code: passcode.trim(),
        }),
      });

      localStorage.setItem('appointmo_token', res.token);
      localStorage.setItem('appointmo_user', JSON.stringify(res.user));

      onSuccess();
    } catch (err: any) {
      setVerifyError(err.message || 'Incorrect or expired access code.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestLoading(true);
    setRequestError(null);
    setRequestSuccess(null);

    try {
      const res: any = await apiFetch('/access/request', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          businessName,
          message,
          acceptedPrivacy: true,
        }),
      });

      setRequestSuccess(
        res.message || "Thanks for reaching out! We've received your request. You'll receive an email when your access is ready."
      );
    } catch (err: any) {
      setRequestError(err.message || 'Unable to submit your request. Please try again.');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-stone-900" />
            <span>Interactive Demo</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">Enter Access Code</h2>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Input your access code below to enter the interactive read-only demonstration.
          </p>
        </div>

        {/* Primary Passcode Verification Form */}
        {tab === 'verify' && (
          <form onSubmit={handleVerifyPasscode} className="space-y-4 text-xs">
            {verifyError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-stone-700 mb-1.5">Access Code</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. APPOINTMO-DEMO or your 6-digit code"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-stone-300 text-sm font-mono tracking-wider focus:outline-none focus:border-stone-900 transition"
                />
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              </div>
              <div className="mt-2 text-[11px] text-stone-400 flex items-center justify-between">
                <span>Try instant code: <button type="button" onClick={() => setPasscode('APPOINTMO-DEMO')} className="font-mono text-stone-700 font-semibold underline">APPOINTMO-DEMO</button></span>
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyLoading || !passcode}
              className="w-full bg-stone-900 text-white font-semibold py-3.5 rounded-xl hover:bg-stone-800 transition text-xs shadow disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>{verifyLoading ? 'Verifying...' : 'Enter Interactive Demo'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setTab('request')}
                className="text-[11px] text-stone-500 hover:text-stone-900 transition underline"
              >
                Don't have a code? Request an invitation
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Request Access Form (Secondary) */}
        {tab === 'request' && (
          <div>
            {requestSuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3 animate-in fade-in">
                <div className="flex items-center space-x-2 font-bold text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Request Received</span>
                </div>
                <p className="text-xs leading-relaxed">{requestSuccess}</p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setTab('verify')}
                    className="w-full bg-emerald-800 text-white font-semibold py-2.5 rounded-xl text-xs hover:bg-emerald-900 transition flex items-center justify-center space-x-1.5"
                  >
                    <span>Back to Enter Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-3.5 text-xs">
                {requestError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{requestError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria Clara"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Business Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Clara Aesthetics"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-stone-900 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={requestLoading}
                  className="w-full mt-2 bg-stone-900 text-white font-semibold py-3 rounded-xl hover:bg-stone-800 transition text-xs shadow disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>{requestLoading ? 'Sending Request...' : 'Send Request'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setTab('verify')}
                    className="text-[11px] text-stone-500 hover:text-stone-900 transition"
                  >
                    ← Already have a code?
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
