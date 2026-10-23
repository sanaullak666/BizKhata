import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { generateInvoicePDF } from '../../lib/pdfGenerator';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Download, Printer, Check, Share2, CheckCircle2 } from 'lucide-react';
import { Badge } from '../common/Badge';

export function InvoiceViewModal({ isOpen, onClose, invoiceId, onUpdated }) {
  const { showToast } = useNotification();
  const [data, setData] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchInvoice = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const [invRes, bizRes] = await Promise.all([
        api.get(`/invoices/${invoiceId}`),
        api.get('/business'),
      ]);
      setData(invRes);
      setBusiness(bizRes.business);
    } catch (e) {
      showToast('Failed to load invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoice();
    }
  }, [isOpen, invoiceId]);

  const handleDownloadPDF = () => {
    if (!data?.invoice || !business) return;
    generateInvoicePDF(data.invoice, data.items || [], business);
    showToast('Invoice PDF downloaded!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMarkPaid = async () => {
    try {
      await api.post(`/invoices/${invoiceId}/status`, { status: 'paid' });
      showToast('Invoice marked as Paid!', 'success');
      fetchInvoice();
      onUpdated && onUpdated();
    } catch (e) {
      showToast('Failed to update invoice status', 'error');
    }
  };

  const handleCopyPublicLink = async () => {
    const url = `${window.location.origin}/invoice/${invoiceId}/public`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast('Public invoice link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  if (!isOpen) return null;

  const inv = data?.invoice;
  const items = data?.items || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={inv ? `Invoice ${inv.invoice_number}` : 'Invoice'}
      subtitle={inv ? `Billed to ${inv.customer_name}` : 'Loading...'}
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
          Loading invoice details...
        </div>
      ) : inv ? (
        <div className="space-y-4">
          {/* Action buttons header */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <Badge
                variant={
                  inv.status === 'paid'
                    ? 'success'
                    : inv.status === 'partially_paid'
                    ? 'warning'
                    : inv.status === 'overdue'
                    ? 'danger'
                    : 'brand'
                }
              >
                {inv.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {inv.status !== 'paid' && (
                <button
                  onClick={handleMarkPaid}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Paid</span>
                </button>
              )}
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                <Download className="w-3.5 h-3.5 text-brand-600" />
                <span>PDF</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={handleCopyPublicLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Invoice Visual Paper */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{business?.name}</h3>
                <p className="text-xs text-slate-500">{business?.address}</p>
                <p className="text-xs text-slate-400">GSTIN: {business?.gstin || '-'}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs uppercase font-bold text-slate-400">Tax Invoice</p>
                <p className="text-lg font-extrabold text-brand-600 dark:text-brand-400 font-mono-num">{inv.invoice_number}</p>
                <p className="text-xs text-slate-500">Date: {formatDate(inv.invoice_date)}</p>
                {inv.due_date && <p className="text-xs text-slate-400">Due: {formatDate(inv.due_date)}</p>}
              </div>
            </div>

            {/* Bill To */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Bill To</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{inv.customer_name}</p>
              {inv.customer_biz && <p className="font-semibold text-slate-600 dark:text-slate-300">{inv.customer_biz}</p>}
              <p className="text-slate-500 mt-1">Mobile: {inv.customer_mobile || '-'}</p>
              {inv.customer_gstin && <p className="text-slate-500 font-mono">GSTIN: {inv.customer_gstin}</p>}
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Item Description</th>
                    <th className="px-3 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Price</th>
                    <th className="px-3 py-2.5 text-center">Tax %</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">
                        {item.item_name}
                        {item.description && <p className="text-[10px] text-slate-400 font-normal">{item.description}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono-num">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right font-mono-num">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2.5 text-center font-mono-num">{item.tax_percent}%</td>
                      <td className="px-3 py-2.5 text-right font-mono-num font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculation Totals */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
              <div className="text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Payment Instructions:</p>
                <p>UPI ID: {business?.upi_id || 'apexsupplies@hdfcbank'}</p>
                <p>Bank: {business?.bank_name} | A/C: {business?.bank_account_no}</p>
                <p>IFSC: {business?.bank_ifsc}</p>
              </div>

              <div className="w-full sm:w-64 space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono-num">{formatCurrency(inv.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Total Tax:</span>
                  <span className="font-mono-num">{formatCurrency(inv.tax_amount)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                  <span>Total Amount:</span>
                  <span className="font-mono-num text-brand-600 dark:text-brand-400">{formatCurrency(inv.total_amount)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Paid Amount:</span>
                  <span className="font-mono-num text-emerald-600 font-bold">{formatCurrency(inv.paid_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
