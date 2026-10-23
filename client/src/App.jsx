import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import { OwnerLayout } from './components/layout/OwnerLayout';
import { SalesmanLayout } from './components/layout/SalesmanLayout';

// Owner Pages
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { CustomersPage } from './pages/owner/CustomersPage';
import { CustomerDetailPage } from './pages/owner/CustomerDetailPage';
import { SalesmenPage } from './pages/owner/SalesmenPage';
import { SalesmanDetailPage } from './pages/owner/SalesmanDetailPage';
import { TransactionsPage } from './pages/owner/TransactionsPage';
import { CollectionsPage } from './pages/owner/CollectionsPage';
import { InvoicesPage } from './pages/owner/InvoicesPage';
import { ReportsPage } from './pages/owner/ReportsPage';
import { RemindersPage } from './pages/owner/RemindersPage';
import { PermissionsPage } from './pages/owner/PermissionsPage';
import { AuditLogsPage } from './pages/owner/AuditLogsPage';
import { SettingsPage } from './pages/owner/SettingsPage';
import { InvoiceBuilder } from './components/invoice/InvoiceBuilder';

// Salesman Pages
import { SalesmanDashboard } from './pages/salesman/SalesmanDashboard';
import { MyCustomersPage } from './pages/salesman/MyCustomersPage';
import { MyCollectionsPage } from './pages/salesman/MyCollectionsPage';
import { SalesmanProfilePage } from './pages/salesman/SalesmanProfilePage';

// Public Pages (NO LOGIN REQUIRED)
import { PublicCustomerStatement } from './pages/public/PublicCustomerStatement';
import { PublicInvoiceView } from './pages/public/PublicInvoiceView';
import { PublicReceiptView } from './pages/public/PublicReceiptView';
import { Login } from './pages/Login';

export function App() {
  const { user, loading, isOwner, isSalesman } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading KhataFlow Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes (No authentication needed - Requirement 1) */}
      <Route path="/statement/:id/public" element={<PublicCustomerStatement />} />
      <Route path="/invoice/:id/public" element={<PublicInvoiceView />} />
      <Route path="/receipts/:id/public" element={<PublicReceiptView />} />
      <Route path="/login" element={<Login />} />

      {/* Root Redirection */}
      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : isOwner ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/salesman/home" replace />
          )
        }
      />

      {/* Owner Portal Routes */}
      {isOwner ? (
        <Route element={<OwnerLayout />}>
          <Route path="/dashboard" element={<OwnerDashboard />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/salesmen" element={<SalesmenPage />} />
          <Route path="/salesmen/:id" element={<SalesmanDetailPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<InvoiceBuilder />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      ) : (
        /* Salesman Portal Routes */
        <Route element={<SalesmanLayout />}>
          <Route path="/salesman/home" element={<SalesmanDashboard />} />
          <Route path="/salesman/customers" element={<MyCustomersPage />} />
          <Route path="/salesman/sales" element={<TransactionsPage />} />
          <Route path="/salesman/collections" element={<MyCollectionsPage />} />
          <Route path="/salesman/invoices/new" element={<InvoiceBuilder backPath="/salesman/home" />} />
          <Route path="/salesman/profile" element={<SalesmanProfilePage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="*" element={<Navigate to="/salesman/home" replace />} />
        </Route>
      )}
    </Routes>
  );
}
export default App;
