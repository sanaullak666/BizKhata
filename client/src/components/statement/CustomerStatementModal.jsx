import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { generateStatementPDF, exportStatementToCSV } from '../../lib/pdfGenerator';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Download, Printer, Share2, Calendar, Check, FileSpreadsheet } from 'lucide-react';

export function CustomerStatementModal({ isOpen, onClose, customerId, partyType = 'customer', initialParty = null }) {
  const { showToast } = useNotification();
  const [statementData, setStatementData] = useState(null);
  const [business, setBusiness] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchStatement = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      if (partyType === 'supplier') {
        const [supRes, bizRes] = await Promise.all([
          api.get(`/suppliers/${customerId}`),
          api.get('/business'),
        ]);
        const supplier = supRes.supplier || initialParty || {};
        let txs = supRes.transactions || [];
        if (fromDate) {
          txs = txs.filter(t => t.date >= fromDate);
        }
        if (toDate) {
          txs = txs.filter(t => t.date <= toDate);
        }
        const totalGave = txs.reduce((sum, t) => sum + (t.type === 'GAVE' ? Number(t.amount || 0) : 0), 0);
        const totalReceived = txs.reduce((sum, t) => sum + (t.type === 'RECEIVED' ? Number(t.amount || 0) : 0), 0);
        const closingBalance = Number(supplier.current_balance || 0);
        const openingBalance = closingBalance + totalGave - totalReceived;

        setStatementData({
          customer: supplier,
          party: supplier,
          partyType: 'supplier',
          period: { fromDate: fromDate || 'Start', toDate: toDate || new Date().toISOString().split('T')[0] },
          openingBalance,
          totalGave,
          totalReceived,
          closingBalance,
          transactions: txs
        });
        setBusiness(bizRes.business);
      } else {
        const [stmtRes, bizRes] = await Promise.all([
          api.get(`/customers/${customerId}/statement?fromDate=${fromDate}&toDate=${toDate}`),
          api.get('/business'),
        ]);
        setStatementData(stmtRes.statement);
        setBusiness(bizRes.business);
      }
    } catch (e) {
      showToast('Failed to load statement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchStatement();
    }
  }, [isOpen, customerId]);

  const handleDownloadPDF = () => {
    if (!statementData || !business) return;
    generateStatementPDF(statementData, business);
    showToast('Statement PDF downloaded!', 'success');
  };

  const handleDownloadCSV = () => {
    if (!statementData) return;
    exportStatementToCSV(statementData);
    showToast('Statement CSV exported!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyPublicLink = async () => {
    const url = `${window.location.origin}/statement/${customerId}/public`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast('Public customer statement link copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  if (!isOpen) return null;

  const partyName = statementData?.customer?.name || statementData?.party?.name || initialParty?.name || 'Party';
  const partyBiz = statementData?.customer?.business_name || statementData?.party?.business_name || initialParty?.business_name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${partyType === 'supplier' ? 'Supplier' : 'Customer'} Ledger Statement`}
      subtitle={`${partyName} ${partyBiz ? `(${partyBiz})` : ''}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <button
              onClick={fetchStatement}
              className="px-3 py-1.5 bg-[#1b5e20] hover:bg-[#144c19] text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              Apply Filter
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm transition"
              title="Download Statement PDF"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm transition"
              title="Export Statement to CSV / Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm transition"
              title="Print Statement"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
            {partyType === 'customer' && (
              <button
                onClick={handleCopyPublicLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition shadow-sm"
                title="Copy customer public link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-emerald-700" />}
                <span>{copied ? 'Copied' : 'Share Link'}</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
            Compiling ledger entries & calculating running balances...
          </div>
        ) : statementData ? (
          <div className="space-y-4">
            {/* 4 Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold uppercase text-slate-400">Opening Balance</p>
                <p className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                  {formatCurrency(statementData.openingBalance)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                <p className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
                  {partyType === 'supplier' ? 'Total Paid (Dr)' : 'Total Given / Sales'}
                </p>
                <p className="text-base font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1">
                  {formatCurrency(statementData.totalGave)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {partyType === 'supplier' ? 'Purchases Received (Cr)' : 'Total Received (Cr)'}
                </p>
                <p className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(statementData.totalReceived)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <p className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Net Closing Balance</p>
                <p className={`text-base font-extrabold font-mono mt-1 ${statementData.closingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {formatCurrency(statementData.closingBalance)}
                </p>
              </div>
            </div>

            {/* Transactions Statement Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold sticky top-0">
                  <tr>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Description / Ref</th>
                    <th className="px-3.5 py-2.5 text-right text-rose-600">{partyType === 'supplier' ? 'Paid (Dr)' : 'You Gave (Dr)'}</th>
                    <th className="px-3.5 py-2.5 text-right text-emerald-600">{partyType === 'supplier' ? 'Purchased (Cr)' : 'You Received (Cr)'}</th>
                    <th className="px-3.5 py-2.5 text-right">Net Balance</th>
                    <th className="px-3.5 py-2.5">Payment Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {statementData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    statementData.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-900 dark:text-slate-100 max-w-xs truncate">
                          {tx.description || '-'}
                          {tx.reference_number && (
                            <span className="block text-[10px] text-slate-400 font-mono">Ref: {tx.reference_number}</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-rose-600">
                          {tx.type === 'GAVE' ? formatCurrency(tx.amount) : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-600">
                          {tx.type === 'RECEIVED' ? formatCurrency(tx.amount) : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(tx.running_balance)}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
                          {tx.payment_method || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
