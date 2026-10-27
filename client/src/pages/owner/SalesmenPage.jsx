import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { 
  UserCheck, Plus, Search, ArrowRight, ShieldCheck, 
  Coins, TrendingUp, Users, Phone, Mail, Edit3, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TableSkeleton } from '../../components/common/Skeleton';

export function SalesmenPage() {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add/Edit Salesman Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState(null);
  const [nextEmployeeId, setNextEmployeeId] = useState('EMP-001');
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    employee_id: '',
    password: '',
    joining_date: new Date().toISOString().split('T')[0],
    address: '',
    designation: 'Field Sales Executive',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const calculateNextEmployeeId = (list = salesmen) => {
    let maxNum = 0;
    (list || []).forEach(s => {
      if (s.employee_id) {
        const match = String(s.employee_id).match(/^EMP-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });
    return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const fetchSalesmen = async () => {
    try {
      setLoading(true);
      const res = await api.get('/salesmen');
      const list = res.salesmen || [];
      setSalesmen(list);
      if (res.next_employee_id) {
        setNextEmployeeId(res.next_employee_id);
      } else {
        setNextEmployeeId(calculateNextEmployeeId(list));
      }
    } catch (e) {
      showToast('Failed to load salesmen', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  const openCreateModal = () => {
    setEditingSalesman(null);
    const assignedId = nextEmployeeId || calculateNextEmployeeId(salesmen);
    setFormData({
      full_name: '',
      mobile: '',
      email: '',
      employee_id: assignedId,
      password: '',
      joining_date: new Date().toISOString().split('T')[0],
      address: '',
      designation: 'Field Sales Executive',
      status: 'active',
    });
    setShowModal(true);
  };

  const openEditModal = (sm) => {
    setEditingSalesman(sm);
    setFormData({
      full_name: sm.full_name,
      mobile: sm.mobile,
      email: sm.email || '',
      employee_id: sm.employee_id || '',
      password: '',
      joining_date: sm.joining_date || new Date().toISOString().split('T')[0],
      address: sm.address || '',
      designation: sm.designation || 'Field Sales Executive',
      status: sm.status || 'active',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.mobile) {
      showToast('Full name and mobile are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingSalesman) {
        await api.put(`/salesmen/${editingSalesman.id}`, formData);
        showToast('Salesman updated successfully.', 'success');
      } else {
        await api.post('/salesmen', formData);
        showToast('Salesman added successfully! Credentials created.', 'success');
      }
      setShowModal(false);
      fetchSalesmen();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSalesmen = salesmen.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.employee_id && s.employee_id.toLowerCase().includes(search.toLowerCase())) ||
      s.mobile.includes(search)
  );

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-tight">
            Salesmen & Field Staff
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Field agent accounts, territory customer portfolios, collections & recovery performance
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
          <button
            onClick={() => navigate('/permissions')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden xs:inline">Permissions</span>
            <span className="xs:hidden">Perms</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-glow-brand transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Comparison Performance Matrix */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">Salesman Comparison Overview</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Live comparison of sales, collections, and efficiency</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4 sm:p-6">
            <TableSkeleton rows={4} />
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Salesman</th>
                    <th className="px-4 py-3 text-center">Customers</th>
                    <th className="px-4 py-3 text-right">Total Sales</th>
                    <th className="px-4 py-3 text-right">Collections</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3 text-center">Collection %</th>
                    <th className="px-4 py-3 text-right">Pending Cash</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSalesmen.map((sm) => (
                    <tr key={sm.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-xs">
                            {sm.full_name[0]}
                          </div>
                          <div>
                            <button
                              onClick={() => navigate(`/salesmen/${sm.id}`)}
                              className="font-bold text-slate-900 dark:text-white hover:text-brand-600 text-left transition-colors"
                            >
                              {sm.full_name}
                            </button>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {sm.employee_id || 'Staff'} • {sm.designation}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono-num font-bold text-slate-700 dark:text-slate-300">
                        {sm.assigned_customers_count || 0}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-bold text-slate-900 dark:text-white">
                        {formatCurrency(sm.total_sales)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-bold text-emerald-600">
                        {formatCurrency(sm.total_collections)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-bold text-rose-600">
                        {formatCurrency(sm.total_outstanding)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono-num">
                          {sm.collection_rate_percent}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-bold text-amber-600">
                        {formatCurrency(sm.pending_cash_settlement)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/salesmen/${sm.id}`)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                          >
                            Performance
                          </button>
                          <button
                            onClick={() => openEditModal(sm)}
                            className="p-1 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
                            title="Edit Salesman"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSalesmen.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No salesmen found.</div>
              ) : (
                filteredSalesmen.map((sm) => (
                  <div key={sm.id} className="p-3.5 active:bg-slate-50 dark:active:bg-slate-800/40">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                          {sm.full_name[0]}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => navigate(`/salesmen/${sm.id}`)}
                            className="text-sm font-bold text-slate-900 dark:text-white text-left truncate block w-full"
                          >
                            {sm.full_name}
                          </button>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {sm.employee_id || 'Staff'} · {sm.designation}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => openEditModal(sm)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                        <p className="text-slate-400 font-semibold">Sales</p>
                        <p className="font-bold text-slate-900 dark:text-white font-mono-num truncate">{formatCurrency(sm.total_sales)}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                        <p className="text-emerald-600 font-semibold">Collected</p>
                        <p className="font-bold text-emerald-700 font-mono-num truncate">{formatCurrency(sm.total_collections)}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40">
                        <p className="text-rose-600 font-semibold">Due</p>
                        <p className="font-bold text-rose-700 font-mono-num truncate">{formatCurrency(sm.total_outstanding)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                      <span className="text-slate-500">
                        {sm.assigned_customers_count || 0} customers · {sm.collection_rate_percent}% rate
                      </span>
                      <button
                        onClick={() => navigate(`/salesmen/${sm.id}`)}
                        className="px-2 py-1 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold"
                      >
                        View Performance
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Salesman Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSalesman ? 'Edit Salesman Profile' : 'Add New Salesman'}
        subtitle="Create secure login and assign field profile"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Arshad Khan"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Employee ID
                </label>
                <span className="text-[9px] sm:text-[10px] font-semibold text-brand-600 bg-brand-50 dark:bg-brand-950/60 px-1.5 sm:px-2 py-0.5 rounded-full">
                  Auto
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={formData.employee_id}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-sm font-mono font-bold cursor-not-allowed focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Mobile (Login) *
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="salesman@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Password {editingSalesman && '(blank = keep)'}
              </label>
              <input
                type="password"
                required={!editingSalesman}
                placeholder="Secure password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Designation
              </label>
              <input
                type="text"
                placeholder="Senior Field Executive"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Joining Date
              </label>
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="active">Active (Full Access)</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended (Blocked)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Field Address / Locality
            </label>
            <input
              type="text"
              placeholder="e.g. Kurla West, Mumbai"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 sm:pt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 sm:border-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-glow-brand transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingSalesman ? 'Update Salesman' : 'Create Salesman'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
