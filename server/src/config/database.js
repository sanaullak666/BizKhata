const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const isVercel = !!process.env.VERCEL;

let dbPath;
if (isVercel) {
  const tmpDir = '/tmp';
  dbPath = path.join(tmpDir, 'khataflow.db');

  // Copy bundled database to /tmp on cold start if not present
  if (!fs.existsSync(dbPath)) {
    const candidatePaths = [
      path.join(__dirname, '../../data/khataflow.db'),
      path.join(__dirname, '../data/khataflow.db'),
      path.join(process.cwd(), 'server/data/khataflow.db'),
      path.join(process.cwd(), 'data/khataflow.db'),
    ];
    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate)) {
        try {
          fs.copyFileSync(candidate, dbPath);
          console.log(`Copied bundled db from ${candidate} to ${dbPath}`);
          break;
        } catch (e) {
          console.warn('Failed to copy bundled db to /tmp:', e.message);
        }
      }
    }
  }
} else {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  dbPath = path.join(dataDir, 'khataflow.db');
}

const db = new Database(dbPath);

// Enable journal mode and Foreign Keys
try {
  if (isVercel) {
    db.pragma('journal_mode = DELETE');
  } else {
    db.pragma('journal_mode = WAL');
  }
} catch (e) {
  try {
    db.pragma('journal_mode = DELETE');
  } catch (err) {}
}
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  const schema = `
    -- Businesses
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT,
      logo_url TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      phone TEXT,
      email TEXT,
      gstin TEXT,
      upi_id TEXT,
      bank_name TEXT,
      bank_account_no TEXT,
      bank_ifsc TEXT,
      currency TEXT DEFAULT 'INR',
      currency_symbol TEXT DEFAULT '₹',
      invoice_prefix TEXT DEFAULT 'INV',
      receipt_prefix TEXT DEFAULT 'REC',
      reminder_template TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Users (Owner and Salesmen)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'salesman')),
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      employee_id TEXT,
      password_hash TEXT NOT NULL,
      designation TEXT,
      profile_photo TEXT,
      joining_date DATE,
      address TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- Granular Staff Permissions
    CREATE TABLE IF NOT EXISTS staff_permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      can_view_customers INTEGER DEFAULT 1,
      can_add_customers INTEGER DEFAULT 1,
      can_edit_customers INTEGER DEFAULT 1,
      can_delete_customers INTEGER DEFAULT 0,
      can_add_transactions INTEGER DEFAULT 1,
      can_delete_transactions INTEGER DEFAULT 0,
      can_create_invoices INTEGER DEFAULT 1,
      can_record_collections INTEGER DEFAULT 1,
      can_send_reminders INTEGER DEFAULT 1,
      can_view_other_salesmen INTEGER DEFAULT 0,
      can_view_reports INTEGER DEFAULT 0,
      can_manage_staff INTEGER DEFAULT 0,
      can_change_settings INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Customers (Ledger Accounts)
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      business_name TEXT,
      mobile TEXT NOT NULL,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      gstin TEXT,
      opening_balance_type TEXT DEFAULT 'owe_business' CHECK(opening_balance_type IN ('owe_business', 'business_owes')),
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      credit_limit REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'blocked')),
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Customer Assignments to Salesmen
    CREATE TABLE IF NOT EXISTS customer_assignments (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      salesman_id TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'transferred', 'unassigned')),
      transferred_to TEXT,
      notes TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    );

    -- Transactions (YOU GAVE / YOU RECEIVED)
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      salesman_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('GAVE', 'RECEIVED')),
      amount REAL NOT NULL,
      date DATE NOT NULL,
      time TIME NOT NULL,
      description TEXT,
      payment_method TEXT DEFAULT 'Cash' CHECK(payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other')),
      reference_number TEXT,
      notes TEXT,
      attachment_url TEXT,
      running_balance REAL NOT NULL,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Collections & Cash Settlement Tracking
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      salesman_id TEXT NOT NULL,
      transaction_id TEXT,
      amount REAL NOT NULL,
      collection_date DATE NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      reference_number TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'verified', 'rejected')),
      notes TEXT,
      submitted_at DATETIME,
      verified_by TEXT,
      verified_at DATETIME,
      settlement_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
      FOREIGN KEY (verified_by) REFERENCES users(id)
    );

    -- Invoices
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      salesman_id TEXT,
      invoice_number TEXT NOT NULL,
      invoice_date DATE NOT NULL,
      due_date DATE,
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'sent' CHECK(status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled')),
      notes TEXT,
      terms TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id)
    );

    -- Invoice Items
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT,
      quantity REAL DEFAULT 1,
      unit_price REAL NOT NULL,
      discount_percent REAL DEFAULT 0,
      tax_percent REAL DEFAULT 0,
      total_price REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    -- Receipts
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      salesman_id TEXT,
      transaction_id TEXT,
      collection_id TEXT,
      receipt_number TEXT NOT NULL,
      receipt_date DATE NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      reference_number TEXT,
      remaining_balance REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
    );

    -- Reminders
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      salesman_id TEXT NOT NULL,
      reminder_type TEXT DEFAULT 'whatsapp' CHECK(reminder_type IN ('whatsapp', 'sms', 'email', 'manual')),
      amount_due REAL NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id)
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- Indexes for high performance
    CREATE INDEX IF NOT EXISTS idx_customers_biz ON customers(business_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_biz_cust ON transactions(business_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_assignments_active ON customer_assignments(customer_id, salesman_id, status);
    CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(business_id, status);
    CREATE INDEX IF NOT EXISTS idx_collections_salesman ON collections(salesman_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_biz_cust ON invoices(business_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_biz ON audit_logs(business_id, created_at);
  `;

  db.exec(schema);
  console.log('✅ SQLite Database schema initialized successfully.');
}

module.exports = {
  db,
  initializeDatabase,
};
