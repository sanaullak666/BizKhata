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

  // Modals state
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
      <div className="space-y-6">
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
    <div className="space-y-6">
      {/* Back button & Customer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {customer.name}
              </h1>
              {customer.business_name && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {customer.business_name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {customer.mobile}</span>
              {customer.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {customer.city}</span>}
            </p>
          </div>
        </div>

        {/* Territory / Staff info */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase font-bold text-slate-400">Territory Salesman</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {customer.assigned_salesman_name || 'Unassigned'}
            </p>
          </div>
          <button
            onClick={() => setShowAssign(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 inline mr-1 text-brand-600" />
            <span>Assign</span>
          </button>
        </div>
      </div>

      {/* Hero Balance & Quick Actions Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Display Hero */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-white via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/40 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Net Outstanding Ledger Balance
              </p>
              <h2 className={`text-3xl sm:text-4xl font-black font-mono-num mt-2 ${
                isReceivable ? 'text-rose-600' : isPayable ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'
              }`}>
                {formatCurrency(customer.current_balance)}
              </h2>
              <p className="text-xs font-semibold mt-1 text-slate-500">
                {isReceivable ? "You'll Get from customer" : isPayable ? "You'll Give (Customer has Advance balance)" : "Account is completely settled"}
              </p>
            </div>

            <div className="text-right text-xs space-y-1">
              <div>
                <span className="text-slate-400">Opening Balance: </span>
                <span className="font-bold font-mono-num">
                  {formatCurrency(customer.opening_balance)}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">
                  ({customer.opening_balance_type === 'owe_business' ? 'Owed' : 'Advance'})
                </span>
              </div>
              {customer.credit_limit > 0 && (
                <div>
                  <span className="text-slate-400">Credit Limit: </span>
                  <span className="font-bold font-mono-num">{formatCurrency(customer.credit_limit)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setTxModal({ isOpen: true, defaultType: 'GAVE' })}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>YOU GAVE (Sale)</span>
            </button>

            <button
              onClick={() => setTxModal({ isOpen: true, defaultType: 'RECEIVED' })}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>YOU RECEIVED (Payment)</span>
            </button>

            <button
              onClick={() => setShowStatement(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-xs"
            >
              <FileText className="w-4 h-4 text-brand-600" />
              <span>Statement</span>
            </button>

            {isReceivable && (
              <button
                onClick={() => setShowReminder(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Reminder</span>
              </button>
            )}
          </div>
        </div>

        {/* Customer Information Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
          <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Account Details</h3>
          
          <div>
            <p className="text-slate-400">Business / Firm</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{customer.business_name || 'Individual'}</p>
          </div>

          <div>
            <p className="text-slate-400">GSTIN / Tax ID</p>
            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{customer.gstin || 'Unregistered'}</p>
          </div>

          <div>
            <p className="text-slate-400">Billing Address</p>
            <p className="text-slate-600 dark:text-slate-300">{customer.address || customer.city || 'Address on file'}</p>
          </div>

          <div>
            <p className="text-slate-400">Ledger Opened</p>
            <p className="text-slate-600 dark:text-slate-300">{formatDate(customer.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Ledger Table (Requirement 15) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Transaction Ledger</h3>
            <p className="text-xs text-slate-500">Complete chronological audit history and running balance</p>
          </div>

          <button
            onClick={() => setShowStatement(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-brand-600" />
            <span>Download Statement PDF</span>
          </button>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            title="No transactions recorded yet"
            description="Use the 'YOU GAVE' or 'YOU RECEIVED' buttons above to record sales and payment collections."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Details / Reference</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right text-rose-600">You Gave (Dr)</th>
                  <th className="px-4 py-3 text-right text-emerald-600">You Received (Cr)</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
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
                          <span className="text-[10px] font-mono text-slate-400">
                            Ref: {tx.reference_number}
                          </span>
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
                            // Find receipt for this transaction if exists
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
        )}
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
