import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Coins, Send, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { useNotification } from '../../context/NotificationContext';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

export function MyCollectionsPage() {
  const { showToast } = useNotification();
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await api.get('/collections');
      setCollections(res.collections || []);
      setSummary(res.summary || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleSubmitToOwner = async (colId) => {
    setSubmittingId(colId);
    try {
      await api.post(`/collections/${colId}/submit`, {
        settlement_notes: 'Cash collected on field submitted for verification',
      });
      showToast('Collection submitted to owner for verification.', 'success');
      fetchCollections();
    } catch (e) {
      showToast(e.message || 'Failed to submit collection', 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleBulkSubmitAll = async () => {
    const pendings = collections.filter(c => c.status === 'pending');
    if (pendings.length === 0) return;

    try {
      for (const p of pendings) {
        await api.post(`/collections/${p.id}/submit`, {
          settlement_notes: 'Bulk cash handover to owner',
        });
      }
      showToast('All collections submitted to owner!', 'success');
      fetchCollections();
    } catch (e) {
      showToast('Error during submission', 'error');
    }
  };

  const pendingCount = collections.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            My Collections & Cash Handover
          </h1>
          <p className="text-xs text-slate-500">Track collections and submit cash to owner for treasury settlement</p>
        </div>

        {pendingCount > 0 && (
          <button
            onClick={handleBulkSubmitAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit All ({pendingCount})</span>
          </button>
        )}
      </div>

      {/* Cash in Hand Hero */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Total Verified Collections</p>
          <p className="text-2xl sm:text-3xl font-black font-mono-num mt-1">
            {formatCurrency(summary.totalVerified)}
          </p>
          <p className="text-xs text-emerald-100 mt-0.5">Approved & settled by Owner</p>
        </div>
        <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

      {/* Collections Feed */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Field Collections Log</h3>
        </div>

        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : collections.length === 0 ? (
          <EmptyState
            title="No collections recorded yet"
            description="Use 'Receive Payment' when receiving money from clients."
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {collections.map((col) => (
              <div key={col.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{col.customer_name}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {col.payment_method}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Date: {formatDate(col.collection_date)} {col.reference_number ? `• Ref: ${col.reference_number}` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right">
                    <p className="text-base font-extrabold font-mono-num text-emerald-600">
                      {formatCurrency(col.amount)}
                    </p>
                    <Badge
                      variant={
                        col.status === 'verified'
                          ? 'success'
                          : col.status === 'submitted'
                          ? 'warning'
                          : col.status === 'rejected'
                          ? 'danger'
                          : 'default'
                      }
                    >
                      {col.status.toUpperCase()}
                    </Badge>
                  </div>

                  {col.status === 'pending' && (
                    <button
                      onClick={() => handleSubmitToOwner(col.id)}
                      disabled={submittingId === col.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 shadow-xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>{submittingId === col.id ? 'Submitting...' : 'Submit to Owner'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
