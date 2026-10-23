import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { generateReceiptPDF } from '../../lib/pdfGenerator';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Printer, Download, Share2, Check, MessageSquare } from 'lucide-react';

export function ReceiptModal({ isOpen, onClose, receiptId }) {
  const { showToast } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && receiptId) {
      setLoading(true);
      api.get(`/receipts/${receiptId}`)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch(() => {
          showToast('Failed to load receipt', 'error');
          setLoading(false);
        });
    }
  }, [isOpen, receiptId]);

  const handleDownloadPDF = () => {
    if (!data?.receipt) return;
    generateReceiptPDF(data.receipt, data.business);
    showToast('Receipt PDF downloaded successfully!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!data?.receipt) return;
    const { receipt, business } = data;
    const msg = `*Payment Receipt: ${receipt.receipt_number}*\n\nDear ${receipt.customer_name},\nWe gratefully acknowledge receipt of *${formatCurrency(receipt.amount)}* via *${receipt.payment_method}* on ${formatDate(receipt.receipt_date)}.\nRemaining Balance: *${formatCurrency(receipt.remaining_balance)}*.\n\nThank you for choosing *${business.name}*!`;
    const cleanPhone = (receipt.customer_mobile || '').replace(/\D/g, '');
    const phone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/receipts/${receiptId}/public`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast('Public receipt link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Receipt" subtitle={data?.receipt?.receipt_number} maxWidth="max-w-md">
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400 animate-pulse">
          Loading receipt details...
        </div>
      ) : data?.receipt ? (
        <div className="space-y-4 text-left">
          {/* Printable Receipt Paper Container */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            {/* Business Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{data.business?.name}</h4>
              <p className="text-xs text-slate-500">{data.business?.address}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                GSTIN: {data.business?.gstin || '-'} | Phone: {data.business?.phone}
              </p>
            </div>

            {/* Receipt Meta */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Receipt Number</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{data.receipt.receipt_number}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Receipt Date</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(data.receipt.receipt_date)}</p>
              </div>
            </div>

            {/* Customer Box */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
              <p className="text-slate-400 uppercase text-[10px] font-bold">Received From</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{data.receipt.customer_name}</p>
              {data.receipt.customer_biz && (
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{data.receipt.customer_biz}</p>
              )}
              <p className="text-slate-500 mt-0.5">Mobile: {data.receipt.customer_mobile || '-'}</p>
            </div>

            {/* Amount Box */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Amount Received
              </p>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num mt-1">
                {formatCurrency(data.receipt.amount)}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mt-1">
                Via {data.receipt.payment_method} {data.receipt.reference_number ? `(${data.receipt.reference_number})` : ''}
              </p>
            </div>

            {/* Ledger status */}
            <div className="pt-1 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
              <span>Remaining Balance:</span>
              <span className="font-bold font-mono-num text-slate-900 dark:text-white">
                {formatCurrency(data.receipt.remaining_balance)}
              </span>
            </div>

            {data.receipt.salesman_name && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Collected By:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{data.receipt.salesman_name}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Link'}</span>
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
