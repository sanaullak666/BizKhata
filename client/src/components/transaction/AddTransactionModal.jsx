import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../lib/utils';
import { ArrowUpRight, ArrowDownLeft, Calendar, Clock, CreditCard, Hash } from 'lucide-react';

export function AddTransactionModal({ isOpen, onClose, defaultCustomerId, defaultType = 'GAVE', onSuccess }) {
  const { showToast } = useNotification();
  const [customers, setCustomers] = useState([]);
  const [type, setType] = useState(defaultType); // 'GAVE' or 'RECEIVED'
  const [customerId, setCustomerId] = useState(defaultCustomerId || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      if (defaultCustomerId) {
        setCustomerId(defaultCustomerId);
      }
      setAmount('');
      setDescription('');
      setReferenceNumber('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().split(' ')[0].slice(0, 5));

      // Fetch customer list
      api.get('/customers')
        .then((res) => {
          setCustomers(res.customers || []);
          if (!defaultCustomerId && res.customers && res.customers.length > 0) {
            setCustomerId(res.customers[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, defaultCustomerId, defaultType]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Calculate live preview balance
  const currentBalance = selectedCustomer ? Number(selectedCustomer.current_balance) || 0 : 0;
  const numAmount = Number(amount) || 0;
  const projectedBalance = type === 'GAVE'
    ? currentBalance + numAmount
    : currentBalance - numAmount;

  const quickChips = [500, 1000, 2000, 5000, 10000];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      showToast('Please select a customer.', 'error');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid amount greater than 0.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/transactions', {
        customer_id: customerId,
        type,
        amount: numAmount,
        date,
        time: time + ':00',
        description: description || (type === 'GAVE' ? 'Goods supplied / Sale' : 'Payment received'),
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes,
      });

      showToast(`${type === 'GAVE' ? 'Sale' : 'Payment'} recorded successfully!`, 'success');
      onSuccess && onSuccess(res);
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to record transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'GAVE' ? 'Record Sale (You Gave)' : 'Receive Payment (You Received)'}
      subtitle="Entries automatically update ledger and running balances"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Type Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setType('GAVE')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              type === 'GAVE'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>YOU GAVE (Sale / Credit)</span>
          </button>

          <button
            type="button"
            onClick={() => setType('RECEIVED')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              type === 'RECEIVED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>YOU RECEIVED (Payment)</span>
          </button>
        </div>

        {/* Customer Select */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Customer *
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="">-- Choose Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.business_name ? `(${c.business_name})` : ''} — Current: {formatCurrency(c.current_balance)}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input with Quick Chips */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Amount (₹) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-lg font-bold text-slate-400">₹</span>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xl font-extrabold font-mono-num rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Quick denomination chips */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
            <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick:</span>
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setAmount(String((Number(amount) || 0) + chip))}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono-num transition-colors"
              >
                +{chip}
              </button>
            ))}
            {amount && (
              <button
                type="button"
                onClick={() => setAmount('')}
                className="px-2 py-1 text-xs text-rose-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Live balance impact preview */}
        {selectedCustomer && numAmount > 0 && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Current Balance: </span>
              <span className="font-bold font-mono-num">{formatCurrency(currentBalance)}</span>
            </div>
            <div>
              <span className="text-slate-500">Projected Balance: </span>
              <span className={`font-extrabold font-mono-num ${projectedBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(projectedBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Payment Method and Reference Number */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Debit / Credit Card</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" /> Ref / Cheque #
            </label>
            <input
              type="text"
              placeholder="e.g. UPI-992019"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Description / Item Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Description / Item Details
          </label>
          <input
            type="text"
            placeholder={type === 'GAVE' ? 'e.g. 5 boxes drill bits & safety gear' : 'e.g. Part payment collected'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm transition-all disabled:opacity-50 ${
              type === 'GAVE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {submitting ? 'Recording Entry...' : `Save ${type === 'GAVE' ? 'Sale (Gave)' : 'Payment (Received)'}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
