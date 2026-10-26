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
      password: '', // Leave blank unless updating
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
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Salesmen & Field Staff
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Field agent accounts, territory customer portfolios, collections & recovery performance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/permissions')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>Manage Permissions</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-glow-brand transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Salesman</span>
          </button>
        </div>
      </div>

      {/* Comparison Performance Matrix (Requirement 14) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Salesman Comparison Overview</h3>
            <p className="text-xs text-slate-500">Live comparison of sales, collections, and collection efficiency</p>
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
          <div className="p-6">
            <TableSkeleton rows={4} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Salesman</th>
                  <th className="px-4 py-3 text-center">Customers</th>
                  <th className="px-4 py-3 text-right">Total Sales</th>
                  <th className="px-4 py-3 text-right">Collections</th>
                  <th className="px-4 py-3 text-right">Market Outstanding</th>
                  <th className="px-4 py-3 text-center">Collection %</th>
                  <th className="px-4 py-3 text-right">Pending Cash</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSalesmen.map((sm) => (
                  <tr key={sm.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Salesman profile */}
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

                    {/* Customers assigned */}
                    <td className="px-4 py-3.5 text-center font-mono-num font-bold text-slate-700 dark:text-slate-300">
                      {sm.assigned_customers_count || 0}
                    </td>

                    {/* Sales */}
                    <td className="px-4 py-3.5 text-right font-mono-num font-bold text-slate-900 dark:text-white">
                      {formatCurrency(sm.total_sales)}
                    </td>

                    {/* Collections */}
                    <td className="px-4 py-3.5 text-right font-mono-num font-bold text-emerald-600">
                      {formatCurrency(sm.total_collections)}
                    </td>

                    {/* Outstanding */}
                    <td className="px-4 py-3.5 text-right font-mono-num font-bold text-rose-600">
                      {formatCurrency(sm.total_outstanding)}
                    </td>

                    {/* Collection Rate */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono-num">
                        {sm.collection_rate_percent}%
                      </span>
                    </td>

                    {/* Pending Cash in Hand */}
                    <td className="px-4 py-3.5 text-right font-mono-num font-bold text-amber-600">
                      {formatCurrency(sm.pending_cash_settlement)}
                    </td>

                    {/* Actions */}
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
        )}
      </div>

      {/* Add / Edit Salesman Modal (Requirement 3) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSalesman ? 'Edit Salesman Profile' : 'Add New Salesman'}
        subtitle="Create secure login and assign field profile"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Arshad Khan"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Employee ID
                </label>
                <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-full">
                  Auto-increment
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={formData.employee_id}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-sm font-mono font-bold cursor-not-allowed focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Mobile Number (Login) *
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="salesman@grihalakshmi.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Password {editingSalesman && '(Leave blank to keep current)'}
              </label>
              <input
                type="password"
                required={!editingSalesman}
                placeholder="Secure password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Designation
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Field Executive"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Joining Date
              </label>
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="active">Active (Full Access)</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended (Blocked)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Field Address / Locality
            </label>
            <input
              type="text"
              placeholder="e.g. Kurla West, Mumbai"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-glow-brand transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingSalesman ? 'Update Salesman' : 'Create Salesman Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
