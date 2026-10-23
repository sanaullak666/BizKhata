const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit, notifyUser } = require('../services/auditService');

// Get all salesmen with live performance stats
router.get('/', authenticateToken, (req, res) => {
  // If salesman without can_view_other_salesmen permission, only return self
  let filterSalesmanId = null;
  if (req.user.role === 'salesman' && (!req.user.permissions || !req.user.permissions.can_view_other_salesmen)) {
    filterSalesmanId = req.user.id;
  }

  let query = `
    SELECT u.id, u.business_id, u.role, u.full_name, u.mobile, u.email, 
           u.employee_id, u.designation, u.joining_date, u.address, u.status, u.created_at
    FROM users u
    WHERE u.business_id = ? AND u.role = 'salesman'
  `;
  const params = [req.businessId];

  if (filterSalesmanId) {
    query += ` AND u.id = ?`;
    params.push(filterSalesmanId);
  }

  query += ` ORDER BY u.full_name ASC`;

  const salesmen = db.prepare(query).all(...params);

  // Compute live performance metrics for each salesman
  const salesmenWithStats = salesmen.map((sm) => {
    // 1. Assigned customers count
    const custCount = db.prepare(`
      SELECT count(*) as count 
      FROM customer_assignments 
      WHERE salesman_id = ? AND status = 'active'
    `).get(sm.id).count;

    // 2. Total sales ('GAVE' recorded by this salesman)
    const salesStat = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_sales, count(*) as count
      FROM transactions
      WHERE salesman_id = ? AND type = 'GAVE'
    `).get(sm.id);

    // 3. Total collections ('RECEIVED' recorded by this salesman)
    const collectionStat = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_collections, count(*) as count
      FROM transactions
      WHERE salesman_id = ? AND type = 'RECEIVED'
    `).get(sm.id);

    // 4. Outstanding balance of assigned customers
    const outstandingStat = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN c.current_balance > 0 THEN c.current_balance ELSE 0 END), 0) as total_outstanding
      FROM customer_assignments ca
      JOIN customers c ON ca.customer_id = c.id
      WHERE ca.salesman_id = ? AND ca.status = 'active'
    `).get(sm.id);

    // 5. Total invoices created
    const invoiceCount = db.prepare(`
      SELECT count(*) as count FROM invoices WHERE salesman_id = ?
    `).get(sm.id).count;

    // 6. Cash collected pending settlement
    const pendingCashStat = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as pending_cash
      FROM collections
      WHERE salesman_id = ? AND payment_method = 'Cash' AND status IN ('pending', 'submitted')
    `).get(sm.id);

    const totalSales = Math.round((salesStat.total_sales || 0) * 100) / 100;
    const totalCollections = Math.round((collectionStat.total_collections || 0) * 100) / 100;
    const totalOutstanding = Math.round((outstandingStat.total_outstanding || 0) * 100) / 100;
    const collectionPercentage = totalSales > 0 ? Math.round((totalCollections / totalSales) * 1000) / 10 : 0;
    const avgOrderValue = salesStat.count > 0 ? Math.round((totalSales / salesStat.count) * 100) / 100 : 0;

    return {
      ...sm,
      assigned_customers_count: custCount,
      total_sales: totalSales,
      total_collections: totalCollections,
      total_outstanding: totalOutstanding,
      total_transactions: (salesStat.count || 0) + (collectionStat.count || 0),
      total_invoices: invoiceCount,
      collection_rate_percent: collectionPercentage,
      average_order_value: avgOrderValue,
      pending_cash_settlement: Math.round((pendingCashStat.pending_cash || 0) * 100) / 100,
    };
  });

  res.json({ salesmen: salesmenWithStats });
});

// Get single salesman detailed profile & performance history
router.get('/:id', authenticateToken, (req, res) => {
  const smId = req.params.id;

  // Restrict if salesman viewing someone else without permission
  if (req.user.role === 'salesman' && req.user.id !== smId && (!req.user.permissions || !req.user.permissions.can_view_other_salesmen)) {
    return res.status(403).json({ error: 'Unauthorized to view this salesman.' });
  }

  const salesman = db.prepare(`
    SELECT id, business_id, role, full_name, mobile, email, employee_id,
           designation, joining_date, address, status, profile_photo, created_at
    FROM users
    WHERE id = ? AND business_id = ?
  `).get(smId, req.businessId);

  if (!salesman) {
    return res.status(404).json({ error: 'Salesman not found.' });
  }

  // Assigned customers
  const assignedCustomers = db.prepare(`
    SELECT c.id, c.name, c.business_name, c.mobile, c.city, c.current_balance, ca.assigned_at
    FROM customer_assignments ca
    JOIN customers c ON ca.customer_id = c.id
    WHERE ca.salesman_id = ? AND ca.status = 'active'
    ORDER BY c.name ASC
  `).all(smId);

  // Performance metrics
  const totalSales = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE salesman_id = ? AND type = 'GAVE'
  `).get(smId).total;

  const totalCollections = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE salesman_id = ? AND type = 'RECEIVED'
  `).get(smId).total;

  const totalOutstanding = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN c.current_balance > 0 THEN c.current_balance ELSE 0 END), 0) as total
    FROM customer_assignments ca
    JOIN customers c ON ca.customer_id = c.id
    WHERE ca.salesman_id = ? AND ca.status = 'active'
  `).get(smId).total;

  // Monthly breakdown for charts
  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', date) as month,
           SUM(CASE WHEN type = 'GAVE' THEN amount ELSE 0 END) as sales,
           SUM(CASE WHEN type = 'RECEIVED' THEN amount ELSE 0 END) as collections
    FROM transactions
    WHERE salesman_id = ?
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
    LIMIT 6
  `).all(smId);

  // Recent transactions
  const recentTransactions = db.prepare(`
    SELECT t.*, c.name as customer_name, c.business_name as customer_biz
    FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE t.salesman_id = ?
    ORDER BY t.date DESC, t.time DESC
    LIMIT 10
  `).all(smId);

  // Permissions
  const permissions = db.prepare(`SELECT * FROM staff_permissions WHERE user_id = ?`).get(smId);

  res.json({
    salesman,
    assignedCustomers,
    metrics: {
      totalSales: Math.round(totalSales * 100) / 100,
      totalCollections: Math.round(totalCollections * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      collectionRate: totalSales > 0 ? Math.round((totalCollections / totalSales) * 1000) / 10 : 0,
      customerCount: assignedCustomers.length,
    },
    monthlyTrend,
    recentTransactions,
    permissions,
  });
});

// Create new salesman (Owner only)
router.post('/', authenticateToken, requireRole('owner'), (req, res) => {
  const {
    full_name, mobile, email, employee_id, password,
    joining_date, address, designation, profile_photo, status = 'active'
  } = req.body;

  if (!full_name || !mobile || !password) {
    return res.status(400).json({ error: 'Full name, mobile number, and password are required.' });
  }

  // Check uniqueness of mobile/email in business
  const existing = db.prepare(`
    SELECT id FROM users 
    WHERE business_id = ? AND (mobile = ? OR (email = ? AND email IS NOT NULL AND email != ''))
  `).get(req.businessId, mobile, email || '');

  if (existing) {
    return res.status(400).json({ error: 'A staff member with this mobile number or email already exists.' });
  }

  const newSalesmanId = 'usr_sales_' + crypto.randomBytes(6).toString('hex');
  const passwordHash = bcrypt.hashSync(password, 10);

  const createTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (
        id, business_id, role, full_name, mobile, email, employee_id,
        password_hash, designation, profile_photo, joining_date, address, status
      ) VALUES (?, ?, 'salesman', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newSalesmanId,
      req.businessId,
      full_name,
      mobile,
      email || `${mobile}@khataflow.local`,
      employee_id || `EMP-${Math.floor(100 + Math.random() * 900)}`,
      passwordHash,
      designation || 'Field Sales Executive',
      profile_photo || null,
      joining_date || new Date().toISOString().split('T')[0],
      address || '',
      status
    );

    // Initial permissions
    db.prepare(`
      INSERT INTO staff_permissions (
        id, user_id, can_view_customers, can_add_customers, can_edit_customers,
        can_delete_customers, can_add_transactions, can_delete_transactions,
        can_create_invoices, can_record_collections, can_send_reminders,
        can_view_other_salesmen, can_view_reports, can_manage_staff, can_change_settings
      ) VALUES (?, ?, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0)
    `).run('perm_' + newSalesmanId, newSalesmanId);
  });

  createTx();

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: 'Salesman Added',
    entityType: 'User',
    entityId: newSalesmanId,
    details: `Added new salesman ${full_name} (${employee_id || 'Staff'}).`,
    req,
  });

  const created = db.prepare(`
    SELECT id, business_id, role, full_name, mobile, email, employee_id, designation, status, joining_date, address
    FROM users WHERE id = ?
  `).get(newSalesmanId);

  res.status(201).json({ message: 'Salesman created successfully.', salesman: created });
});

// Update salesman details (Owner only)
router.put('/:id', authenticateToken, requireRole('owner'), (req, res) => {
  const smId = req.params.id;
  const {
    full_name, mobile, email, employee_id, password,
    joining_date, address, designation, profile_photo, status
  } = req.body;

  const salesman = db.prepare(`SELECT id, full_name FROM users WHERE id = ? AND business_id = ?`).get(smId, req.businessId);
  if (!salesman) {
    return res.status(404).json({ error: 'Salesman not found.' });
  }

  let passwordHash = null;
  if (password && password.trim().length > 0) {
    passwordHash = bcrypt.hashSync(password, 10);
  }

  db.prepare(`
    UPDATE users SET
      full_name = COALESCE(?, full_name),
      mobile = COALESCE(?, mobile),
      email = COALESCE(?, email),
      employee_id = COALESCE(?, employee_id),
      designation = COALESCE(?, designation),
      profile_photo = COALESCE(?, profile_photo),
      joining_date = COALESCE(?, joining_date),
      address = COALESCE(?, address),
      status = COALESCE(?, status),
      password_hash = CASE WHEN ? IS NOT NULL THEN ? ELSE password_hash END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND business_id = ?
  `).run(
    full_name, mobile, email, employee_id, designation, profile_photo,
    joining_date, address, status,
    passwordHash, passwordHash,
    smId, req.businessId
  );

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: 'Salesman Profile Updated',
    entityType: 'User',
    entityId: smId,
    details: `Updated profile & status (${status || 'Active'}) for ${full_name || salesman.full_name}.`,
    req,
  });

  const updated = db.prepare(`
    SELECT id, business_id, role, full_name, mobile, email, employee_id, designation, status, joining_date, address
    FROM users WHERE id = ?
  `).get(smId);

  res.json({ message: 'Salesman updated successfully.', salesman: updated });
});

// Update salesman permissions (Requirement 25)
router.put('/:id/permissions', authenticateToken, requireRole('owner'), (req, res) => {
  const smId = req.params.id;
  const {
    can_view_customers, can_add_customers, can_edit_customers, can_delete_customers,
    can_add_transactions, can_delete_transactions, can_create_invoices,
    can_record_collections, can_send_reminders, can_view_other_salesmen,
    can_view_reports, can_manage_staff, can_change_settings
  } = req.body;

  const salesman = db.prepare(`SELECT id, full_name FROM users WHERE id = ? AND business_id = ?`).get(smId, req.businessId);
  if (!salesman) {
    return res.status(404).json({ error: 'Salesman not found.' });
  }

  db.prepare(`
    INSERT INTO staff_permissions (
      id, user_id, can_view_customers, can_add_customers, can_edit_customers,
      can_delete_customers, can_add_transactions, can_delete_transactions,
      can_create_invoices, can_record_collections, can_send_reminders,
      can_view_other_salesmen, can_view_reports, can_manage_staff, can_change_settings,
      updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
    )
    ON CONFLICT(user_id) DO UPDATE SET
      can_view_customers = excluded.can_view_customers,
      can_add_customers = excluded.can_add_customers,
      can_edit_customers = excluded.can_edit_customers,
      can_delete_customers = excluded.can_delete_customers,
      can_add_transactions = excluded.can_add_transactions,
      can_delete_transactions = excluded.can_delete_transactions,
      can_create_invoices = excluded.can_create_invoices,
      can_record_collections = excluded.can_record_collections,
      can_send_reminders = excluded.can_send_reminders,
      can_view_other_salesmen = excluded.can_view_other_salesmen,
      can_view_reports = excluded.can_view_reports,
      can_manage_staff = excluded.can_manage_staff,
      can_change_settings = excluded.can_change_settings,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    'perm_' + smId,
    smId,
    can_view_customers ? 1 : 0,
    can_add_customers ? 1 : 0,
    can_edit_customers ? 1 : 0,
    can_delete_customers ? 1 : 0,
    can_add_transactions ? 1 : 0,
    can_delete_transactions ? 1 : 0,
    can_create_invoices ? 1 : 0,
    can_record_collections ? 1 : 0,
    can_send_reminders ? 1 : 0,
    can_view_other_salesmen ? 1 : 0,
    can_view_reports ? 1 : 0,
    can_manage_staff ? 1 : 0,
    can_change_settings ? 1 : 0
  );

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: 'Permissions Changed',
    entityType: 'User',
    entityId: smId,
    details: `Updated staff permissions for salesman ${salesman.full_name}.`,
    req,
  });

  const permissions = db.prepare(`SELECT * FROM staff_permissions WHERE user_id = ?`).get(smId);
  res.json({ message: 'Permissions updated successfully.', permissions });
});

module.exports = router;
