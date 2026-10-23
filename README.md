# KhataFlow — Intelligent Digital Khata & Field Sales Management Platform

**KhataFlow** is a modern, commercial-grade Digital Khata, Business Ledger, and Field Sales Management platform. Built with an original fintech-inspired UI/UX, multi-tenant security architecture, exact decimal financial precision, and real-time field collection tracking.

---

## 🌟 Key Architecture & Original Product Identity

This platform is **NOT a clone of Khatabook**. It has been designed from the ground up with:
- **Original Fintech Visual Identity**: Deep slate palettes, emerald receipts, coral credit exposures, and typography optimized for tabular financial figures.
- **Role-Based Experience**:
  - **Owner / Executive Command Center**: Desktop multi-panel layout, cash settlement action tray, salesman comparison matrix, aging reports, and audit logs.
  - **Salesman Mobile-First Experience**: Designed for one-handed field operation, bottom navigation (`Home | Customers | Sales | Collections | More`), and a floating action button (`+`) enabling 1–3 tap workflows.
  - **Customers (No Login Required)**: Customers exist as ledger accounts receiving secure public statement links, tax invoices, and payment receipts without creating credentials.

---

## 🚀 Live Servers & Access Points

The application is running live and accessible at:
- **Full Unified Platform (App + API)**: [http://localhost:5050](http://localhost:5050)
- **Vite Hot-Reload Development Server**: [http://localhost:3000](http://localhost:3000)
- **Backend API Health Check**: [http://localhost:5050/api/health](http://localhost:5050/api/health)

---

## 👥 Demo Accounts (1-Click Switcher Available in UI)

You can switch between any account with **1-click** using the **Account Switcher** in the top navigation bar or on the login page:

| Role | Name | Employee ID | Mobile / Email | Password | Assigned Customers |
|---|---|---|---|---|---|
| **Owner / Admin** | Vikram Malhotra | EMP-001 | `owner@khataflow.com` / `9876543210` | `password123` | Full Business (All Customers) |
| **Salesman (Senior)** | Arshad Khan | EMP-101 | `arshad@khataflow.com` / `9811223344` | `password123` | Rahman Traders, National Hardware, Al-Madina |
| **Salesman (Area)** | Rahim Sheikh | EMP-102 | `rahim@khataflow.com` / `9822334455` | `password123` | Royal Sanitary, Evergreen Agro, Bharat Paints |
| **Salesman (Field)** | Sameer Joshi | EMP-103 | `sameer@khataflow.com` / `9833445566` | `password123` | Metro City Mart, Sunrise Supermarket |

---

## 🛠️ Complete Feature Matrix

### 1. Multi-Tenant Role & Customer Visibility Isolation
- **Backend-Enforced Authorization**: Salesman A cannot access Salesman B's customer ledger unless explicitly authorized in `staff_permissions`.
- **Territory Assignments**: Owner can assign, transfer, or unassign customers with audit notes and full assignment history tracking.

### 2. Dual Transaction Engine (YOU GAVE vs YOU RECEIVED)
- **YOU GAVE**: Credit sales given to customer (increases debt).
- **YOU RECEIVED**: Payments collected (reduces debt).
- **Opening Balances**: Supports both "Customer owes business" (Receivable) and "Business owes customer" (Advance deposit).
- **Decimal Precision**: Running balances and customer balances are recomputed atomically inside database transactions.

### 3. Collection Management & Cash Settlement Workflow
- Salesmen collect cash, UPI, cheques, or bank transfers on field visits.
- Cash in salesmen's hands is clearly highlighted on the dashboard.
- Salesman clicks **"Submit to Owner"**.
- Owner reviews the submission in the **Cash Settlement Action Tray** and clicks **"Mark Cash Settled"** or **"Reject"**.

### 4. Billing, Invoices & Receipts
- **GST Tax Invoices**: Dynamic line items, quantities, discounts, tax brackets (5%, 12%, 18%, 28%), subtotal, and grand total. Automatically posts to customer ledger.
- **Payment Receipts**: Automatically generated whenever a payment is recorded. Includes receipt number, remaining balance, and collected-by staff info.
- **Client-Side PDF Generation**: One-click professional PDF downloads for Invoices, Receipts, and Statements using `jspdf` and `jspdf-autotable`.

### 5. Payment Reminders (WhatsApp, SMS, Email)
- One-tap WhatsApp click-to-chat with pre-filled professional reminder text including business UPI ID, bank details, and outstanding balance.
- Copy message text to clipboard.
- Full reminder history logged in the database.

### 6. Analytics & Intelligence Reports
- **Debt Aging Report**: Classifies debtors into `0-30 days`, `31-60 days`, `61-90 days`, and `90+ days (Critical)`.
- **Salesman Performance Matrix**: Compares sales volume, collections, outstanding, customer count, and collection rate (`%`).
- **Payment Channels**: Breakdown of Cash, UPI, Cheque, and Bank Transfer share.
- **CSV Data Export**: One-click CSV export for Customers, Transactions, Invoices, and Collections.

### 7. Staff Permissions & Security
- Granular permission matrix per staff member:
  - `can_view_customers`, `can_add_customers`, `can_edit_customers`, `can_delete_customers`
  - `can_add_transactions`, `can_delete_transactions`
  - `can_create_invoices`, `can_record_collections`, `can_send_reminders`
  - `can_view_other_salesmen`, `can_view_reports`, `can_manage_staff`, `can_change_settings`
- Immutable Audit Trail recording actor, action, timestamp, details, and IP address.

### 8. Disaster Recovery & Backups
- Complete full-database JSON export and restore capabilities.

---

## 🧪 Automated Test Suite

A complete integration test suite verifies all critical capabilities:
```bash
npm test
```
**Test Coverage**:
- ✅ Health check & demo users
- ✅ Owner & Salesman JWT authentication
- ✅ Salesman territory isolation & customer visibility
- ✅ 403 Forbidden enforcement on unauthorized cross-salesman access
- ✅ Exact arithmetic balance calculation on GAVE and RECEIVED transactions
- ✅ Cash collection submission & owner settlement workflow
- ✅ Public customer statement access without credentials
- ✅ Public customer invoice access without credentials
- ✅ Full JSON database backup and restore
- ✅ Audit log emission

---

## 💻 Tech Stack

- **Backend**: Node.js, Express 5, Better-SQLite3, BcryptJS, JSONWebToken, Multer
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, jsPDF, jspdf-autotable, Canvas-Confetti
- **Database**: SQLite with WAL mode, foreign keys, and atomic transactions
