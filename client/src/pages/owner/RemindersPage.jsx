import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { BellRing, MessageSquare, Mail, Phone, Search, Users, ExternalLink } from 'lucide-react';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ReminderModal } from '../../components/customer/ReminderModal';

export function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [remRes, custRes] = await Promise.all([
        api.get('/reminders'),
        api.get('/customers?balance_filter=owe_business'),
      ]);
      setReminders(remRes.reminders || []);
      setCustomers(custRes.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Payment Reminders & Recovery
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Automated WhatsApp, SMS and email payment reminders dispatched to outstanding clients
        </p>
      </div>

      {/* Quick Send to Outstanding Customers Tray */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Quick Reminder Dispatch (Overdue Balances)
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {customers.slice(0, 3).map((cust) => (
            <div
              key={cust.id}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{cust.name}</p>
                <p className="text-sm font-black font-mono-num text-rose-600">{formatCurrency(cust.current_balance)}</p>
              </div>

              <button
                onClick={() => setSelectedCustomerId(cust.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Reminder History Table (Requirement 17) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Reminder History Log</h3>
          <p className="text-xs text-slate-500">Audit trail of all reminder messages dispatched</p>
        </div>

        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : reminders.length === 0 ? (
          <EmptyState
            title="No reminders logged yet"
            description="Send a reminder using the button above or from any customer's ledger."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Dispatched At</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Salesman</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Amount Claimed</th>
                  <th className="px-4 py-3">Message Content</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {reminders.map((rem) => (
                  <tr key={rem.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                      {formatDate(rem.sent_at, true)}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {rem.customer_name}
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {rem.salesman_name || 'Owner'}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {rem.reminder_type}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono-num font-bold text-rose-600">
                      {formatCurrency(rem.amount_due)}
                    </td>

                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-sm truncate">
                      {rem.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReminderModal
        isOpen={!!selectedCustomerId}
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </div>
  );
}
