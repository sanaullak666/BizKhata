import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { 
  ArrowLeft, ArrowUpRight, ArrowDownLeft, FileText, MessageSquare, 
  UserCheck, Receipt, Download, Calendar, Phone, MapPin, Building
} from 'lucide-react';
import { AddTransactionModal } from '../../components/transaction/AddTransactionModal';
import { CustomerStatementModal } from '../../components/statement/CustomerStatementModal';
import { ReminderModal } from '../../components/customer/ReminderModal';
import { ReceiptModal } from '../../components/transaction/ReceiptModal';
import { AssignCustomerModal } from '../../components/customer/AssignCustomerModal';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [txModal, setTxModal] = useState({ isOpen: false, defaultType: 'GAVE' });
  const [showStatement, setShowStatement] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [viewReceiptId, setViewReceiptId] = useState(null);

  const fetchCustomerLedger = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers/${id}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerLedger();
  }, [id]);

  if (loading || !data) {
    return (
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  const { customer, transactions, invoices, collections } = data;
  const isReceivable = customer.current_balance > 0;
  const isPayable = customer.current_balance < 0;

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0 pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                {customer.name}
              </h1>
              {customer.business_name && (
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  {customer.business_name}
                </span>
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {customer.mobile}
              </span>
              {customer.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {customer.city}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none sm:text-right">
            <p className="text-[9px] uppercase font-bold text-slate-400">Territory Salesman</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {customer.assigned_salesman_name || 'Unassigned'}
            </p>
          </div>
          <button
            onClick={() => setShowAssign(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shrink-0"
          >
            <UserCheck className="w-3.5 h-3.5 inline mr-1 text-brand-600" />
            <span>Assign</span>
          </button>
        </div>
      </div>

      {/* Hero Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="md:col-span-2 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-white via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/40 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Net Outstanding Ledger Balance
              </p>
              <h2 className={`text-2xl sm:text-4xl font-black font-mono-num mt-1.5 truncate ${
                isReceivable ? 'text-rose-600' : isPayable ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'
              }`}>
                {formatCurrency(customer.current_balance)}
              </h2>
              <p className="text-[11px] sm:text-xs font-semibold mt-1 text-slate-500">
                {isReceivable ? "You'll Get from customer" : isPayable ? "You'll Give (Customer has Advance balance)" : "Account is completely settled"}
              </p>
            </div>

            <div className="text-right text-[10px] sm:text-xs space-y-0.5 shrink-0">
              <div>
                <span className="text-slate-400">Opening: </span>
                <span className="font-bold font-mono-num">
                  {formatCurrency(customer.opening_balance)}
                </span>
                <span className="text-[9px] text-slate-400 ml-1">
                  ({customer.opening_balance_type === 'owe_business' ? 'Owed' : 'Advance'})
                </span>
              </div>
              {customer.credit_limit > 0 && (
                <div>
                  <span className="text-slate-400">Limit: </span>
                  <span className="font-bold font-mono-num">{formatCurrency(customer.credit_limit)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons - responsive wrap */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setTxModal({ isOpen: true, defaultType: 'GAVE' })}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] sm:text-xs font-bold shadow-sm transition-all flex-1 sm:flex-initial min-w-fit"
            >
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>YOU GAVE</span>
            </button>

            <button
              onClick={() => setTxModal({ isOpen: true, defaultType: 'RECEIVED' })}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] sm:text-xs font-bold shadow-sm transition-all flex-1 sm:flex-initial min-w-fit"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>RECEIVED</span>
            </button>

            <button
              onClick={() => setShowStatement(true)}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-slate-50 transition-all shadow-xs flex-1 sm:flex-initial min-w-fit"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600 shrink-0" />
              <span>Statement</span>
            </button>

            {isReceivable && (
              <button
                onClick={() => setShowReminder(true)}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-emerald-100 transition-all flex-1 sm:flex-initial min-w-fit"
              >
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Remind</span>
              </button>
            )}
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 sm:space-y-3 text-xs">
          <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Account Details</h3>
          <div>
            <p className="text-slate-400 text-[10px]">Business / Firm</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{customer.business_name || 'Individual'}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px]">GSTIN / Tax ID</p>
            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{customer.gstin || 'Unregistered'}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px]">Billing Address</p>
            <p className="text-slate-600 dark:text-slate-300">{customer.address || customer.city || 'Address on file'}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px]">Ledger Opened</p>
            <p className="text-slate-600 dark:text-slate-300">{formatDate(customer.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Ledger: Table + Mobile Cards */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">Transaction Ledger</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Complete chronological audit history and running balance</p>
          </div>

          <button
            onClick={() => setShowStatement(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors w-full sm:w-auto"
          >
            <Download className="w-3.5 h-3.5 text-brand-600" />
            <span>Download PDF</span>
          </button>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            title="No transactions recorded yet"
            description="Use the 'YOU GAVE' or 'YOU RECEIVED' buttons above to record sales and payment collections."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Details / Reference</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right text-rose-600">You Gave</th>
                    <th className="px-4 py-3 text-right text-emerald-600">You Received</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <p className="font-semibold text-slate-900 dark:text-white">{formatDate(tx.date)}</p>
                        <p className="text-[10px] text-slate-400">{tx.time?.slice(0, 5)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {tx.reference_number && (
                            <span className="text-[10px] font-mono text-slate-400">Ref: {tx.reference_number}</span>
                          )}
                          <span className="text-[10px] text-slate-400 font-semibold">
                            By: {tx.salesman_name || 'Owner'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-extrabold text-sm text-rose-600">
                        {tx.type === 'GAVE' ? formatCurrency(tx.amount) : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-extrabold text-sm text-emerald-600">
                        {tx.type === 'RECEIVED' ? formatCurrency(tx.amount) : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-extrabold text-sm text-slate-900 dark:text-white">
                        {formatCurrency(tx.running_balance)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {tx.type === 'RECEIVED' ? (
                          <button
                            onClick={() => {
                              api.get(`/receipts?customer_id=${customer.id}`)
                                .then((r) => {
                                  const matched = r.receipts?.find(rc => rc.transaction_id === tx.id);
                                  if (matched) setViewReceiptId(matched.id);
                                  else setViewReceiptId(r.receipts[0]?.id);
                                })
                                .catch(() => {});
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="View / Download Receipt"
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

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{tx.description}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {formatDate(tx.date)} · {tx.payment_method} · {tx.salesman_name || 'Owner'}
                      </p>
                    </div>
                    <span className={`text-sm font-black font-mono-num shrink-0 ${
                      tx.type === 'GAVE' ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {tx.type === 'GAVE' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                    <span className="text-slate-500 font-mono">
                      Bal: {formatCurrency(tx.running_balance)}
                    </span>
                    {tx.type === 'RECEIVED' && (
                      <button
                        onClick={() => {
                          api.get(`/receipts?customer_id=${customer.id}`)
                            .then((r) => {
                              const matched = r.receipts?.find(rc => rc.transaction_id === tx.id);
                              if (matched) setViewReceiptId(matched.id);
                              else setViewReceiptId(r.receipts[0]?.id);
                            })
                            .catch(() => {});
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-bold"
                      >
                        <Receipt className="w-3 h-3" />
                        Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 inset-x-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 lg:hidden flex gap-2 shadow-lg">
        <button
          onClick={() => setTxModal({ isOpen: true, defaultType: 'GAVE' })}
          className="flex-1 py-3 bg-rose-600 active:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-98"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>YOU GAVE ₹</span>
        </button>
        <button
          onClick={() => setTxModal({ isOpen: true, defaultType: 'RECEIVED' })}
          className="flex-1 py-3 bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-98"
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>YOU GOT ₹</span>
        </button>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={txModal.isOpen}
        defaultType={txModal.defaultType}
        defaultCustomerId={customer.id}
        onClose={() => setTxModal({ isOpen: false, defaultType: 'GAVE' })}
        onSuccess={() => fetchCustomerLedger()}
      />

      <CustomerStatementModal
        isOpen={showStatement}
        customerId={customer.id}
        onClose={() => setShowStatement(false)}
      />

      <ReminderModal
        isOpen={showReminder}
        customerId={customer.id}
        onClose={() => setShowReminder(false)}
      />

      <AssignCustomerModal
        isOpen={showAssign}
        customer={customer}
        onClose={() => setShowAssign(false)}
        onSuccess={() => fetchCustomerLedger()}
      />

      <ReceiptModal
        isOpen={!!viewReceiptId}
        receiptId={viewReceiptId}
        onClose={() => setViewReceiptId(null)}
      />
    </div>
  );
}
