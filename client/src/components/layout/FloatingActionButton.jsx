import React, { useState } from 'react';
import { Plus, UserPlus, ArrowUpRight, ArrowDownLeft, FilePlus, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function FloatingActionButton({ onAddCustomer, onRecordGave, onRecordReceived, onCreateInvoice }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Speed Dial Actions */}
      <div
        className={cn(
          'absolute bottom-16 right-0 z-40 flex flex-col items-end gap-2.5 transition-all duration-200 pointer-events-none',
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4'
        )}
      >
        <button
          onClick={() => {
            setIsOpen(false);
            onAddCustomer && onAddCustomer();
          }}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-premium border border-slate-200 dark:border-slate-700 hover:scale-105 transition-all"
        >
          <span>Add Customer</span>
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
            <UserPlus className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => {
            setIsOpen(false);
            onRecordGave && onRecordGave();
          }}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-premium border border-slate-200 dark:border-slate-700 hover:scale-105 transition-all"
        >
          <span>Add Sale (You Gave)</span>
          <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => {
            setIsOpen(false);
            onRecordReceived && onRecordReceived();
          }}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-premium border border-slate-200 dark:border-slate-700 hover:scale-105 transition-all"
        >
          <span>Receive Payment</span>
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => {
            setIsOpen(false);
            onCreateInvoice && onCreateInvoice();
          }}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-premium border border-slate-200 dark:border-slate-700 hover:scale-105 transition-all"
        >
          <span>Create Invoice</span>
          <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600">
            <FilePlus className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Main Trigger Button (+) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-glow-brand hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none',
          isOpen && 'rotate-45 from-slate-700 to-slate-900 shadow-none'
        )}
        aria-label="Quick Actions"
      >
        <Plus className="h-7 w-7 transition-transform" />
      </button>
    </div>
  );
}
