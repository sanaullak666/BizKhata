import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Badge } from '../../components/common/Badge';
import { FileText, Plus, Search, Download, Printer, Eye, Share2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InvoiceViewModal } from '../../components/invoice/InvoiceViewModal';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useNotification } from '../../context/NotificationContext';

export function InvoicesPage() {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let query = `/invoices?`;
      if (status) query += `status=${status}&`;
      const res = await api.get(query);
      setInvoices(res.invoices || []);
      setSummary(res.summary || {});
    } catch (e) {
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [status]);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-tight">
            Tax Invoices & Billing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Generate GST-compliant tax invoices, track payment status & export PDF
          </p>
        </div>

        <button
          onClick={() => navigate('/invoices/new')}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-glow-brand transition-all w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* KPI Mini Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Total Invoiced</p>
            <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono-num mt-1 truncate">
              {formatCurrency(summary.totalInvoiced)}
            </p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-950 shadow-subtle flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600">Collected</p>
            <p className="text-lg sm:text-2xl font-black text-emerald-600 font-mono-num mt-1 truncate">
              {formatCurrency(summary.totalPaid)}
            </p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-950 shadow-subtle flex items-center justify-between xs:col-span-2 sm:col-span-1">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-500">Pending</p>
            <p className="text-lg sm:text-2xl font-black text-rose-600 font-mono-num mt-1 truncate">
              {formatCurrency(summary.totalPending)}
            </p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2.5 sm:gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search invoice number, customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none"
          />
        </div>

        <div className="w-full">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 sm:p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="Create your first GST invoice using the builder."
            action={
              <button
                onClick={() => navigate('/invoices/new')}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
              >
                Create Invoice
              </button>
            }
          />
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Tax (GST)</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-bold font-mono text-brand-600 dark:text-brand-400">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{inv.customer_name}</p>
                        {inv.customer_biz && <p className="text-[11px] text-slate-500">{inv.customer_biz}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {inv.due_date ? formatDate(inv.due_date) : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num text-slate-600 dark:text-slate-400">
                        {formatCurrency(inv.tax_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-black text-sm text-slate-900 dark:text-white">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={
                            inv.status === 'paid' ? 'success'
                            : inv.status === 'partially_paid' ? 'warning'
                            : inv.status === 'overdue' ? 'danger'
                            : 'brand'
                          }
                        >
                          {inv.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className="p-3.5 active:bg-slate-50 dark:active:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                        {inv.invoice_number}
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                        {inv.customer_name}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {formatDate(inv.invoice_date)} {inv.due_date && `· Due ${formatDate(inv.due_date)}`}
                      </p>
                    </div>
                    <span className="text-sm font-black font-mono-num text-slate-900 dark:text-white shrink-0">
                      {formatCurrency(inv.total_amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Badge
                      variant={
                        inv.status === 'paid' ? 'success'
                        : inv.status === 'partially_paid' ? 'warning'
                        : inv.status === 'overdue' ? 'danger'
                        : 'brand'
                      }
                    >
                      {inv.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <button
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold active:bg-slate-200"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <InvoiceViewModal
        isOpen={!!selectedInvoiceId}
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        onUpdated={() => fetchInvoices()}
      />
    </div>
  );
}
