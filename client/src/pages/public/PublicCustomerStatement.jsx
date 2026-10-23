import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { generateStatementPDF } from '../../lib/pdfGenerator';
import { Download, Printer, Building2, Phone, Calendar, ShieldCheck, Sparkles } from 'lucide-react';

export function PublicCustomerStatement() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchStatement = async () => {
    try {
      setLoading(true);
      let query = `/customers/${id}/public-statement?`;
      if (fromDate) query += `fromDate=${fromDate}&`;
      if (toDate) query += `toDate=${toDate}&`;
      const res = await api.get(query);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [id]);

  const handleDownloadPDF = () => {
    if (!data?.statement || !data?.business) return;
    generateStatementPDF(data.statement, data.business);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading Customer Ledger Statement...</p>
        </div>
      </div>
    );
  }

  if (!data?.statement) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="p-8 rounded-2xl bg-white shadow-xl text-center max-w-sm">
          <p className="text-base font-bold text-slate-800">Statement Not Found</p>
          <p className="text-xs text-slate-500 mt-1">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const { business, statement } = data;
  const { customer, period, openingBalance, totalGave, totalReceived, closingBalance, transactions } = statement;

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{business.name}</h1>
              <p className="text-xs text-slate-500">
                GSTIN: {business.gstin || '-'} • Phone: {business.phone} • UPI: {business.upi_id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Customer Statement Banner */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Account</span>
              <h2 className="text-lg font-black text-slate-900">{customer.name}</h2>
              {customer.business_name && <p className="text-xs font-semibold text-slate-600">{customer.business_name}</p>}
              <p className="text-xs text-slate-400 mt-0.5">Mobile: {customer.mobile} | {customer.city || 'Mumbai'}</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement Period</span>
              <p className="text-xs font-bold text-slate-800">
                {formatDate(period.fromDate)} to {formatDate(period.toDate)}
              </p>
            </div>
          </div>

          {/* 4 Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase text-slate-400">Opening Balance</p>
              <p className="text-base font-extrabold font-mono-num text-slate-800 mt-1">
                {formatCurrency(openingBalance)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200">
              <p className="text-[10px] font-bold uppercase text-rose-600">Goods Supplied (Dr)</p>
              <p className="text-base font-extrabold font-mono-num text-rose-600 mt-1">
                {formatCurrency(totalGave)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <p className="text-[10px] font-bold uppercase text-emerald-600">Payments Paid (Cr)</p>
              <p className="text-base font-extrabold font-mono-num text-emerald-600 mt-1">
                {formatCurrency(totalReceived)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-50/60 border border-brand-200">
              <p className="text-[10px] font-bold uppercase text-brand-600">Net Closing Balance</p>
              <p className={`text-base font-extrabold font-mono-num mt-1 ${closingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(closingBalance)}
              </p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Transaction Description</th>
                  <th className="px-4 py-3 text-right text-rose-600">You Received (Sale Dr)</th>
                  <th className="px-4 py-3 text-right text-emerald-600">You Paid (Cr)</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                  <th className="px-4 py-3">Payment Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-semibold max-w-xs">
                      {t.description}
                      {t.reference_number && <span className="block text-[10px] font-mono text-slate-400">Ref: {t.reference_number}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num font-bold text-rose-600">
                      {t.type === 'GAVE' ? formatCurrency(t.amount) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num font-bold text-emerald-600">
                      {t.type === 'RECEIVED' ? formatCurrency(t.amount) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num font-bold text-slate-900">
                      {formatCurrency(t.running_balance)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-medium">
                      {t.payment_method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Notice */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <p>Official Digital Statement issued via KhataFlow Platform.</p>
            <p>UPI for settlement: <strong className="font-mono text-slate-800">{business.upi_id}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
