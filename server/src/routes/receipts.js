const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// Public receipt view (NO LOGIN REQUIRED - Requirement 1 & 19)
router.get('/:id/public', (req, res) => {
  const receiptId = req.params.id;

  const receipt = db.prepare(`
    SELECT r.*,
           c.name as customer_name,
           c.business_name as customer_biz,
           c.mobile as customer_mobile,
           c.city as customer_city,
           u.full_name as salesman_name
    FROM receipts r
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN users u ON r.salesman_id = u.id
    WHERE r.id = ?
  `).get(receiptId);

  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found.' });
  }

  const business = db.prepare(`
    SELECT name, tagline, address, city, state, pincode, phone, email, gstin, upi_id, currency, currency_symbol
    FROM businesses WHERE id = ?
  `).get(receipt.business_id);

  res.json({
    business,
    receipt,
  });
});

// List receipts
router.get('/', authenticateToken, (req, res) => {
  const { customer_id, salesman_id, start_date, end_date } = req.query;

  let query = `
    SELECT r.*,
           c.name as customer_name,
           c.business_name as customer_biz,
           u.full_name as salesman_name
    FROM receipts r
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN users u ON r.salesman_id = u.id
    WHERE r.business_id = ?
  `;
  const params = [req.businessId];

  if (req.user.role === 'salesman' && (!req.user.permissions || !req.user.permissions.can_view_other_salesmen)) {
    query += ` AND r.salesman_id = ?`;
    params.push(req.user.id);
  } else if (salesman_id) {
    query += ` AND r.salesman_id = ?`;
    params.push(salesman_id);
  }

  if (customer_id) {
    query += ` AND r.customer_id = ?`;
    params.push(customer_id);
  }

  if (start_date) {
    query += ` AND r.receipt_date >= ?`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND r.receipt_date <= ?`;
    params.push(end_date);
  }

  query += ` ORDER BY r.receipt_date DESC, r.created_at DESC`;

  const receipts = db.prepare(query).all(...params);

  res.json({ receipts });
});

// Get single receipt
router.get('/:id', authenticateToken, (req, res) => {
  const receiptId = req.params.id;

  const receipt = db.prepare(`
    SELECT r.*,
           c.name as customer_name,
           c.business_name as customer_biz,
           c.mobile as customer_mobile,
           c.address as customer_address,
           c.city as customer_city,
           u.full_name as salesman_name
    FROM receipts r
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN users u ON r.salesman_id = u.id
    WHERE r.id = ? AND r.business_id = ?
  `).get(receiptId, req.businessId);

  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found.' });
  }

  const business = db.prepare(`SELECT * FROM businesses WHERE id = ?`).get(req.businessId);

  res.json({ receipt, business });
});

module.exports = router;
