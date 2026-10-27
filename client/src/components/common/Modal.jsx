import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg', className }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog / Mobile Bottom Sheet */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
        <div 
          className={cn(
            'w-full transform overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 text-left align-middle shadow-2xl transition-all border-t sm:border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom sm:zoom-in-95 max-h-[92vh] flex flex-col',
            maxWidth,
            className
          )}
        >
          {/* Mobile Drag Indicator */}
          <div className="pt-2 sm:hidden flex justify-center">
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-3.5 sm:py-4 shrink-0">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">{title}</h3>
              {subtitle && <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
