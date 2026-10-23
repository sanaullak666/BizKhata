import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserCheck, ArrowLeftRight, FileText, 
  Coins, BarChart3, BellRing, ShieldCheck, ScrollText, Settings,
  Sparkles, X
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Salesmen & Staff', path: '/salesmen', icon: UserCheck },
    { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { label: 'Cash & Collections', path: '/collections', icon: Coins, highlight: true },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    { label: 'Payment Reminders', path: '/reminders', icon: BellRing },
    { label: 'Staff Permissions', path: '/permissions', icon: ShieldCheck },
    { label: 'Audit Trail', path: '/audit-logs', icon: ScrollText },
    { label: 'Settings & Backup', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Top Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              Khata<span className="text-brand-600">Flow</span>
            </span>
          </div>

          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operations & Ledger
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white',
                    item.highlight && !location.pathname.includes(item.path) && 'text-emerald-600 dark:text-emerald-400 font-bold'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('w-4 h-4 transition-transform group-hover:scale-110', isActive ? 'text-white' : item.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-brand-50/50 dark:from-slate-800 dark:to-slate-800/50 border border-brand-100/60 dark:border-slate-700">
            <p className="text-[11px] font-bold text-brand-900 dark:text-brand-300">Apex Enterprise</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Commercial Ledger Engine</p>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time Sync Active</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
