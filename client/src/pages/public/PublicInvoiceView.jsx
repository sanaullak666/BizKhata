import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { generateInvoicePDF } from '../../lib/pdfGenerator';
import { Download, Printer, CheckCircle2, Building, Sparkles } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export function PublicInvoiceView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/invoices/${id}/public`)
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
    if (!data?.invoice || !data?.business) return;
    generateInvoicePDF(data.invoice, data.items || [], data.business);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <p className="text-sm font-bold text-slate-500 animate-pulse">Loading Invoice...</p>
      </div>
    );
  }

  if (!data?.invoice) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="p-8 rounded-2xl bg-white shadow text-center max-w-sm">
          <p className="text-base font-bold text-slate-800">Invoice Not Found</p>
          <p className="text-xs text-slate-500 mt-1">This link may be invalid.</p>
        </div>
      </div>
    );
  }

  const { business, invoice, items } = data;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top actions */}
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <Badge variant={invoice.status === 'paid' ? 'success' : 'brand'}>
              {invoice.status.toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Invoice Paper */}
        <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{business.name}</h2>
              <p className="text-xs text-slate-500">{business.address}</p>
              <p className="text-xs text-slate-400">GSTIN: {business.gstin || '-'}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400">Tax Invoice</span>
              <p className="text-lg font-black text-brand-600 font-mono-num">{invoice.invoice_number}</p>
              <p className="text-xs text-slate-500">Date: {formatDate(invoice.invoice_date)}</p>
            </div>
          </div>

          {/* Bill to */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <p className="text-slate-400 font-bold uppercase text-[10px]">Billed To</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{invoice.customer_name}</p>
            {invoice.customer_biz && <p className="font-semibold text-slate-700">{invoice.customer_biz}</p>}
            <p className="text-slate-500 mt-1">Mobile: {invoice.customer_mobile || '-'}</p>
          </div>

          {/* Items */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-3 py-2.5 text-center">Qty</th>
                  <th className="px-3 py-2.5 text-right">Price</th>
                  <th className="px-3 py-2.5 text-center">Tax %</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items?.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2.5 font-semibold text-slate-900">{it.item_name}</td>
                    <td className="px-3 py-2.5 text-center font-mono-num">{it.quantity}</td>
                    <td className="px-3 py-2.5 text-right font-mono-num">{formatCurrency(it.unit_price)}</td>
                    <td className="px-3 py-2.5 text-center font-mono-num">{it.tax_percent}%</td>
                    <td className="px-3 py-2.5 text-right font-mono-num font-bold">{formatCurrency(it.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Bank & UPI Settlement:</p>
              <p>UPI ID: <strong className="font-mono text-slate-900">{business.upi_id}</strong></p>
              <p>Bank: {business.bank_name} | A/C: {business.bank_account_no}</p>
              <p>IFSC: {business.bank_ifsc}</p>
            </div>

            <div className="w-full sm:w-64 space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono-num">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST Tax:</span>
                <span className="font-mono-num">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                <span>Total Amount:</span>
                <span className="font-mono-num text-brand-600">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
