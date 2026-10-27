import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, downloadBlob } from '../../lib/utils';
import { 
  Coins, CheckCircle2, Clock, XCircle, ShieldCheck, 
  Download, Filter, AlertTriangle, ArrowRight, UserCheck
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { CashSettlementModal } from '../../components/collection/CashSettlementModal';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useNotification } from '../../context/NotificationContext';

export function CollectionsPage() {
  const { showToast } = useNotification();
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [salesmen, setSalesmen] = useState([]);

  // Settle modal
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      let query = `/collections?`;
      if (statusFilter) query += `status=${statusFilter}&`;
      if (paymentMethod) query += `payment_method=${paymentMethod}&`;
      if (salesmanId) query += `salesman_id=${salesmanId}&`;

      const [cRes, sRes] = await Promise.all([
        api.get(query),
        api.get('/salesmen'),
      ]);

      setCollections(cRes.collections || []);
      setSummary(cRes.summary || {});
      setSalesmen(sRes.salesmen || []);
    } catch (e) {
      showToast('Failed to load collections', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [statusFilter, paymentMethod, salesmanId]);

  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.post('/collections/bulk-verify', {
        collection_ids: selectedIds,
        notes: 'Bulk settled by business owner',
      });
      showToast(`Successfully settled ${selectedIds.length} collections!`, 'success');
      setSelectedIds([]);
      fetchCollections();
    } catch (e) {
      showToast(e.message || 'Bulk settlement failed', 'error');
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await api.get('/backup/export-csv/collections');
      downloadBlob(blob, `Grihalakshmi-Collections-${new Date().toISOString().slice(0, 10)}.csv`);
      showToast('Collections exported to CSV!', 'success');
    } catch (e) {
      showToast('Failed to export CSV', 'error');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-tight">
            Collection Management & Cash Settlement
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Field collection tracking, cash-in-hand control, and owner treasury settlement
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkVerify}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Settle ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-950 shadow-subtle">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600">Cash in Field</p>
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-amber-600 font-mono-num truncate">
            {formatCurrency(summary.cashInField)}
          </p>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5">Unverified</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-brand-200/80 dark:border-brand-950 shadow-subtle">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-brand-600">Pending</p>
            <div className="p-1.5 sm:p-2 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-brand-600 font-mono-num truncate">
            {formatCurrency(summary.totalSubmitted)}
          </p>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5">Submitted</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-950 shadow-subtle">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600">Verified</p>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-emerald-600 font-mono-num truncate">
            {formatCurrency(summary.totalVerified)}
          </p>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5">Credited</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Total Entries</p>
            <div className="p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono-num">
            {summary.totalCount || 0}
          </p>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5">All modes</p>
        </div>
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2.5 sm:gap-3">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { id: '', label: 'All' },
            { id: 'submitted', label: 'Submitted' },
            { id: 'pending', label: 'Pending' },
            { id: 'verified', label: 'Verified' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={salesmanId}
            onChange={(e) => setSalesmanId(e.target.value)}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] sm:text-xs font-semibold focus:outline-none"
          >
            <option value="">All Salesmen</option>
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] sm:text-xs font-semibold focus:outline-none"
          >
            <option value="">All Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Collections: Desktop Table + Mobile Cards */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 sm:p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : collections.length === 0 ? (
          <EmptyState
            title="No collections match the filter"
            description="When salesmen collect cash or payments from customers, they appear here for verification and cash settlement."
          />
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === collections.filter(c => c.status !== 'verified').length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(collections.filter(c => c.status !== 'verified').map(c => c.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    </th>
                    <th className="px-4 py-3">Collection Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Salesman</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {collections.map((col) => {
                    const isSelected = selectedIds.includes(col.id);
                    const canSettle = col.status === 'pending' || col.status === 'submitted';

                    return (
                      <tr key={col.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          {canSettle && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds([...selectedIds, col.id]);
                                } else {
                                  setSelectedIds(selectedIds.filter(id => id !== col.id));
                                }
                              }}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                          {formatDate(col.collection_date)}
                        </td>

                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          {col.customer_name}
                          {col.customer_biz && (
                            <span className="block text-[11px] text-slate-500 font-normal">{col.customer_biz}</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{col.salesman_name}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                              {col.payment_method}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono-num font-extrabold text-sm text-emerald-600">
                          {formatCurrency(col.amount)}
                        </td>

                        <td className="px-4 py-3.5 text-center">
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
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {canSettle ? (
                            <button
                              onClick={() => setSelectedCollection(col)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                            >
                              Settle Cash
                            </button>
                          ) : col.status === 'verified' ? (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Settled</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-rose-600 flex items-center justify-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE / TABLET CARDS */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {collections.map((col) => {
                const canSettle = col.status === 'pending' || col.status === 'submitted';
                return (
                  <div key={col.id} className="p-3.5 active:bg-slate-50 dark:active:bg-slate-800/40">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{col.customer_name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {formatDate(col.collection_date)} · {col.salesman_name}
                        </p>
                      </div>
                      <span className="text-sm font-black font-mono-num text-emerald-600 shrink-0">
                        {formatCurrency(col.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {col.payment_method}
                        </span>
                        <Badge
                          variant={
                            col.status === 'verified' ? 'success'
                            : col.status === 'submitted' ? 'warning'
                            : col.status === 'rejected' ? 'danger'
                            : 'default'
                          }
                        >
                          {col.status.toUpperCase()}
                        </Badge>
                      </div>

                      {canSettle ? (
                        <button
                          onClick={() => setSelectedCollection(col)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold active:bg-emerald-700"
                        >
                          Settle
                        </button>
                      ) : col.status === 'verified' ? (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Settled
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Cash Settlement Modal */}
      <CashSettlementModal
        isOpen={!!selectedCollection}
        collection={selectedCollection}
        onClose={() => setSelectedCollection(null)}
        onSuccess={() => fetchCollections()}
      />
    </div>
  );
}
