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
  const [activeTab, setActiveTab] = useState('aging'); // 'aging', 'salesman', 'sales', 'collections'
  const [loading, setLoading] = useState(true);

  // Data states
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
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Reports & Business Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Comprehensive audit reports, debt aging analysis, staff performance & payment channels
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Print / Save PDF Report</span>
        </button>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: 'aging', label: 'Outstanding Aging Analysis', icon: AlertTriangle },
          { id: 'salesman', label: 'Salesman Comparison Matrix', icon: Users },
          { id: 'sales', label: 'Sales & Revenue Report', icon: TrendingUp },
          { id: 'collections', label: 'Payment Mode Channels', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-glow-brand'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          {/* TAB 1: OUTSTANDING AGING REPORT (Requirement 22) */}
          {activeTab === 'aging' && agingData && (
            <div className="space-y-6">
              {/* 4 Aging Buckets Hero */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                  <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">0 - 30 Days (Current)</p>
                  <p className="text-2xl font-black font-mono-num text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(agingData.agingSummary?.bucket0_30)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">High recovery probability</p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                  <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">31 - 60 Days</p>
                  <p className="text-2xl font-black font-mono-num text-amber-600 dark:text-amber-400 mt-1">
                    {formatCurrency(agingData.agingSummary?.bucket31_60)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Follow-up reminder due</p>
                </div>

                <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
                  <p className="text-[10px] font-bold uppercase text-orange-700 dark:text-orange-300">61 - 90 Days</p>
                  <p className="text-2xl font-black font-mono-num text-orange-600 dark:text-orange-400 mt-1">
                    {formatCurrency(agingData.agingSummary?.bucket61_90)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Urgent collection notice</p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                  <p className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">90+ Days (Critical)</p>
                  <p className="text-2xl font-black font-mono-num text-rose-600 dark:text-rose-400 mt-1">
                    {formatCurrency(agingData.agingSummary?.bucket90Plus)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Stop credit exposure</p>
                </div>
              </div>

              {/* Outstanding Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Customer Aging List</h3>
                  <p className="text-xs text-slate-500">Ranked by balance with days since last transaction</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Customer Account</th>
                        <th className="px-4 py-3">Assigned Territory Staff</th>
                        <th className="px-4 py-3">Last Transaction</th>
                        <th className="px-4 py-3 text-center">Aging Bucket</th>
                        <th className="px-4 py-3 text-right">Outstanding Due</th>
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
              </div>
            </div>
          )}

          {/* TAB 2: SALESMAN COMPARISON MATRIX (Requirement 14) */}
          {activeTab === 'salesman' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Field Staff Efficiency Comparison</h3>
                <p className="text-xs text-slate-500">Benchmarking sales volume vs collection conversion</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Salesman</th>
                      <th className="px-4 py-3 text-right">Credit Sales</th>
                      <th className="px-4 py-3 text-right">Collections</th>
                      <th className="px-4 py-3 text-right">Outstanding Balance</th>
                      <th className="px-4 py-3 text-center">Assigned Customers</th>
                      <th className="px-4 py-3 text-center">Transactions</th>
                      <th className="px-4 py-3 text-center">Collection %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
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
            </div>
          )}

          {/* TAB 3: SALES & REVENUE REPORT */}
          {activeTab === 'sales' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Daily Sales & Credit Log</h3>
                <p className="text-xs text-slate-500">Goods dispatched and billed</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Number of Invoices / Sales</th>
                      <th className="px-4 py-3 text-right">Total Daily Sales</th>
                      <th className="px-4 py-3 text-right">Average Order Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {salesReport.map((row) => (
                      <tr key={row.period_label} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          {formatDate(row.period_label)}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono-num">
                          {row.transaction_count} orders
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
            </div>
          )}

          {/* TAB 4: PAYMENT MODE CHANNELS */}
          {activeTab === 'collections' && collectionReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Method Breakdown */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Payment Method Share</h3>
                  <div className="space-y-3">
                    {collectionReport.byMethod?.map((m) => (
                      <div key={m.payment_method} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{m.payment_method}</p>
                          <p className="text-[11px] text-slate-400">{m.count} payments processed</p>
                        </div>
                        <p className="text-sm font-extrabold font-mono-num text-emerald-600">
                          {formatCurrency(m.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Settlement Verification Status</h3>
                  <div className="space-y-3">
                    {collectionReport.breakdown?.map((b, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{b.payment_method}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mt-1 ${
                            b.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {b.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold font-mono-num text-slate-900 dark:text-white">
                            {formatCurrency(b.total_amount)}
                          </p>
                          <p className="text-[10px] text-slate-400">{b.count} entries</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
