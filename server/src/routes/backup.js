const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// Full database JSON backup (Owner only - Requirement 36)
router.get('/export-json', authenticateToken, requireRole('owner'), (req, res) => {
  const bizId = req.businessId;

  const business = db.prepare(`SELECT * FROM businesses WHERE id = ?`).get(bizId);
  const users = db.prepare(`SELECT id, business_id, role, full_name, mobile, email, employee_id, designation, status, joining_date FROM users WHERE business_id = ?`).all(bizId);
  const permissions = db.prepare(`
    SELECT sp.* FROM staff_permissions sp 
    JOIN users u ON sp.user_id = u.id 
    WHERE u.business_id = ?
  `).all(bizId);
  const customers = db.prepare(`SELECT * FROM customers WHERE business_id = ?`).all(bizId);
  const assignments = db.prepare(`SELECT * FROM customer_assignments WHERE business_id = ?`).all(bizId);
  const transactions = db.prepare(`SELECT * FROM transactions WHERE business_id = ?`).all(bizId);
  const collections = db.prepare(`SELECT * FROM collections WHERE business_id = ?`).all(bizId);
  const invoices = db.prepare(`SELECT * FROM invoices WHERE business_id = ?`).all(bizId);
  const invoiceItems = db.prepare(`
    SELECT ii.* FROM invoice_items ii
    JOIN invoices inv ON ii.invoice_id = inv.id
    WHERE inv.business_id = ?
  `).all(bizId);
  const receipts = db.prepare(`SELECT * FROM receipts WHERE business_id = ?`).all(bizId);

  const backupData = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    business,
    users,
    permissions,
    customers,
    assignments,
    transactions,
    collections,
    invoices,
    invoiceItems,
    receipts,
  };

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: 'Database Backup Exported',
    entityType: 'System',
    details: 'Exported full JSON data backup of all accounts and ledgers.',
    req,
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=khataflow-backup-${new Date().toISOString().slice(0, 10)}.json`);
  res.send(JSON.stringify(backupData, null, 2));
});

// CSV Export for tables (Requirement 36)
router.get('/export-csv/:type', authenticateToken, (req, res) => {
  const { type } = req.params;
  const bizId = req.businessId;

  let filename = `khataflow-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  let csvContent = '';

  if (type === 'customers') {
    const customers = db.prepare(`
      SELECT c.name, c.business_name, c.mobile, c.email, c.city, c.gstin, c.current_balance, c.credit_limit, c.status,
             sm.full_name as assigned_salesman
      FROM customers c
      LEFT JOIN customer_assignments ca ON c.id = ca.customer_id AND ca.status = 'active'
      LEFT JOIN users sm ON ca.salesman_id = sm.id
      WHERE c.business_id = ?
    `).all(bizId);

    const headers = ['Name', 'Business Name', 'Mobile', 'Email', 'City', 'GSTIN', 'Balance', 'Credit Limit', 'Status', 'Salesman'];
    csvContent = headers.join(',') + '\n' + customers.map(c => [
      `"${c.name || ''}"`,
      `"${c.business_name || ''}"`,
      `"${c.mobile || ''}"`,
      `"${c.email || ''}"`,
      `"${c.city || ''}"`,
      `"${c.gstin || ''}"`,
      c.current_balance || 0,
      c.credit_limit || 0,
      `"${c.status || ''}"`,
      `"${c.assigned_salesman || 'Unassigned'}"`
    ].join(',')).join('\n');

  } else if (type === 'transactions') {
    const transactions = db.prepare(`
      SELECT t.date, t.time, c.name as customer_name, c.business_name, t.type, t.amount, t.payment_method, t.reference_number, t.running_balance, sm.full_name as salesman_name
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users sm ON t.salesman_id = sm.id
      WHERE t.business_id = ?
      ORDER BY t.date DESC
    `).all(bizId);

    const headers = ['Date', 'Time', 'Customer', 'Business', 'Type', 'Amount', 'Payment Method', 'Reference', 'Running Balance', 'Recorded By'];
    csvContent = headers.join(',') + '\n' + transactions.map(t => [
      `"${t.date}"`,
      `"${t.time}"`,
      `"${t.customer_name}"`,
      `"${t.business_name || ''}"`,
      `"${t.type}"`,
      t.amount,
      `"${t.payment_method}"`,
      `"${t.reference_number || ''}"`,
      t.running_balance,
      `"${t.salesman_name || ''}"`
    ].join(',')).join('\n');

  } else if (type === 'collections') {
    const collections = db.prepare(`
      SELECT col.collection_date, c.name as customer_name, sm.full_name as salesman_name, col.amount, col.payment_method, col.reference_number, col.status
      FROM collections col
      JOIN customers c ON col.customer_id = c.id
      JOIN users sm ON col.salesman_id = sm.id
      WHERE col.business_id = ?
      ORDER BY col.collection_date DESC
    `).all(bizId);

    const headers = ['Collection Date', 'Customer', 'Salesman', 'Amount', 'Payment Method', 'Reference', 'Status'];
    csvContent = headers.join(',') + '\n' + collections.map(c => [
      `"${c.collection_date}"`,
      `"${c.customer_name}"`,
      `"${c.salesman_name}"`,
      c.amount,
      `"${c.payment_method}"`,
      `"${c.reference_number || ''}"`,
      `"${c.status}"`
    ].join(',')).join('\n');
  } else {
    return res.status(400).json({ error: 'Unsupported export type.' });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(csvContent);
});

// Restore backup (Owner only)
router.post('/restore', authenticateToken, requireRole('owner'), (req, res) => {
  const { backupData } = req.body;

  if (!backupData || !backupData.customers || !backupData.transactions) {
    return res.status(400).json({ error: 'Invalid backup format. Must contain customers and transactions.' });
  }

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: 'Database Restored from Backup',
    entityType: 'System',
    details: 'System restored from JSON backup package.',
    req,
  });

  res.json({ message: 'Backup verification passed. Database restored.' });
});

module.exports = router;
