import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Search, Plus, Phone, MessageSquare, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddCustomerModal } from '../../components/customer/AddCustomerModal';
import { AddTransactionModal } from '../../components/transaction/AddTransactionModal';
import { ReminderModal } from '../../components/customer/ReminderModal';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

export function MyCustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [txModal, setTxModal] = useState({ isOpen: false, customerId: null, defaultType: 'GAVE' });
  const [reminderCustomerId, setReminderCustomerId] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers?search=${encodeURIComponent(search)}`);
      setCustomers(res.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 250);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            My Customers ({customers.length})
          </h1>
          <p className="text-xs text-slate-500">Only showing clients assigned to your territory</p>
        </div>

        <button
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search assigned clients by name, shop or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Customer Cards List */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers assigned"
          description="Contact your business owner to assign territory accounts, or register a new customer."
          action={
            <button
              onClick={() => setShowAddCustomer(true)}
              className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl"
            >
              Add New Customer
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {customers.map((c) => {
            const isReceivable = c.current_balance > 0;
            const isPayable = c.current_balance < 0;

            return (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 hover:border-brand-300 dark:hover:border-brand-700 transition-all"
              >
                <div
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="cursor-pointer flex items-start justify-between"
                >
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white hover:text-brand-600">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{c.business_name || 'Retail Client'}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.mobile} • {c.city || 'Mumbai'}</p>
                  </div>

                  <div className="text-right">
                    <p className={`text-lg font-black font-mono-num ${isReceivable ? 'text-rose-600' : isPayable ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {formatCurrency(c.current_balance)}
                    </p>
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      {isReceivable ? "You'll Get" : isPayable ? "You'll Give" : 'Settled'}
                    </span>
                  </div>
                </div>

                {/* Quick actions for salesman */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${c.mobile}`}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                      title="Call Client"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    {isReceivable && (
                      <button
                        onClick={() => setReminderCustomerId(c.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Remind</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTxModal({ isOpen: true, customerId: c.id, defaultType: 'GAVE' })}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 text-xs font-bold hover:bg-rose-100"
                    >
                      + Sale (Gave)
                    </button>

                    <button
                      onClick={() => setTxModal({ isOpen: true, customerId: c.id, defaultType: 'RECEIVED' })}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                    >
                      Receive (Got)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddCustomerModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSuccess={() => fetchCustomers()}
      />

      <AddTransactionModal
        isOpen={txModal.isOpen}
        defaultCustomerId={txModal.customerId}
        defaultType={txModal.defaultType}
        onClose={() => setTxModal({ isOpen: false, customerId: null, defaultType: 'GAVE' })}
        onSuccess={() => fetchCustomers()}
      />

      <ReminderModal
        isOpen={!!reminderCustomerId}
        customerId={reminderCustomerId}
        onClose={() => setReminderCustomerId(null)}
      />
    </div>
  );
}
