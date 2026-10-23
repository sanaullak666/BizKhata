import React, { useState, useEffect } from 'react';
import { Search, User, Users, FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

export function GlobalSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setCustomers([]);
      setSalesmen([]);
      setInvoices([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        try {
          const [cRes, sRes, iRes] = await Promise.all([
            api.get(`/customers?search=${encodeURIComponent(query)}`).catch(() => ({ customers: [] })),
            api.get(`/salesmen`).catch(() => ({ salesmen: [] })),
            api.get(`/invoices`).catch(() => ({ invoices: [] })),
          ]);

          setCustomers(cRes.customers?.slice(0, 5) || []);
          setSalesmen(
            (sRes.salesmen || []).filter(
              s => s.full_name.toLowerCase().includes(query.toLowerCase()) || (s.employee_id && s.employee_id.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, 3)
          );
          setInvoices(
            (iRes.invoices || []).filter(
              inv => inv.invoice_number.toLowerCase().includes(query.toLowerCase()) || (inv.customer_name && inv.customer_name.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, 3)
          );
        } catch (e) {
        } finally {
          setLoading(false);
        }
      } else {
        setCustomers([]);
        setSalesmen([]);
        setInvoices([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="mx-auto max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 transition-all">
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-200 dark:border-slate-800 px-4">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            className="h-14 w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            placeholder="Type customer name, salesman, invoice # or mobile..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="hidden sm:inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-500 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Searching database...
            </div>
          )}

          {!loading && query.trim().length > 1 && customers.length === 0 && salesmen.length === 0 && invoices.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No results found for "<span className="font-semibold text-slate-900 dark:text-white">{query}</span>"
            </div>
          )}

          {/* Customers */}
          {customers.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Customers
              </p>
              <div className="space-y-1">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      navigate(`/customers/${c.id}`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.business_name || c.city || c.mobile}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold font-mono-num ${c.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(c.current_balance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Salesmen */}
          {salesmen.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Staff / Salesmen
              </p>
              <div className="space-y-1">
                {salesmen.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      navigate(`/salesmen/${s.id}`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.full_name}</p>
                      <p className="text-xs text-slate-500">{s.designation || s.employee_id} • {s.mobile}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {invoices.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Invoices
              </p>
              <div className="space-y-1">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      navigate(`/invoices`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{inv.invoice_number}</p>
                      <p className="text-xs text-slate-500">{inv.customer_name}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono-num">
                      {formatCurrency(inv.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
