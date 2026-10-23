import React from 'react';
import { cn } from '../../lib/utils';

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', className, onClick }) {
  const variants = {
    default: 'from-slate-500/10 to-slate-500/5 text-slate-700 dark:text-slate-300',
    brand: 'from-brand-500/15 to-brand-500/5 text-brand-600 dark:text-brand-400 border-brand-200/50 dark:border-brand-900/40',
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/40',
    rose: 'from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/40',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/40',
  };

  const iconColors = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-subtle border border-slate-200/80 dark:border-slate-800 transition-all duration-200 hover:shadow-premium',
        onClick && 'cursor-pointer hover:border-brand-300 dark:hover:border-brand-700',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white font-mono-num tracking-tight">{value}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-xl', iconColors[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
          <span className={trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
            {trend.isPositive ? '+' : ''}{trend.value}
          </span>
          <span className="text-slate-400 font-normal">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
