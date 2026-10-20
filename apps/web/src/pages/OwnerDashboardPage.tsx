import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, RefreshCw, LogOut, Mail, Send, AlertTriangle, ShieldCheck, UserCheck, Ban } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const OwnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ pending: 0, approved: 0, rejected: 0, revoked: 0, all: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);

  const handleSyncDatabase = async () => {
    setMigrating(true);
    setErrorNotice(null);
    try {
      const res: any = await apiFetch('/owner/auto-migrate', { method: 'POST' });
      setNotice(res.message);
      fetchRequests();
    } catch (err: any) {
      setErrorNotice(err.message || 'Auto-migration failed');
    } finally {
      setMigrating(false);
    }
  };

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
    setErrorNotice(null);
    setNotice(null);

    try {
      let endpoint = '';
      if (type === 'approve') endpoint = `/owner/requests/${request.id}/approve`;
      if (type === 'resend') endpoint = `/owner/requests/${request.id}/resend`;
      if (type === 'reject') endpoint = `/owner/requests/${request.id}/reject`;
      if (type === 'revoke') endpoint = `/owner/requests/${request.id}/revoke`;

      const res: any = await apiFetch(endpoint, { method: 'POST' });

      setNotice(res.message || 'Action executed successfully.');
      setPendingAction(null);
      await fetchRequests();
    } catch (err: any) {
      setErrorNotice(err.message || 'Action failed to execute.');
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
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
              A
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-stone-900">Appointmo</span>
                <span className="px-2 py-0.5 rounded-full bg-stone-900 text-white text-[10px] font-semibold tracking-wide uppercase">
                  Owner Portal
                </span>
              </div>
              <p className="text-[11px] text-stone-500">Access Requests &amp; Authorized Users</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSyncDatabase}
              disabled={migrating}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50 transition shadow-sm disabled:opacity-50"
              title="Synchronize database tables on hosted Neon DB"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${migrating ? 'animate-spin' : ''}`} />
              <span>{migrating ? 'Syncing...' : 'Sync DB'}</span>
            </button>

            <button
              onClick={fetchRequests}
              disabled={loading}
              className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition"
              title="Refresh requests"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:text-rose-600 hover:border-rose-200 transition text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Banner notices */}
        {notice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorNotice && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button onClick={() => setErrorNotice(null)} className="text-rose-700 hover:text-rose-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Access Requests &amp; Authorized Users</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Review visitor inquiries and manage authorization to the interactive Appointmo demo.
            </p>
          </div>
        </div>

        {/* Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: 'all', label: 'All Inquiries', count: counts.all, color: 'border-stone-300' },
            { key: 'pending', label: 'Pending Review', count: counts.pending, color: 'border-amber-300 bg-amber-50/50' },
            { key: 'approved', label: 'Approved Users', count: counts.approved, color: 'border-emerald-300 bg-emerald-50/50' },
            { key: 'rejected', label: 'Rejected', count: counts.rejected, color: 'border-stone-300' },
            { key: 'revoked', label: 'Revoked', count: counts.revoked, color: 'border-rose-300 bg-rose-50/50' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`p-4 rounded-2xl border text-left transition ${item.color} ${
                filter === item.key ? 'ring-2 ring-stone-900 shadow-sm' : 'hover:border-stone-400 bg-white'
              }`}
            >
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">{item.label}</div>
              <div className="text-2xl font-bold text-stone-900 mt-1">{item.count || 0}</div>
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Visitor</th>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">Message / Note</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading && requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-stone-400">
                      Loading inquiries...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-stone-400">
                      No inquiries found matching this category.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-stone-50/70 transition">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-stone-900">{req.full_name}</div>
                        <div className="text-stone-500 text-[11px]">{req.email}</div>
                      </td>
                      <td className="px-5 py-4 text-stone-700">
                        {req.business_name || <span className="text-stone-400 italic">Not specified</span>}
                      </td>
                      <td className="px-5 py-4 max-w-xs truncate text-stone-600" title={req.message}>
                        {req.message || <span className="text-stone-400 italic">No message provided</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            req.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'rejected'
                              ? 'bg-stone-100 text-stone-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {req.status === 'pending' && 'Pending Review'}
                          {req.status === 'approved' && 'Approved User'}
                          {req.status === 'rejected' && 'Rejected'}
                          {req.status === 'revoked' && 'Access Revoked'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-stone-500 whitespace-nowrap">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setPendingAction({ type: 'approve', request: req })}
                              className="px-3 py-1.5 rounded-lg bg-stone-900 text-white font-medium text-[11px] hover:bg-stone-800 transition shadow-sm"
                            >
                              Approve &amp; Invite
                            </button>
                            <button
                              onClick={() => setPendingAction({ type: 'reject', request: req })}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 font-medium text-[11px] hover:bg-stone-100 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {req.status === 'approved' && (
                          <>
                            <button
                              onClick={() => setPendingAction({ type: 'resend', request: req })}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 font-medium text-[11px] hover:bg-stone-100 transition"
                            >
                              Resend Invite
                            </button>
                            <button
                              onClick={() => setPendingAction({ type: 'revoke', request: req })}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 font-medium text-[11px] hover:bg-rose-50 transition"
                            >
                              Revoke Access
                            </button>
                          </>
                        )}
                        {(req.status === 'rejected' || req.status === 'revoked') && (
                          <button
                            onClick={() => setPendingAction({ type: 'approve', request: req })}
                            className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 font-medium text-[11px] hover:bg-stone-100 transition"
                          >
                            Re-Approve Access
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              {pendingAction.type === 'revoke' ? (
                <Ban className="w-5 h-5 text-rose-600" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-amber-700" />
              )}
            </div>

            <h3 className="text-base font-bold text-stone-900 mb-1">
              {pendingAction.type === 'approve' && 'Approve & Send Invitation?'}
              {pendingAction.type === 'resend' && 'Resend Invitation Email?'}
              {pendingAction.type === 'reject' && 'Reject Access Request?'}
              {pendingAction.type === 'revoke' && 'Revoke Access Immediately?'}
            </h3>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              {pendingAction.type === 'approve' &&
                `An invitation email will be sent to ${pendingAction.request.email} with an account setup link allowing them to explore Appointmo.`}
              {pendingAction.type === 'resend' &&
                `This will send a fresh invitation email to ${pendingAction.request.email}.`}
              {pendingAction.type === 'reject' &&
                `This will mark ${pendingAction.request.full_name}'s request as rejected.`}
              {pendingAction.type === 'revoke' &&
                `This will immediately terminate any active demo sessions for ${pendingAction.request.email} and block further access.`}
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
