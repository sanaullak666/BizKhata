import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { 
  ArrowLeft, Users, TrendingUp, Coins, ShieldCheck, 
  ArrowRight, Phone, Mail, MapPin, Calendar, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { TableSkeleton } from '../../components/common/Skeleton';
import { StatCard } from '../../components/common/StatCard';

export function SalesmanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/salesmen/${id}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const { salesman, assignedCustomers, metrics, monthlyTrend, recentTransactions } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/salesmen')}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {salesman.full_name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {salesman.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
              <span>{salesman.designation} • {salesman.employee_id}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {salesman.mobile}</span>
              {salesman.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {salesman.email}</span>}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/permissions')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 shadow-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <span>Staff Permissions</span>
        </button>
      </div>

      {/* KPI Cards (Requirement 13) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          title="Assigned Customers"
          value={metrics.customerCount}
          subtitle="Territory accounts"
          icon={Users}
          variant="brand"
        />

        <StatCard
          title="Total Sales"
          value={formatCurrency(metrics.totalSales)}
          subtitle="Goods credit supplied"
          icon={TrendingUp}
          variant="default"
        />

        <StatCard
          title="Total Collections"
          value={formatCurrency(metrics.totalCollections)}
          subtitle="Recovered & settled"
          icon={Coins}
          variant="emerald"
        />

        <StatCard
          title="Market Outstanding"
          value={formatCurrency(metrics.totalOutstanding)}
          subtitle="Dues from assigned clients"
          icon={AlertTriangle}
          variant="rose"
        />

        <StatCard
          title="Collection Rate"
          value={`${metrics.collectionRate}%`}
          subtitle="Recovery efficiency"
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      {/* Visual Chart Bars (Requirement 13) */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Sales & Collections Track Record</h3>
          <p className="text-xs text-slate-500">Monthly recovery performance</p>
        </div>

        <div className="space-y-3 pt-2">
          {monthlyTrend.map((m) => {
            const maxVal = Math.max(m.sales, m.collections, 1);
            const salesWidth = `${Math.min(100, Math.round((m.sales / maxVal) * 100))}%`;
            const colWidth = `${Math.min(100, Math.round((m.collections / maxVal) * 100))}%`;

            return (
              <div key={m.month} className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Month: {m.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-rose-600">Sales: {formatCurrency(m.sales)}</span>
                    <span className="text-emerald-600">Collections: {formatCurrency(m.collections)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: salesWidth }} />
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: colWidth }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Assigned Customers & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Customers */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Assigned Customers ({assignedCustomers.length})</h3>
              <p className="text-xs text-slate-500">Only accessible by {salesman.full_name}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {assignedCustomers.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-[11px] text-slate-500">{c.business_name || c.city || c.mobile}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-black font-mono-num ${c.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(c.current_balance)}
                  </p>
                  <p className="text-[10px] text-slate-400">Assigned: {formatDate(c.assigned_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Recent Activities</h3>
              <p className="text-xs text-slate-500">Recent entries posted by this agent</p>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{tx.customer_name}</p>
                  <p className="text-[11px] text-slate-500">{tx.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.date)} • {tx.payment_method}</p>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-extrabold font-mono-num ${tx.type === 'GAVE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {tx.type === 'GAVE' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    {tx.type === 'GAVE' ? 'Sale' : 'Payment'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
