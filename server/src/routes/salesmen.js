const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit, notifyUser } = require('../services/auditService');

// Helper to get next sequential EMP-xxx employee ID
async function getNextEmployeeId(businessId) {
  const existingEmployees = await db.prepare(`
    SELECT employee_id FROM users 
    WHERE business_id = ? AND employee_id LIKE 'EMP-%'
  `).all(businessId);

  let maxNum = 0;
  for (const emp of existingEmployees) {
    if (emp.employee_id) {
      const match = String(emp.employee_id).match(/^EMP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  }

  return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
}

// Get all salesmen with live performance stats
router.get('/', authenticateToken, async (req, res) => {
  try {
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

    const salesmen = await db.prepare(query).all(...params);

    // Compute live performance metrics for each salesman
    const salesmenWithStats = await Promise.all(salesmen.map(async (sm) => {
      // 1. Assigned customers count
      const custCountRow = await db.prepare(`
        SELECT count(*) as count 
        FROM customer_assignments 
        WHERE salesman_id = ? AND status = 'active'
      `).get(sm.id);
      const custCount = custCountRow ? custCountRow.count : 0;

      // 2. Total sales ('GAVE' recorded by this salesman)
      const salesStat = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_sales, count(*) as count
        FROM transactions
        WHERE salesman_id = ? AND type = 'GAVE'
      `).get(sm.id) || {};

      // 3. Total collections ('RECEIVED' recorded by this salesman)
      const collectionStat = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_collections, count(*) as count
        FROM transactions
        WHERE salesman_id = ? AND type = 'RECEIVED'
      `).get(sm.id) || {};

      // 4. Outstanding balance of assigned customers
      const outstandingStat = await db.prepare(`
        SELECT COALESCE(SUM(CASE WHEN c.current_balance > 0 THEN c.current_balance ELSE 0 END), 0) as total_outstanding
        FROM customer_assignments ca
        JOIN customers c ON ca.customer_id = c.id
        WHERE ca.salesman_id = ? AND ca.status = 'active'
      `).get(sm.id) || {};

      // 5. Total invoices created
      const invoiceCountRow = await db.prepare(`
        SELECT count(*) as count FROM invoices WHERE salesman_id = ?
      `).get(sm.id);
      const invoiceCount = invoiceCountRow ? invoiceCountRow.count : 0;

      // 6. Cash collected pending settlement
      const pendingCashStat = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as pending_cash
        FROM collections
        WHERE salesman_id = ? AND payment_method = 'Cash' AND status IN ('pending', 'submitted')
      `).get(sm.id) || {};

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
    }));

    const nextEmployeeId = await getNextEmployeeId(req.businessId);

    res.json({ salesmen: salesmenWithStats, next_employee_id: nextEmployeeId });
  } catch (err) {
    console.error('List salesmen error:', err);
    res.status(500).json({ error: err.message || 'Error fetching salesmen.' });
  }
});

// Get single salesman detailed profile & performance history
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const smId = req.params.id;

    if (req.user.role === 'salesman' && req.user.id !== smId && (!req.user.permissions || !req.user.permissions.can_view_other_salesmen)) {
      return res.status(403).json({ error: 'Unauthorized to view this salesman.' });
    }

    const salesman = await db.prepare(`
      SELECT id, business_id, role, full_name, mobile, email, employee_id,
             designation, joining_date, address, status, profile_photo, created_at
      FROM users
      WHERE id = ? AND business_id = ?
    `).get(smId, req.businessId);

    if (!salesman) {
      return res.status(404).json({ error: 'Salesman not found.' });
    }

    // Assigned customers
    const assignedCustomers = await db.prepare(`
      SELECT c.id, c.name, c.business_name, c.mobile, c.city, c.current_balance, ca.assigned_at
      FROM customer_assignments ca
      JOIN customers c ON ca.customer_id = c.id
      WHERE ca.salesman_id = ? AND ca.status = 'active'
      ORDER BY c.name ASC
    `).all(smId);

    // Performance metrics
    const salesRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE salesman_id = ? AND type = 'GAVE'
    `).get(smId);
    const totalSales = salesRow ? salesRow.total : 0;

    const collectionsRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE salesman_id = ? AND type = 'RECEIVED'
    `).get(smId);
    const totalCollections = collectionsRow ? collectionsRow.total : 0;

    const outstandingRow = await db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN c.current_balance > 0 THEN c.current_balance ELSE 0 END), 0) as total
      FROM customer_assignments ca
      JOIN customers c ON ca.customer_id = c.id
      WHERE ca.salesman_id = ? AND ca.status = 'active'
    `).get(smId);
    const totalOutstanding = outstandingRow ? outstandingRow.total : 0;

    // Monthly breakdown for charts
    const monthlyTrend = await db.prepare(`
      SELECT DATE_FORMAT(date, '%Y-%m') as month,
             SUM(CASE WHEN type = 'GAVE' THEN amount ELSE 0 END) as sales,
             SUM(CASE WHEN type = 'RECEIVED' THEN amount ELSE 0 END) as collections
      FROM transactions
      WHERE salesman_id = ?
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month ASC
      LIMIT 6
    `).all(smId);

    // Recent transactions
    const recentTransactions = await db.prepare(`
      SELECT t.*, c.name as customer_name, c.business_name as customer_biz
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      WHERE t.salesman_id = ?
      ORDER BY t.date DESC, t.time DESC
      LIMIT 10
    `).all(smId);

    // Permissions
    const permissions = await db.prepare(`SELECT * FROM staff_permissions WHERE user_id = ?`).get(smId);

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
  } catch (err) {
    console.error('Get salesman error:', err);
    res.status(500).json({ error: err.message || 'Error fetching salesman profile.' });
  }
});

// Create new salesman (Owner only)
router.post('/', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const {
      full_name, mobile, email, employee_id, password,
      joining_date, address, designation, profile_photo, status = 'active'
    } = req.body;

    if (!full_name || !mobile || !password) {
      return res.status(400).json({ error: 'Full name, mobile number, and password are required.' });
    }

    const existing = await db.prepare(`
      SELECT id FROM users 
      WHERE business_id = ? AND (mobile = ? OR (email = ? AND email IS NOT NULL AND email != ''))
    `).get(req.businessId, mobile, email || '');

    if (existing) {
      return res.status(400).json({ error: 'A staff member with this mobile number or email already exists.' });
    }

    const newSalesmanId = 'usr_sales_' + crypto.randomBytes(6).toString('hex');
    const passwordHash = bcrypt.hashSync(password, 10);
    const autoEmployeeId = await getNextEmployeeId(req.businessId);

    const createTx = db.transaction(async () => {
      await db.prepare(`
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
        autoEmployeeId,
        passwordHash,
        designation || 'Field Sales Executive',
        profile_photo || null,
        joining_date || new Date().toISOString().split('T')[0],
        address || '',
        status
      );

      // Initial permissions
      await db.prepare(`
        INSERT INTO staff_permissions (
          id, user_id, can_view_customers, can_add_customers, can_edit_customers,
          can_delete_customers, can_add_transactions, can_delete_transactions,
          can_create_invoices, can_record_collections, can_send_reminders,
          can_view_other_salesmen, can_view_reports, can_manage_staff, can_change_settings
        ) VALUES (?, ?, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0)
      `).run('perm_' + newSalesmanId, newSalesmanId);
    });

    await createTx();

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Salesman Added',
      entityType: 'User',
      entityId: newSalesmanId,
      details: `Added new salesman ${full_name} (${autoEmployeeId}).`,
      req,
    });

    const created = await db.prepare(`
      SELECT id, business_id, role, full_name, mobile, email, employee_id, designation, status, joining_date, address
      FROM users WHERE id = ?
    `).get(newSalesmanId);

    res.status(201).json({ message: 'Salesman created successfully.', salesman: created });
  } catch (err) {
    console.error('Create salesman error:', err);
    res.status(500).json({ error: err.message || 'Error creating salesman.' });
  }
});

// Update salesman details (Owner only)
router.put('/:id', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const smId = req.params.id;
    const {
      full_name, mobile, email, employee_id, password,
      joining_date, address, designation, profile_photo, status
    } = req.body;

    const salesman = await db.prepare(`SELECT id, full_name FROM users WHERE id = ? AND business_id = ?`).get(smId, req.businessId);
    if (!salesman) {
      return res.status(404).json({ error: 'Salesman not found.' });
    }

    let passwordHash = null;
    if (password && password.trim().length > 0) {
      passwordHash = bcrypt.hashSync(password, 10);
    }

    await db.prepare(`
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

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Salesman Profile Updated',
      entityType: 'User',
      entityId: smId,
      details: `Updated profile & status (${status || 'Active'}) for ${full_name || salesman.full_name}.`,
      req,
    });

    const updated = await db.prepare(`
      SELECT id, business_id, role, full_name, mobile, email, employee_id, designation, status, joining_date, address
      FROM users WHERE id = ?
    `).get(smId);

    res.json({ message: 'Salesman updated successfully.', salesman: updated });
  } catch (err) {
    console.error('Update salesman error:', err);
    res.status(500).json({ error: err.message || 'Error updating salesman.' });
  }
});

// Update salesman permissions (Requirement 25)
router.put('/:id/permissions', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const smId = req.params.id;
    const {
      can_view_customers, can_add_customers, can_edit_customers, can_delete_customers,
      can_add_transactions, can_delete_transactions, can_create_invoices,
      can_record_collections, can_send_reminders, can_view_other_salesmen,
      can_view_reports, can_manage_staff, can_change_settings
    } = req.body;

    const salesman = await db.prepare(`SELECT id, full_name FROM users WHERE id = ? AND business_id = ?`).get(smId, req.businessId);
    if (!salesman) {
      return res.status(404).json({ error: 'Salesman not found.' });
    }

    await db.prepare(`
      INSERT INTO staff_permissions (
        id, user_id, can_view_customers, can_add_customers, can_edit_customers,
        can_delete_customers, can_add_transactions, can_delete_transactions,
        can_create_invoices, can_record_collections, can_send_reminders,
        can_view_other_salesmen, can_view_reports, can_manage_staff, can_change_settings,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
      ON DUPLICATE KEY UPDATE
        can_view_customers = VALUES(can_view_customers),
        can_add_customers = VALUES(can_add_customers),
        can_edit_customers = VALUES(can_edit_customers),
        can_delete_customers = VALUES(can_delete_customers),
        can_add_transactions = VALUES(can_add_transactions),
        can_delete_transactions = VALUES(can_delete_transactions),
        can_create_invoices = VALUES(can_create_invoices),
        can_record_collections = VALUES(can_record_collections),
        can_send_reminders = VALUES(can_send_reminders),
        can_view_other_salesmen = VALUES(can_view_other_salesmen),
        can_view_reports = VALUES(can_view_reports),
        can_manage_staff = VALUES(can_manage_staff),
        can_change_settings = VALUES(can_change_settings),
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

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Permissions Changed',
      entityType: 'User',
      entityId: smId,
      details: `Updated staff permissions for salesman ${salesman.full_name}.`,
      req,
    });

    const permissions = await db.prepare(`SELECT * FROM staff_permissions WHERE user_id = ?`).get(smId);
    res.json({ message: 'Permissions updated successfully.', permissions });
  } catch (err) {
    console.error('Update permissions error:', err);
    res.status(500).json({ error: err.message || 'Error updating staff permissions.' });
  }
});

// Delete salesman (Owner only)
router.delete('/:id', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const smId = req.params.id;
    const salesman = await db.prepare(`
      SELECT * FROM users WHERE id = ? AND business_id = ? AND role = 'salesman'
    `).get(smId, req.businessId);

    if (!salesman) {
      return res.status(404).json({ error: 'Salesman not found.' });
    }

    const deleteTx = db.transaction(async () => {
      await db.prepare(`DELETE FROM customer_assignments WHERE salesman_id = ?`).run(smId);
      await db.prepare(`DELETE FROM staff_permissions WHERE user_id = ?`).run(smId);
      await db.prepare(`DELETE FROM collections WHERE salesman_id = ?`).run(smId);
      await db.prepare(`DELETE FROM reminders WHERE salesman_id = ?`).run(smId);
      await db.prepare(`DELETE FROM notifications WHERE user_id = ?`).run(smId);
      await db.prepare(`DELETE FROM users WHERE id = ? AND business_id = ?`).run(smId, req.businessId);
    });

    await deleteTx();

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Salesman Deleted',
      entityType: 'User',
      entityId: smId,
      details: `Deleted salesman ${salesman.full_name} (${salesman.mobile}).`,
      req,
    });

    res.json({ message: 'Salesman deleted successfully.' });
  } catch (err) {
    console.error('Delete salesman error:', err);
    res.status(500).json({ error: err.message || 'Error deleting salesman.' });
  }
});

module.exports = router;
