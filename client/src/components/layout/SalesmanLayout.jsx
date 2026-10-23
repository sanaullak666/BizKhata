import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { MobileBottomNav } from './MobileBottomNav';
import { FloatingActionButton } from './FloatingActionButton';
import { AddCustomerModal } from '../customer/AddCustomerModal';
import { AddTransactionModal } from '../transaction/AddTransactionModal';

export function SalesmanLayout() {
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [txModalConfig, setTxModalConfig] = useState({ isOpen: false, defaultType: 'GAVE' });
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 sm:pb-8">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 p-3.5 sm:p-6 max-w-4xl w-full mx-auto">
        <Outlet />
      </main>

      {/* Floating Action Button for Salesman (Requirement 28) */}
      <FloatingActionButton
        onAddCustomer={() => setShowAddCustomer(true)}
        onRecordGave={() => setTxModalConfig({ isOpen: true, defaultType: 'GAVE' })}
        onRecordReceived={() => setTxModalConfig({ isOpen: true, defaultType: 'RECEIVED' })}
        onCreateInvoice={() => navigate('/salesman/invoices/new')}
      />

      {/* Mobile Bottom Navigation (Requirement 28) */}
      <MobileBottomNav />

      {/* Global Modals for Quick Actions */}
      <AddCustomerModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSuccess={() => {
          setShowAddCustomer(false);
          window.location.reload();
        }}
      />

      <AddTransactionModal
        isOpen={txModalConfig.isOpen}
        defaultType={txModalConfig.defaultType}
        onClose={() => setTxModalConfig({ isOpen: false, defaultType: 'GAVE' })}
        onSuccess={() => {
          setTxModalConfig({ isOpen: false, defaultType: 'GAVE' });
          window.location.reload();
        }}
      />
    </div>
  );
}
