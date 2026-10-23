const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// Get business profile and settings
router.get('/', authenticateToken, (req, res) => {
  const business = db.prepare(`SELECT * FROM businesses WHERE id = ?`).get(req.businessId);
  if (!business) {
    return res.status(404).json({ error: 'Business profile not found.' });
  }
  res.json({ business });
});

// Update business profile & settings (Owner only)
router.put('/', authenticateToken, requireRole('owner'), (req, res) => {
  const {
    name, tagline, logo_url, address, city, state, pincode, phone, email,
    gstin, upi_id, bank_name, bank_account_no, bank_ifsc, currency, currency_symbol,
    invoice_prefix, receipt_prefix, reminder_template
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Business name is required.' });
  }

  db.prepare(`
    UPDATE businesses SET
      name = COALESCE(?, name),
      tagline = COALESCE(?, tagline),
      logo_url = COALESCE(?, logo_url),
      address = COALESCE(?, address),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      pincode = COALESCE(?, pincode),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      gstin = COALESCE(?, gstin),
      upi_id = COALESCE(?, upi_id),
      bank_name = COALESCE(?, bank_name),
      bank_account_no = COALESCE(?, bank_account_no),
      bank_ifsc = COALESCE(?, bank_ifsc),
      currency = COALESCE(?, currency),
      currency_symbol = COALESCE(?, currency_symbol),
      invoice_prefix = COALESCE(?, invoice_prefix),
      receipt_prefix = COALESCE(?, receipt_prefix),
      reminder_template = COALESCE(?, reminder_template),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name, tagline, logo_url, address, city, state, pincode, phone, email,
    gstin, upi_id, bank_name, bank_account_no, bank_ifsc, currency, currency_symbol,
    invoice_prefix, receipt_prefix, reminder_template,
    req.businessId
  );

  logAudit({
    businessId: req.businessId,
    userId: req.user.id,
    userName: req.user.full_name,
    action: 'Business Settings Updated',
    entityType: 'Business',
    entityId: req.businessId,
    details: `Updated business information and payment details for ${name}.`,
    req,
  });

  const updated = db.prepare(`SELECT * FROM businesses WHERE id = ?`).get(req.businessId);
  res.json({ message: 'Business settings updated successfully.', business: updated });
});

module.exports = router;
