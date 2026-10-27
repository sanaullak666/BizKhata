import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { generateStatementPDF, generateBusinessReportPDF, exportStatementToCSV } from '../../lib/pdfGenerator';
import { CustomerStatementModal } from '../../components/statement/CustomerStatementModal';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  Home, BookOpen, Edit2, Search, Filter, FileText, Plus, 
  ArrowLeft, Phone, Trash2, Wallet, 
  Share2, Check, Download, AlertCircle, Calendar, X,
  LogOut, Shield, RefreshCw, Paperclip, Receipt, Eye,
  Users, UserPlus, EyeOff, Key, FileSpreadsheet, Printer,
  TrendingUp, BarChart2, Coins
} from 'lucide-react';

export function KhatabookDashboard() {
  const { user, logout } = useAuth();
  const { showToast } = useNotification();

  // Tab: 'customers' | 'suppliers'
  const [activeTab, setActiveTab] = useState('customers');

  // Data states
  const [customers, setCustomers] = useState([]);
  const [customerSummary, setCustomerSummary] = useState({ willGive: 0, willGet: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSummary, setSupplierSummary] = useState({ willGive: 0, willGet: 0 });
  const [cashbookEntries, setCashbookEntries] = useState([]);
  const [cashbookSummary, setCashbookSummary] = useState({ totalIn: 0, totalOut: 0, netBalance: 0 });

  const [businessInfo, setBusinessInfo] = useState({
    name: 'Grihalakshmi Food Products',
    tagline: 'Spices, Pure Curry Powders & Millets Ledger',
    phone: '',
    email: '',
    address: '',
    upi_id: '',
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'will_get', 'will_give'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditBusinessModal, setShowEditBusinessModal] = useState(false);
  const [showCashbookModal, setShowCashbookModal] = useState(false);
  const [cashModalType, setCashModalType] = useState('in'); // 'in' or 'out'
  const [showAddCashEntry, setShowAddCashEntry] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reportsModalTab, setReportsModalTab] = useState('overview'); // 'overview' | 'sales' | 'salesmen' | 'aging'
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementParty, setStatementParty] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Mobile adaptive layout states
  const [mobileTab, setMobileTab] = useState('parties'); // 'home' | 'parties' | 'more'
  const [mobileViewMode, setMobileViewMode] = useState('list'); // 'list' | 'detail'
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Selected party for right panel detail / ledger
  const [selectedParty, setSelectedParty] = useState(null);
  const [partyTransactions, setPartyTransactions] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txModalType, setTxModalType] = useState('GAVE'); // 'GAVE' or 'GOT'

  // Edit party & transaction modal states
  const [showEditPartyModal, setShowEditPartyModal] = useState(false);
  const [editPartyForm, setEditPartyForm] = useState({ id: '', name: '', mobile: '', address: '', city: '' });

  const [showEditTxModal, setShowEditTxModal] = useState(false);
  const [editTxForm, setEditTxForm] = useState({
    id: '',
    type: '',
    amount: '',
    date: '',
    description: '',
    reference_number: '',
    attachment_url: '',
    attachment_name: '',
  });

  const [editingCashEntry, setEditingCashEntry] = useState(null);

  // Salesmen management states
  const [salesmen, setSalesmen] = useState([]);
  const [showSalesmenModal, setShowSalesmenModal] = useState(false);
  const [showAddSalesmanModal, setShowAddSalesmanModal] = useState(false);
  const [showSalesmanPassword, setShowSalesmanPassword] = useState(false);
  const [newSalesman, setNewSalesman] = useState({
    full_name: '',
    mobile: '',
    password: '',
    email: '',
    address: '',
    designation: 'Field Sales Executive',
  });

  const [showEditSalesmanModal, setShowEditSalesmanModal] = useState(false);
  const [editSalesmanForm, setEditSalesmanForm] = useState({
    id: '',
    full_name: '',
    mobile: '',
    password: '',
    address: '',
    status: 'active',
  });
  const [showEditSalesmanPwd, setShowEditSalesmanPwd] = useState(false);

  // Forms
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    mobile: '',
    address: '',
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    mobile: '',
    address: '',
  });

  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    reference_number: '',
    description: '',
    attachment_url: '',
    attachment_name: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [previewAttachment, setPreviewAttachment] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be under 5MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewTransaction((prev) => ({
        ...prev,
        attachment_url: reader.result,
        attachment_name: file.name,
      }));
      showToast(`Attached: ${file.name}`, 'info');
    };
    reader.readAsDataURL(file);
  };

  const [newCashEntry, setNewCashEntry] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [businessForm, setBusinessForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    upi_id: '',
  });

  // Fetch Business
  const fetchBusiness = async () => {
    try {
      const res = await api.get('/business');
      if (res.business) {
        setBusinessInfo(res.business);
        setBusinessForm({
          name: res.business.name || 'Grihalakshmi Food Products',
          phone: res.business.phone || '',
          email: res.business.email || '',
          address: res.business.address || '',
          upi_id: res.business.upi_id || '',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Customers
  const fetchCustomers = async (selectFirst = false) => {
    try {
      const res = await api.get('/customers');
      const list = res.customers || [];
      setCustomers(list);
      setCustomerSummary({
        willGive: res.summary?.totalPayable || 0,
        willGet: res.summary?.totalReceivable || 0,
      });

      if (selectFirst && list.length > 0 && activeTab === 'customers') {
        selectPartyDetails(list[0], 'customer');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Suppliers
  const fetchSuppliers = async (selectFirst = false) => {
    try {
      const res = await api.get('/suppliers');
      const list = res.suppliers || [];
      setSuppliers(list);
      setSupplierSummary({
        willGive: res.summary?.willGive || 0,
        willGet: res.summary?.willGet || 0,
      });

      if (selectFirst && list.length > 0 && activeTab === 'suppliers') {
        selectPartyDetails(list[0], 'supplier');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Cashbook
  const fetchCashbook = async () => {
    try {
      const res = await api.get('/cashbook');
      setCashbookEntries(res.entries || []);
      setCashbookSummary(res.summary || { totalIn: 0, totalOut: 0, netBalance: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Salesmen
  const fetchSalesmen = async () => {
    try {
      const res = await api.get('/salesmen');
      setSalesmen(res.salesmen || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Register New Salesman
  const handleAddSalesman = async (e) => {
    e.preventDefault();
    if (!newSalesman.full_name || !newSalesman.mobile || !newSalesman.password) {
      showToast('Name, mobile number, and password are required', 'warning');
      return;
    }
    try {
      await api.post('/salesmen', newSalesman);
      showToast(`Salesman registered! They can log in with mobile ${newSalesman.mobile}`, 'success');
      setShowAddSalesmanModal(false);
      setNewSalesman({
        full_name: '',
        mobile: '',
        password: '',
        email: '',
        address: '',
        designation: 'Field Sales Executive',
      });
      fetchSalesmen();
    } catch (err) {
      showToast(err.message || 'Failed to register salesman', 'error');
    }
  };

  // Delete / Deactivate Salesman
  const handleDeleteSalesman = async (sm) => {
    if (!window.confirm(`Are you sure you want to delete salesman "${sm.full_name}"?`)) {
      return;
    }
    try {
      await api.delete(`/salesmen/${sm.id}`);
      showToast('Salesman account deleted', 'success');
      fetchSalesmen();
    } catch (err) {
      showToast(err.message || 'Failed to delete salesman', 'error');
    }
  };

  // Open Edit Salesman Modal
  const openEditSalesmanModal = (sm) => {
    setEditSalesmanForm({
      id: sm.id,
      full_name: sm.full_name || '',
      mobile: sm.mobile || '',
      password: '',
      address: sm.address || '',
      status: sm.status || 'active',
    });
    setShowEditSalesmanPwd(false);
    setShowEditSalesmanModal(true);
  };

  // Save Edit Salesman
  const handleSaveEditSalesman = async (e) => {
    e.preventDefault();
    if (!editSalesmanForm.full_name || !editSalesmanForm.mobile) {
      showToast('Name and mobile number are required', 'warning');
      return;
    }
    try {
      const payload = {
        full_name: editSalesmanForm.full_name,
        mobile: editSalesmanForm.mobile,
        address: editSalesmanForm.address,
        status: editSalesmanForm.status,
      };
      if (editSalesmanForm.password && editSalesmanForm.password.trim().length > 0) {
        payload.password = editSalesmanForm.password.trim();
      }
      await api.put(`/salesmen/${editSalesmanForm.id}`, payload);
      showToast(`Salesman "${editSalesmanForm.full_name}" updated successfully`, 'success');
      setShowEditSalesmanModal(false);
      fetchSalesmen();
    } catch (err) {
      showToast(err.message || 'Failed to update salesman', 'error');
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchBusiness(), fetchCustomers(true), fetchSuppliers(), fetchCashbook(), fetchSalesmen()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // When active tab changes, default select first item in that tab
  useEffect(() => {
    if (activeTab === 'customers' && customers.length > 0) {
      selectPartyDetails(customers[0], 'customer');
    } else if (activeTab === 'suppliers' && suppliers.length > 0) {
      selectPartyDetails(suppliers[0], 'supplier');
    } else {
      setSelectedParty(null);
      setPartyTransactions([]);
    }
  }, [activeTab]);

  // Select Party for Sidepanel Details
  const selectPartyDetails = async (party, type, isUserClick = false) => {
    setSelectedParty({ ...party, partyType: type });
    if (isUserClick) {
      setMobileViewMode('detail');
    }
    setLoadingLedger(true);
    try {
      if (type === 'customer') {
        const res = await api.get(`/customers/${party.id}`);
        setPartyTransactions(res.transactions || []);
        setSelectedParty({ ...res.customer, partyType: 'customer' });
      } else {
        const res = await api.get(`/suppliers/${party.id}`);
        setPartyTransactions(res.transactions || []);
        setSelectedParty({ ...res.supplier, partyType: 'supplier' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Add Customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) {
      showToast('Customer name is required', 'warning');
      return;
    }
    try {
      await api.post('/customers', {
        name: newCustomer.name,
        mobile: newCustomer.mobile || '-',
        address: newCustomer.address || null,
        opening_balance: 0,
        opening_balance_type: 'owe_business',
      });
      showToast('Customer added successfully', 'success');
      setShowAddCustomerModal(false);
      setNewCustomer({ name: '', mobile: '', address: '' });
      await fetchCustomers(true);
    } catch (e) {
      showToast(e.message || 'Failed to add customer', 'error');
    }
  };

  // Add Supplier
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) {
      showToast('Supplier name is required', 'warning');
      return;
    }
    try {
      await api.post('/suppliers', {
        name: newSupplier.name,
        mobile: newSupplier.mobile || null,
        address: newSupplier.address || null,
        opening_balance: 0,
        opening_balance_type: 'owe_supplier',
      });
      showToast('Supplier added successfully', 'success');
      setShowAddSupplierModal(false);
      setNewSupplier({ name: '', mobile: '', address: '' });
      await fetchSuppliers(true);
    } catch (e) {
      showToast(e.message || 'Failed to add supplier', 'error');
    }
  };

  // Add Transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    const amount = parseFloat(newTransaction.amount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount', 'warning');
      return;
    }

    try {
      if (selectedParty.partyType === 'customer') {
        const txType = txModalType === 'GAVE' ? 'GAVE' : 'RECEIVED';
        await api.post('/transactions', {
          customer_id: selectedParty.id,
          type: txType,
          amount,
          reference_number: newTransaction.reference_number || null,
          description: newTransaction.description || null,
          attachment_url: newTransaction.attachment_url || null,
          date: newTransaction.date,
        });
        showToast('Transaction saved', 'success');
        selectPartyDetails(selectedParty, 'customer');
        fetchCustomers();
      } else {
        await api.post(`/suppliers/${selectedParty.id}/transactions`, {
          type: txModalType,
          amount,
          reference_number: newTransaction.reference_number || null,
          description: newTransaction.description || null,
          attachment_url: newTransaction.attachment_url || null,
          date: newTransaction.date,
        });
        showToast('Transaction saved', 'success');
        selectPartyDetails(selectedParty, 'supplier');
        fetchSuppliers();
      }
      setShowAddTxModal(false);
      setNewTransaction({
        amount: '',
        reference_number: '',
        description: '',
        attachment_url: '',
        attachment_name: '',
        date: new Date().toISOString().split('T')[0],
      });
    } catch (e) {
      showToast(e.message || 'Failed to record transaction', 'error');
    }
  };

  // Add or Edit Cashbook Entry
  const handleAddCashEntry = async (e) => {
    e.preventDefault();
    const amount = parseFloat(newCashEntry.amount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount', 'warning');
      return;
    }

    try {
      if (editingCashEntry) {
        await api.put(`/cashbook/${editingCashEntry.id}`, {
          type: cashModalType,
          amount,
          category: newCashEntry.category || (cashModalType === 'in' ? 'Cash In' : 'Cash Out'),
          description: newCashEntry.description,
          date: newCashEntry.date,
        });
        showToast('Cash entry updated', 'success');
      } else {
        await api.post('/cashbook', {
          type: cashModalType,
          amount,
          category: newCashEntry.category || (cashModalType === 'in' ? 'Cash In' : 'Cash Out'),
          description: newCashEntry.description,
          date: newCashEntry.date,
        });
        showToast('Cash entry recorded', 'success');
      }
      setShowAddCashEntry(false);
      setEditingCashEntry(null);
      setNewCashEntry({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
      fetchCashbook();
    } catch (e) {
      showToast(e.message || 'Failed to save cash entry', 'error');
    }
  };

  const openEditCashEntry = (entry) => {
    setEditingCashEntry(entry);
    setNewCashEntry({
      amount: entry.amount,
      category: entry.category || '',
      description: entry.description || '',
      date: entry.date ? entry.date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setCashModalType(entry.type);
    setShowAddCashEntry(true);
  };

  const handleDeleteCashEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cash entry?')) return;
    try {
      await api.delete(`/cashbook/${id}`);
      showToast('Cash entry deleted', 'success');
      fetchCashbook();
    } catch (err) {
      showToast(err.message || 'Failed to delete cash entry', 'error');
    }
  };

  // Party Edit & Delete
  const openEditPartyModal = (party) => {
    if (!party) return;
    setEditPartyForm({
      id: party.id,
      name: party.name || '',
      mobile: party.mobile || '',
      address: party.address || '',
      city: party.city || '',
    });
    setShowEditPartyModal(true);
  };

  const handleSaveEditParty = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'customers') {
        const res = await api.put(`/customers/${editPartyForm.id}`, editPartyForm);
        showToast('Customer details updated', 'success');
        await fetchCustomers();
        setSelectedParty((prev) => ({ ...prev, ...res.customer }));
      } else {
        const res = await api.put(`/suppliers/${editPartyForm.id}`, editPartyForm);
        showToast('Supplier details updated', 'success');
        await fetchSuppliers();
        setSelectedParty((prev) => ({ ...prev, ...res.supplier }));
      }
      setShowEditPartyModal(false);
    } catch (err) {
      showToast(err.message || 'Failed to update details', 'error');
    }
  };

  const handleDeleteParty = async () => {
    if (!selectedParty) return;
    const isCustomer = activeTab === 'customers';
    const label = isCustomer ? 'Customer' : 'Supplier';
    if (!window.confirm(`Are you sure you want to delete ${label} "${selectedParty.name}"? All associated transaction records will be permanently removed.`)) {
      return;
    }
    try {
      if (isCustomer) {
        await api.delete(`/customers/${selectedParty.id}`);
        showToast('Customer deleted successfully', 'success');
        await fetchCustomers();
      } else {
        await api.delete(`/suppliers/${selectedParty.id}`);
        showToast('Supplier deleted successfully', 'success');
        await fetchSuppliers();
      }
      setSelectedParty(null);
      setPartyTransactions([]);
    } catch (err) {
      showToast(err.message || `Failed to delete ${label}`, 'error');
    }
  };

  // Transaction Edit & Delete
  const handleEditTxFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be under 5MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditTxForm((prev) => ({
        ...prev,
        attachment_url: reader.result,
        attachment_name: file.name,
      }));
      showToast(`Attached: ${file.name}`, 'info');
    };
    reader.readAsDataURL(file);
  };

  const openEditTxModal = (tx) => {
    setEditTxForm({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      date: tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0],
      description: tx.description || '',
      reference_number: tx.reference_number || '',
      attachment_url: tx.attachment_url || '',
      attachment_name: '',
    });
    setShowEditTxModal(true);
  };

  const handleSaveEditTx = async (e) => {
    e.preventDefault();
    if (!editTxForm.amount || parseFloat(editTxForm.amount) <= 0) {
      showToast('Please enter a valid amount', 'warning');
      return;
    }
    try {
      if (activeTab === 'customers') {
        await api.put(`/transactions/${editTxForm.id}`, {
          amount: parseFloat(editTxForm.amount),
          date: editTxForm.date,
          description: editTxForm.description,
          reference_number: editTxForm.reference_number || null,
          attachment_url: editTxForm.attachment_url || null,
        });
        showToast('Transaction updated', 'success');
        if (selectedParty) {
          selectPartyDetails(selectedParty, 'customer');
        }
        fetchCustomers();
      } else {
        await api.put(`/suppliers/transactions/${editTxForm.id}`, {
          amount: parseFloat(editTxForm.amount),
          date: editTxForm.date,
          description: editTxForm.description,
          reference_number: editTxForm.reference_number || null,
          attachment_url: editTxForm.attachment_url || null,
        });
        showToast('Transaction updated', 'success');
        if (selectedParty) {
          selectPartyDetails(selectedParty, 'supplier');
        }
        fetchSuppliers();
      }
      setShowEditTxModal(false);
    } catch (err) {
      showToast(err.message || 'Failed to update transaction', 'error');
    }
  };

  const handleDeleteTx = async (tx) => {
    if (!window.confirm(`Are you sure you want to delete this entry of ₹${tx.amount}?`)) {
      return;
    }
    try {
      if (activeTab === 'customers') {
        await api.delete(`/transactions/${tx.id}`);
        showToast('Transaction deleted', 'success');
        if (selectedParty) {
          selectPartyDetails(selectedParty, 'customer');
        }
        fetchCustomers();
      } else {
        await api.delete(`/suppliers/transactions/${tx.id}`);
        showToast('Transaction deleted', 'success');
        if (selectedParty) {
          selectPartyDetails(selectedParty, 'supplier');
        }
        fetchSuppliers();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete transaction', 'error');
    }
  };

  // Save Business Profile
  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    try {
      await api.put('/business', businessForm);
      showToast('Business details updated', 'success');
      setShowEditBusinessModal(false);
      fetchBusiness();
    } catch (e) {
      showToast(e.message || 'Failed to update business details', 'error');
    }
  };

  // Export Full Backup
  const handleDownloadBackup = async () => {
    try {
      const blob = await api.get('/backup/export-json');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Grihalakshmi-Backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      showToast('Backup downloaded successfully', 'success');
    } catch (e) {
      showToast('Failed to export backup', 'error');
    }
  };

  // Export CSV
  const handleDownloadCSV = async (customType = null) => {
    try {
      const type = customType || (activeTab === 'customers' ? 'customers' : 'transactions');
      const blob = await api.get(`/backup/export-csv/${type}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Grihalakshmi-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} CSV exported successfully!`, 'success');
      setShowExportMenu(false);
    } catch (e) {
      showToast('Failed to export CSV', 'error');
    }
  };

  // WhatsApp Reminder
  const sendWhatsAppReminder = (party, isCustomer = true) => {
    const rawBal = party.current_balance;
    const amountStr = `₹${Math.abs(rawBal).toLocaleString('en-IN')}`;
    let msg = '';
    if (isCustomer) {
      msg = `Dear ${party.name}, your balance of ${amountStr} with ${businessInfo.name} is outstanding. Kindly clear via UPI (${businessInfo.upi_id || ''}) or cash. Thank you!`;
    } else {
      msg = `Hello ${party.name}, regarding our account balance of ${amountStr} with ${businessInfo.name}. Kindly verify the ledger. Thank you!`;
    }
    const cleanPhone = (party.mobile || '').replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // PDF Report (Professional Multi-Page Business Analytics)
  const generatePdfReport = (customTitle = null) => {
    const list = activeTab === 'customers' ? customers : suppliers;
    const isCustomer = activeTab === 'customers';
    generateBusinessReportPDF({
      title: customTitle || `${isCustomer ? 'CUSTOMER' : 'SUPPLIER'} ACCOUNTS RECOVERY SUMMARY`,
      totalReceivable: customerSummary.willGet,
      totalPayable: isCustomer ? customerSummary.willGive : supplierSummary.willGive,
      totalAccounts: list.length,
      filename: `Grihalakshmi-${activeTab}-Report`,
      items: list.map(item => ({
        name: item.name,
        mobile: item.mobile,
        address: item.address || item.city,
        current_balance: item.current_balance,
        status: (item.current_balance > 0 ? (isCustomer ? 'You Will Get' : 'You Will Give') : item.current_balance < 0 ? (isCustomer ? 'You Will Give' : 'You Will Get') : 'Settled')
      }))
    }, businessInfo);
    showToast('Report PDF downloaded!', 'success');
  };

  // Single Party Statement PDF (Professional Statement with GSTIN & Header)
  const generatePartyStatementPDF = () => {
    if (!selectedParty) return;
    const isCustomer = selectedParty.partyType === 'customer' || activeTab === 'customers';
    const totalGave = partyTransactions.reduce((sum, t) => sum + (t.type === 'GAVE' ? Number(t.amount || 0) : 0), 0);
    const totalReceived = partyTransactions.reduce((sum, t) => sum + (t.type === 'RECEIVED' ? Number(t.amount || 0) : 0), 0);
    const closingBalance = Number(selectedParty.current_balance || 0);
    const openingBalance = closingBalance + (isCustomer ? (totalReceived - totalGave) : (totalGave - totalReceived));

    generateStatementPDF({
      customer: selectedParty,
      party: selectedParty,
      partyType: isCustomer ? 'customer' : 'supplier',
      period: { fromDate: '', toDate: new Date().toISOString().slice(0, 10) },
      openingBalance,
      totalGave,
      totalReceived,
      closingBalance,
      transactions: partyTransactions
    }, businessInfo);
    showToast('Statement PDF downloaded!', 'success');
  };

  // Single Party Statement CSV Export
  const generatePartyStatementCSV = () => {
    if (!selectedParty) return;
    const isCustomer = selectedParty.partyType === 'customer' || activeTab === 'customers';
    exportStatementToCSV({
      customer: selectedParty,
      party: selectedParty,
      partyType: isCustomer ? 'customer' : 'supplier',
      transactions: partyTransactions
    });
    showToast('Statement CSV exported!', 'success');
  };

  // Filter lists
  const currentList = activeTab === 'customers' ? customers : suppliers;
  const filteredList = currentList.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.mobile && item.mobile.includes(searchQuery));
    if (!matchSearch) return false;
    if (filterType === 'will_get') {
      return activeTab === 'customers' ? item.current_balance > 0 : item.current_balance < 0;
    }
    if (filterType === 'will_give') {
      return activeTab === 'customers' ? item.current_balance < 0 : item.current_balance > 0;
    }
    return true;
  });

  const getInitials = (name) => {
    if (!name) return 'P';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '2 days ago';
    const diffDays = Math.floor((new Date() - new Date(timestamp)) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <div className="bg-slate-50 text-slate-800 antialiased flex flex-col min-h-screen font-sans">
      
      {/* 1. TOP NAVIGATION HEADER (Matching desktop_khata_simplified_grihalakshmi_food_products.html) */}
      <header className="bg-[#1b5e20] text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* DESKTOP & TABLET TOP NAVIGATION HEADER */}
          <div className="hidden md:flex items-center justify-between h-16">
            
            {/* Brand Identity & Business Switcher */}
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.png" 
                alt="Grihalakshmi Food Products Logo" 
                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-white/30 shadow-sm"
              />
              <div>
                <div 
                  onClick={() => setShowEditBusinessModal(true)}
                  className="flex items-center space-x-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <h1 className="text-base font-semibold text-white tracking-tight leading-none">
                    {businessInfo.name}
                  </h1>
                  <Edit2 className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <p className="text-xs text-emerald-200 mt-0.5">
                  {businessInfo.tagline || 'Spices, Pure Curry Powders & Millets Ledger'}
                </p>
              </div>
            </div>

            {/* Center Khatabook-style Top Tabs */}
            <nav className="flex items-center space-x-1 bg-[#144c19] p-1 rounded-xl">
              <button 
                id="tab-customers"
                onClick={() => setActiveTab('customers')}
                className={`px-5 py-1.5 rounded-lg text-sm transition-all ${
                  activeTab === 'customers'
                    ? 'font-semibold bg-white text-[#1b5e20] shadow-sm'
                    : 'font-medium text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                CUSTOMERS
              </button>

              <button 
                id="tab-suppliers"
                onClick={() => setActiveTab('suppliers')}
                className={`px-5 py-1.5 rounded-lg text-sm transition-all ${
                  activeTab === 'suppliers'
                    ? 'font-semibold bg-white text-[#1b5e20] shadow-sm'
                    : 'font-medium text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                SUPPLIERS
              </button>
            </nav>

            {/* Right Utilities & Profile */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={loadAll}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-900 rounded-lg text-xs font-semibold text-emerald-100 border border-emerald-700/50 transition"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Live Sync</span>
              </button>

              {/* Salesmen / Staff Shortcut */}
              <button
                type="button"
                onClick={() => {
                  fetchSalesmen();
                  setShowSalesmenModal(true);
                }}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-900 rounded-lg text-xs font-semibold text-emerald-100 border border-emerald-700/50 transition"
                title="Manage Staff & Salesmen"
              >
                <Users className="w-3.5 h-3.5 text-emerald-300" />
                <span>Salesmen ({salesmen.length})</span>
              </button>

              {/* Add Salesman Top Corner Button */}
              <button
                type="button"
                onClick={() => {
                  fetchSalesmen();
                  setShowAddSalesmanModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold rounded-lg shadow-sm transition"
                title="Register new salesman with login password"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                <span>Add Salesman</span>
              </button>

              {/* User Profile */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center pl-2 border-l border-emerald-700/60 space-x-2 focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#1b5e20] font-bold text-xs flex items-center justify-center">
                    GL
                  </div>
                  <span className="text-xs font-medium text-emerald-100 hidden sm:inline">Admin</span>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-bold text-slate-800">{user?.full_name || 'Admin User'}</p>
                      <p className="text-slate-500 font-mono text-[10px]">{user?.mobile || user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleDownloadBackup();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>Download Backup</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        fetchSalesmen();
                        setShowAddSalesmanModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Add Salesman</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        fetchSalesmen();
                        setShowSalesmenModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Manage Salesmen ({salesmen.length})</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowEditBusinessModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Business Settings</span>
                    </button>
                    <button
                      onClick={logout}
                      className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* DEDICATED PURPOSE-BUILT MOBILE HEADER (Visible only on screens < 768px) */}
          <div className="md:hidden flex items-center justify-between h-14">
            <div className="flex items-center space-x-2.5">
              <img 
                src="/logo.png" 
                alt="Grihalakshmi Logo" 
                className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border border-white/30 shadow-xs shrink-0"
              />
              <div 
                onClick={() => setShowEditBusinessModal(true)}
                className="cursor-pointer"
              >
                <h1 className="text-sm font-bold text-white tracking-tight leading-none truncate max-w-[190px]">
                  {businessInfo.name}
                </h1>
                <p className="text-[10px] text-emerald-200 mt-0.5 truncate max-w-[190px]">
                  Official Ledger &amp; Field Staff
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button 
                onClick={loadAll}
                className="p-1.5 rounded-lg bg-emerald-900/60 text-emerald-100 border border-emerald-700/50 transition active:scale-95"
                title="Live Sync"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse block" />
              </button>

              <button
                onClick={() => {
                  fetchSalesmen();
                  setShowAddSalesmanModal(true);
                }}
                className="p-1.5 rounded-lg bg-white/10 text-emerald-100 hover:bg-white/20 transition active:scale-95"
                title="Register Salesman"
              >
                <UserPlus className="w-4 h-4 text-emerald-200" />
              </button>

              <button
                onClick={() => setMobileTab('more')}
                className="w-8 h-8 rounded-full bg-emerald-100 text-[#1b5e20] font-bold text-xs flex items-center justify-center border border-white/40 shadow-xs active:scale-95"
              >
                GL
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* DESKTOP & TABLET SUMMARY BANNER (Hidden on Mobile) */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 py-5 px-6">
            
            {/* You will give */}
            <div className="flex flex-col items-center justify-center text-center py-2 md:py-0">
              <span className="text-sm font-medium text-slate-500">You will give</span>
              <div className="mt-1 flex items-baseline space-x-1">
                <span className="text-3xl font-bold tracking-tight text-emerald-700">
                  ₹ {activeTab === 'customers' ? customerSummary.willGive.toLocaleString('en-IN') : supplierSummary.willGive.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'customers' ? 'Customer advance balance' : 'Supplier liabilities / payable'}
              </span>
            </div>

            {/* You will get */}
            <div className="flex flex-col items-center justify-center text-center py-2 md:py-0">
              <span className="text-sm font-medium text-slate-500">You will get</span>
              <div className="mt-1 flex items-baseline space-x-1">
                <span className="text-3xl font-bold tracking-tight text-red-600" id="total-receivable">
                  ₹ {activeTab === 'customers' ? customerSummary.willGet.toLocaleString('en-IN') : supplierSummary.willGet.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-0.5">
                From {activeTab === 'customers' ? customers.length : suppliers.length} {activeTab}
              </span>
            </div>

          </div>

          {/* Action Bar under the summary card */}
          <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowReportsModal(true)}
                className="inline-flex items-center text-blue-700 hover:text-blue-800 font-semibold transition space-x-1.5"
                title="Open Comprehensive Business Reports & Analytics"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="underline decoration-blue-200 underline-offset-2">View Reports & Analytics</span>
              </button>
              <span className="text-slate-300">|</span>
              
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="inline-flex items-center text-slate-700 hover:text-slate-900 font-semibold transition space-x-1.5"
                  title="Export Data & Download Reports"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Download Reports / CSV ▾</span>
                </button>

                {showExportMenu && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                    <button
                      onClick={() => { generatePdfReport(); setShowExportMenu(false); }}
                      className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-emerald-800 font-medium flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Download {activeTab === 'customers' ? 'Customers' : 'Suppliers'} Report (PDF)</span>
                    </button>
                    <button
                      onClick={() => handleDownloadCSV('customers')}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                      <span>Export Customers List (CSV)</span>
                    </button>
                    <button
                      onClick={() => handleDownloadCSV('transactions')}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export All Ledger Transactions (CSV)</span>
                    </button>
                    <button
                      onClick={() => handleDownloadCSV('collections')}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                      <span>Export Field Collections (CSV)</span>
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => { handleDownloadBackup(); setShowExportMenu(false); }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-600 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Download Full JSON Backup</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center text-slate-500 space-x-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" />
              <span>Updated live from ledger</span>
            </div>
          </div>
        </div>

        {/* MOBILE DASHBOARD VIEW (Shown only on mobile when mobileTab === 'home') */}
        {mobileTab === 'home' && (
          <div className="md:hidden space-y-4 pb-24 animate-in fade-in">
            {/* Mobile Header Greeting */}
            <div className="p-4 bg-gradient-to-br from-[#1b5e20] to-[#144c19] text-white rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-emerald-200 font-medium">
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'},
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold text-white">
                  Live Ledger
                </span>
              </div>
              <h2 className="text-lg font-bold leading-tight">{user?.full_name || 'Admin'}</h2>
              <p className="text-xs text-emerald-100 mt-0.5">{businessInfo.name}</p>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => { setFilterType('will_get'); setMobileTab('parties'); setMobileViewMode('list'); }}
                className="p-3.5 bg-red-50 border border-red-200/80 rounded-2xl shadow-xs cursor-pointer active:scale-98 transition"
              >
                <span className="text-[11px] font-bold text-red-600 uppercase tracking-tight">You Will Get</span>
                <p className="text-xl font-black text-red-700 mt-1 font-mono">
                  ₹ {customerSummary.willGet.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-red-500 mt-0.5 block font-medium">From {customers.filter(c => c.current_balance > 0).length} customers</span>
              </div>

              <div 
                onClick={() => { setFilterType('will_give'); setMobileTab('parties'); setMobileViewMode('list'); }}
                className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl shadow-xs cursor-pointer active:scale-98 transition"
              >
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-tight">You Will Give</span>
                <p className="text-xl font-black text-emerald-800 mt-1 font-mono">
                  ₹ {supplierSummary.willGive.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">To {suppliers.filter(s => s.current_balance > 0).length} suppliers</span>
              </div>
            </div>

            {/* Quick Action Grid */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Quick Actions</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 transition active:scale-95"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-1">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">+ Customer</span>
                </button>

                <button
                  onClick={() => setShowAddSupplierModal(true)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 transition active:scale-95"
                >
                  <div className="w-9 h-9 rounded-full bg-[#006978]/10 text-[#006978] flex items-center justify-center mb-1">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">+ Supplier</span>
                </button>

                <button
                  onClick={() => setShowCashbookModal(true)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-blue-50 transition active:scale-95"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-1">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">Cashbook</span>
                </button>

                <button
                  onClick={() => setShowReportsModal(true)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-amber-50 transition active:scale-95"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-1">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">Reports</span>
                </button>
              </div>
            </div>

            {/* Top Due Accounts to Collect */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Pending Recoveries</h3>
                <button
                  onClick={() => { setFilterType('will_get'); setMobileTab('parties'); setMobileViewMode('list'); }}
                  className="text-[11px] font-bold text-emerald-700"
                >
                  View All &gt;
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {customers.filter(c => c.current_balance > 0).slice(0, 4).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No pending collections. All accounts are settled!
                  </div>
                ) : (
                  customers.filter(c => c.current_balance > 0).slice(0, 4).map(c => (
                    <div 
                      key={c.id}
                      onClick={() => {
                        selectPartyDetails(c, 'customer', true);
                        setMobileTab('parties');
                      }}
                      className="p-3 flex items-center justify-between active:bg-slate-50"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">{c.name}</p>
                          <p className="text-[10px] text-slate-400">{c.city || c.address || 'Customer'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-red-600 font-mono">₹ {Number(c.current_balance).toLocaleString('en-IN')}</p>
                        <span className="text-[9px] text-red-500 font-semibold">Due</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE MORE MENU (Shown on mobile when mobileTab === 'more') */}
        {mobileTab === 'more' && (
          <div className="md:hidden space-y-3 pb-24 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#1b5e20] font-bold text-base flex items-center justify-center">
                  GL
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{user?.full_name || 'Admin User'}</h3>
                  <p className="text-xs text-slate-500 font-mono">{user?.mobile || user?.email}</p>
                  <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase">
                    {user?.role || 'Owner'}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <button
                  onClick={() => { fetchSalesmen(); setShowSalesmenModal(true); }}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Manage Salesmen ({salesmen.length})</span>
                  </div>
                  <span className="text-slate-400 font-mono">&gt;</span>
                </button>

                <button
                  onClick={() => { fetchSalesmen(); setShowAddSalesmanModal(true); }}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>+ Register New Salesman</span>
                  </div>
                  <span className="text-slate-400 font-mono">&gt;</span>
                </button>

                <button
                  onClick={() => setShowEditBusinessModal(true)}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    <span>Business Settings &amp; UPI</span>
                  </div>
                  <span className="text-slate-400 font-mono">&gt;</span>
                </button>

                <button
                  onClick={handleDownloadBackup}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Download Database Backup</span>
                  </div>
                  <span className="text-slate-400 font-mono">&gt;</span>
                </button>

                <button
                  onClick={logout}
                  className="w-full text-left p-3 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold flex items-center justify-between border-t border-slate-100 pt-3"
                >
                  <div className="flex items-center gap-2.5">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </div>
                  <span className="font-mono">&gt;</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE PARTIES SEGMENTED CONTROL (Visible only on mobile when mobileTab === 'parties' and mobileViewMode === 'list') */}
        {mobileTab === 'parties' && mobileViewMode === 'list' && (
          <div className="md:hidden flex items-center bg-slate-200/90 p-1 rounded-xl mb-3 shadow-inner">
            <button
              onClick={() => { setActiveTab('customers'); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'customers' ? 'bg-[#1b5e20] text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              CUSTOMERS ({customers.length})
            </button>
            <button
              onClick={() => { setActiveTab('suppliers'); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'suppliers' ? 'bg-[#006978] text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              SUPPLIERS ({suppliers.length})
            </button>
          </div>
        )}

        {/* MAIN 2-COLUMN ADAPTIVE LAYOUT */}
        <div className={`grid grid-cols-1 md:grid-cols-12 md:gap-4 lg:gap-6 pb-20 md:pb-6 ${
          mobileTab !== 'parties' ? 'hidden md:grid' : ''
        }`}>
          
          {/* LEFT PANEL: PARTIES LISTING SECTION (md:col-span-6 lg:col-span-7 xl:col-span-8) */}
          <section className={`md:col-span-6 lg:col-span-7 xl:col-span-8 space-y-4 ${
            mobileTab !== 'parties' ? 'hidden md:block' : mobileViewMode === 'detail' ? 'hidden md:block' : 'block'
          }`}>
            
            {/* Search & Quick Action Toolbar */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="text"
                  id="party-search-input"
                  placeholder={activeTab === 'customers' ? 'Search Customer...' : 'Search Supplier...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition"
                />
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                  <button 
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        setShowFilterSheet(true);
                      } else {
                        setShowFilterDropdown(!showFilterDropdown);
                      }
                    }}
                    className={`p-1 rounded-md transition ${filterType !== 'all' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 hover:text-slate-600'}`} 
                    title="Filter list"
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                </div>

                {/* Desktop Filter Dropdown */}
                {showFilterDropdown && (
                  <div className="hidden md:block absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-40 text-xs">
                    <button
                      onClick={() => { setFilterType('all'); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${filterType === 'all' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600'}`}
                    >
                      All Accounts
                    </button>
                    <button
                      onClick={() => { setFilterType('will_get'); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${filterType === 'will_get' ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}
                    >
                      You Will Get (Len)
                    </button>
                    <button
                      onClick={() => { setFilterType('will_give'); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${filterType === 'will_give' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'}`}
                    >
                      You Will Give (Den)
                    </button>
                  </div>
                )}
              </div>

              {/* Primary Actions */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {/* Cashbook Shortcut Button */}
                <button 
                  onClick={() => setShowCashbookModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span>Cashbook</span>
                </button>

                {/* Add Party Button (Khatabook magenta/emerald action style) */}
                {activeTab === 'customers' ? (
                  <button 
                    onClick={() => setShowAddCustomerModal(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#9d174d] hover:bg-[#831843] text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span id="add-party-text">ADD CUSTOMER</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowAddSupplierModal(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#006978] hover:bg-[#005763] text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span id="add-party-text">ADD SUPPLIER</span>
                  </button>
                )}
              </div>

            </div>

            {/* Party List Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100" id="party-list">
                {filteredList.length === 0 ? (
                  <div className="text-center py-12 p-4">
                    <p className="text-xs font-bold text-slate-400">No {activeTab} found matching your query.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Use the "ADD" button above to add a new account.</p>
                  </div>
                ) : (
                  filteredList.map((item) => {
                    const isSelected = selectedParty?.id === item.id;
                    const rawBal = item.current_balance || 0;
                    const willGet = activeTab === 'customers' ? rawBal > 0 : rawBal < 0;
                    const initials = getInitials(item.name);

                    return (
                      <div
                        key={item.id}
                        onClick={() => selectPartyDetails(item, activeTab === 'customers' ? 'customer' : 'supplier', true)}
                        className={`transition cursor-pointer border-l-4 ${
                          isSelected ? 'border-emerald-600 bg-emerald-50/20' : 'border-transparent'
                        }`}
                      >
                        {/* DESKTOP & TABLET ROW (hidden on screens < 640px) */}
                        <div className="hidden sm:flex p-4 items-center justify-between hover:bg-slate-50 transition">
                          <div className="flex items-center space-x-3.5">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${
                              isSelected 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {initials}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                                {item.name}
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {item.city ? `${item.city} • ` : ''}{getRelativeTime(item.updated_at || item.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`text-base font-bold ${
                              rawBal === 0 ? 'text-slate-600' : willGet ? 'text-red-600' : 'text-emerald-700'
                            }`}>
                              ₹ {Math.abs(rawBal).toLocaleString('en-IN')}
                            </div>
                            {rawBal !== 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sendWhatsAppReminder(item, activeTab === 'customers');
                                }}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-end space-x-0.5 mt-0.5"
                              >
                                <span>{activeTab === 'customers' ? 'REMIND' : 'REQUEST'}</span>
                                <span className="font-mono text-[10px]">&gt;</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* MOBILE DEDICATED PURPOSE-BUILT CARD (sm:hidden) */}
                        <div className="sm:hidden p-3.5 space-y-2.5 active:bg-slate-50">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                                {initials}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                                  {item.name}
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {item.mobile ? `+91 ${item.mobile}` : item.city || item.address || 'Active account'}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`text-sm font-black font-mono block ${
                                rawBal === 0 ? 'text-slate-600' : willGet ? 'text-red-600' : 'text-emerald-700'
                              }`}>
                                ₹ {Math.abs(rawBal).toLocaleString('en-IN')}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-tight ${
                                rawBal === 0 ? 'text-slate-400' : willGet ? 'text-red-500' : 'text-emerald-600'
                              }`}>
                                {rawBal === 0 ? 'Settled' : willGet ? 'Due (Len)' : 'Advance (Den)'}
                              </span>
                            </div>
                          </div>

                          {/* Mobile Action Bar */}
                          <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                            <div className="flex items-center space-x-1.5">
                              {item.mobile && (
                                <a
                                  href={`tel:${item.mobile}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold text-[11px] active:bg-slate-200"
                                >
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>Call</span>
                                </a>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sendWhatsAppReminder(item, activeTab === 'customers');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-semibold text-[11px] active:bg-emerald-100"
                              >
                                <Share2 className="w-3 h-3 text-emerald-600" />
                                <span>WhatsApp</span>
                              </button>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStatementParty({ ...item, partyType: activeTab === 'customers' ? 'customer' : 'supplier' });
                                  setShowStatementModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-slate-800 font-semibold text-[11px]"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Statement</span>
                              </button>
                              <span className="text-emerald-700 font-bold text-xs flex items-center">
                                Ledger &gt;
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom status */}
              <div className="px-4 py-3 bg-slate-50 text-xs text-slate-500 flex justify-between items-center border-t border-slate-100">
                <span>Showing {filteredList.length} active {activeTab} accounts</span>
                <span 
                  onClick={generatePdfReport}
                  className="text-emerald-700 font-medium cursor-pointer hover:underline"
                >
                  Download Statement
                </span>
              </div>
            </div>

          </section>

          {/* RIGHT PANEL: PARTY LEDGER DETAIL / MINISTATEMENT */}
          <aside className={`md:col-span-6 lg:col-span-5 xl:col-span-4 ${
            mobileTab !== 'parties' ? 'hidden md:block' : mobileViewMode === 'detail' ? 'block' : 'hidden md:block'
          }`}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-20">
              
              {selectedParty ? (
                <>
                  {/* MOBILE HEADER (Visible only on mobile when inspecting party ledger) */}
                  <div className="md:hidden flex items-center justify-between p-3.5 bg-gradient-to-r from-[#1b5e20] to-[#144c19] text-white">
                    <button
                      type="button"
                      onClick={() => setMobileViewMode('list')}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white/20 active:bg-white/30 text-white font-bold text-xs transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <div className="text-center font-bold text-xs truncate max-w-[150px]">
                      {selectedParty.name}
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {selectedParty.mobile && (
                        <a
                          href={`tel:${selectedParty.mobile}`}
                          className="p-1.5 rounded-lg bg-white/20 active:bg-white/30 text-white"
                          title="Call"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => sendWhatsAppReminder(selectedParty, selectedParty.partyType === 'customer')}
                        className="p-1.5 rounded-lg bg-white/20 active:bg-white/30 text-white"
                        title="WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Selected Party Header (Desktop & Full details) */}
                  <div className="p-4 bg-slate-50/70 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                        Party Details
                      </span>
                      <button 
                        onClick={() => {
                          setTxModalType('GOT');
                          setShowAddTxModal(true);
                        }}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                      >
                        + New Entry
                      </button>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center shrink-0">
                          {getInitials(selectedParty.name)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {selectedParty.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {selectedParty.mobile ? `+91 ${selectedParty.mobile}` : 'No phone set'}
                          </p>
                          {selectedParty.address && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              📍 {selectedParty.address}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Edit / Delete Account Actions */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => openEditPartyModal(selectedParty)}
                          title="Edit Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition border border-slate-200/60 hover:border-emerald-300"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteParty}
                          title="Delete Account"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200/60 hover:border-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Due Balance Snapshot */}
                    {(() => {
                      const rawBal = selectedParty.current_balance || 0;
                      const isCustomer = selectedParty.partyType === 'customer';
                      const willGet = isCustomer ? rawBal > 0 : rawBal < 0;

                      return (
                        <div className={`mt-4 p-3 rounded-lg flex items-center justify-between border ${
                          rawBal === 0 
                            ? 'bg-slate-50 border-slate-200' 
                            : willGet 
                              ? 'bg-red-50/70 border-red-100' 
                              : 'bg-emerald-50/70 border-emerald-100'
                        }`}>
                          <div>
                            <div className={`text-[11px] font-medium ${
                              rawBal === 0 ? 'text-slate-600' : willGet ? 'text-red-600' : 'text-emerald-700'
                            }`}>
                              {rawBal === 0 ? 'Account Settled' : willGet ? 'Pending Due (Len)' : 'Payable (Den)'}
                            </div>
                            <div className={`text-xl font-bold ${
                              rawBal === 0 ? 'text-slate-800' : willGet ? 'text-red-700' : 'text-emerald-800'
                            }`}>
                              ₹ {Math.abs(rawBal).toLocaleString('en-IN')}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => {
                                setTxModalType('GOT');
                                setShowAddTxModal(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm transition"
                            >
                              Receive ₹
                            </button>
                            <button 
                              onClick={() => {
                                setTxModalType('GAVE');
                                setShowAddTxModal(true);
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow-sm transition"
                            >
                              Give ₹
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Recent Entries in this Ledger */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Recent Transactions
                      </h4>
                      <span className="text-[11px] text-slate-400">Past 30 Days</span>
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {loadingLedger ? (
                        <p className="text-xs text-slate-400 py-6 text-center">Loading entries...</p>
                      ) : partyTransactions.length === 0 ? (
                        <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                          No transactions yet. Record an entry below.
                        </div>
                      ) : (
                        partyTransactions.map((tx) => {
                          const isGave = tx.type === 'GAVE';
                          return (
                            <div key={tx.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-start justify-between text-xs">
                              <div className="space-y-1">
                                <p className="font-medium text-slate-800">{tx.description || (isGave ? 'Credit Given' : 'Payment Received')}</p>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                  <span className="text-slate-400">{formatDate(tx.date)}</span>
                                  {tx.reference_number && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-mono font-semibold">
                                      <Receipt className="w-2.5 h-2.5" />
                                      Bill #{tx.reference_number}
                                    </span>
                                  )}
                                  {tx.attachment_url && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAttachment({
                                        url: tx.attachment_url,
                                        title: tx.reference_number ? `Bill #${tx.reference_number}` : 'Attached Bill',
                                      })}
                                      className="inline-flex items-center gap-0.5 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors font-semibold"
                                    >
                                      <Paperclip className="w-2.5 h-2.5" />
                                      <span>View Bill</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <div className="text-right">
                                  <span className={`font-bold block ${isGave ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {isGave ? '+' : '-'} ₹ {parseFloat(tx.amount).toLocaleString('en-IN')}
                                  </span>
                                  {tx.running_balance !== undefined && (
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      Bal: ₹{Math.abs(tx.running_balance).toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditTxModal(tx)}
                                    title="Edit Entry"
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTx(tx)}
                                    title="Delete Entry"
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quick Statement, PDF, CSV & WhatsApp Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      <button 
                        onClick={() => {
                          setStatementParty({ ...selectedParty, partyType: activeTab === 'customers' ? 'customer' : 'supplier' });
                          setShowStatementModal(true);
                        }}
                        className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 bg-[#1b5e20] hover:bg-[#144c19] text-white text-xs font-bold rounded-lg shadow-sm transition"
                        title="View Detailed Ledger Statement with Date Filter"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Statement</span>
                      </button>

                      <button 
                        onClick={generatePartyStatementPDF}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-sm transition" 
                        title="Download Branded Statement PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-700" />
                        <span>PDF</span>
                      </button>

                      <button 
                        onClick={generatePartyStatementCSV}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-sm transition" 
                        title="Export Statement to CSV"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                        <span>CSV</span>
                      </button>

                      <button 
                        onClick={() => sendWhatsAppReminder(selectedParty, selectedParty.partyType === 'customer')}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
                        title="Send WhatsApp Reminder / Statement Link"
                      >
                        <Share2 className="w-4 h-4 text-emerald-600" />
                      </button>
                    </div>

                  </div>

                  {/* MOBILE STICKY BOTTOM ACTION BAR (Gave / Got) */}
                  <div className="fixed bottom-0 inset-x-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 md:hidden flex gap-2.5 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setTxModalType('GAVE');
                        setShowAddTxModal(true);
                      }}
                      className="flex-1 py-3 bg-rose-600 active:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                    >
                      <span>YOU GAVE ₹</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTxModalType('GOT');
                        setShowAddTxModal(true);
                      }}
                      className="flex-1 py-3 bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                    >
                      <span>YOU GOT ₹</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-10 text-center text-xs text-slate-400">
                  Select a party from the list to view their ledger.
                </div>
              )}

            </div>
          </aside>

        </div>
      </main>

      {/* 3. MINIMAL FOOTER (Hidden on mobile to yield room for mobile bottom nav) */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-slate-700">{businessInfo.name}</span>
            <span>•</span>
            <span>Online Khatabook Desktop</span>
          </div>

          <div className="mt-2 sm:mt-0 flex items-center space-x-4">
            <span className="inline-flex items-center text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
              100% Secure &amp; Auto-backed up
            </span>
            <button 
              onClick={() => setShowEditBusinessModal(true)} 
              className="hover:underline text-slate-500"
            >
              Settings
            </button>
          </div>
        </div>
      </footer>

      {/* 4. MOBILE FLOATING ACTION BUTTON (+ FAB) WITH SPEED DIAL */}
      {mobileViewMode === 'list' && (
        <div className="fixed bottom-20 right-4 z-40 md:hidden flex flex-col items-end">
          {showFabMenu && (
            <div className="mb-3 flex flex-col gap-2.5 items-end animate-in fade-in slide-in-from-bottom-2">
              <button
                type="button"
                onClick={() => { setShowFabMenu(false); setShowAddCustomerModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#9d174d] text-white rounded-full shadow-xl text-xs font-bold transition active:scale-95"
              >
                <span>+ Add Customer</span>
                <UserPlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setShowFabMenu(false); setShowAddSupplierModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#006978] text-white rounded-full shadow-xl text-xs font-bold transition active:scale-95"
              >
                <span>+ Add Supplier</span>
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setShowFabMenu(false); setShowCashbookModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white rounded-full shadow-xl text-xs font-bold transition active:scale-95"
              >
                <span>Cashbook Entry</span>
                <Wallet className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowFabMenu(!showFabMenu)}
            className={`w-14 h-14 rounded-full bg-emerald-700 text-white shadow-xl flex items-center justify-center font-bold text-2xl transition-all active:scale-95 border-2 border-white/60 ${
              showFabMenu ? 'rotate-45 bg-slate-800' : ''
            }`}
            aria-label="Add New Entry"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* 5. MOBILE BOTTOM NAVIGATION BAR */}
      {mobileViewMode === 'list' && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 md:hidden shadow-lg flex items-center justify-around">
          <button 
            type="button"
            onClick={() => { setMobileTab('home'); setMobileViewMode('list'); }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold transition ${
              mobileTab === 'home' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </button>

          <button 
            type="button"
            onClick={() => { setMobileTab('parties'); setMobileViewMode('list'); }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold transition ${
              mobileTab === 'parties' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span>Parties</span>
          </button>

          <button 
            type="button"
            onClick={() => setShowCashbookModal(true)}
            className="flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-700 transition"
          >
            <Wallet className="w-5 h-5 mb-0.5" />
            <span>Cashbook</span>
          </button>

          <button 
            type="button"
            onClick={() => setShowReportsModal(true)}
            className="flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-700 transition"
          >
            <BarChart2 className="w-5 h-5 mb-0.5" />
            <span>Reports</span>
          </button>

          <button 
            type="button"
            onClick={() => { setMobileTab('more'); setMobileViewMode('list'); }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold transition ${
              mobileTab === 'more' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </nav>
      )}

      {/* 6. MOBILE FILTER BOTTOM SHEET */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden flex items-end animate-in fade-in">
          <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 shadow-2xl">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-1" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Filter {activeTab === 'customers' ? 'Customers' : 'Suppliers'}</h3>
              <button 
                type="button"
                onClick={() => setShowFilterSheet(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { setFilterType('all'); setShowFilterSheet(false); }}
                className={`w-full py-3 px-4 rounded-xl text-left font-semibold text-xs flex items-center justify-between transition ${
                  filterType === 'all' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-slate-50 text-slate-700'
                }`}
              >
                <span>All Accounts ({activeTab === 'customers' ? customers.length : suppliers.length})</span>
                {filterType === 'all' && <Check className="w-4 h-4 text-emerald-700" />}
              </button>
              <button
                type="button"
                onClick={() => { setFilterType('will_get'); setShowFilterSheet(false); }}
                className={`w-full py-3 px-4 rounded-xl text-left font-semibold text-xs flex items-center justify-between transition ${
                  filterType === 'will_get' ? 'bg-red-50 text-red-700 border border-red-300' : 'bg-slate-50 text-slate-700'
                }`}
              >
                <span>You Will Get (Len / Due)</span>
                {filterType === 'will_get' && <Check className="w-4 h-4 text-red-600" />}
              </button>
              <button
                type="button"
                onClick={() => { setFilterType('will_give'); setShowFilterSheet(false); }}
                className={`w-full py-3 px-4 rounded-xl text-left font-semibold text-xs flex items-center justify-between transition ${
                  filterType === 'will_give' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-slate-50 text-slate-700'
                }`}
              >
                <span>You Will Give (Den / Payable)</span>
                {filterType === 'will_give' && <Check className="w-4 h-4 text-emerald-600" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setFilterType('all'); setShowFilterSheet(false); }}
              className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Reset to All
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Arjun"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={newCustomer.mobile}
                  onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Address <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Shop #4, Market Road, Near Temple"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#9d174d] hover:bg-[#831843] text-white font-bold text-sm shadow-md transition-all uppercase tracking-wider"
              >
                Save Customer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Supplier</h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Me or Raw Spices Mandi"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={newSupplier.mobile}
                  onChange={(e) => setNewSupplier({ ...newSupplier, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Address <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Warehouse Plot 12, APMC Market"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#006978] hover:bg-[#005763] text-white font-bold text-sm shadow-md transition-all uppercase tracking-wider"
              >
                Save Supplier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TRANSACTION (GIVE OR GOT) */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className={`text-base font-bold uppercase ${txModalType === 'GAVE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                {txModalType === 'GAVE' ? 'You Gave to' : 'You Got from'} {selectedParty?.name}
              </h3>
              <button onClick={() => setShowAddTxModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="0"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  className="w-full text-2xl font-bold text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Invoice / Bill Number <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-1049 or Bill #82"
                  value={newTransaction.reference_number}
                  onChange={(e) => setNewTransaction({ ...newTransaction, reference_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description / Items <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Curry Powder 200g, Turmeric, Cash"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Attach Bill (Photo or PDF) <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                {newTransaction.attachment_name ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-slate-700 truncate">{newTransaction.attachment_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewTransaction(prev => ({ ...prev, attachment_url: '', attachment_name: '' }))}
                      className="text-rose-500 hover:text-rose-700 p-1 shrink-0"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/50 cursor-pointer text-xs font-semibold text-slate-600 transition-colors">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span>Upload Bill Photo or PDF</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all ${
                  txModalType === 'GAVE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Save Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW ATTACHED BILL (PHOTO OR PDF) */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-4 shadow-2xl space-y-3 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">{previewAttachment.title || 'Attached Bill'}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.url}
                  download={`bill-${Date.now()}`}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 border border-emerald-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 rounded-xl flex items-center justify-center p-2 min-h-[300px]">
              {previewAttachment.url.startsWith('data:application/pdf') || previewAttachment.url.endsWith('.pdf') ? (
                <iframe
                  src={previewAttachment.url}
                  title="PDF Preview"
                  className="w-full h-[500px] rounded-lg border-0"
                />
              ) : (
                <img
                  src={previewAttachment.url}
                  alt="Bill Preview"
                  className="max-h-[500px] max-w-full object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CASHBOOK VIEW & ENTRY */}
      {showCashbookModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Daily Cashbook</h3>
              </div>
              <button onClick={() => setShowCashbookModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-800 uppercase">Cash In</p>
                <p className="text-base font-black text-emerald-700 mt-0.5">₹{cashbookSummary.totalIn.toLocaleString('en-IN')}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <p className="text-[10px] font-bold text-rose-800 uppercase">Cash Out</p>
                <p className="text-base font-black text-rose-700 mt-0.5">₹{cashbookSummary.totalOut.toLocaleString('en-IN')}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-[10px] font-bold text-blue-800 uppercase">Net Balance</p>
                <p className="text-base font-black text-blue-700 mt-0.5">₹{cashbookSummary.netBalance.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Quick buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCashModalType('in');
                  setShowAddCashEntry(true);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm text-center active:scale-98"
              >
                + RECORD CASH IN
              </button>
              <button
                onClick={() => {
                  setCashModalType('out');
                  setShowAddCashEntry(true);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm text-center active:scale-98"
              >
                - RECORD CASH OUT
              </button>
            </div>

            {/* Cash entries list */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1 divide-y divide-slate-100">
              {cashbookEntries.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No cash entries recorded yet.</p>
              ) : (
                cashbookEntries.map((c) => (
                  <div key={c.id} className="pt-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{c.category || (c.type === 'in' ? 'Cash In' : 'Cash Out')}</p>
                      <p className="text-[11px] text-slate-400">{c.description || formatDate(c.date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${c.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {c.type === 'in' ? '+' : '-'} ₹{parseFloat(c.amount).toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditCashEntry(c)}
                        title="Edit Cash Entry"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCashEntry(c.id)}
                        title="Delete Cash Entry"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CASH ENTRY FORM */}
      {showAddCashEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className={`text-base font-bold uppercase ${cashModalType === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {editingCashEntry ? 'Edit Cash Entry' : cashModalType === 'in' ? 'Record Cash In (+)' : 'Record Cash Out (-)'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddCashEntry(false);
                  setEditingCashEntry(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCashEntry} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="0"
                  value={newCashEntry.amount}
                  onChange={(e) => setNewCashEntry({ ...newCashEntry, amount: e.target.value })}
                  className="w-full text-xl font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Category / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter Sales, Fuel, Tea"
                  value={newCashEntry.category}
                  onChange={(e) => setNewCashEntry({ ...newCashEntry, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={newCashEntry.date}
                  onChange={(e) => setNewCashEntry({ ...newCashEntry, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all ${
                  cashModalType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {editingCashEntry ? 'Update Cash Entry' : (cashModalType === 'in' ? 'Save Cash In' : 'Save Cash Out')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BUSINESS DETAILS */}
      {showEditBusinessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Business Profile</h3>
              <button onClick={() => setShowEditBusinessModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBusiness} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessForm.name}
                  onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Phone / Mobile
                </label>
                <input
                  type="text"
                  value={businessForm.phone}
                  onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  UPI ID (For payment reminders)
                </label>
                <input
                  type="text"
                  placeholder="e.g. grihalakshmi@upi"
                  value={businessForm.upi_id}
                  onChange={(e) => setBusinessForm({ ...businessForm, upi_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#1b5e20] hover:bg-[#144c19] text-white font-bold text-sm shadow-md transition-all uppercase tracking-wider"
              >
                Save Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PARTY (CUSTOMER / SUPPLIER) */}
      {showEditPartyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit {activeTab === 'customers' ? 'Customer' : 'Supplier'} Details
              </h3>
              <button onClick={() => setShowEditPartyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditParty} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={editPartyForm.name}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={editPartyForm.mobile}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Address <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={editPartyForm.address}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditPartyModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all uppercase tracking-wider"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TRANSACTION ENTRY */}
      {showEditTxModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit Transaction Entry
              </h3>
              <button onClick={() => setShowEditTxModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTx} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editTxForm.amount}
                  onChange={(e) => setEditTxForm({ ...editTxForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-lg font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={editTxForm.date}
                  onChange={(e) => setEditTxForm({ ...editTxForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description / Notes <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stock supply, payment"
                  value={editTxForm.description}
                  onChange={(e) => setEditTxForm({ ...editTxForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Invoice / Bill Number <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-001"
                  value={editTxForm.reference_number}
                  onChange={(e) => setEditTxForm({ ...editTxForm, reference_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Attach Bill Photo or PDF <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleEditTxFileChange}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
                {editTxForm.attachment_url && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-1.5 rounded">
                    <span className="flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      Attachment present {editTxForm.attachment_name ? `(${editTxForm.attachment_name})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditTxForm({ ...editTxForm, attachment_url: '', attachment_name: '' })}
                      className="text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditTxModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all uppercase tracking-wider"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SALESMAN REGISTRATION */}
      {showAddSalesmanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Add Salesman Registration</h3>
                  <p className="text-[11px] text-slate-400">Create staff login credentials</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddSalesmanModal(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSalesman} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Salesman Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Ramesh Kumar"
                  value={newSalesman.full_name}
                  onChange={(e) => setNewSalesman({ ...newSalesman, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mobile Number (Login Identifier) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={newSalesman.mobile}
                    onChange={(e) => setNewSalesman({ ...newSalesman, mobile: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Salesman will use this phone number to sign in.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Password for Login *
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type={showSalesmanPassword ? 'text' : 'password'}
                    required
                    placeholder="Create login password"
                    value={newSalesman.password}
                    onChange={(e) => setNewSalesman({ ...newSalesman, password: e.target.value })}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSalesmanPassword(!showSalesmanPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                    title={showSalesmanPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSalesmanPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Address / Route <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Calicut North Route, Main Market"
                  value={newSalesman.address}
                  onChange={(e) => setNewSalesman({ ...newSalesman, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSalesmanModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#1b5e20] hover:bg-[#144c19] text-white font-bold text-xs shadow-md transition-all uppercase tracking-wider"
                >
                  Register Salesman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE SALESMEN LIST */}
      {showSalesmenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Salesmen &amp; Field Staff ({salesmen.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">Manage field team access</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSalesmenModal(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action to Add Salesman */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAddSalesmanModal(true);
                }}
                className="w-full py-2.5 bg-[#1b5e20] hover:bg-[#144c19] text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ REGISTER NEW SALESMAN</span>
              </button>
            </div>

            {/* Salesmen List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 divide-y divide-slate-100 pr-1 max-h-80">
              {salesmen.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">No Salesmen Registered</p>
                  <p className="text-[11px] mt-1">Click the button above to register a new salesman.</p>
                </div>
              ) : (
                salesmen.map((sm) => (
                  <div key={sm.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#1b5e20] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {getInitials(sm.full_name)}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 leading-tight">{sm.full_name}</p>
                        <p className="text-[11px] text-slate-600 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-700" />
                          <span>+91 {sm.mobile}</span>
                        </p>
                        {sm.address && (
                          <p className="text-[10px] text-slate-400 line-clamp-1">📍 {sm.address}</p>
                        )}
                        <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Active Login
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => openEditSalesmanModal(sm)}
                        title="Edit Salesman"
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSalesman(sm)}
                        title="Delete Salesman"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              Salesmen log in via mobile number and their configured password.
            </div>

          </div>
        </div>
      )}

      {/* MODAL: EDIT SALESMAN */}
      {showEditSalesmanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Edit Salesman</h3>
                  <p className="text-[11px] text-slate-400">Update profile &amp; login credentials</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditSalesmanModal(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSalesman} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Salesman Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={editSalesmanForm.full_name}
                  onChange={(e) => setEditSalesmanForm({ ...editSalesmanForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mobile Number (Login Identifier) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={editSalesmanForm.mobile}
                    onChange={(e) => setEditSalesmanForm({ ...editSalesmanForm, mobile: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  New Password <span className="text-[10px] text-slate-400 font-normal lowercase">(leave blank to keep unchanged)</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type={showEditSalesmanPwd ? 'text' : 'password'}
                    placeholder="Enter new password if changing"
                    value={editSalesmanForm.password}
                    onChange={(e) => setEditSalesmanForm({ ...editSalesmanForm, password: e.target.value })}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditSalesmanPwd(!showEditSalesmanPwd)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                    title={showEditSalesmanPwd ? 'Hide password' : 'Show password'}
                  >
                    {showEditSalesmanPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Address / Route <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Calicut North Route, Main Market"
                  value={editSalesmanForm.address}
                  onChange={(e) => setEditSalesmanForm({ ...editSalesmanForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Account Status
                </label>
                <select
                  value={editSalesmanForm.status}
                  onChange={(e) => setEditSalesmanForm({ ...editSalesmanForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                >
                  <option value="active">Active (Can Log In)</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditSalesmanModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#1b5e20] hover:bg-[#144c19] text-white font-bold text-xs shadow-md transition-all uppercase tracking-wider"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER / SUPPLIER STATEMENT VIEWER & DOWNLOAD */}
      {showStatementModal && statementParty && (
        <CustomerStatementModal
          isOpen={showStatementModal}
          onClose={() => {
            setShowStatementModal(false);
            setStatementParty(null);
          }}
          customerId={statementParty.id}
          partyType={statementParty.partyType || (activeTab === 'customers' ? 'customer' : 'supplier')}
          initialParty={statementParty}
        />
      )}

      {/* MODAL: COMPREHENSIVE BUSINESS REPORTS & ANALYTICS */}
      {showReportsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-[#1b5e20] text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <BarChart2 className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">Business Reports & Analytics</h3>
                  <p className="text-xs text-emerald-200 mt-0.5">{businessInfo.name} • Live Ledger Intelligence</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => generatePdfReport()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-lg text-xs font-bold shadow-sm transition"
                  title="Download Summary Report PDF"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">Download PDF</span>
                </button>
                <button
                  onClick={() => handleDownloadCSV('customers')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold border border-emerald-600 transition"
                  title="Export Customers CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold border border-emerald-600 transition"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button 
                  onClick={() => setShowReportsModal(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => setReportsModalTab('overview')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
                  reportsModalTab === 'overview' ? 'bg-[#1b5e20] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                }`}
              >
                Overview & Summary
              </button>
              <button
                onClick={() => setReportsModalTab('aging')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
                  reportsModalTab === 'aging' ? 'bg-[#1b5e20] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                }`}
              >
                Receivables & Payables
              </button>
              <button
                onClick={() => setReportsModalTab('salesmen')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
                  reportsModalTab === 'salesmen' ? 'bg-[#1b5e20] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                }`}
              >
                Staff & Salesmen ({salesmen.length})
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {reportsModalTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-[11px] font-bold text-red-600 uppercase">Total Receivables (Len)</p>
                      <p className="text-2xl font-black text-red-700 mt-1">₹ {customerSummary.willGet.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-red-500 mt-0.5">{customers.filter(c => c.current_balance > 0).length} customers owe payment</p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase">Total Payables (Den)</p>
                      <p className="text-2xl font-black text-emerald-800 mt-1">₹ {supplierSummary.willGive.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">{suppliers.filter(s => s.current_balance > 0).length} suppliers pending</p>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                      <p className="text-[11px] font-bold text-blue-700 uppercase">Net Ledger Balance</p>
                      <p className="text-2xl font-black text-blue-800 mt-1">₹ {(customerSummary.willGet - supplierSummary.willGive).toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-blue-500 mt-0.5">Receivables minus Payables</p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-[11px] font-bold text-amber-700 uppercase">Cash in Drawer</p>
                      <p className="text-2xl font-black text-amber-800 mt-1">₹ {Number(cashbookSummary.netBalance || 0).toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">Physical Cashbook Balance</p>
                    </div>
                  </div>

                  {/* Quick Export Cards */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-3">Quick Report Downloads</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => generatePdfReport('COMPLETE CUSTOMERS LEDGER SUMMARY')}
                        className="p-3 bg-white hover:bg-emerald-50/50 border border-slate-200 rounded-xl text-left transition flex items-center space-x-3 shadow-sm"
                      >
                        <FileText className="w-6 h-6 text-emerald-700 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Customer Dues (PDF)</p>
                          <p className="text-[10px] text-slate-500">Official statement PDF</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleDownloadCSV('transactions')}
                        className="p-3 bg-white hover:bg-blue-50/50 border border-slate-200 rounded-xl text-left transition flex items-center space-x-3 shadow-sm"
                      >
                        <FileSpreadsheet className="w-6 h-6 text-blue-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Transactions Ledger (CSV)</p>
                          <p className="text-[10px] text-slate-500">Complete debit/credit log</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleDownloadCSV('collections')}
                        className="p-3 bg-white hover:bg-amber-50/50 border border-slate-200 rounded-xl text-left transition flex items-center space-x-3 shadow-sm"
                      >
                        <Coins className="w-6 h-6 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Field Collections (CSV)</p>
                          <p className="text-[10px] text-slate-500">Staff collection records</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {reportsModalTab === 'aging' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Top Outstanding Customer Accounts</h4>
                    <span className="text-xs text-slate-400">Total {customers.length} accounts</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0">
                        <tr>
                          <th className="px-3.5 py-2.5">Customer Name</th>
                          <th className="px-3.5 py-2.5">Mobile</th>
                          <th className="px-3.5 py-2.5">Location</th>
                          <th className="px-3.5 py-2.5 text-right">Balance Due</th>
                          <th className="px-3.5 py-2.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {customers.filter(c => c.current_balance > 0).slice(0, 15).map(c => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-3.5 py-2.5 font-bold text-slate-800">{c.name}</td>
                            <td className="px-3.5 py-2.5 text-slate-500 font-mono">{c.mobile || '-'}</td>
                            <td className="px-3.5 py-2.5 text-slate-500">{c.city || c.address || '-'}</td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-red-600 font-mono">
                              ₹ {Number(c.current_balance).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <button
                                onClick={() => {
                                  setShowReportsModal(false);
                                  setStatementParty({ ...c, partyType: 'customer' });
                                  setShowStatementModal(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded text-[11px] transition"
                              >
                                View Statement
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportsModalTab === 'salesmen' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Field Sales Representatives</h4>
                    <span className="text-xs text-slate-400">{salesmen.length} active registered staff</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0">
                        <tr>
                          <th className="px-3.5 py-2.5">Salesman</th>
                          <th className="px-3.5 py-2.5">Mobile (Login)</th>
                          <th className="px-3.5 py-2.5">Territory / Address</th>
                          <th className="px-3.5 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {salesmen.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              No salesmen registered yet. Use the top "+ Add Salesman" button to register field staff.
                            </td>
                          </tr>
                        ) : (
                          salesmen.map(sm => (
                            <tr key={sm.id} className="hover:bg-slate-50">
                              <td className="px-3.5 py-2.5 font-bold text-slate-800">{sm.full_name}</td>
                              <td className="px-3.5 py-2.5 text-slate-600 font-mono">+91 {sm.mobile}</td>
                              <td className="px-3.5 py-2.5 text-slate-500">{sm.address || 'General Territory'}</td>
                              <td className="px-3.5 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sm.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {sm.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Grihalakshmi Food Products • Business Intelligence</span>
              <button
                onClick={() => setShowReportsModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default KhatabookDashboard;
