import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { 
  TrendingUp, TrendingDown, Users, Coins, ArrowUpRight, 
  ArrowDownLeft, Clock, ShieldCheck, ArrowRight, UserCheck, CheckCircle2,
  AlertTriangle, MessageSquare, Plus, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddTransactionModal } from '../../components/transaction/AddTransactionModal';
import { AddCustomerModal } from '../../components/customer/AddCustomerModal';
import { CashSettlementModal } from '../../components/collection/CashSettlementModal';
import { ReminderModal } from '../../components/customer/ReminderModal';
import { TableSkeleton } from '../../components/common/Skeleton';

export function OwnerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddTx, setShowAddTx] = useState({ isOpen: false, defaultType: 'GAVE' });
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [settleCollection, setSettleCollection] = useState(null);
  const [reminderCustomerId, setReminderCustomerId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard');
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const { metrics, dailyTrend, topOutstandingCustomers, topSalesmen, recentTransactions, pendingCollections } = data;

  return (
    <div className="space-y-8">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Executive Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-tenant ledger, field collections & sales performance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all"
          >
            <Plus className="w-4 h-4 text-brand-600" />
            <span>Add Customer</span>
          </button>

          <button
            onClick={() => setShowAddTx({ isOpen: true, defaultType: 'GAVE' })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Record Sale</span>
          </button>

          <button
            onClick={() => setShowAddTx({ isOpen: true, defaultType: 'RECEIVED' })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Receive Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Requirement 21) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Receivable"
          value={formatCurrency(metrics.totalReceivable)}
          subtitle="Customer balance owed to you"
          icon={TrendingUp}
          variant="rose"
          onClick={() => navigate('/customers?balance_filter=owe_business')}
        />

        <StatCard
          title="Total Payable"
          value={formatCurrency(metrics.totalPayable)}
          subtitle="Advance customer credit"
          icon={TrendingDown}
          variant="emerald"
          onClick={() => navigate('/customers?balance_filter=business_owes')}
        />

        <StatCard
          title="Today's Sales"
          value={formatCurrency(metrics.todaySales)}
          subtitle="Credit sales recorded today"
          icon={ArrowUpRight}
          variant="brand"
          onClick={() => navigate('/transactions?type=GAVE')}
        />

        <StatCard
          title="Today's Collections"
          value={formatCurrency(metrics.todayCollection)}
          subtitle="Payments received today"
          icon={Coins}
          variant="emerald"
          onClick={() => navigate('/collections')}
        />

        <StatCard
          title="Monthly Sales"
          value={formatCurrency(metrics.monthlySales)}
          subtitle="Current calendar month"
          icon={TrendingUp}
          variant="default"
        />

        <StatCard
          title="Monthly Collections"
          value={formatCurrency(metrics.monthlyCollection)}
          subtitle="Current calendar month"
          icon={Coins}
          variant="emerald"
        />

        <StatCard
          title="Market Outstanding"
          value={formatCurrency(metrics.outstanding)}
          subtitle="Total pending recovery"
          icon={AlertTriangle}
          variant="amber"
          onClick={() => navigate('/reports')}
        />

        <StatCard
          title="Cash in Field (Salesmen)"
          value={formatCurrency(metrics.cashInField)}
          subtitle="Physical cash pending settlement"
          icon={Coins}
          variant="rose"
          onClick={() => navigate('/collections')}
        />
      </div>

      {/* Cash Collection Settlement Tray (Requirements 10 & 11) */}
      {pendingCollections && pendingCollections.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/60 via-amber-50/30 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-200">
                  Field Cash Collections Awaiting Settlement ({pendingCollections.length})
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Salesmen have collected physical cash/payments that require your official verification
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/collections')}
              className="text-xs font-bold text-amber-900 dark:text-amber-200 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View All Collections</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
            {pendingCollections.slice(0, 3).map((col) => (
              <div
                key={col.id}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-800/50 flex items-center justify-between shadow-xs"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                    {col.customer_name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Collected by <span className="font-semibold text-slate-700 dark:text-slate-300">{col.salesman_name}</span>
                  </p>
                  <p className="text-[10px] text-amber-600 font-semibold uppercase mt-0.5">
                    {col.payment_method} • {col.status}
                  </p>
                </div>

                <div className="text-right space-y-1.5">
                  <p className="text-base font-extrabold font-mono-num text-emerald-600">
                    {formatCurrency(col.amount)}
                  </p>
                  <button
                    onClick={() => setSettleCollection(col)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                  >
                    Settle Cash
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Top Outstanding Customers & Top Salesmen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Top Outstanding Customers (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Top Outstanding Customers</h3>
              <p className="text-xs text-slate-500">Highest unpaid balances in active accounts</p>
            </div>
            <button
              onClick={() => navigate('/customers?balance_filter=owe_business')}
              className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="pb-2.5">Customer / Store</th>
                  <th className="pb-2.5">Contact</th>
                  <th className="pb-2.5 text-right">Balance Due</th>
                  <th className="pb-2.5 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topOutstandingCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3">
                      <button
                        onClick={() => navigate(`/customers/${cust.id}`)}
                        className="text-left group"
                      >
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                          {cust.name}
                        </p>
                        <p className="text-[11px] text-slate-500">{cust.business_name || 'Retail Customer'}</p>
                      </button>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 font-mono">
                      {cust.mobile}
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm font-extrabold font-mono-num text-rose-600">
                        {formatCurrency(cust.current_balance)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setReminderCustomerId(cust.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Remind</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Top Salesmen Summary (1 Col) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Salesmen Leaderboard</h3>
              <p className="text-xs text-slate-500">Highest collections recorded</p>
            </div>
            <button
              onClick={() => navigate('/salesmen')}
              className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {topSalesmen.map((sm, idx) => (
              <div
                key={sm.id}
                onClick={() => navigate(`/salesmen/${sm.id}`)}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-300 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-black">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{sm.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{sm.employee_id || 'Staff'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-600 font-mono-num">
                      {formatCurrency(sm.total_collections)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Sales: {formatCurrency(sm.total_sales)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions Master Ledger Feed */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Recent Transactions</h3>
            <p className="text-xs text-slate-500">Live feed across all salesmen and customers</p>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
          >
            <span>Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="pb-2.5">Date & Time</th>
                <th className="pb-2.5">Customer</th>
                <th className="pb-2.5">Staff / Salesman</th>
                <th className="pb-2.5">Payment Method</th>
                <th className="pb-2.5 text-right">You Gave (Dr)</th>
                <th className="pb-2.5 text-right">You Received (Cr)</th>
                <th className="pb-2.5 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50">
                  <td className="py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(tx.date)} • {tx.time?.slice(0, 5)}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => navigate(`/customers/${tx.customer_id}`)}
                      className="font-bold text-slate-900 dark:text-white hover:text-brand-600 text-left"
                    >
                      {tx.customer_name}
                      {tx.customer_biz && <span className="block text-[10px] text-slate-400 font-normal">{tx.customer_biz}</span>}
                    </button>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {tx.salesman_name || 'Owner'}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                      {tx.payment_method}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono-num font-bold text-rose-600">
                    {tx.type === 'GAVE' ? formatCurrency(tx.amount) : '-'}
                  </td>
                  <td className="py-3 text-right font-mono-num font-bold text-emerald-600">
                    {tx.type === 'RECEIVED' ? formatCurrency(tx.amount) : '-'}
                  </td>
                  <td className="py-3 text-right font-mono-num font-bold text-slate-900 dark:text-white">
                    {formatCurrency(tx.running_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Modals */}
      <AddTransactionModal
        isOpen={showAddTx.isOpen}
        defaultType={showAddTx.defaultType}
        onClose={() => setShowAddTx({ isOpen: false, defaultType: 'GAVE' })}
        onSuccess={() => fetchDashboardData()}
      />

      <AddCustomerModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSuccess={() => fetchDashboardData()}
      />

      <CashSettlementModal
        isOpen={!!settleCollection}
        collection={settleCollection}
        onClose={() => setSettleCollection(null)}
        onSuccess={() => fetchDashboardData()}
      />

      <ReminderModal
        isOpen={!!reminderCustomerId}
        customerId={reminderCustomerId}
        onClose={() => setReminderCustomerId(null)}
      />
    </div>
  );
}
