import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import { CheckCircle2, XCircle, AlertCircle, Coins, ShieldCheck } from 'lucide-react';

export function CashSettlementModal({ isOpen, onClose, collection, onSuccess }) {
  const { showToast } = useNotification();
  const [settlementNotes, setSettlementNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isRejectMode, setIsRejectMode] = useState(false);

  if (!isOpen || !collection) return null;

  const handleVerify = async () => {
    setSubmitting(true);
    try {
      await api.post(`/collections/${collection.id}/verify`, {
        settlement_notes: settlementNotes || 'Cash verified and settled in business treasury',
      });
      showToast('Collection marked as Verified & Cash Settled!', 'success');
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      showToast(e.message || 'Settlement failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!settlementNotes.trim()) {
      showToast('Please provide a reason for rejecting this collection.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/collections/${collection.id}/reject`, {
        reason: settlementNotes,
      });
      showToast('Collection has been rejected.', 'info');
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      showToast(e.message || 'Action failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRejectMode ? 'Reject Collection' : 'Cash Collection Settlement'}
      subtitle={`Verify physical/digital handover from ${collection.salesman_name}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Collection details card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Salesman</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{collection.salesman_name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {collection.customer_name} {collection.customer_biz ? `(${collection.customer_biz})` : ''}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Date Collected</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {formatDate(collection.collection_date)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Mode</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
              {collection.payment_method}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Amount to Settle
            </p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num mt-0.5">
              {formatCurrency(collection.amount)}
            </p>
          </div>
        </div>

        {/* Notes input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            {isRejectMode ? 'Reason for Rejection *' : 'Settlement Remarks / Audit Note'}
          </label>
          <textarea
            rows={2}
            placeholder={isRejectMode ? 'Why is this collection being rejected?' : 'e.g. Cash received in store, envelope verified...'}
            value={settlementNotes}
            onChange={(e) => setSettlementNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="pt-2 flex items-center justify-between">
          {!isRejectMode ? (
            <button
              type="button"
              onClick={() => setIsRejectMode(true)}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Reject Collection
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRejectMode(false)}
              className="text-xs font-bold text-slate-500 hover:underline"
            >
              Back to Settlement
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>

            {isRejectMode ? (
              <button
                type="button"
                onClick={handleReject}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleVerify}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-glow-success disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Settling...' : 'Mark Cash Settled'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
