const mysql = require('mysql2/promise');
const { AsyncLocalStorage } = require('async_hooks');

const DB_HOST = process.env.TIDB_HOST || process.env.DB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com';
const DB_PORT = parseInt(process.env.TIDB_PORT || process.env.DB_PORT || '4000', 10);
const DB_USER = process.env.TIDB_USER || process.env.DB_USER || 'U32xJ4R96dasLqF.root';
const DB_PASSWORD = process.env.TIDB_PASSWORD || process.env.DB_PASSWORD || 'uOW8cSZNTWy7TRBl';
const DB_NAME = process.env.TIDB_DATABASE || process.env.DB_NAME || 'khataflow';

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});

const als = new AsyncLocalStorage();

function convertSqliteToMysql(sql) {
  let res = sql;
  // date('now', '-14 days') -> (CURDATE() - INTERVAL 14 DAY)
  res = res.replace(/date\(\s*'now'\s*,\s*'-(\d+)\s+days'\s*\)/gi, '(CURDATE() - INTERVAL $1 DAY)');
  // date('now', '+14 days') -> (CURDATE() + INTERVAL 14 DAY)
  res = res.replace(/date\(\s*'now'\s*,\s*'\+(\d+)\s+days'\s*\)/gi, '(CURDATE() + INTERVAL $1 DAY)');
  // date('now') -> CURDATE()
  res = res.replace(/date\(\s*'now'\s*\)/gi, 'CURDATE()');
  // datetime('now') -> NOW()
  res = res.replace(/datetime\(\s*'now'\s*\)/gi, 'NOW()');
  // strftime('%Y-%m', col) -> DATE_FORMAT(col, '%Y-%m')
  res = res.replace(/strftime\(\s*('[^']+')\s*,\s*([a-zA-Z0-9_\.]+)\s*\)/gi, 'DATE_FORMAT($2, $1)');
  // strftime(?, col) -> DATE_FORMAT(col, ?)
  res = res.replace(/strftime\(\s*\?\s*,\s*([a-zA-Z0-9_\.]+)\s*\)/gi, 'DATE_FORMAT($1, ?)');
  return res;
}

function sanitizeParams(args) {
  const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return flat.map(p => (p === undefined ? null : p));
}

const db = {
  pool,
  convertSqliteToMysql,
  prepare: (sql) => {
    const converted = convertSqliteToMysql(sql);
    return {
      get: async (...args) => {
        const params = sanitizeParams(args);
        const conn = als.getStore() || pool;
        const [rows] = await conn.query(converted, params);
        return rows && rows.length > 0 ? rows[0] : null;
      },
      all: async (...args) => {
        const params = sanitizeParams(args);
        const conn = als.getStore() || pool;
        const [rows] = await conn.query(converted, params);
        return rows || [];
      },
      run: async (...args) => {
        const params = sanitizeParams(args);
        const conn = als.getStore() || pool;
        const [result] = await conn.query(converted, params);
        return {
          changes: result ? result.affectedRows : 0,
          lastInsertRowid: result ? result.insertId : 0,
          affectedRows: result ? result.affectedRows : 0
        };
      }
    };
  },
  transaction: (fn) => {
    return async (...args) => {
      const conn = await pool.getConnection();
      await conn.beginTransaction();
      try {
        const result = await als.run(conn, () => fn(...args));
        await conn.commit();
        return result;
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    };
  }
};

async function initializeDatabase() {
  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS businesses (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      tagline VARCHAR(255),
      logo_url TEXT,
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(20),
      phone VARCHAR(50),
      email VARCHAR(255),
      gstin VARCHAR(50),
      upi_id VARCHAR(100),
      bank_name VARCHAR(150),
      bank_account_no VARCHAR(50),
      bank_ifsc VARCHAR(50),
      currency VARCHAR(10) DEFAULT 'INR',
      currency_symbol VARCHAR(10) DEFAULT '₹',
      invoice_prefix VARCHAR(20) DEFAULT 'INV',
      receipt_prefix VARCHAR(20) DEFAULT 'REC',
      reminder_template TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      business_id VARCHAR(64) NOT NULL,
      role VARCHAR(32) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      mobile VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      employee_id VARCHAR(64),
      password_hash VARCHAR(255) NOT NULL,
      designation VARCHAR(100),
      profile_photo TEXT,
      joining_date DATE,
      address TEXT,
      status VARCHAR(32) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS staff_permissions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) UNIQUE NOT NULL,
      can_view_customers TINYINT DEFAULT 1,
      can_add_customers TINYINT DEFAULT 1,
      can_edit_customers TINYINT DEFAULT 1,
      can_delete_customers TINYINT DEFAULT 0,
      can_add_transactions TINYINT DEFAULT 1,
      can_delete_transactions TINYINT DEFAULT 0,
      can_create_invoices TINYINT DEFAULT 1,
      can_record_collections TINYINT DEFAULT 1,
      can_send_reminders TINYINT DEFAULT 1,
      can_view_other_salesmen TINYINT DEFAULT 0,
      can_view_reports TINYINT DEFAULT 0,
      can_manage_staff TINYINT DEFAULT 0,
      can_change_settings TINYINT DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      business_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      business_name VARCHAR(255),
      mobile VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(20),
      gstin VARCHAR(50),
      opening_balance_type VARCHAR(32) DEFAULT 'owe_business',
      opening_balance DOUBLE DEFAULT 0,
      current_balance DOUBLE DEFAULT 0,
      credit_limit DOUBLE DEFAULT 0,
      status VARCHAR(32) DEFAULT 'active',
      notes TEXT,
      created_by VARCHAR(64),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS customer_assignments (
      id VARCHAR(64) PRIMARY KEY,
      business_id VARCHAR(64) NOT NULL,
      customer_id VARCHAR(64) NOT NULL,
      salesman_id VARCHAR(64) NOT NULL,
      assigned_by VARCHAR(64) NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(32) DEFAULT 'active',
      transferred_to VARCHAR(64),
      notes TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(64) PRIMARY KEY,
      business_id VARCHAR(64) NOT NULL,
      customer_id VARCHAR(64) NOT NULL,
      salesman_id VARCHAR(64),
      type VARCHAR(32) NOT NULL,
      amount DOUBLE NOT NULL,
      date DATE NOT NULL,
      time VARCHAR(20) NOT NULL,
      description TEXT,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      reference_number VARCHAR(100),
      notes TEXT,
      attachment_url TEXT,
      running_balance DOUBLE NOT NULL,
      created_by VARCHAR(64) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS collections (
      id VARCHAR(64) PRIMARY KEY,
      business_id VARCHAR(64) NOT NULL,
      customer_id VARCHAR(64) NOT NULL,
      salesman_id VARCHAR(64) NOT NULL,
      transaction_id VARCHAR(64),
      amount DOUBLE NOT NULL,
      collection_date DATE NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      reference_number VARCHAR(100),
      status VARCHAR(32) DEFAULT 'pending',
      notes TEXT,
      submitted_at DATETIME,
      verified_by VARCHAR(64),
      verified_at DATETIME,
      settlement_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
      FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(64) PRIMARY KEY,
      business_id VARCHAR(64) NOT NULL,
      customer_id VARCHAR(64) NOT NULL,
      salesman_id VARCHAR(64),
      invoice_number VARCHAR(100) NOT NULL,
      invoice_date DATE NOT NULL,
      due_date DATE,
      subtotal DOUBLE DEFAULT 0,
      discount_amount DOUBLE DEFAULT 0,
      tax_amount DOUBLE DEFAULT 0,
      total_amount DOUBLE NOT NULL,
      paid_amount DOUBLE DEFAULT 0,
      status VARCHAR(32) DEFAULT 'sent',
      notes TEXT,
      terms TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS invoice_items (
      id VARCHAR(64) PRIMARY KEY,
      invoice_id VARCHAR(64) NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      description TEXT,
      quantity DOUBLE DEFAULT 1,
      unit_price DOUBLE NOT NULL,
      discount_percent DOUBLE DEFAULT 0,
      tax_percent DOUBLE DEFAULT 0,
      total_price DOUBLE NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS receipts (
      id VARCHAR(64) PRIMARY KEY,
      business_id VARCHAR(64) NOT NULL,
      customer_id VARCHAR(64) NOT NULL,
      salesman_id VARCHAR(64),
      transaction_id VARCHAR(64),
      collection_id VARCHAR(64),
      receipt_number VARCHAR(100) NOT NULL,
      receipt_date DATE NOT NULL,
      amount DOUBLE NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      reference_number VARCHAR(100),
      remaining_balance DOUBLE NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS reminders (
      id VARCHAR(64) PRIMARY KEY,
      business_id VARCHAR(64) NOT NULL,
      customer_id VARCHAR(64) NOT NULL,
      salesman_id VARCHAR(64) NOT NULL,
      reminder_type VARCHAR(32) DEFAULT 'whatsapp',
      amount_due DOUBLE NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(32) DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(64) PRIMARY KEY,
      business_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      link TEXT,
      is_read TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      business_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64),
      user_name VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(64),
      details TEXT,
      ip_address VARCHAR(50),
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )`
  ];

  try {
    for (const sql of schemaStatements) {
      await pool.query(sql);
    }
    console.log('✅ TiDB Database schema initialized successfully.');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

module.exports = {
  db,
  pool,
  initializeDatabase
};
