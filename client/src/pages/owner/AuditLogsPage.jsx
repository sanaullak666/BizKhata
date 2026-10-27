import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { ScrollText, Search, Shield, Filter, Download } from 'lucide-react';
import { TableSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

export function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = `/audit-logs?search=${encodeURIComponent(search)}`;
      if (entityType) query += `&entity_type=${entityType}`;
      const res = await api.get(query);
      setLogs(res.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 250);
    return () => clearTimeout(timer);
  }, [search, entityType]);

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-tight">
          System Audit Logs & Security Trail
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Immutable event log tracking customer creations, cash handovers, assignments & deletions
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2.5 sm:gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search action, details, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none"
          />
        </div>

        <div className="w-full">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none"
          >
            <option value="">All Entity Types</option>
            <option value="Customer">Customer</option>
            <option value="Transaction">Transaction</option>
            <option value="Collection">Collection</option>
            <option value="Invoice">Invoice</option>
            <option value="User">User / Staff</option>
            <option value="Business">Business Settings</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 sm:p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No audit log entries found"
            description="All staff and ledger actions are logged here automatically."
          />
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User / Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity Type</th>
                    <th className="px-4 py-3">Audit Details</th>
                    <th className="px-4 py-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDate(log.created_at, true)}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        {log.user_name || 'System Engine'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-600 dark:text-slate-400">
                        {log.entity_type}
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200 max-w-md">
                        {log.details}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <div key={log.id} className="p-3.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {log.action}
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                        {log.user_name || 'System Engine'}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {formatDate(log.created_at, true)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                    {log.details}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-semibold">{log.entity_type}</span>
                    <span className="font-mono">{log.ip_address || '127.0.0.1'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
