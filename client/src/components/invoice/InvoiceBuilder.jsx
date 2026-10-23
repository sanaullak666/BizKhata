import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../lib/utils';
import { Plus, Trash2, ArrowLeft, Save, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function InvoiceBuilder({ onCreated, backPath = '/invoices' }) {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [applyToLedger, setApplyToLedger] = useState(true);
  const [notes, setNotes] = useState('Payment due within 15 days of invoice date.');
  const [submitting, setSubmitting] = useState(false);

  const [items, setItems] = useState([
    { item_name: 'High-Tensile Fasteners (Box of 500)', description: 'Galvanized Grade 8.8', quantity: 2, unit_price: 1800, discount_percent: 0, tax_percent: 18 },
  ]);

  useEffect(() => {
    api.get('/customers')
      .then((res) => {
        setCustomers(res.customers || []);
        if (res.customers && res.customers.length > 0) {
          setCustomerId(res.customers[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const addItem = () => {
    setItems([
      ...items,
      { item_name: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 18 },
    ]);
  };

  const removeItem = (idx) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx][field] = value;
    setItems(updated);
  };

  // Calculations
  let subtotal = 0;
  let totalTax = 0;
  items.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const disc = Number(item.discount_percent) || 0;
    const tax = Number(item.tax_percent) || 0;
    const base = qty * price;
    const discounted = base - (base * disc / 100);
    const taxAmt = discounted * (tax / 100);
    subtotal += discounted;
    totalTax += taxAmt;
  });
  const grandTotal = subtotal + totalTax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      showToast('Please select a customer', 'error');
      return;
    }

    const invalidItem = items.find(it => !it.item_name.trim() || Number(it.unit_price) <= 0);
    if (invalidItem) {
      showToast('Please provide valid names and prices for all invoice line items.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/invoices', {
        customer_id: customerId,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        items,
        notes,
        apply_to_ledger: applyToLedger,
      });

      showToast(`Invoice ${res.invoiceNumber} created successfully!`, 'success');
      if (onCreated) {
        onCreated(res);
      } else {
        navigate(backPath);
      }
    } catch (e) {
      showToast(e.message || 'Failed to create invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(backPath)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Create Tax Invoice</h1>
            <p className="text-xs text-slate-500">Issue commercial invoice and optionally book into ledger</p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-glow-brand transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{submitting ? 'Creating Invoice...' : 'Save & Issue Invoice'}</span>
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Invoice Information</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Customer *
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
                    {c.name} {c.business_name ? `(${c.business_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Book to Ledger Switch */}
          <div className="p-3 rounded-xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-brand-900 dark:text-brand-300">Book to Customer Digital Khata</p>
              <p className="text-[11px] text-slate-500">Automatically adds a 'YOU GAVE' debit transaction for the total invoice amount</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={applyToLedger}
                onChange={(e) => setApplyToLedger(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>
        </div>

        {/* Line Items Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Line Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 text-xs font-bold hover:bg-brand-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="px-3 py-2.5">Item Name & Description</th>
                  <th className="px-3 py-2.5 w-24">Qty</th>
                  <th className="px-3 py-2.5 w-32">Unit Price (₹)</th>
                  <th className="px-3 py-2.5 w-24">Tax %</th>
                  <th className="px-3 py-2.5 w-24">Disc %</th>
                  <th className="px-3 py-2.5 text-right w-28">Amount</th>
                  <th className="px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, idx) => {
                  const qty = Number(item.quantity) || 0;
                  const price = Number(item.unit_price) || 0;
                  const disc = Number(item.discount_percent) || 0;
                  const tax = Number(item.tax_percent) || 0;
                  const base = qty * price;
                  const discounted = base - (base * disc / 100);
                  const lineTotal = discounted + (discounted * tax / 100);

                  return (
                    <tr key={idx} className="align-top">
                      <td className="px-3 py-2 space-y-1">
                        <input
                          type="text"
                          required
                          placeholder="Item name / Product"
                          value={item.item_name}
                          onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Optional specifications / SKU"
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-[11px] text-slate-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono-num"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono-num"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.tax_percent}
                          onChange={(e) => updateItem(idx, 'tax_percent', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount_percent}
                          onChange={(e) => updateItem(idx, 'discount_percent', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono-num"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-bold font-mono-num text-xs pt-3">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="px-3 py-2 text-center pt-2.5">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          disabled={items.length <= 1}
                          className="text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Subtotals & Grand Total */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Terms & Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
              />
            </div>

            <div className="w-full sm:w-72 space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono-num font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Tax (GST):</span>
                <span className="font-mono-num font-semibold">{formatCurrency(totalTax)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-extrabold text-base text-slate-900 dark:text-white">
                <span>Grand Total:</span>
                <span className="font-mono-num text-brand-600 dark:text-brand-400">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
