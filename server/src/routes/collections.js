const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit, notifyUser, notifyOwner } = require('../services/auditService');

// Get collections list with status and salesman filters
router.get('/', authenticateToken, (req, res) => {
  const { salesman_id, status, payment_method, date_from, date_to } = req.query;

  let query = `
    SELECT col.*,
           c.name as customer_name,
           c.business_name as customer_biz,
           c.mobile as customer_mobile,
           sm.full_name as salesman_name,
           verifier.full_name as verified_by_name
    FROM collections col
    JOIN customers c ON col.customer_id = c.id
    JOIN users sm ON col.salesman_id = sm.id
    LEFT JOIN users verifier ON col.verified_by = verifier.id
    WHERE col.business_id = ?
  `;
  const params = [req.businessId];

  // Salesman visibility restriction
  if (req.user.role === 'salesman' && (!req.user.permissions || !req.user.permissions.can_view_other_salesmen)) {
    query += ` AND col.salesman_id = ?`;
    params.push(req.user.id);
  } else if (salesman_id) {
    query += ` AND col.salesman_id = ?`;
    params.push(salesman_id);
  }

  if (status) {
    query += ` AND col.status = ?`;
    params.push(status);
  }

  if (payment_method) {
    query += ` AND col.payment_method = ?`;
    params.push(payment_method);
  }

  if (date_from) {
    query += ` AND col.collection_date >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    query += ` AND col.collection_date <= ?`;
    params.push(date_to);
  }

  query += ` ORDER BY col.collection_date DESC, col.created_at DESC`;

  const collections = db.prepare(query).all(...params);

  // Summary counts
  let totalPending = 0;
  let totalSubmitted = 0;
  let totalVerified = 0;
  let cashInField = 0; // Cash collected that is pending or submitted

  for (const c of collections) {
    if (c.status === 'pending') totalPending += c.amount;
    if (c.status === 'submitted') totalSubmitted += c.amount;
    if (c.status === 'verified') totalVerified += c.amount;
    if (c.payment_method === 'Cash' && ['pending', 'submitted'].includes(c.status)) {
      cashInField += c.amount;
    }
  }

  res.json({
    collections,
    summary: {
      totalCount: collections.length,
      totalPending: Math.round(totalPending * 100) / 100,
      totalSubmitted: Math.round(totalSubmitted * 100) / 100,
      totalVerified: Math.round(totalVerified * 100) / 100,
      cashInField: Math.round(cashInField * 100) / 100,
    },
  });
});

// Salesman submits collection to Owner (Requirement 11)
router.post('/:id/submit', authenticateToken, (req, res) => {
  const colId = req.params.id;
  const { settlement_notes } = req.body;

  const collection = db.prepare(`
    SELECT col.*, c.name as customer_name, sm.full_name as salesman_name
    FROM collections col
    JOIN customers c ON col.customer_id = c.id
    JOIN users sm ON col.salesman_id = sm.id
    WHERE col.id = ? AND col.business_id = ?
  `).get(colId, req.businessId);

  if (!collection) {
    return res.status(404).json({ error: 'Collection record not found.' });
  }

  if (req.user.role === 'salesman' && collection.salesman_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only submit your own collections.' });
  }

  db.prepare(`
    UPDATE collections SET
      status = 'submitted',
      submitted_at = CURRENT_TIMESTAMP,
      settlement_notes = COALESCE(?, settlement_notes)
    WHERE id = ?
  `).run(settlement_notes || 'Submitted by salesman for settlement', colId);

  notifyOwner({
    businessId: req.businessId,
    title: 'Cash Collection Submitted',
    message: `${collection.salesman_name} submitted ₹${collection.amount} (${collection.payment_method}) for settlement.`,
    type: 'cash_submission',
    link: '/collections',
  });

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: 'Collection Submitted for Settlement',
    entityType: 'Collection',
    entityId: colId,
    details: `${collection.salesman_name} submitted collection of ₹${collection.amount} from ${collection.customer_name} to Owner.`,
    req,
  });

  res.json({ message: 'Collection submitted to owner for verification successfully.' });
});

// Owner marks Cash Settled / Verified (Requirement 11)
router.post('/:id/verify', authenticateToken, requireRole('owner'), (req, res) => {
  const colId = req.params.id;
  const { settlement_notes } = req.body;

  const collection = db.prepare(`
    SELECT col.*, c.name as customer_name, sm.full_name as salesman_name, sm.id as salesman_id
    FROM collections col
    JOIN customers c ON col.customer_id = c.id
    JOIN users sm ON col.salesman_id = sm.id
    WHERE col.id = ? AND col.business_id = ?
  `).get(colId, req.businessId);

  if (!collection) {
    return res.status(404).json({ error: 'Collection record not found.' });
  }

  db.prepare(`
    UPDATE collections SET
      status = 'verified',
      verified_by = ?,
      verified_at = CURRENT_TIMESTAMP,
      settlement_notes = COALESCE(?, settlement_notes)
    WHERE id = ?
  `).run(req.user.id, settlement_notes || 'Verified & Settled by Owner', colId);

  // Notify the salesman that their cash collection has been settled and verified
  notifyUser({
    businessId: req.businessId,
    userId: collection.salesman_id,
    title: 'Collection Settled & Verified',
    message: `Owner has verified and settled your ₹${collection.amount} collection from ${collection.customer_name}.`,
    type: 'collection',
    link: '/collections',
  });

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: 'Cash Settled / Collection Verified',
    entityType: 'Collection',
    entityId: colId,
    details: `Owner settled ₹${collection.amount} (${collection.payment_method}) collected by ${collection.salesman_name}.`,
    req,
  });

  res.json({ message: 'Collection successfully verified and cash marked as settled.' });
});

// Owner rejects collection
router.post('/:id/reject', authenticateToken, requireRole('owner'), (req, res) => {
  const colId = req.params.id;
  const { reason } = req.body;

  const collection = db.prepare(`SELECT * FROM collections WHERE id = ? AND business_id = ?`).get(colId, req.businessId);
  if (!collection) {
    return res.status(404).json({ error: 'Collection record not found.' });
  }

  db.prepare(`
    UPDATE collections SET
      status = 'rejected',
      settlement_notes = ?
    WHERE id = ?
  `).run(reason || 'Rejected by owner', colId);

  notifyUser({
    businessId: req.businessId,
    userId: collection.salesman_id,
    title: 'Collection Rejected',
    message: `Collection of ₹${collection.amount} was rejected: ${reason || 'Details required'}.`,
    type: 'warning',
    link: '/collections',
  });

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: 'Collection Rejected',
    entityType: 'Collection',
    entityId: colId,
    details: `Owner rejected collection ID ${colId} for ₹${collection.amount}. Reason: ${reason || 'Unspecified'}.`,
    req,
  });

  res.json({ message: 'Collection rejected.' });
});

// Owner bulk settle / verify collections
router.post('/bulk-verify', authenticateToken, requireRole('owner'), (req, res) => {
  const { collection_ids, notes } = req.body;

  if (!Array.isArray(collection_ids) || collection_ids.length === 0) {
    return res.status(400).json({ error: 'No collections selected for settlement.' });
  }

  const bulkTx = db.transaction(() => {
    for (const cId of collection_ids) {
      db.prepare(`
        UPDATE collections SET
          status = 'verified',
          verified_by = ?,
          verified_at = CURRENT_TIMESTAMP,
          settlement_notes = COALESCE(?, 'Bulk verified by owner')
        WHERE id = ? AND business_id = ?
      `).run(req.user.id, notes || 'Bulk verified', cId, req.businessId);
    }
  });

  bulkTx();

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: 'Bulk Cash Settlement',
    entityType: 'Collection',
    details: `Owner bulk verified and settled ${collection_ids.length} collections.`,
    req,
  });

  res.json({ message: `Successfully settled ${collection_ids.length} collections.` });
});

module.exports = router;
