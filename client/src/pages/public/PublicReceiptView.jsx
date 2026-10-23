import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { generateReceiptPDF } from '../../lib/pdfGenerator';
import { Download, Printer, CheckCircle2 } from 'lucide-react';

export function PublicReceiptView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/receipts/${id}/public`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [id]);

  const handleDownloadPDF = () => {
    if (!data?.receipt || !data?.business) return;
    generateReceiptPDF(data.receipt, data.business);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <p className="text-sm font-bold text-slate-500 animate-pulse">Loading Receipt...</p>
      </div>
    );
  }

  if (!data?.receipt) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="p-8 rounded-2xl bg-white shadow text-center max-w-sm">
          <p className="text-base font-bold text-slate-800">Receipt Not Found</p>
          <p className="text-xs text-slate-500 mt-1">This link may be invalid.</p>
        </div>
      </div>
    );
  }

  const { business, receipt } = data;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Official Receipt
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-900">{business.name}</h2>
            <p className="text-xs text-slate-500">{business.address}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Phone: {business.phone} • GSTIN: {business.gstin}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase text-[10px]">Receipt #</p>
              <p className="font-mono font-bold text-slate-800">{receipt.receipt_number}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Date</p>
              <p className="font-bold text-slate-800">{formatDate(receipt.receipt_date)}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <p className="text-slate-400 uppercase text-[10px] font-bold">Received From</p>
            <p className="text-sm font-bold text-slate-900">{receipt.customer_name}</p>
            {receipt.customer_biz && <p className="font-semibold text-slate-600">{receipt.customer_biz}</p>}
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Amount Received</p>
            <p className="text-3xl font-black text-emerald-600 font-mono-num mt-1">
              {formatCurrency(receipt.amount)}
            </p>
            <p className="text-xs text-emerald-700 font-semibold mt-1">
              Via {receipt.payment_method} {receipt.reference_number ? `(${receipt.reference_number})` : ''}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span>Remaining Account Balance:</span>
            <span className="font-bold font-mono-num text-slate-900">{formatCurrency(receipt.remaining_balance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
