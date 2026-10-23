import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';

export function AssignCustomerModal({ isOpen, onClose, customer, onSuccess }) {
  const { showToast } = useNotification();
  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.get('/salesmen')
        .then((res) => {
          setSalesmen(res.salesmen || []);
        })
        .catch(() => {});

      setSelectedSalesmanId(customer?.assigned_salesman_id || '');
      setNotes('');
    }
  }, [isOpen, customer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer) return;

    setSubmitting(true);
    try {
      await api.post(`/customers/${customer.id}/assign`, {
        salesman_id: selectedSalesmanId || null,
        notes: notes || 'Territory assignment updated by owner',
      });

      showToast('Customer assignment updated successfully!', 'success');
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to update assignment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign / Transfer Customer"
      subtitle={`Manage territory and salesman for ${customer?.name}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500">Currently Assigned To:</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            {customer?.assigned_salesman_name || 'Unassigned (No Salesman)'}
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Select Salesman
          </label>
          <select
            value={selectedSalesmanId}
            onChange={(e) => setSelectedSalesmanId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="">-- Unassign (Owner Direct) --</option>
            {salesmen.map((sm) => (
              <option key={sm.id} value={sm.id}>
                {sm.full_name} ({sm.employee_id || 'Staff'}) — {sm.assigned_customers_count || 0} clients
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Reason / Assignment Notes
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Territory transfer or area realignment..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

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
            className="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-glow-brand transition-all disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Confirm Assignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
