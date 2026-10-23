import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, Mail, Sparkles, AlertCircle, Lock } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { FormalNameFields } from './FormalNameFields';
import { formatFormalName } from '../lib/countryConfig';

interface AccessGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: 'request' | 'login';
}

export const AccessGateModal: React.FC<AccessGateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'request',
}) => {
  const [tab, setTab] = useState<'request' | 'login'>(initialTab);

  // Request form state
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [message, setMessage] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Approved user login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setRequestError('First name and last name are required.');
      return;
    }
    if (!email.trim()) {
      setRequestError('Email address is required.');
      return;
    }

    setRequestLoading(true);
    setRequestError(null);
    setRequestSuccess(null);

    const formalFullName = formatFormalName({ firstName, middleName, lastName });

    try {
      const res: any = await apiFetch('/access/request', {
        method: 'POST',
        body: JSON.stringify({
          fullName: formalFullName,
          email: email.trim(),
          businessName: businessName.trim(),
          message: message.trim(),
          acceptedPrivacy: true,
        }),
      });

      setRequestSuccess(res.message || "Thanks for reaching out! We've received your request. You'll receive an email once approved.");
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setEmail('');
      setBusinessName('');
      setMessage('');
    } catch (err: any) {
      setRequestError(err.message || 'Unable to submit your request. Please check your information and try again.');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleApprovedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res: any = await apiFetch('/access/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      localStorage.setItem('appointmo_token', res.token);
      localStorage.setItem('appointmo_user', JSON.stringify(res.user));

      onSuccess();
    } catch (err: any) {
      setLoginError(err.message || 'Unable to sign in. Please verify your credentials or ensure your access is approved.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 sm:p-8 overflow-hidden text-stone-900 dark:text-stone-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-stone-900 dark:text-amber-400" />
            <span>Interactive Demo</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            {tab === 'request' ? 'Request Demo Access' : 'Sign In to Demo'}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            {tab === 'request'
              ? 'Tell us a bit about your business and we will approve your preview access promptly.'
              : 'Sign in with your approved account to explore the interactive appointment platform.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-stone-100 dark:bg-stone-800/80 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('request');
              setRequestError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              tab === 'request' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Request Access
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setLoginError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              tab === 'login' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Approved Sign In
          </button>
        </div>

        {/* TAB 1: REQUEST ACCESS */}
        {tab === 'request' && (
          <div>
            {requestSuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs space-y-3 animate-in fade-in">
                <div className="flex items-center space-x-2 font-bold text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Request Received</span>
                </div>
                <p className="text-xs leading-relaxed">{requestSuccess}</p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-xl transition text-xs shadow"
                  >
                    Already received your approval? Sign in
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-3.5 text-xs">
                {requestError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{requestError}</span>
                  </div>
                )}

                <FormalNameFields
                  firstName={firstName}
                  middleName={middleName}
                  lastName={lastName}
                  onFirstNameChange={setFirstName}
                  onMiddleNameChange={setMiddleName}
                  onLastNameChange={setLastName}
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
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Business Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rostova Hair Studio"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Message or Use Case (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Tell us what you're looking for..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={requestLoading || !firstName.trim() || !lastName.trim() || !email.trim()}
                  className="w-full bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold py-3 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition text-xs shadow disabled:opacity-50 flex items-center justify-center space-x-2 mt-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>{requestLoading ? 'Submitting...' : 'Submit Access Request'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: APPROVED USER SIGN IN */}
        {tab === 'login' && (
          <form onSubmit={handleApprovedLogin} className="space-y-4 text-xs">
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Approved Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition"
                />
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 transition"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading || !loginEmail || !loginPassword}
              className="w-full bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold py-3.5 rounded-xl hover:bg-stone-800 dark:hover:bg-amber-300 transition text-xs shadow disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>{loginLoading ? 'Signing in...' : 'Sign In to Interactive Demo'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setTab('request')}
                className="text-[11px] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition underline"
              >
                Haven't requested access yet? Submit a request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
