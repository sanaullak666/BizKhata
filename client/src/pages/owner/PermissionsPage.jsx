import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ShieldCheck, Save, Check, UserCheck, AlertCircle } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { TableSkeleton } from '../../components/common/Skeleton';

export function PermissionsPage() {
  const { showToast } = useNotification();
  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/salesmen')
      .then((res) => {
        setSalesmen(res.salesmen || []);
        if (res.salesmen && res.salesmen.length > 0) {
          setSelectedSalesmanId(res.salesmen[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedSalesmanId) {
      api.get(`/salesmen/${selectedSalesmanId}`)
        .then((res) => {
          setPermissions(res.permissions || {});
        })
        .catch(() => {});
    }
  }, [selectedSalesmanId]);

  const togglePerm = (key) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: prev[key] === 1 ? 0 : 1,
    }));
  };

  const handleSave = async () => {
    if (!selectedSalesmanId) return;
    setSaving(true);
    try {
      await api.put(`/salesmen/${selectedSalesmanId}/permissions`, permissions);
      showToast('Staff permissions updated successfully!', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to update permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const permMatrix = [
    {
      category: 'Customer Ledger Operations',
      items: [
        { key: 'can_view_customers', label: 'View Customers', desc: 'Allows viewing assigned customer ledger records' },
        { key: 'can_add_customers', label: 'Add New Customers', desc: 'Allows registering new customer accounts directly from field' },
        { key: 'can_edit_customers', label: 'Edit Customer Profiles', desc: 'Allows updating phone, address, and credit limits' },
        { key: 'can_delete_customers', label: 'Delete Customers', desc: 'High risk: allows deleting customers and all transaction history' },
      ],
    },
    {
      category: 'Transactions & Financial Operations',
      items: [
        { key: 'can_add_transactions', label: 'Record Transactions', desc: 'Record credit sales (Gave) and payments (Received)' },
        { key: 'can_delete_transactions', label: 'Delete Transactions', desc: 'High risk: allows removing existing ledger entries' },
        { key: 'can_record_collections', label: 'Record & Submit Collections', desc: 'Collect cash/UPI payments from customers and submit to owner' },
        { key: 'can_create_invoices', label: 'Generate Invoices', desc: 'Create and issue commercial GST invoices' },
        { key: 'can_send_reminders', label: 'Send Payment Reminders', desc: 'Trigger WhatsApp and SMS payment reminders to customers' },
      ],
    },
    {
      category: 'Visibility & Territory Privacy',
      items: [
        { key: 'can_view_other_salesmen', label: 'View Other Salesmen Customers', desc: 'Allow visibility into customers assigned to peer salesmen (default disabled)' },
        { key: 'can_view_reports', label: 'Access Business Reports', desc: 'View business-wide sales and recovery analytics' },
        { key: 'can_manage_staff', label: 'Manage Staff Profiles', desc: 'Add or modify other employee profiles' },
        { key: 'can_change_settings', label: 'Modify Business Settings', desc: 'Edit business profile, GSTIN, UPI and bank details' },
      ],
    },
  ];

  const selectedSalesman = salesmen.find((s) => s.id === selectedSalesmanId);

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-tight">
            Granular Staff Permissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Control exact API & UI operational permissions for each salesman and field executive
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-glow-brand transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Permissions'}</span>
        </button>
      </div>

      {/* Staff Selector Ribbon */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600 shrink-0" />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Configuring:</span>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {salesmen.map((sm) => (
            <button
              key={sm.id}
              onClick={() => setSelectedSalesmanId(sm.id)}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                selectedSalesmanId === sm.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {sm.full_name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {permMatrix.map((group, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
            >
              <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {group.category}
                </h3>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.items.map((item) => {
                  const isChecked = permissions[item.key] === 1;

                  return (
                    <div
                      key={item.key}
                      onClick={() => togglePerm(item.key)}
                      className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{item.label}</span>
                          {item.key.includes('delete') && (
                            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 font-semibold shrink-0">
                              High Risk
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                      </div>

                      <div className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 sm:w-11 sm:h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-glow-brand transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : `Save for ${selectedSalesman?.full_name || 'Staff'}`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
