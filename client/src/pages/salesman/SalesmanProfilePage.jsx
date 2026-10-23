import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../lib/utils';
import { User, ShieldCheck, Phone, Mail, MapPin, Calendar, LogOut, Check } from 'lucide-react';

export function SalesmanProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Agent Profile & Settings
        </h1>
        <p className="text-xs text-slate-500">Employee ID: {user?.employee_id || 'Staff'}</p>
      </div>

      {/* Profile Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-md">
            {user?.full_name ? user.full_name[0] : 'U'}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{user?.full_name}</h2>
            <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold">{user?.designation}</p>
            <p className="text-xs text-slate-400 mt-0.5">Firm: {user?.business_name}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>Mobile: <strong className="text-slate-800 dark:text-slate-200 font-mono">{user?.mobile}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>Email: <strong className="text-slate-800 dark:text-slate-200">{user?.email}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>Territory: <strong className="text-slate-800 dark:text-slate-200">{user?.address || 'Mumbai Region'}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Status: <strong className="text-emerald-600 font-bold uppercase">{user?.status}</strong></span>
          </div>
        </div>
      </div>

      {/* Granted Permissions Card */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Configured Operational Permissions
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            { label: 'View Assigned Customers', granted: true },
            { label: 'Add New Customers', granted: true },
            { label: 'Edit Customer Profiles', granted: true },
            { label: 'Record Sales & Payments', granted: true },
            { label: 'Submit Cash Collections', granted: true },
            { label: 'Generate Commercial Invoices', granted: true },
            { label: 'Send WhatsApp Reminders', granted: true },
            { label: 'Delete Customer Ledger', granted: user?.permissions?.can_delete_customers === 1 },
            { label: 'View Other Agents Customers', granted: user?.permissions?.can_view_other_salesmen === 1 },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className={`h-4 w-4 rounded-full flex items-center justify-center ${p.granted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                {p.granted ? <Check className="w-2.5 h-2.5" /> : '×'}
              </span>
              <span className={p.granted ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}>
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out from App</span>
      </button>
    </div>
  );
}
