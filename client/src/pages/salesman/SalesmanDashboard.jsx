import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { generateStatementPDF, generateDailyHandoverPDF, exportStatementToCSV } from '../../lib/pdfGenerator';
import { CustomerStatementModal } from '../../components/statement/CustomerStatementModal';
import { 
  BookOpen, Search, Filter, Phone, MapPin, ArrowLeft, 
  Share2, Download, LogOut, FileText, Receipt, Paperclip, 
  X, RefreshCw, User, CheckCircle2, FileSpreadsheet, Printer, Coins
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function SalesmanDashboard() {
  const { user, logout } = useAuth();
  const { showToast } = useNotification();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'will_get', 'settled'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Selected customer for viewing details
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Mobile view state: 'list' or 'detail'
  const [mobileViewMode, setMobileViewMode] = useState('list');
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  // Customer financial summary
  const [summary, setSummary] = useState({
    willGive: 0,
    willGet: 0,
  });

  const fetchCustomers = async (autoSelectFirst = false) => {
    try {
      setLoading(true);
      const res = await api.get('/customers');
      const list = res.customers || [];
      setCustomers(list);

      // Calculate summary
      const willGive = list.reduce((sum, c) => sum + (c.current_balance < 0 ? Math.abs(c.current_balance) : 0), 0);
      const willGet = list.reduce((sum, c) => sum + (c.current_balance > 0 ? c.current_balance : 0), 0);
      setSummary({ willGive, willGet });

      // Auto-select first customer on desktop if none selected
      if (autoSelectFirst && list.length > 0 && !selectedCustomer) {
        selectCustomer(list[0], false);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading customer directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(true);
  }, []);

  const selectCustomer = async (customer, isMobileClick = false) => {
    setSelectedCustomer(customer);
    if (isMobileClick) {
      setMobileViewMode('detail');
    }
    setLoadingTransactions(true);
    try {
      const res = await api.get(`/customers/${customer.id}`);
      setSelectedCustomer(res.customer || customer);
      setCustomerTransactions(res.transactions || []);
    } catch (e) {
      console.error(e);
      showToast('Error loading customer statement', 'error');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    const diffDays = Math.floor((new Date() - new Date(timestamp)) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // WhatsApp Reminder Link
  const sendWhatsAppReminder = (cust) => {
    const rawBal = cust.current_balance || 0;
    const amountStr = `₹${Math.abs(rawBal).toLocaleString('en-IN')}`;
    const msg = `Dear ${cust.name}, your account balance of ${amountStr} with Grihalakshmi Food Products is outstanding. Kindly verify and settle at your earliest convenience. Thank you!`;
    const cleanPhone = (cust.mobile || '').replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // PDF Report for all assigned customers
  const generatePdfReport = () => {
    const doc = new jsPDF();
    doc.setFillColor(27, 94, 32); // #1b5e20 Forest Green
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Grihalakshmi Food Products', 14, 15);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Customer Accounts Summary (Field Staff) - Generated on ${new Date().toLocaleDateString('en-IN')}`, 14, 32);

    const rows = filteredCustomers.map((item, index) => {
      const rawBal = item.current_balance || 0;
      const status = rawBal > 0 ? 'You Will Get' : (rawBal === 0 ? 'Settled' : 'Advance');
      return [
        index + 1,
        item.name,
        item.mobile || '-',
        item.address || '-',
        status,
        `Rs. ${Math.abs(rawBal).toLocaleString('en-IN')}`,
      ];
    });

    doc.autoTable({
      startY: 38,
      head: [['#', 'Name', 'Mobile', 'Address', 'Status', 'Balance']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [27, 94, 32], textColor: [255, 255, 255] },
    });

    doc.save(`Grihalakshmi-Customers-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast('Customer report PDF downloaded!', 'success');
  };

  // Download CSV of assigned customers
  const handleDownloadCSV = () => {
    try {
      const headers = ['Name', 'Mobile', 'Address', 'City', 'Status', 'Balance (INR)'];
      const rows = filteredCustomers.map(c => {
        const rawBal = c.current_balance || 0;
        const status = rawBal > 0 ? 'You Will Get' : (rawBal === 0 ? 'Settled' : 'Advance');
        return [
          `"${(c.name || '').replace(/"/g, '""')}"`,
          `"${(c.mobile || '').replace(/"/g, '""')}"`,
          `"${(c.address || '').replace(/"/g, '""')}"`,
          `"${(c.city || '').replace(/"/g, '""')}"`,
          `"${status}"`,
          Math.abs(rawBal)
        ].join(',');
      });
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Grihalakshmi-Customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      showToast('CSV downloaded successfully', 'success');
    } catch (e) {
      showToast('Failed to export CSV', 'error');
    }
  };

  // Single Customer Statement PDF (Branded & Formatted)
  const downloadStatementPDF = () => {
    if (!selectedCustomer) return;
    const totalGave = customerTransactions.reduce((sum, t) => sum + (t.type === 'GAVE' ? Number(t.amount || 0) : 0), 0);
    const totalReceived = customerTransactions.reduce((sum, t) => sum + (t.type === 'RECEIVED' ? Number(t.amount || 0) : 0), 0);
    const closingBalance = Number(selectedCustomer.current_balance || 0);
    const openingBalance = closingBalance + totalReceived - totalGave;

    generateStatementPDF({
      customer: selectedCustomer,
      party: selectedCustomer,
      partyType: 'customer',
      period: { fromDate: '', toDate: new Date().toISOString().slice(0, 10) },
      openingBalance,
      totalGave,
      totalReceived,
      closingBalance,
      transactions: customerTransactions
    }, { name: 'Grihalakshmi Food Products', tagline: 'Spices, Pure Curry Powders & Millets Ledger' });
    showToast('Statement PDF downloaded!', 'success');
  };

  // Single Customer Statement CSV Export
  const exportCustomerStatementCSV = () => {
    if (!selectedCustomer) return;
    exportStatementToCSV({
      customer: selectedCustomer,
      party: selectedCustomer,
      partyType: 'customer',
      transactions: customerTransactions
    });
    showToast('Statement CSV exported!', 'success');
  };

  // Generate Daily Cash Handover Settlement Slip
  const generateDailyHandoverSlip = (handoverDetails) => {
    generateDailyHandoverPDF({
      salesmanName: user?.full_name || 'Field Salesman',
      collectionsCount: handoverDetails?.count || 0,
      cashAmount: handoverDetails?.cash || 0,
      upiAmount: handoverDetails?.upi || 0,
      totalAmount: (handoverDetails?.cash || 0) + (handoverDetails?.upi || 0)
    }, { name: 'Grihalakshmi Food Products' });
    showToast('Daily handover slip generated!', 'success');
  };

  // Filter customers
  const filteredCustomers = customers.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (item.name && item.name.toLowerCase().includes(q)) ||
      (item.mobile && item.mobile.includes(q)) ||
      (item.address && item.address.toLowerCase().includes(q)) ||
      (item.city && item.city.toLowerCase().includes(q));

    if (!matchSearch) return false;
    if (filterType === 'will_get') return (item.current_balance || 0) > 0;
    if (filterType === 'settled') return (item.current_balance || 0) <= 0;
    return true;
  });

  return (
    <div className="bg-slate-50 text-slate-800 antialiased flex flex-col min-h-screen font-sans">
      
      {/* 1. TOP NAVIGATION HEADER (Matching Admin Khatabook Header) */}
      <header className="bg-[#1b5e20] text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Identity */}
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.png" 
                alt="Grihalakshmi Food Products Logo" 
                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-white/30 shadow-sm"
              />
              <div>
                <h1 className="text-base font-semibold text-white tracking-tight leading-none">
                  Grihalakshmi Food Products
                </h1>
                <span className="text-[11px] text-emerald-200 font-medium">
                  Salesman Portal • Customer Directory
                </span>
              </div>
            </div>

            {/* Center Tab Badge */}
            <nav className="hidden sm:flex items-center space-x-1 bg-[#144c19] p-1 rounded-xl">
              <div className="px-5 py-1.5 rounded-lg text-sm font-semibold bg-white text-[#1b5e20] shadow-sm flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#1b5e20]" />
                <span>CUSTOMERS</span>
              </div>
            </nav>

            {/* Right Utilities & Profile */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => fetchCustomers(false)}
                title="Refresh customer balances"
                className="p-2 text-emerald-100 hover:text-white hover:bg-white/10 rounded-full transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <div className="hidden md:flex items-center space-x-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Sync</span>
              </div>

              {/* Profile & Sign Out */}
              <div className="flex items-center gap-2 pl-2 border-l border-emerald-700/60">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold leading-tight text-white">{user?.full_name || 'Sales Staff'}</p>
                  <p className="text-[10px] text-emerald-200 font-mono">{user?.mobile || 'Field Staff'}</p>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-emerald-100 border border-emerald-700/50 transition flex items-center gap-1 text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA (Responsive Max-7xl Container) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* SUMMARY BANNER (Matching Khatabook Top Summary Card) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 py-5 px-6">
            
            {/* You will give / Advance */}
            <div className="flex flex-col items-center justify-center text-center py-2 md:py-0">
              <span className="text-sm font-medium text-slate-500">You will give</span>
              <div className="mt-1 flex items-baseline space-x-1">
                <span className="text-3xl font-bold tracking-tight text-emerald-700">
                  ₹ {summary.willGive.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-0.5">
                Customer advance balances
              </span>
            </div>

            {/* You will get / Pending Dues */}
            <div className="flex flex-col items-center justify-center text-center py-2 md:py-0">
              <span className="text-sm font-medium text-slate-500">You will get</span>
              <div className="mt-1 flex items-baseline space-x-1">
                <span className="text-3xl font-bold tracking-tight text-red-600">
                  ₹ {summary.willGet.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-0.5">
                From {customers.length} total customers
              </span>
            </div>

          </div>

          {/* Action Bar under summary card */}
          <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setShowHandoverModal(true)}
                className="inline-flex items-center text-[#1b5e20] hover:text-[#144c19] font-bold transition space-x-1.5"
                title="Prepare and download evening physical cash & settlement handover slip"
              >
                <Coins className="w-4 h-4 text-emerald-700" />
                <span className="underline decoration-emerald-300 underline-offset-2">Daily Handover Slip (PDF)</span>
              </button>
              <span className="text-slate-300">|</span>
              <button 
                onClick={generatePdfReport}
                className="inline-flex items-center text-blue-700 hover:text-blue-800 font-semibold transition space-x-1.5"
                title="Download full territory customer balances report"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Territory Report (PDF)</span>
              </button>
              <span className="text-slate-300">|</span>
              <button 
                onClick={handleDownloadCSV}
                className="inline-flex items-center text-slate-700 hover:text-slate-900 font-semibold transition space-x-1.5"
                title="Export assigned customers to CSV / Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="flex items-center text-slate-500 space-x-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" />
              <span>Customer Ledger Directory</span>
            </div>
          </div>
        </div>

        {/* 3. 2-COLUMN RESPONSIVE LAYOUT (Master-Detail) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: CUSTOMER DIRECTORY LIST (lg:col-span-7 xl:col-span-8) */}
          <section className={`lg:col-span-7 xl:col-span-8 space-y-4 ${
            mobileViewMode === 'detail' ? 'hidden lg:block' : 'block'
          }`}>
            
            {/* Search & Filter Toolbar */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="text"
                  placeholder="Search customer by name, mobile, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition"
                />
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                  <button 
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="text-slate-400 hover:text-slate-600 p-1" 
                    title="Filter list"
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                </div>

                {/* Filter Dropdown */}
                {showFilterDropdown && (
                  <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-40 text-xs">
                    <button
                      onClick={() => { setFilterType('all'); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${filterType === 'all' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      All Customers ({customers.length})
                    </button>
                    <button
                      onClick={() => { setFilterType('will_get'); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${filterType === 'will_get' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      You Will Get (Len) ({customers.filter(c => (c.current_balance || 0) > 0).length})
                    </button>
                    <button
                      onClick={() => { setFilterType('settled'); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${filterType === 'settled' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      Settled / Advance ({customers.filter(c => (c.current_balance || 0) <= 0).length})
                    </button>
                  </div>
                )}
              </div>

              {/* Counter status badge */}
              <div className="flex items-center text-xs text-slate-500 font-medium">
                <span>Showing {filteredCustomers.length} of {customers.length} accounts</span>
              </div>

            </div>

            {/* Customer List Card (Matching Khatabook styling) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="text-center py-12 p-4">
                    <p className="text-xs font-bold text-slate-400">Loading customer directory...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-12 p-4">
                    <p className="text-xs font-bold text-slate-400">No customers found matching your search.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing filters or search terms.</p>
                  </div>
                ) : (
                  filteredCustomers.map((cust) => {
                    const isSelected = selectedCustomer?.id === cust.id;
                    const rawBal = cust.current_balance || 0;
                    const willGet = rawBal > 0;
                    const initials = getInitials(cust.name);

                    return (
                      <div
                        key={cust.id}
                        onClick={() => selectCustomer(cust, true)}
                        className={`p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer border-l-4 ${
                          isSelected ? 'border-emerald-600 bg-slate-50/80' : 'border-transparent'
                        }`}
                      >
                        <div className="flex items-start space-x-3.5">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                            isSelected 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {initials}
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                              {cust.name}
                            </h4>

                            {cust.address && (
                              <p className="text-xs text-slate-500 flex items-center gap-1 line-clamp-1">
                                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span>{cust.address}{cust.city ? `, ${cust.city}` : ''}</span>
                              </p>
                            )}

                            {cust.mobile && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span>+91 {cust.mobile}</span>
                              </p>
                            )}

                            <p className="text-[11px] text-slate-400">
                              Updated {getRelativeTime(cust.updated_at || cust.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <div className={`text-base font-bold ${
                            rawBal === 0 ? 'text-slate-600' : willGet ? 'text-red-600' : 'text-emerald-700'
                          }`}>
                            ₹ {Math.abs(rawBal).toLocaleString('en-IN')}
                          </div>

                          {rawBal !== 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                sendWhatsAppReminder(cust);
                              }}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-end space-x-0.5 mt-0.5"
                            >
                              <span>REMIND</span>
                              <span className="font-mono text-[10px]">&gt;</span>
                            </button>
                          )}

                          <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                            {rawBal === 0 ? 'Settled' : willGet ? 'Due' : 'Advance'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* List Footer */}
              <div className="px-4 py-3 bg-slate-50 text-xs text-slate-500 flex justify-between items-center border-t border-slate-100">
                <span>Showing {filteredCustomers.length} active customer accounts</span>
                <span 
                  onClick={generatePdfReport}
                  className="text-emerald-700 font-medium cursor-pointer hover:underline"
                >
                  Download Summary PDF
                </span>
              </div>
            </div>

          </section>

          {/* RIGHT PANEL: PARTY LEDGER DETAIL / MINISTATEMENT (lg:col-span-5 xl:col-span-4) */}
          <aside className={`lg:col-span-5 xl:col-span-4 ${
            mobileViewMode === 'detail' ? 'block' : 'hidden lg:block'
          }`}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-20">
              
              {selectedCustomer ? (
                <>
                  {/* Selected Customer Header */}
                  <div className="p-4 bg-slate-50/70 border-b border-slate-200">
                    
                    {/* Mobile Back Button & Title */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* Mobile Back Button */}
                        <button
                          type="button"
                          onClick={() => setMobileViewMode('list')}
                          className="lg:hidden inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg hover:bg-emerald-200 transition"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back</span>
                        </button>

                        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                          Customer Profile & Details
                        </span>
                      </div>

                      {/* Direct Call & WhatsApp Shortcut */}
                      <div className="flex items-center gap-2">
                        {selectedCustomer.mobile && (
                          <a
                            href={`tel:${selectedCustomer.mobile}`}
                            className="p-1.5 rounded-lg bg-emerald-100 text-[#1b5e20] hover:bg-emerald-200 transition"
                            title="Call customer"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => sendWhatsAppReminder(selectedCustomer)}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Customer Info Card */}
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center shrink-0">
                        {getInitials(selectedCustomer.name)}
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-base font-bold text-slate-900 leading-tight">
                          {selectedCustomer.name}
                        </h3>
                        {selectedCustomer.business_name && (
                          <p className="text-xs text-slate-500 font-medium">
                            {selectedCustomer.business_name}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {selectedCustomer.mobile ? `+91 ${selectedCustomer.mobile}` : 'No phone set'}
                        </p>
                        {selectedCustomer.address && (
                          <p className="text-xs text-slate-600 flex items-start gap-1 pt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                            <span>{selectedCustomer.address}{selectedCustomer.city ? `, ${selectedCustomer.city}` : ''}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Due Balance Snapshot Box (Matching Admin Khatabook styling) */}
                    {(() => {
                      const rawBal = selectedCustomer.current_balance || 0;
                      const willGet = rawBal > 0;

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
                              {rawBal === 0 ? 'Account Settled' : willGet ? 'Pending Due (Len)' : 'Customer Advance'}
                            </div>
                            <div className={`text-xl font-bold ${
                              rawBal === 0 ? 'text-slate-800' : willGet ? 'text-red-700' : 'text-emerald-800'
                            }`}>
                              ₹ {Math.abs(rawBal).toLocaleString('en-IN')}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowStatementModal(true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#1b5e20] hover:bg-[#144c19] text-white rounded text-xs font-bold shadow-sm transition"
                              title="View date-filtered statement with live cards"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Statement</span>
                            </button>
                            <button
                              type="button"
                              onClick={downloadStatementPDF}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold shadow-sm transition"
                              title="Download Statement (PDF)"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-700" />
                              <span>PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={exportCustomerStatementCSV}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold shadow-sm transition"
                              title="Export Statement (CSV)"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                              <span>CSV</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                  </div>

                  {/* Recent Customer Ledger Entries */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Recent Transactions
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {customerTransactions.length} records
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {loadingTransactions ? (
                        <p className="text-xs text-slate-400 py-6 text-center">Loading transactions...</p>
                      ) : customerTransactions.length === 0 ? (
                        <div className="p-6 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                          No transactions found for this customer.
                        </div>
                      ) : (
                        customerTransactions.map((tx) => {
                          const isGave = tx.type === 'GAVE';
                          return (
                            <div key={tx.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-start justify-between text-xs">
                              <div className="space-y-1">
                                <p className="font-medium text-slate-800">
                                  {tx.description || (isGave ? 'Goods Supplied' : 'Payment Received')}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                  <span className="text-slate-400">{formatDate(tx.date)}</span>
                                  {tx.reference_number && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold">
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
                                      className="inline-flex items-center gap-0.5 text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold"
                                    >
                                      <Paperclip className="w-2.5 h-2.5" />
                                      <span>View Bill</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0 ml-2">
                                <span className={`font-bold ${isGave ? 'text-red-600' : 'text-emerald-700'}`}>
                                  {isGave ? '+' : '-'} ₹ {parseFloat(tx.amount).toLocaleString('en-IN')}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Bal: ₹{Math.abs(tx.running_balance).toLocaleString('en-IN')}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Customer Quick Actions Footer */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Need payment follow-up?</span>
                    <button
                      type="button"
                      onClick={() => sendWhatsAppReminder(selectedCustomer)}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Send WhatsApp Reminder</span>
                    </button>
                  </div>

                </>
              ) : (
                /* Empty state when no customer selected (on desktop) */
                <div className="p-12 text-center text-slate-400">
                  <User className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-600">No Customer Selected</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Select a customer from the left directory to view their address, contact info, balance status, and transaction history.
                  </p>
                </div>
              )}

            </div>
          </aside>

        </div>

      </main>

      {/* Bill Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl p-4 shadow-2xl space-y-3 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">{previewAttachment.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 rounded-xl flex items-center justify-center p-2 min-h-[300px]">
              {previewAttachment.url.startsWith('data:application/pdf') || previewAttachment.url.endsWith('.pdf') ? (
                <iframe src={previewAttachment.url} title="PDF Preview" className="w-full h-[450px] rounded-lg" />
              ) : (
                <img src={previewAttachment.url} alt="Bill" className="max-h-[450px] max-w-full object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER STATEMENT VIEWER & DOWNLOAD */}
      {showStatementModal && selectedCustomer && (
        <CustomerStatementModal
          isOpen={showStatementModal}
          onClose={() => setShowStatementModal(false)}
          customerId={selectedCustomer.id}
          partyType="customer"
          initialParty={selectedCustomer}
        />
      )}

      {/* MODAL: DAILY FIELD HANDOVER SLIP */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 bg-[#1b5e20] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Coins className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-bold leading-tight">Daily Cash Handover Settlement</h3>
                  <p className="text-[11px] text-emerald-200 mt-0.5">Field Staff Evening Settlement Slip</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHandoverModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase">Field Executive</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{user?.full_name || 'Staff Member'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase">Date</p>
                  <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Assigned Route Customers:</span>
                  <span className="font-bold font-mono text-slate-800">{customers.length}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Total Pending Dues to Recover:</span>
                  <span className="font-bold font-mono text-red-600">₹ {summary.willGet.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Official Company:</span>
                  <span className="font-bold text-emerald-900">Grihalakshmi Food Products</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    generateDailyHandoverSlip({
                      count: customers.filter(c => (c.current_balance || 0) <= 0).length,
                      cash: 0,
                      upi: 0
                    });
                  }}
                  className="w-full py-2.5 bg-[#1b5e20] hover:bg-[#144c19] text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-emerald-300" />
                  <span>DOWNLOAD DAILY HANDOVER SLIP (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => generatePdfReport()}
                  className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-300 flex items-center justify-center gap-2 transition"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Download Route Customers List (PDF)</span>
                </button>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHandoverModal(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        Grihalakshmi Food Products • Simplified Field Ledger System
      </footer>

    </div>
  );
}

export default SalesmanDashboard;
