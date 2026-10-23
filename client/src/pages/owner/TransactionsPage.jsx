import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, downloadBlob } from '../../lib/utils';
import { 
  ArrowLeftRight, Search, Download, Plus, ArrowUpRight, 
  ArrowDownLeft, Filter, Receipt, Calendar, CreditCard
} from 'lucide-react';
import { AddTransactionModal } from '../../components/transaction/AddTransactionModal';
import { ReceiptModal } from '../../components/transaction/ReceiptModal';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export function TransactionsPage() {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalGave: 0, totalReceived: 0, netBalance: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [txModal, setTxModal] = useState({ isOpen: false, defaultType: 'GAVE' });
  const [viewReceiptId, setViewReceiptId] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let query = `/transactions?search=${encodeURIComponent(search)}`;
      if (type) query += `&type=${type}`;
      if (paymentMethod) query += `&payment_method=${paymentMethod}`;
      if (startDate) query += `&start_date=${startDate}`;
      if (endDate) query += `&end_date=${endDate}`;

      const res = await api.get(query);
      setTransactions(res.transactions || []);
      setSummary(res.summary || {});
    } catch (e) {
      showToast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchTransactions, 250);
    return () => clearTimeout(timer);
  }, [search, type, paymentMethod, startDate, endDate]);

  const handleExportCSV = async () => {
    try {
      const blob = await api.get('/backup/export-csv/transactions');
      downloadBlob(blob, `KhataFlow-Transactions-${new Date().toISOString().slice(0, 10)}.csv`);
      showToast('Transactions exported to CSV!', 'success');
    } catch (e) {
      showToast('Failed to export CSV', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Transactions Master Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time feed of all sales, payments, UPI settlements & customer credit
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setTxModal({ isOpen: true, defaultType: 'GAVE' })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Record Sale</span>
          </button>

          <button
            onClick={() => setTxModal({ isOpen: true, defaultType: 'RECEIVED' })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Receive Payment</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Total Credit Sales (Given)</p>
            <p className="text-2xl font-black text-rose-600 font-mono-num mt-1">
              {formatCurrency(summary.totalGave)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Payments (Received)</p>
            <p className="text-2xl font-black text-emerald-600 font-mono-num mt-1">
              {formatCurrency(summary.totalReceived)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Credit Exposure</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono-num mt-1">
              {formatCurrency(summary.netBalance)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Multi Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search description, reference #, customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Type Filter */}
        <div className="w-full md:w-44">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="GAVE">YOU GAVE (Sale)</option>
            <option value="RECEIVED">YOU RECEIVED (Payment)</option>
          </select>
        </div>

        {/* Method Filter */}
        <div className="w-full md:w-44">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none"
          >
            <option value="">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Card">Card</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions match the current criteria"
            description="Adjust your search filters or record a new transaction."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Customer Account</th>
                  <th className="px-4 py-3">Description & Ref</th>
                  <th className="px-4 py-3">Recorded By</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right text-rose-600">You Gave (Dr)</th>
                  <th className="px-4 py-3 text-right text-emerald-600">You Received (Cr)</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                  <th className="px-4 py-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      <p className="font-semibold text-slate-900 dark:text-white">{formatDate(tx.date)}</p>
                      <p className="text-[10px] text-slate-400">{tx.time?.slice(0, 5)}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => navigate(`/customers/${tx.customer_id}`)}
                        className="font-bold text-slate-900 dark:text-white hover:text-brand-600 text-left"
                      >
                        {tx.customer_name}
                        {tx.customer_business && (
                          <span className="block text-[11px] text-slate-500 font-medium">{tx.customer_business}</span>
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{tx.description}</p>
                      {tx.reference_number && (
                        <p className="text-[10px] font-mono text-slate-400">Ref: {tx.reference_number}</p>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {tx.salesman_name || 'Owner'}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                        {tx.payment_method}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono-num font-extrabold text-sm text-rose-600">
                      {tx.type === 'GAVE' ? formatCurrency(tx.amount) : '-'}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono-num font-extrabold text-sm text-emerald-600">
                      {tx.type === 'RECEIVED' ? formatCurrency(tx.amount) : '-'}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono-num font-bold text-slate-900 dark:text-white">
                      {formatCurrency(tx.running_balance)}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {tx.type === 'RECEIVED' ? (
                        <button
                          onClick={() => {
                            api.get(`/receipts?customer_id=${tx.customer_id}`)
                              .then((r) => {
                                const matched = r.receipts?.find(rc => rc.transaction_id === tx.id);
                                if (matched) setViewReceiptId(matched.id);
                                else if (r.receipts && r.receipts.length > 0) setViewReceiptId(r.receipts[0].id);
                              })
                              .catch(() => {});
                          }}
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          title="View Payment Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={txModal.isOpen}
        defaultType={txModal.defaultType}
        onClose={() => setTxModal({ isOpen: false, defaultType: 'GAVE' })}
        onSuccess={() => fetchTransactions()}
      />

      <ReceiptModal
        isOpen={!!viewReceiptId}
        receiptId={viewReceiptId}
        onClose={() => setViewReceiptId(null)}
      />
    </div>
  );
}
