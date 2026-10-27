import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, downloadBlob } from '../../lib/utils';
import { Badge } from '../../components/common/Badge';
import { 
  Users, Search, Filter, Plus, ArrowUpRight, ArrowDownLeft, 
  MessageSquare, UserCheck, MoreVertical, Download, Trash2, Edit2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddCustomerModal } from '../../components/customer/AddCustomerModal';
import { AssignCustomerModal } from '../../components/customer/AssignCustomerModal';
import { ReminderModal } from '../../components/customer/ReminderModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

export function CustomersPage() {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [customers, setCustomers] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [summary, setSummary] = useState({ totalCustomers: 0, totalReceivable: 0, totalPayable: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('');

  // Modals state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [assignCustomer, setAssignCustomer] = useState(null);
  const [reminderCustomerId, setReminderCustomerId] = useState(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      let query = `/customers?search=${encodeURIComponent(search)}`;
      if (salesmanId) query += `&salesman_id=${salesmanId}`;
      if (balanceFilter) query += `&balance_filter=${balanceFilter}`;

      const [cRes, sRes] = await Promise.all([
        api.get(query),
        api.get('/salesmen'),
      ]);

      setCustomers(cRes.customers || []);
      setSummary(cRes.summary || {});
      setSalesmen(sRes.salesmen || []);
    } catch (err) {
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, salesmanId, balanceFilter]);

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerId) return;
    setDeleting(true);
    try {
      await api.delete(`/customers/${deleteCustomerId}`);
      showToast('Customer deleted successfully.', 'success');
      setDeleteCustomerId(null);
      fetchCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to delete customer', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await api.get('/backup/export-csv/customers');
      downloadBlob(blob, `Grihalakshmi-Customers-${new Date().toISOString().slice(0, 10)}.csv`);
      showToast('Customers exported to CSV!', 'success');
    } catch (e) {
      showToast('Failed to export CSV', 'error');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-tight">
            Customer Ledgers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Accounts, live credit/debit balances, territory assignments & payment tracking
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

          <button
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-glow-brand transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Mini Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Accounts</p>
            <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono-num">
              {summary.totalCustomers}
            </p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-950 shadow-subtle flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-500">Total Receivable</p>
            <p className="text-lg sm:text-2xl font-black text-rose-600 mt-1 font-mono-num truncate">
              {formatCurrency(summary.totalReceivable)}
            </p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 shrink-0">
            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-950 shadow-subtle flex items-center justify-between xs:col-span-2 sm:col-span-1">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600">Total Payable</p>
            <p className="text-lg sm:text-2xl font-black text-emerald-600 mt-1 font-mono-num truncate">
              {formatCurrency(summary.totalPayable)}
            </p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 shrink-0">
            <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2.5 sm:gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by customer name, store, mobile or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={salesmanId}
            onChange={(e) => setSalesmanId(e.target.value)}
            className="w-full px-2 sm:px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="">All Salesmen</option>
            <option value="unassigned">Unassigned</option>
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.employee_id || 'Staff'})
              </option>
            ))}
          </select>

          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value)}
            className="w-full px-2 sm:px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="">All Balances</option>
            <option value="owe_business">Owes Business (&gt; 0)</option>
            <option value="business_owes">Business Owes (&lt; 0)</option>
            <option value="zero">Settled (= 0)</option>
          </select>
        </div>
      </div>

      {/* Customers Table: Desktop Table + Mobile Cards */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 sm:p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers match your criteria"
            description="Try modifying your search or filter terms, or add a new customer to get started."
            action={
              <button
                onClick={() => setShowAddCustomer(true)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Add Customer
              </button>
            }
          />
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Customer & Business</th>
                    <th className="px-4 py-3">Assigned Salesman</th>
                    <th className="px-4 py-3">City / Contact</th>
                    <th className="px-4 py-3 text-right">Credit Limit</th>
                    <th className="px-4 py-3 text-right">Ledger Balance</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customers.map((c) => {
                    const isReceivable = c.current_balance > 0;
                    const isPayable = c.current_balance < 0;
                    const isZero = c.current_balance === 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => navigate(`/customers/${c.id}`)}
                            className="text-left group"
                          >
                            <p className="font-extrabold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {c.business_name || 'Retail Buyer'}
                            </p>
                          </button>
                        </td>

                        <td className="px-4 py-3.5">
                          {c.assigned_salesman_name ? (
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {c.assigned_salesman_name}
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAssignCustomer(c)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Assign Salesman</span>
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{c.city || 'Mumbai'}</p>
                          <p className="text-[11px] font-mono">{c.mobile}</p>
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono-num text-slate-500">
                          {c.credit_limit ? formatCurrency(c.credit_limit) : '-'}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`text-sm font-black font-mono-num ${
                              isReceivable
                                ? 'text-rose-600'
                                : isPayable
                                ? 'text-emerald-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {formatCurrency(c.current_balance)}
                          </span>
                          <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                            {isReceivable ? "You'll Get" : isPayable ? "You'll Give" : 'Settled'}
                          </p>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/customers/${c.id}`)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                            >
                              Ledger
                            </button>

                            {isReceivable && (
                              <button
                                onClick={() => setReminderCustomerId(c.id)}
                                title="Send WhatsApp Payment Reminder"
                                className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => setAssignCustomer(c)}
                              title="Assign or Transfer Territory"
                              className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setDeleteCustomerId(c.id)}
                              title="Delete customer"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {customers.map((c) => {
                const isReceivable = c.current_balance > 0;
                const isPayable = c.current_balance < 0;
                const isZero = c.current_balance === 0;
                const initials = c.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'C';

                return (
                  <div key={c.id} className="p-3.5 active:bg-slate-50 dark:active:bg-slate-800/40">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => navigate(`/customers/${c.id}`)}
                            className="text-sm font-bold text-slate-900 dark:text-white text-left truncate block w-full leading-tight"
                          >
                            {c.name}
                          </button>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {c.business_name || c.mobile || c.city || 'Retail Buyer'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm font-black font-mono-num block ${
                          isReceivable
                            ? 'text-rose-600'
                            : isPayable
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }`}>
                          {formatCurrency(c.current_balance)}
                        </span>
                        <span className={`text-[9px] uppercase font-bold ${
                          isReceivable ? 'text-rose-500' : isPayable ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {isZero ? 'Settled' : isReceivable ? 'Due' : 'Advance'}
                        </span>
                      </div>
                    </div>

                    {/* Salesman indicator */}
                    {c.assigned_salesman_name && (
                      <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                        Assigned: {c.assigned_salesman_name}
                      </p>
                    )}

                    {/* Action bar */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold active:bg-slate-200"
                        >
                          Ledger
                        </button>

                        {isReceivable && (
                          <button
                            onClick={() => setReminderCustomerId(c.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold active:bg-emerald-100"
                          >
                            Remind
                          </button>
                        )}

                        <button
                          onClick={() => setAssignCustomer(c)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold active:bg-indigo-100"
                        >
                          Assign
                        </button>
                      </div>

                      <button
                        onClick={() => setDeleteCustomerId(c.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Global Modals */}
      <AddCustomerModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSuccess={() => fetchCustomers()}
      />

      <AssignCustomerModal
        isOpen={!!assignCustomer}
        customer={assignCustomer}
        onClose={() => setAssignCustomer(null)}
        onSuccess={() => fetchCustomers()}
      />

      <ReminderModal
        isOpen={!!reminderCustomerId}
        customerId={reminderCustomerId}
        onClose={() => setReminderCustomerId(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteCustomerId}
        title="Delete Customer Account"
        message="Are you sure you want to delete this customer? All transaction history and ledger statements will be permanently removed."
        confirmText="Delete Customer"
        loading={deleting}
        onConfirm={handleDeleteCustomer}
        onClose={() => setDeleteCustomerId(null)}
      />
    </div>
  );
}
