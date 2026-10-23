const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { roundMoney } = require('../services/ledgerService');

// Owner Business Dashboard metrics (Requirement 21)
router.get('/dashboard', authenticateToken, (req, res) => {
  const bizId = req.businessId;
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7); // YYYY-MM

  // Total Receivable (sum of positive balances)
  const receivableRow = db.prepare(`
    SELECT COALESCE(SUM(current_balance), 0) as total_receivable
    FROM customers
    WHERE business_id = ? AND current_balance > 0
  `).get(bizId);

  // Total Payable (sum of negative balances)
  const payableRow = db.prepare(`
    SELECT COALESCE(SUM(ABS(current_balance)), 0) as total_payable
    FROM customers
    WHERE business_id = ? AND current_balance < 0
  `).get(bizId);

  // Today's Sales ('GAVE' on today)
  const todaySalesRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as today_sales, count(*) as count
    FROM transactions
    WHERE business_id = ? AND type = 'GAVE' AND date = ?
  `).get(bizId, today);

  // Today's Collections ('RECEIVED' on today)
  const todayCollectionRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as today_collection, count(*) as count
    FROM transactions
    WHERE business_id = ? AND type = 'RECEIVED' AND date = ?
  `).get(bizId, today);

  // Monthly Sales ('GAVE' this month)
  const monthSalesRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as month_sales
    FROM transactions
    WHERE business_id = ? AND type = 'GAVE' AND date LIKE ?
  `).get(bizId, `${currentMonth}%`);

  // Monthly Collections ('RECEIVED' this month)
  const monthCollectionRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as month_collection
    FROM transactions
    WHERE business_id = ? AND type = 'RECEIVED' AND date LIKE ?
  `).get(bizId, `${currentMonth}%`);

  // Total Outstanding in Market
  const outstandingAmount = roundMoney(receivableRow.total_receivable || 0);

  // Cash in field pending settlement
  const cashInFieldRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as cash_in_field
    FROM collections
    WHERE business_id = ? AND payment_method = 'Cash' AND status IN ('pending', 'submitted')
  `).get(bizId);

  // 7-day Sales & Collections trend for Chart
  const dailyTrend = db.prepare(`
    SELECT date,
           SUM(CASE WHEN type = 'GAVE' THEN amount ELSE 0 END) as sales,
           SUM(CASE WHEN type = 'RECEIVED' THEN amount ELSE 0 END) as collections
    FROM transactions
    WHERE business_id = ? AND date >= date('now', '-14 days')
    GROUP BY date
    ORDER BY date ASC
  `).all(bizId);

  // Top Customers by Outstanding
  const topOutstandingCustomers = db.prepare(`
    SELECT id, name, business_name, mobile, current_balance, credit_limit
    FROM customers
    WHERE business_id = ? AND current_balance > 0
    ORDER BY current_balance DESC
    LIMIT 6
  `).all(bizId);

  // Top Salesmen by Collections
  const topSalesmen = db.prepare(`
    SELECT sm.id, sm.full_name, sm.employee_id,
           COALESCE(SUM(CASE WHEN t.type = 'GAVE' THEN t.amount ELSE 0 END), 0) as total_sales,
           COALESCE(SUM(CASE WHEN t.type = 'RECEIVED' THEN t.amount ELSE 0 END), 0) as total_collections
    FROM users sm
    LEFT JOIN transactions t ON sm.id = t.salesman_id
    WHERE sm.business_id = ? AND sm.role = 'salesman'
    GROUP BY sm.id
    ORDER BY total_collections DESC
    LIMIT 5
  `).all(bizId);

  // Recent Transactions
  const recentTransactions = db.prepare(`
    SELECT t.*, c.name as customer_name, c.business_name as customer_biz, u.full_name as salesman_name
    FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    LEFT JOIN users u ON t.salesman_id = u.id
    WHERE t.business_id = ?
    ORDER BY t.date DESC, t.time DESC, t.created_at DESC
    LIMIT 8
  `).all(bizId);

  // Pending Collections / Cash waiting for verification
  const pendingCollections = db.prepare(`
    SELECT col.*, c.name as customer_name, sm.full_name as salesman_name
    FROM collections col
    JOIN customers c ON col.customer_id = c.id
    JOIN users sm ON col.salesman_id = sm.id
    WHERE col.business_id = ? AND col.status IN ('pending', 'submitted')
    ORDER BY col.collection_date DESC
    LIMIT 6
  `).all(bizId);

  res.json({
    metrics: {
      totalReceivable: roundMoney(receivableRow.total_receivable),
      totalPayable: roundMoney(payableRow.total_payable),
      todaySales: roundMoney(todaySalesRow.today_sales),
      todayCollection: roundMoney(todayCollectionRow.today_collection),
      monthlySales: roundMoney(monthSalesRow.month_sales),
      monthlyCollection: roundMoney(monthCollectionRow.month_collection),
      outstanding: outstandingAmount,
      cashInField: roundMoney(cashInFieldRow.cash_in_field),
    },
    dailyTrend,
    topOutstandingCustomers,
    topSalesmen,
    recentTransactions,
    pendingCollections,
  });
});

// Salesman Dashboard metrics (Requirement 5)
router.get('/salesman-dashboard', authenticateToken, (req, res) => {
  const salesmanId = req.user.id;
  const bizId = req.businessId;
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);

  // Assigned customers count
  const myCustomersCount = db.prepare(`
    SELECT count(*) as count 
    FROM customer_assignments 
    WHERE salesman_id = ? AND status = 'active'
  `).get(salesmanId).count;

  // Today's Sales
  const todaySales = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE salesman_id = ? AND type = 'GAVE' AND date = ?
  `).get(salesmanId, today).total;

  // Today's Collections
  const todayCollections = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE salesman_id = ? AND type = 'RECEIVED' AND date = ?
  `).get(salesmanId, today).total;

  // Monthly Sales
  const monthlySales = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE salesman_id = ? AND type = 'GAVE' AND date LIKE ?
  `).get(salesmanId, `${currentMonth}%`).total;

  // Monthly Collection
  const monthlyCollections = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE salesman_id = ? AND type = 'RECEIVED' AND date LIKE ?
  `).get(salesmanId, `${currentMonth}%`).total;

  // Outstanding among assigned customers
  const myOutstanding = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN c.current_balance > 0 THEN c.current_balance ELSE 0 END), 0) as total
    FROM customer_assignments ca
    JOIN customers c ON ca.customer_id = c.id
    WHERE ca.salesman_id = ? AND ca.status = 'active'
  `).get(salesmanId).total;

  // Cash in hand (collected cash by this salesman pending settlement)
  const cashInHand = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM collections
    WHERE salesman_id = ? AND payment_method = 'Cash' AND status IN ('pending', 'submitted')
  `).get(salesmanId).total;

  // Recent transactions by this salesman
  const recentTransactions = db.prepare(`
    SELECT t.*, c.name as customer_name, c.business_name as customer_biz
    FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE t.salesman_id = ?
    ORDER BY t.date DESC, t.time DESC, t.created_at DESC
    LIMIT 8
  `).all(salesmanId);

  // Top outstanding assigned customers
  const outstandingCustomers = db.prepare(`
    SELECT c.id, c.name, c.business_name, c.mobile, c.current_balance
    FROM customer_assignments ca
    JOIN customers c ON ca.customer_id = c.id
    WHERE ca.salesman_id = ? AND ca.status = 'active' AND c.current_balance > 0
    ORDER BY c.current_balance DESC
    LIMIT 6
  `).all(salesmanId);

  // Pending collections for this salesman
  const pendingCollections = db.prepare(`
    SELECT col.*, c.name as customer_name
    FROM collections col
    JOIN customers c ON col.customer_id = c.id
    WHERE col.salesman_id = ? AND col.status IN ('pending', 'submitted')
    ORDER BY col.collection_date DESC
  `).all(salesmanId);

  res.json({
    metrics: {
      myCustomers: myCustomersCount,
      todaySales: roundMoney(todaySales),
      todayCollections: roundMoney(todayCollections),
      monthlySales: roundMoney(monthlySales),
      monthlyCollections: roundMoney(monthlyCollections),
      outstanding: roundMoney(myOutstanding),
      cashInHand: roundMoney(cashInHand),
      collectionRate: monthlySales > 0 ? Math.round((monthlyCollections / monthlySales) * 1000) / 10 : 0,
    },
    recentTransactions,
    outstandingCustomers,
    pendingCollections,
  });
});

// Sales Report (Daily, Weekly, Monthly, Custom)
router.get('/sales', authenticateToken, (req, res) => {
  const { period = 'daily', start_date, end_date, salesman_id } = req.query;
  const bizId = req.businessId;

  let query = `
    SELECT strftime(?, date) as period_label,
           count(*) as transaction_count,
           SUM(amount) as total_sales,
           AVG(amount) as avg_sale_value
    FROM transactions
    WHERE business_id = ? AND type = 'GAVE'
  `;
  const formatStr = period === 'monthly' ? '%Y-%m' : '%Y-%m-%d';
  const params = [formatStr, bizId];

  if (salesman_id) {
    query += ` AND salesman_id = ?`;
    params.push(salesman_id);
  }

  if (start_date) {
    query += ` AND date >= ?`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND date <= ?`;
    params.push(end_date);
  }

  query += ` GROUP BY period_label ORDER BY period_label DESC LIMIT 60`;

  const rows = db.prepare(query).all(...params);

  res.json({ report: rows });
});

// Collection Report (by salesman, payment method, date)
router.get('/collections', authenticateToken, (req, res) => {
  const { salesman_id, payment_method, start_date, end_date } = req.query;
  const bizId = req.businessId;

  let query = `
    SELECT col.payment_method,
           col.status,
           count(*) as count,
           SUM(col.amount) as total_amount
    FROM collections col
    WHERE col.business_id = ?
  `;
  const params = [bizId];

  if (salesman_id) {
    query += ` AND col.salesman_id = ?`;
    params.push(salesman_id);
  }

  if (payment_method) {
    query += ` AND col.payment_method = ?`;
    params.push(payment_method);
  }

  if (start_date) {
    query += ` AND col.collection_date >= ?`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND col.collection_date <= ?`;
    params.push(end_date);
  }

  query += ` GROUP BY col.payment_method, col.status ORDER BY total_amount DESC`;

  const breakdown = db.prepare(query).all(...params);

  // Group by payment method
  const byMethod = db.prepare(`
    SELECT payment_method, SUM(amount) as total, count(*) as count
    FROM collections
    WHERE business_id = ?
    GROUP BY payment_method
    ORDER BY total DESC
  `).all(bizId);

  res.json({ breakdown, byMethod });
});

// Outstanding / Aging Report (0-30, 31-60, 61-90, 90+ days)
router.get('/outstanding', authenticateToken, (req, res) => {
  const bizId = req.businessId;

  const customers = db.prepare(`
    SELECT c.id, c.name, c.business_name, c.mobile, c.current_balance, c.credit_limit,
           ca.salesman_id, sm.full_name as salesman_name,
           MAX(t.date) as last_transaction_date,
           julianday('now') - julianday(MAX(t.date)) as days_since_last_tx
    FROM customers c
    LEFT JOIN customer_assignments ca ON c.id = ca.customer_id AND ca.status = 'active'
    LEFT JOIN users sm ON ca.salesman_id = sm.id
    LEFT JOIN transactions t ON c.id = t.customer_id
    WHERE c.business_id = ? AND c.current_balance > 0
    GROUP BY c.id
    ORDER BY c.current_balance DESC
  `).all(bizId);

  // Bucketing
  let bucket0_30 = 0;
  let bucket31_60 = 0;
  let bucket61_90 = 0;
  let bucket90Plus = 0;

  const enrichedCustomers = customers.map((c) => {
    const days = Math.floor(c.days_since_last_tx || 0);
    let bucket = '0-30 days';
    if (days > 90) {
      bucket = '90+ days';
      bucket90Plus += c.current_balance;
    } else if (days > 60) {
      bucket = '61-90 days';
      bucket61_90 += c.current_balance;
    } else if (days > 30) {
      bucket = '31-60 days';
      bucket31_60 += c.current_balance;
    } else {
      bucket0_30 += c.current_balance;
    }

    return {
      ...c,
      days_inactive: days,
      aging_bucket: bucket,
    };
  });

  res.json({
    customers: enrichedCustomers,
    agingSummary: {
      bucket0_30: roundMoney(bucket0_30),
      bucket31_60: roundMoney(bucket31_60),
      bucket61_90: roundMoney(bucket61_90),
      bucket90Plus: roundMoney(bucket90Plus),
      totalOutstanding: roundMoney(bucket0_30 + bucket31_60 + bucket61_90 + bucket90Plus),
    },
  });
});

// Salesman Comparison Report (Requirement 14)
router.get('/salesman-comparison', authenticateToken, (req, res) => {
  const bizId = req.businessId;

  const salesmen = db.prepare(`
    SELECT sm.id, sm.full_name, sm.employee_id, sm.mobile, sm.status,
           COUNT(DISTINCT ca.customer_id) as assigned_customers_count,
           COALESCE(SUM(CASE WHEN t.type = 'GAVE' THEN t.amount ELSE 0 END), 0) as total_sales,
           COALESCE(SUM(CASE WHEN t.type = 'RECEIVED' THEN t.amount ELSE 0 END), 0) as total_collections,
           COUNT(DISTINCT t.id) as total_transactions
    FROM users sm
    LEFT JOIN customer_assignments ca ON sm.id = ca.salesman_id AND ca.status = 'active'
    LEFT JOIN transactions t ON sm.id = t.salesman_id
    WHERE sm.business_id = ? AND sm.role = 'salesman'
    GROUP BY sm.id
    ORDER BY total_sales DESC
  `).all(bizId);

  const enrichedSalesmen = salesmen.map((sm) => {
    // Outstanding of assigned customers
    const outstanding = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN c.current_balance > 0 THEN c.current_balance ELSE 0 END), 0) as total
      FROM customer_assignments ca
      JOIN customers c ON ca.customer_id = c.id
      WHERE ca.salesman_id = ? AND ca.status = 'active'
    `).get(sm.id).total;

    const totalSales = roundMoney(sm.total_sales);
    const totalCollections = roundMoney(sm.total_collections);
    const totalOutstanding = roundMoney(outstanding);
    const collectionRate = totalSales > 0 ? Math.round((totalCollections / totalSales) * 1000) / 10 : 0;

    return {
      ...sm,
      total_sales: totalSales,
      total_collections: totalCollections,
      total_outstanding: totalOutstanding,
      collection_rate_percent: collectionRate,
    };
  });

  res.json({ salesmen: enrichedSalesmen });
});

module.exports = router;
