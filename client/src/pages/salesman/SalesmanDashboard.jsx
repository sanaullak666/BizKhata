import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { 
  Users, TrendingUp, Coins, AlertTriangle, ArrowUpRight, 
  ArrowDownLeft, MessageSquare, Phone, Send, CheckCircle2, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddTransactionModal } from '../../components/transaction/AddTransactionModal';
import { ReminderModal } from '../../components/customer/ReminderModal';
import { TableSkeleton } from '../../components/common/Skeleton';

export function SalesmanDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [txModal, setTxModal] = useState({ isOpen: false, defaultType: 'GAVE' });
  const [reminderCustomerId, setReminderCustomerId] = useState(null);
  const [submittingCash, setSubmittingCash] = useState(false);

  const fetchSalesmanData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/salesman-dashboard');
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmanData();
  }, []);

  const handleSubmitCashToOwner = async () => {
    if (!data?.pendingCollections || data.pendingCollections.length === 0) {
      showToast('No pending cash collections to submit.', 'info');
      return;
    }

    setSubmittingCash(true);
    try {
      for (const col of data.pendingCollections) {
        if (col.status === 'pending') {
          await api.post(`/collections/${col.id}/submit`, {
            settlement_notes: 'Physical cash handed over to owner for verification',
          });
        }
      }
      showToast('Cash collection submitted to Owner for settlement!', 'success');
      fetchSalesmanData();
    } catch (e) {
      showToast('Failed to submit cash', 'error');
    } finally {
      setSubmittingCash(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  const { metrics, outstandingCustomers, recentTransactions, pendingCollections } = data;

  return (
    <div className="space-y-5">
      {/* Salesman Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500">Field Representative</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {user?.full_name}
          </h1>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Field Active</span>
          </span>
        </div>
      </div>

      {/* Cash In Hand Banner (Requirements 10 & 11) */}
      {metrics.cashInHand > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-100">
                Cash in Hand (Collected from Clients)
              </p>
              <h3 className="text-3xl font-black font-mono-num mt-1">
                {formatCurrency(metrics.cashInHand)}
              </h3>
              <p className="text-[11px] text-amber-100 mt-0.5">
                Physical cash in your possession pending submission to owner
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <button
            onClick={handleSubmitCashToOwner}
            disabled={submittingCash}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black shadow-sm hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submittingCash ? 'Submitting...' : 'Submit Cash to Owner for Settlement'}</span>
          </button>
        </div>
      )}

      {/* 6 Key Metrics Grid (Requirement 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My Customers</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono-num">
            {metrics.myCustomers}
          </p>
          <p className="text-[10px] text-slate-500">Assigned accounts</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950 shadow-subtle">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Today's Sales</p>
          <p className="text-2xl font-black text-rose-600 mt-1 font-mono-num">
            {formatCurrency(metrics.todaySales)}
          </p>
          <p className="text-[10px] text-slate-500">Goods dispatched</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950 shadow-subtle">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Today's Collections</p>
          <p className="text-2xl font-black text-emerald-600 mt-1 font-mono-num">
            {formatCurrency(metrics.todayCollections)}
          </p>
          <p className="text-[10px] text-slate-500">Recovered today</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Sales</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono-num">
            {formatCurrency(metrics.monthlySales)}
          </p>
          <p className="text-[10px] text-slate-500">This calendar month</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Monthly Collection</p>
          <p className="text-xl font-black text-emerald-600 mt-1 font-mono-num">
            {formatCurrency(metrics.monthlyCollections)}
          </p>
          <p className="text-[10px] text-slate-500">Rate: {metrics.collectionRate}%</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950 shadow-subtle">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Outstanding</p>
          <p className="text-xl font-black text-rose-600 mt-1 font-mono-num">
            {formatCurrency(metrics.outstanding)}
          </p>
          <p className="text-[10px] text-slate-500">Unpaid dues</p>
        </div>
      </div>

      {/* Quick Action Ribbon */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setTxModal({ isOpen: true, defaultType: 'GAVE' })}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-sm hover:bg-rose-700 transition-all"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Record Sale (You Gave)</span>
        </button>

        <button
          onClick={() => setTxModal({ isOpen: true, defaultType: 'RECEIVED' })}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition-all"
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Receive Payment</span>
        </button>
      </div>

      {/* Top Outstanding Customers in My Territory */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Outstanding Visits & Recovery</h3>
          <button
            onClick={() => navigate('/salesman/customers')}
            className="text-xs font-bold text-brand-600 hover:underline"
          >
            All Clients
          </button>
        </div>

        <div className="space-y-2">
          {outstandingCustomers.map((cust) => (
            <div
              key={cust.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{cust.name}</p>
                <p className="text-[11px] text-slate-500">{cust.business_name || 'Retail Client'}</p>
                <p className="text-sm font-black font-mono-num text-rose-600 mt-0.5">
                  {formatCurrency(cust.current_balance)}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${cust.mobile}`}
                  className="p-2 rounded-xl bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                >
                  <Phone className="w-4 h-4" />
                </a>

                <button
                  onClick={() => setReminderCustomerId(cust.id)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Field Transactions */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{tx.customer_name}</p>
                <p className="text-[11px] text-slate-500">{tx.description} • {formatDate(tx.date)}</p>
              </div>
              <div className="text-right">
                <p className={`font-mono-num font-bold text-xs ${tx.type === 'GAVE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {tx.type === 'GAVE' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  {tx.payment_method}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={txModal.isOpen}
        defaultType={txModal.defaultType}
        onClose={() => setTxModal({ isOpen: false, defaultType: 'GAVE' })}
        onSuccess={() => fetchSalesmanData()}
      />

      <ReminderModal
        isOpen={!!reminderCustomerId}
        customerId={reminderCustomerId}
        onClose={() => setReminderCustomerId(null)}
      />
    </div>
  );
}
