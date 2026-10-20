import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, KeyRound, RefreshCw, LogOut, Mail, Send, AlertTriangle, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const OwnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ pending: 0, approved: 0, rejected: 0, revoked: 0, all: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Modal confirm action
  const [pendingAction, setPendingAction] = useState<{ type: 'approve' | 'resend' | 'reject' | 'revoke'; request: any } | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const url = filter === 'all' ? '/owner/requests' : `/owner/requests?status=${filter}`;
      const res: any = await apiFetch(url);
      setRequests(res.requests || []);
      if (res.counts) setCounts(res.counts);
    } catch (err: any) {
      if (err.message?.includes('authorization') || err.message?.includes('expired') || err.message?.includes('Owner')) {
        navigate('/admin/login');
      } else {
        setErrorNotice(err.message || 'Failed to load access requests');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleExecuteAction = async () => {
    if (!pendingAction) return;
    const { type, request } = pendingAction;

    setActionProcessing(true);
    setNotice(null);
    setErrorNotice(null);

    try {
      const res: any = await apiFetch(`/owner/requests/${request.id}/${type}`, { method: 'POST' });
      setNotice(res.message);
      setPendingAction(null);
      fetchRequests();
    } catch (err: any) {
      setErrorNotice(err.message || `Failed to ${type} request`);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('appointmo_token');
    localStorage.removeItem('appointmo_user');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-stone-100 pb-20 text-stone-900">
      {/* Top Header */}
      <div className="bg-stone-900 text-white py-4 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-sm tracking-wide">APPOINTMO</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
              OWNER CONSOLE
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-xs text-stone-300 hover:text-white transition"
            >
              Salon Management
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-stone-400 hover:text-white flex items-center space-x-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        {/* Page Title & Stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Access Requests & Passcodes</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Review visitor inquiries and issue 15-minute verification passcodes via email.
            </p>
          </div>

          <button
            onClick={fetchRequests}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Notifications */}
        {notice && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex justify-between items-center shadow-sm">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-emerald-900 font-bold ml-2">×</button>
          </div>
        )}

        {errorNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex justify-between items-center shadow-sm">
            <span>{errorNotice}</span>
            <button onClick={() => setErrorNotice(null)} className="text-rose-900 font-bold ml-2">×</button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'all', label: 'All Inquiries', count: counts.all },
            { id: 'pending', label: 'Pending Review', count: counts.pending },
            { id: 'approved', label: 'Approved / Active', count: counts.approved },
            { id: 'rejected', label: 'Rejected', count: counts.rejected },
            { id: 'revoked', label: 'Revoked', count: counts.revoked },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
                filter === t.id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span>{t.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filter === t.id ? 'bg-stone-800 text-stone-200' : 'bg-stone-100 text-stone-600'
              }`}>
                {t.count || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Visitor</th>
                  <th className="py-3.5 px-4">Organization</th>
                  <th className="py-3.5 px-4">Message / Note</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Passcode Details</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400">
                      {loading ? 'Loading access requests...' : 'No inquiries found matching this category.'}
                    </td>
                  </tr>
                ) : (
                  requests.map(r => {
                    const isCodeExpired = r.expires_at ? new Date(r.expires_at).getTime() < Date.now() : false;
                    const isCodeUsed = !!r.used_at;

                    return (
                      <tr key={r.id} className="hover:bg-stone-50/60 transition">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-stone-900">{r.full_name}</div>
                          <div className="text-[11px] text-stone-400 font-mono">{r.email}</div>
                        </td>

                        <td className="py-4 px-4 text-stone-600">
                          {r.business_name || <span className="text-stone-300">—</span>}
                        </td>

                        <td className="py-4 px-4 text-stone-500 max-w-xs truncate" title={r.message}>
                          {r.message || <span className="text-stone-300">—</span>}
                        </td>

                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                            r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            r.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            r.status === 'revoked' ? 'bg-rose-100 text-rose-800' :
                            'bg-stone-200 text-stone-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {r.expires_at ? (
                            <div className="space-y-0.5 text-[11px]">
                              <span className="font-mono text-stone-700 block">
                                Hint: {r.raw_token_hint || '••••••'}
                              </span>
                              {isCodeUsed ? (
                                <span className="text-emerald-700 font-medium">Redeemed ✓</span>
                              ) : isCodeExpired ? (
                                <span className="text-rose-600 font-medium">Expired</span>
                              ) : (
                                <span className="text-amber-700">Valid 15m</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-300 text-[11px]">Not issued</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-stone-400 text-[11px]">
                          {new Date(r.requested_at || r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>

                        <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {r.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setPendingAction({ type: 'approve', request: r })}
                                className="px-2.5 py-1 rounded-lg bg-stone-900 text-white font-medium text-[11px] hover:bg-stone-800 transition"
                              >
                                Approve &amp; Send
                              </button>
                              <button
                                onClick={() => setPendingAction({ type: 'reject', request: r })}
                                className="px-2.5 py-1 rounded-lg border border-stone-200 text-stone-600 font-medium text-[11px] hover:bg-stone-100 transition"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {r.status === 'approved' && (
                            <>
                              <button
                                onClick={() => setPendingAction({ type: 'resend', request: r })}
                                className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 font-medium text-[11px] hover:bg-amber-100 transition"
                              >
                                Resend Code
                              </button>
                              <button
                                onClick={() => setPendingAction({ type: 'revoke', request: r })}
                                className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 font-medium text-[11px] hover:bg-rose-50 transition"
                              >
                                Revoke
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Sensitive Actions */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              {pendingAction.type === 'revoke' ? <AlertTriangle className="w-5 h-5 text-rose-600" /> : <Mail className="w-5 h-5 text-amber-700" />}
            </div>

            <h3 className="text-base font-bold text-stone-900 mb-1">
              {pendingAction.type === 'approve' && 'Approve & Send Access Code?'}
              {pendingAction.type === 'resend' && 'Resend 15-Minute Access Code?'}
              {pendingAction.type === 'reject' && 'Reject Access Request?'}
              {pendingAction.type === 'revoke' && 'Revoke Access Immediately?'}
            </h3>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              {pendingAction.type === 'approve' &&
                `An email containing a secure 15-minute verification code will be sent to ${pendingAction.request.email}.`}
              {pendingAction.type === 'resend' &&
                `This will invalidate any previously issued codes and email a fresh 15-minute passcode to ${pendingAction.request.email}.`}
              {pendingAction.type === 'reject' &&
                `This will mark ${pendingAction.request.full_name}'s request as rejected.`}
              {pendingAction.type === 'revoke' &&
                `This will terminate active invitations and invalidate any live demo sessions for ${pendingAction.request.email}.`}
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionProcessing}
                onClick={handleExecuteAction}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold text-white shadow ${
                  pendingAction.type === 'revoke' || pendingAction.type === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-stone-900 hover:bg-stone-800'
                }`}
              >
                {actionProcessing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
