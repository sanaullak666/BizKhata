import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, downloadBlob } from '../../lib/utils';
import { 
  BarChart3, TrendingUp, Coins, AlertTriangle, Users, 
  Download, Calendar, CreditCard, PieChart, ShieldCheck
} from 'lucide-react';
import { TableSkeleton } from '../../components/common/Skeleton';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export function ReportsPage() {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState('aging');
  const [loading, setLoading] = useState(true);

  const [agingData, setAgingData] = useState(null);
  const [salesmanData, setSalesmanData] = useState([]);
  const [salesReport, setSalesReport] = useState([]);
  const [collectionReport, setCollectionReport] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [agingRes, smRes, salesRes, colRes] = await Promise.all([
        api.get('/reports/outstanding'),
        api.get('/reports/salesman-comparison'),
        api.get('/reports/sales?period=daily'),
        api.get('/reports/collections'),
      ]);

      setAgingData(agingRes);
      setSalesmanData(smRes.salesmen || []);
      setSalesReport(salesRes.report || []);
      setCollectionReport(colRes);
    } catch (e) {
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-tight">
            Reports & Business Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Comprehensive audit reports, debt aging analysis, staff performance & payment channels
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 shadow-xs w-full sm:w-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto -mx-1 px-1">
        {[
          { id: 'aging', label: 'Outstanding Aging', icon: AlertTriangle },
          { id: 'salesman', label: 'Salesman Matrix', icon: Users },
          { id: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
          { id: 'collections', label: 'Payment Channels', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs md:text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-glow-brand'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          {/* TAB 1: OUTSTANDING AGING REPORT */}
          {activeTab === 'aging' && agingData && (
            <div className="space-y-4 sm:space-y-6">
              {/* Aging Buckets */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">0-30 Days</p>
                  <p className="text-base sm:text-2xl font-black font-mono-num text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                    {formatCurrency(agingData.agingSummary?.bucket0_30)}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">High recovery</p>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">31-60 Days</p>
                  <p className="text-base sm:text-2xl font-black font-mono-num text-amber-600 dark:text-amber-400 mt-1 truncate">
                    {formatCurrency(agingData.agingSummary?.bucket31_60)}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Follow-up due</p>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase text-orange-700 dark:text-orange-300">61-90 Days</p>
                  <p className="text-base sm:text-2xl font-black font-mono-num text-orange-600 dark:text-orange-400 mt-1 truncate">
                    {formatCurrency(agingData.agingSummary?.bucket61_90)}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Urgent notice</p>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">90+ Days</p>
                  <p className="text-base sm:text-2xl font-black font-mono-num text-rose-600 dark:text-rose-400 mt-1 truncate">
                    {formatCurrency(agingData.agingSummary?.bucket90Plus)}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Critical</p>
                </div>
              </div>

              {/* Customer Aging List: Table + Mobile Cards */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">Customer Aging List</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Ranked by balance with days since last transaction</p>
                </div>

                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Customer Account</th>
                        <th className="px-4 py-3">Territory Staff</th>
                        <th className="px-4 py-3">Last Transaction</th>
                        <th className="px-4 py-3 text-center">Aging Bucket</th>
                        <th className="px-4 py-3 text-right">Outstanding</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {agingData.customers?.map((cust) => (
                        <tr key={cust.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => navigate(`/customers/${cust.id}`)}
                              className="font-bold text-slate-900 dark:text-white hover:text-brand-600 text-left"
                            >
                              {cust.name}
                              {cust.business_name && (
                                <span className="block text-[11px] text-slate-500 font-normal">{cust.business_name}</span>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                            {cust.salesman_name || 'Unassigned'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {cust.last_transaction_date ? formatDate(cust.last_transaction_date) : 'Opening'}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              cust.aging_bucket === '90+ days'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : cust.aging_bucket === '61-90 days'
                                ? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                : cust.aging_bucket === '31-60 days'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {cust.aging_bucket}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono-num font-extrabold text-sm text-rose-600">
                            {formatCurrency(cust.current_balance)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => navigate(`/customers/${cust.id}`)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold"
                            >
                              Ledger
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {agingData.customers?.map((cust) => (
                    <div key={cust.id} className="p-3.5 active:bg-slate-50 dark:active:bg-slate-800/40">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => navigate(`/customers/${cust.id}`)}
                            className="text-sm font-bold text-slate-900 dark:text-white text-left truncate block w-full"
                          >
                            {cust.name}
                          </button>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                            {cust.salesman_name || 'Unassigned'} · {cust.last_transaction_date ? formatDate(cust.last_transaction_date) : 'Opening'}
                          </p>
                        </div>
                        <span className="text-sm font-black font-mono-num text-rose-600 shrink-0">
                          {formatCurrency(cust.current_balance)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          cust.aging_bucket === '90+ days'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : cust.aging_bucket === '61-90 days'
                            ? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                            : cust.aging_bucket === '31-60 days'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {cust.aging_bucket}
                        </span>
                        <button
                          onClick={() => navigate(`/customers/${cust.id}`)}
                          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300"
                        >
                          View Ledger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SALESMAN COMPARISON */}
          {activeTab === 'salesman' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">Field Staff Efficiency Comparison</h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Benchmarking sales volume vs collection conversion</p>
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Salesman</th>
                      <th className="px-4 py-3 text-right">Credit Sales</th>
                      <th className="px-4 py-3 text-right">Collections</th>
                      <th className="px-4 py-3 text-right">Outstanding</th>
                      <th className="px-4 py-3 text-center">Customers</th>
                      <th className="px-4 py-3 text-center">Transactions</th>
                      <th className="px-4 py-3 text-center">Collection %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salesmanData.map((sm) => (
                      <tr key={sm.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5">
                          <p className="font-extrabold text-slate-900 dark:text-white">{sm.full_name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{sm.employee_id || 'Staff'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono-num font-bold text-slate-900 dark:text-white">
                          {formatCurrency(sm.total_sales)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono-num font-bold text-emerald-600">
                          {formatCurrency(sm.total_collections)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono-num font-bold text-rose-600">
                          {formatCurrency(sm.total_outstanding)}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono-num font-semibold">
                          {sm.assigned_customers_count || 0}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono-num font-semibold">
                          {sm.total_transactions || 0}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono-num bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            {sm.collection_rate_percent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {salesmanData.map((sm) => (
                  <div key={sm.id} className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{sm.full_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{sm.employee_id || 'Staff'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-num bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                        {sm.collection_rate_percent}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                        <p className="text-slate-400 font-semibold">Sales</p>
                        <p className="font-bold text-slate-900 dark:text-white font-mono-num truncate">{formatCurrency(sm.total_sales)}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                        <p className="text-emerald-600 font-semibold">Collected</p>
                        <p className="font-bold text-emerald-700 font-mono-num truncate">{formatCurrency(sm.total_collections)}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40">
                        <p className="text-rose-600 font-semibold">Due</p>
                        <p className="font-bold text-rose-700 font-mono-num truncate">{formatCurrency(sm.total_outstanding)}</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-2">
                      {sm.assigned_customers_count || 0} customers · {sm.total_transactions || 0} transactions
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SALES & REVENUE REPORT */}
          {activeTab === 'sales' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">Daily Sales & Credit Log</h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Goods dispatched and billed</p>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Orders</th>
                      <th className="px-4 py-3 text-right">Total Daily Sales</th>
                      <th className="px-4 py-3 text-right">Avg Order Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salesReport.map((row) => (
                      <tr key={row.period_label} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          {formatDate(row.period_label)}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono-num">
                          {row.transaction_count}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono-num font-extrabold text-brand-600 dark:text-brand-400">
                          {formatCurrency(row.total_sales)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono-num font-semibold text-slate-700 dark:text-slate-300">
                          {formatCurrency(row.avg_sale_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {salesReport.map((row) => (
                  <div key={row.period_label} className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatDate(row.period_label)}
                      </p>
                      <p className="text-sm font-black font-mono-num text-brand-600 dark:text-brand-400">
                        {formatCurrency(row.total_sales)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{row.transaction_count} orders</span>
                      <span>Avg: {formatCurrency(row.avg_sale_value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT MODE CHANNELS */}
          {activeTab === 'collections' && collectionReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              {/* Method Breakdown */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">Payment Method Share</h3>
                <div className="space-y-2 sm:space-y-3">
                  {collectionReport.byMethod?.map((m) => (
                    <div key={m.payment_method} className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.payment_method}</p>
                        <p className="text-[10px] sm:text-[11px] text-slate-400">{m.count} payments</p>
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold font-mono-num text-emerald-600 shrink-0">
                        {formatCurrency(m.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">Settlement Verification Status</h3>
                <div className="space-y-2 sm:space-y-3">
                  {collectionReport.breakdown?.map((b, idx) => (
                    <div key={idx} className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{b.payment_method}</p>
                        <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase mt-1 ${
                          b.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-extrabold font-mono-num text-slate-900 dark:text-white">
                          {formatCurrency(b.total_amount)}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-slate-400">{b.count} entries</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
