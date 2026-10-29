import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ShieldAlert, KeyRound, RefreshCw, LogOut } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const PlatformAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState<string | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<any | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/access-requests/requests' : `/access-requests/requests?status=${filter}`;
      const res: any = await apiFetch(url);
      setRequests(res.requests || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleApprove = async (id: string) => {
    try {
      const res: any = await apiFetch(`/access-requests/requests/${id}/approve`, { method: 'POST' });
      setGeneratedInvite(res);
      setMessage('Request approved and secure invitation token generated!');
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke access for this request?')) return;
    try {
      await apiFetch(`/access-requests/requests/${id}/revoke`, { method: 'POST' });
      setMessage('Request and associated invitations revoked.');
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('appointmo_token');
    localStorage.removeItem('appointmo_user');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-stone-100 pb-20">
      {/* Top Bar */}
      <div className="bg-stone-900 text-white py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-sm tracking-wide">APPOINTMO PLATFORM</span>
            <span className="text-[10px] bg-stone-800 px-2 py-0.5 rounded text-amber-400 font-mono">OWNER PORTAL</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-xs text-stone-300 hover:text-white"
            >
              Salon Dashboard
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

      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Access Requests</h1>
            <p className="text-xs text-stone-500">Review and manage requests for access to the Appointmo platform</p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white text-stone-700"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="revoked">Revoked</option>
            </select>
            <button
              onClick={fetchRequests}
              className="p-1.5 rounded-lg bg-white border border-stone-300 text-stone-600 hover:bg-stone-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex justify-between items-center">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-emerald-900 font-bold">×</button>
          </div>
        )}

        {generatedInvite && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs shadow-sm">
            <div className="flex items-center space-x-2 font-bold text-amber-900 mb-2">
              <KeyRound className="w-4 h-4 text-amber-700" />
              <span>Newly Generated Invitation Token</span>
            </div>
            <p className="text-[11px] text-amber-800 mb-3">
              Copy and provide this token or redemption link to the requester.
            </p>
            <div className="bg-white p-2.5 rounded-xl border border-amber-200 font-mono text-xs break-all mb-2">
              {generatedInvite.invitationToken}
            </div>
            <div className="text-[11px] text-amber-700">
              Redemption URL: <span className="font-mono">{window.location.origin}/access/redeem?token={generatedInvite.invitationToken}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Visitor</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    No requests found matching this filter.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50/50">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-900">{r.full_name}</div>
                      <div className="text-[11px] text-stone-400 font-mono">{r.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">{r.business_name || '—'}</td>
                    <td className="py-3.5 px-4 text-stone-500 max-w-xs truncate">{r.message || '—'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] uppercase ${
                        r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-400 text-[11px]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="px-2.5 py-1 rounded bg-stone-900 text-white font-medium text-[11px] hover:bg-stone-800"
                        >
                          Approve
                        </button>
                      )}
                      {r.status === 'approved' && (
                        <button
                          onClick={() => handleRevoke(r.id)}
                          className="px-2.5 py-1 rounded border border-rose-200 text-rose-600 font-medium text-[11px] hover:bg-rose-50"
                        >
                          Revoke
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
    </div>
  );
};
