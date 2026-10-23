const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { checkPermission, verifyCustomerAccess } = require('../middleware/permissions');
const { roundMoney, recalculateCustomerLedger } = require('../services/ledgerService');
const { logAudit } = require('../services/auditService');

// Public invoice endpoint for customer (NO LOGIN REQUIRED - Requirement 1 & 18)
router.get('/:id/public', async (req, res) => {
  try {
    const invoiceId = req.params.id;

    const invoice = await db.prepare(`
      SELECT inv.*,
             c.name as customer_name,
             c.business_name as customer_biz,
             c.mobile as customer_mobile,
             c.email as customer_email,
             c.address as customer_address,
             c.city as customer_city,
             c.state as customer_state,
             c.pincode as customer_pincode,
             c.gstin as customer_gstin,
             u.full_name as salesman_name
      FROM invoices inv
      JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN users u ON inv.salesman_id = u.id
      WHERE inv.id = ?
    `).get(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const business = await db.prepare(`
      SELECT name, tagline, address, city, state, pincode, phone, email, gstin, upi_id, bank_name, bank_account_no, bank_ifsc, currency, currency_symbol
      FROM businesses WHERE id = ?
    `).get(invoice.business_id);

    const items = await db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(invoiceId);

    res.json({
      business,
      invoice,
      items,
    });
  } catch (err) {
    console.error('Public invoice error:', err);
    res.status(500).json({ error: err.message || 'Error fetching invoice.' });
  }
});

// List invoices with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { customer_id, salesman_id, status, start_date, end_date } = req.query;

    let query = `
      SELECT inv.*,
             c.name as customer_name,
             c.business_name as customer_biz,
             c.mobile as customer_mobile,
             u.full_name as salesman_name
      FROM invoices inv
      JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN users u ON inv.salesman_id = u.id
      WHERE inv.business_id = ?
    `;
    const params = [req.businessId];

    // Salesman visibility restriction
    if (req.user.role === 'salesman' && (!req.user.permissions || !req.user.permissions.can_view_other_salesmen)) {
      query += ` AND inv.salesman_id = ?`;
      params.push(req.user.id);
    } else if (salesman_id) {
      query += ` AND inv.salesman_id = ?`;
      params.push(salesman_id);
    }

    if (customer_id) {
      query += ` AND inv.customer_id = ?`;
      params.push(customer_id);
    }

    if (status) {
      query += ` AND inv.status = ?`;
      params.push(status);
    }

    if (start_date) {
      query += ` AND inv.invoice_date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND inv.invoice_date <= ?`;
      params.push(end_date);
    }

    query += ` ORDER BY inv.invoice_date DESC, inv.created_at DESC`;

    const invoices = await db.prepare(query).all(...params);

    // Totals
    let totalInvoiced = 0;
    let totalPaid = 0;
    for (const inv of invoices) {
      totalInvoiced += inv.total_amount;
      totalPaid += inv.paid_amount;
    }

    res.json({
      invoices,
      summary: {
        count: invoices.length,
        totalInvoiced: roundMoney(totalInvoiced),
        totalPaid: roundMoney(totalPaid),
        totalPending: roundMoney(totalInvoiced - totalPaid),
      },
    });
  } catch (err) {
    console.error('List invoices error:', err);
    res.status(500).json({ error: err.message || 'Error listing invoices.' });
  }
});

// Get single invoice with line items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const invoiceId = req.params.id;

    const invoice = await db.prepare(`
      SELECT inv.*,
             c.name as customer_name,
             c.business_name as customer_biz,
             c.mobile as customer_mobile,
             c.address as customer_address,
             c.gstin as customer_gstin,
             u.full_name as salesman_name
      FROM invoices inv
      JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN users u ON inv.salesman_id = u.id
      WHERE inv.id = ? AND inv.business_id = ?
    `).get(invoiceId, req.businessId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const items = await db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(invoiceId);

    res.json({ invoice, items });
  } catch (err) {
    console.error('Get invoice error:', err);
    res.status(500).json({ error: err.message || 'Error fetching invoice.' });
  }
});

// Create new invoice
router.post('/', authenticateToken, verifyCustomerAccess, checkPermission('can_create_invoices'), async (req, res) => {
  try {
    const {
      customer_id, invoice_date, due_date, items, notes, terms,
      apply_to_ledger = true
    } = req.body;

    if (!customer_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and at least one item are required.' });
    }

    const customer = await db.prepare(`SELECT name, business_name FROM customers WHERE id = ? AND business_id = ?`).get(customer_id, req.businessId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const biz = await db.prepare(`SELECT invoice_prefix FROM businesses WHERE id = ?`).get(req.businessId);
    const prefix = biz?.invoice_prefix || 'INV-2026';
    const invoiceNumber = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceId = 'inv_' + crypto.randomBytes(6).toString('hex');
    const salesmanId = req.user.role === 'salesman' ? req.user.id : (req.body.salesman_id || req.user.id);

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const processedItems = items.map((it) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.unit_price) || 0;
      const discPct = Number(it.discount_percent) || 0;
      const taxPct = Number(it.tax_percent) || 0;

      const baseAmount = qty * price;
      const discountAmt = baseAmount * (discPct / 100);
      const taxableAmount = baseAmount - discountAmt;
      const taxAmt = taxableAmount * (taxPct / 100);
      const lineTotal = roundMoney(taxableAmount + taxAmt);

      subtotal += taxableAmount;
      totalDiscount += discountAmt;
      totalTax += taxAmt;

      return {
        id: 'item_' + crypto.randomBytes(6).toString('hex'),
        name: it.item_name,
        description: it.description || '',
        qty,
        price,
        discPct,
        taxPct,
        lineTotal,
      };
    });

    const totalAmount = roundMoney(subtotal + totalTax);

    const createInvoiceTx = db.transaction(async () => {
      // 1. Insert invoice header
      await db.prepare(`
        INSERT INTO invoices (
          id, business_id, customer_id, salesman_id, invoice_number, invoice_date,
          due_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
          status, notes, terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'sent', ?, ?)
      `).run(
        invoiceId,
        req.businessId,
        customer_id,
        salesmanId,
        invoiceNumber,
        invoice_date || new Date().toISOString().split('T')[0],
        due_date || null,
        roundMoney(subtotal),
        roundMoney(totalDiscount),
        roundMoney(totalTax),
        totalAmount,
        notes || null,
        terms || 'Net 15 days payment terms apply.'
      );

      // 2. Insert invoice line items
      const insertItem = db.prepare(`
        INSERT INTO invoice_items (id, invoice_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of processedItems) {
        await insertItem.run(item.id, invoiceId, item.name, item.description, item.qty, item.price, item.discPct, item.taxPct, item.lineTotal);
      }

      // 3. If apply_to_ledger is true, create 'GAVE' transaction on the customer's ledger!
      if (apply_to_ledger) {
        const txId = 'tx_' + crypto.randomBytes(6).toString('hex');
        await db.prepare(`
          INSERT INTO transactions (
            id, business_id, customer_id, salesman_id, type, amount, date, time,
            description, payment_method, reference_number, running_balance, created_by
          ) VALUES (?, ?, ?, ?, 'GAVE', ?, ?, ?, ?, 'Other', ?, 0, ?)
        `).run(
          txId,
          req.businessId,
          customer_id,
          salesmanId,
          totalAmount,
          invoice_date || new Date().toISOString().split('T')[0],
          new Date().toTimeString().split(' ')[0],
          `Invoice ${invoiceNumber} issued`,
          invoiceNumber,
          req.user.id
        );
      }
    });

    await createInvoiceTx();

    // Recalculate customer running balances
    if (apply_to_ledger) {
      await recalculateCustomerLedger(customer_id);
    }

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Invoice Created',
      entityType: 'Invoice',
      entityId: invoiceId,
      details: `Created invoice ${invoiceNumber} for ₹${totalAmount} to ${customer.name}.`,
      req,
    });

    res.status(201).json({
      message: 'Invoice created successfully.',
      invoiceId,
      invoiceNumber,
      totalAmount,
    });
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: err.message || 'Error creating invoice.' });
  }
});

// Update invoice status (e.g. mark paid, sent, etc.)
router.post('/:id/status', authenticateToken, async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { status, paid_amount } = req.body;

    const invoice = await db.prepare(`SELECT * FROM invoices WHERE id = ? AND business_id = ?`).get(invoiceId, req.businessId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    let finalPaid = invoice.paid_amount;
    if (status === 'paid') {
      finalPaid = invoice.total_amount;
    } else if (paid_amount !== undefined) {
      finalPaid = Number(paid_amount);
    }

    await db.prepare(`
      UPDATE invoices SET
        status = ?,
        paid_amount = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, finalPaid, invoiceId);

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Invoice Status Changed',
      entityType: 'Invoice',
      entityId: invoiceId,
      details: `Changed invoice ${invoice.invoice_number} status to ${status}.`,
      req,
    });

    res.json({ message: `Invoice status changed to ${status}.` });
  } catch (err) {
    console.error('Update invoice status error:', err);
    res.status(500).json({ error: err.message || 'Error updating invoice status.' });
  }
});

// Delete invoice
router.delete('/:id', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const invoiceId = req.params.id;

    const invoice = await db.prepare(`SELECT * FROM invoices WHERE id = ? AND business_id = ?`).get(invoiceId, req.businessId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    await db.prepare(`DELETE FROM invoices WHERE id = ?`).run(invoiceId);

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Invoice Deleted',
      entityType: 'Invoice',
      entityId: invoiceId,
      details: `Deleted invoice ${invoice.invoice_number}.`,
      req,
    });

    res.json({ message: 'Invoice deleted successfully.' });
  } catch (err) {
    console.error('Delete invoice error:', err);
    res.status(500).json({ error: err.message || 'Error deleting invoice.' });
  }
});

module.exports = router;
