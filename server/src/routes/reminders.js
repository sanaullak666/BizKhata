const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { logAudit } = require('../services/auditService');

// Get reminder history
router.get('/', authenticateToken, (req, res) => {
  const { customer_id, salesman_id } = req.query;

  let query = `
    SELECT rem.*,
           c.name as customer_name,
           c.business_name as customer_biz,
           c.mobile as customer_mobile,
           u.full_name as salesman_name
    FROM reminders rem
    JOIN customers c ON rem.customer_id = c.id
    JOIN users u ON rem.salesman_id = u.id
    WHERE rem.business_id = ?
  `;
  const params = [req.businessId];

  if (req.user.role === 'salesman' && (!req.user.permissions || !req.user.permissions.can_view_other_salesmen)) {
    query += ` AND rem.salesman_id = ?`;
    params.push(req.user.id);
  } else if (salesman_id) {
    query += ` AND rem.salesman_id = ?`;
    params.push(salesman_id);
  }

  if (customer_id) {
    query += ` AND rem.customer_id = ?`;
    params.push(customer_id);
  }

  query += ` ORDER BY rem.sent_at DESC LIMIT 200`;

  const reminders = db.prepare(query).all(...params);

  res.json({ reminders });
});

// Log a payment reminder action (WhatsApp / SMS / Email / Copy)
router.post('/', authenticateToken, checkPermission('can_send_reminders'), (req, res) => {
  const { customer_id, reminder_type = 'whatsapp', amount_due, message } = req.body;

  if (!customer_id || !message) {
    return res.status(400).json({ error: 'Customer and message content are required.' });
  }

  const customer = db.prepare(`SELECT name, business_name, mobile FROM customers WHERE id = ? AND business_id = ?`).get(customer_id, req.businessId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const reminderId = 'rem_' + crypto.randomBytes(6).toString('hex');

  db.prepare(`
    INSERT INTO reminders (
      id, business_id, customer_id, salesman_id, reminder_type, amount_due, message, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'sent')
  `).run(
    reminderId,
    req.businessId,
    customer_id,
    req.user.id,
    reminder_type,
    Number(amount_due) || 0,
    message
  );

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: `Payment Reminder Sent (${reminder_type.toUpperCase()})`,
    entityType: 'Reminder',
    entityId: reminderId,
    details: `${req.user.full_name} sent ${reminder_type} payment reminder to ${customer.name} for ₹${amount_due}.`,
    req,
  });

  res.json({ message: 'Reminder recorded successfully.', reminderId });
});

// Prepare reminder text with business details and customer balance
router.get('/prepare/:customerId', authenticateToken, (req, res) => {
  const customerId = req.params.customerId;

  const customer = db.prepare(`SELECT * FROM customers WHERE id = ? AND business_id = ?`).get(customerId, req.businessId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const business = db.prepare(`SELECT * FROM businesses WHERE id = ?`).get(req.businessId);

  const formattedAmount = `${business.currency_symbol || '₹'}${Math.abs(customer.current_balance).toLocaleString('en-IN')}`;

  const message = `Hello ${customer.name}${customer.business_name ? ` (${customer.business_name})` : ''},\n\nThis is a gentle reminder that your pending balance with *${business.name}* is *${formattedAmount}*.\n\nPlease clear the outstanding dues at your earliest convenience.\n\n*Payment Details:*\nUPI ID: ${business.upi_id || 'Contact owner'}\nBank: ${business.bank_name || 'HDFC Bank'}\nA/C: ${business.bank_account_no || ''}\nIFSC: ${business.bank_ifsc || ''}\n\nThank you for your business!`;

  // WhatsApp click-to-chat URL: https://wa.me/91XXXXXXXXXX?text=urlencoded
  const cleanPhone = customer.mobile.replace(/\D/g, '');
  const internationalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`;

  res.json({
    customer,
    business,
    formattedAmount,
    message,
    whatsappUrl,
  });
});

module.exports = router;
