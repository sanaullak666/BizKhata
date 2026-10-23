import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { MessageSquare, PhoneCall, Copy, Check, ExternalLink, Mail } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export function ReminderModal({ isOpen, onClose, customerId }) {
  const { showToast } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      setLoading(true);
      api.get(`/reminders/prepare/${customerId}`)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          showToast('Failed to prepare reminder', 'error');
          setLoading(false);
        });
    }
  }, [isOpen, customerId]);

  const handleCopyMessage = async () => {
    if (!data?.message) return;
    try {
      await navigator.clipboard.writeText(data.message);
      setCopied(true);
      showToast('Reminder message copied to clipboard!', 'success');

      // Log reminder action
      await api.post('/reminders', {
        customer_id: customerId,
        reminder_type: 'manual',
        amount_due: data.customer.current_balance,
        message: data.message,
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!data?.whatsappUrl) return;

    // Log reminder in backend
    try {
      await api.post('/reminders', {
        customer_id: customerId,
        reminder_type: 'whatsapp',
        amount_due: data.customer.current_balance,
        message: data.message,
      });
    } catch (e) {}

    window.open(data.whatsappUrl, '_blank');
    onClose();
  };

  const handleSendEmail = () => {
    if (!data?.customer?.email) {
      showToast('Customer does not have an email address configured.', 'warning');
      return;
    }
    const subject = encodeURIComponent(`Payment Reminder: Outstanding balance with ${data.business.name}`);
    const body = encodeURIComponent(data.message);
    window.location.href = `mailto:${data.customer.email}?subject=${subject}&body=${body}`;
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Payment Reminder"
      subtitle={data?.customer ? `${data.customer.name} owes ${formatCurrency(data.customer.current_balance)}` : 'Loading...'}
      maxWidth="max-w-lg"
    >
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400 animate-pulse">
          Generating payment reminder draft...
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Outstanding Notice Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                Outstanding Balance
              </p>
              <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono-num mt-1">
                {formatCurrency(data.customer.current_balance)}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-900 dark:text-white">{data.customer.name}</p>
              <p>{data.customer.mobile}</p>
            </div>
          </div>

          {/* Formatted Message Preview */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Message Preview
            </label>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto leading-relaxed">
              {data.message}
            </div>
          </div>

          {/* Action Buttons (Requirement 17) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleCopyMessage}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleSendEmail}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
