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
          <img 
            src="/logo.png" 
            alt="Grihalakshmi Food Products Logo" 
            className="w-14 h-14 rounded-2xl object-contain mx-auto shadow-md p-1 bg-white border border-slate-200"
          />
          <div className="h-6 w-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Grihalakshmi Food Products...</p>
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
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={isOwner ? "/dashboard" : "/salesman/home"} replace />
          ) : (
            <Login />
          )
        }
      />

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

      {/* Owner Portal Routes (Authenticated Owner Only) */}
      {user && isOwner && (
        <Route element={<OwnerLayout />}>
          <Route path="/dashboard" element={<OwnerDashboard />} />
          <Route path="/customers" element={<Navigate to="/dashboard" replace />} />
          <Route path="/customers/:id" element={<Navigate to="/dashboard" replace />} />
          <Route path="/salesmen" element={<Navigate to="/dashboard" replace />} />
          <Route path="/salesmen/:id" element={<Navigate to="/dashboard" replace />} />
          <Route path="/transactions" element={<Navigate to="/dashboard" replace />} />
          <Route path="/collections" element={<Navigate to="/dashboard" replace />} />
          <Route path="/invoices" element={<Navigate to="/dashboard" replace />} />
          <Route path="/invoices/new" element={<Navigate to="/dashboard" replace />} />
          <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
          <Route path="/reminders" element={<Navigate to="/dashboard" replace />} />
          <Route path="/permissions" element={<Navigate to="/dashboard" replace />} />
          <Route path="/audit-logs" element={<Navigate to="/dashboard" replace />} />
          <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      )}

      {/* Salesman Portal Routes (Authenticated Salesman / Non-owner Only) */}
      {user && !isOwner && (
        <Route element={<SalesmanLayout />}>
          <Route path="/salesman/home" element={<SalesmanDashboard />} />
          <Route path="/salesman/customers" element={<Navigate to="/salesman/home" replace />} />
          <Route path="/salesman/sales" element={<Navigate to="/salesman/home" replace />} />
          <Route path="/salesman/collections" element={<Navigate to="/salesman/home" replace />} />
          <Route path="/salesman/invoices/new" element={<Navigate to="/salesman/home" replace />} />
          <Route path="/salesman/profile" element={<Navigate to="/salesman/home" replace />} />
          <Route path="/customers/:id" element={<Navigate to="/salesman/home" replace />} />
          <Route path="*" element={<Navigate to="/salesman/home" replace />} />
        </Route>
      )}

      {/* Catch-all Fallback: If not logged in, redirect any unauthorized path to /login */}
      {!user && <Route path="*" element={<Navigate to="/login" replace />} />}
    </Routes>
  );
}
export default App;
