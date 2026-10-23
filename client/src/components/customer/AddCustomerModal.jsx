import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export function AddCustomerModal({ isOpen, onClose, onSuccess }) {
  const { isOwner } = useAuth();
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    gstin: '',
    opening_balance_type: 'owe_business', // 'owe_business' or 'business_owes'
    opening_balance: '',
    credit_limit: '50000',
    notes: '',
    assigned_salesman_id: '',
  });

  const [salesmen, setSalesmen] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && isOwner) {
      api.get('/salesmen')
        .then((res) => setSalesmen(res.salesmen || []))
        .catch(() => {});
    }
  }, [isOpen, isOwner]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      showToast('Name and mobile number are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/customers', {
        ...formData,
        opening_balance: Number(formData.opening_balance) || 0,
        credit_limit: Number(formData.credit_limit) || 0,
      });

      showToast('Customer added successfully!', 'success');
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to add customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer" subtitle="Create customer ledger and set opening balance" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Business */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahman Khan"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Business / Store Name
            </label>
            <input
              type="text"
              placeholder="e.g. Rahman Traders"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Mobile Number (WhatsApp) *
            </label>
            <input
              type="tel"
              required
              placeholder="10-digit mobile"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="customer@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Opening Balance Settings (Requirement 16) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Opening Balance Configuration
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                formData.opening_balance_type === 'owe_business'
                  ? 'border-rose-300 bg-rose-50/60 text-rose-800 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-200'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <input
                type="radio"
                name="balance_type"
                checked={formData.opening_balance_type === 'owe_business'}
                onChange={() => setFormData({ ...formData, opening_balance_type: 'owe_business' })}
                className="text-rose-600 focus:ring-rose-500"
              />
              <span>Customer Owes Business (Receivable)</span>
            </label>

            <label
              className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                formData.opening_balance_type === 'business_owes'
                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <input
                type="radio"
                name="balance_type"
                checked={formData.opening_balance_type === 'business_owes'}
                onChange={() => setFormData({ ...formData, opening_balance_type: 'business_owes' })}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>Business Owes Customer (Advance)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Opening Balance Amount (₹)
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono-num focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                placeholder="50000"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono-num focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Address and City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              City / Locality
            </label>
            <input
              type="text"
              placeholder="e.g. Mumbai"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              GSTIN (Optional)
            </label>
            <input
              type="text"
              placeholder="27AABCR9912C1ZT"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Assigned Salesman (if Owner) */}
        {isOwner && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Assign to Salesman (Territory)
            </label>
            <select
              value={formData.assigned_salesman_id}
              onChange={(e) => setFormData({ ...formData, assigned_salesman_id: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">-- Unassigned (Assign Later) --</option>
              {salesmen.map((sm) => (
                <option key={sm.id} value={sm.id}>
                  {sm.full_name} ({sm.employee_id || 'Staff'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Buttons */}
        <div className="pt-3 flex justify-end gap-3">
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
            className="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-glow-brand transition-all disabled:opacity-50"
          >
            {submitting ? 'Creating Customer...' : 'Save & Open Ledger'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
