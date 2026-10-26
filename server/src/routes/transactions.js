const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, verifyCustomerAccess } = require('../middleware/permissions');
const { recalculateCustomerLedger, roundMoney } = require('../services/ledgerService');
const { logAudit, notifyOwner } = require('../services/auditService');

// List transactions with extensive filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { customer_id, salesman_id, type, payment_method, start_date, end_date, search } = req.query;

    let query = `
      SELECT t.*, 
             c.name as customer_name,
             c.business_name as customer_business,
             c.mobile as customer_mobile,
             u.full_name as salesman_name
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u ON t.salesman_id = u.id
      WHERE t.business_id = ?
    `;
    const params = [req.businessId];

    // Salesman visibility restriction
    if (req.user.role === 'salesman' && (!req.user.permissions || !req.user.permissions.can_view_other_salesmen)) {
      query += ` AND (t.salesman_id = ? OR t.customer_id IN (
        SELECT customer_id FROM customer_assignments WHERE salesman_id = ? AND status = 'active'
      ))`;
      params.push(req.user.id, req.user.id);
    } else if (salesman_id) {
      query += ` AND t.salesman_id = ?`;
      params.push(salesman_id);
    }

    if (customer_id) {
      query += ` AND t.customer_id = ?`;
      params.push(customer_id);
    }

    if (type) {
      query += ` AND t.type = ?`;
      params.push(type);
    }

    if (payment_method) {
      query += ` AND t.payment_method = ?`;
      params.push(payment_method);
    }

    if (start_date) {
      query += ` AND t.date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND t.date <= ?`;
      params.push(end_date);
    }

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      query += ` AND (c.name LIKE ? OR c.business_name LIKE ? OR t.description LIKE ? OR t.reference_number LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY t.date DESC, t.time DESC, t.created_at DESC LIMIT 500`;

    const transactions = await db.prepare(query).all(...params);

    // Totals for this query
    let totalGave = 0;
    let totalReceived = 0;
    for (const t of transactions) {
      if (t.type === 'GAVE') totalGave += t.amount;
      if (t.type === 'RECEIVED') totalReceived += t.amount;
    }

    res.json({
      transactions,
      summary: {
        count: transactions.length,
        totalGave: roundMoney(totalGave),
        totalReceived: roundMoney(totalReceived),
        netBalance: roundMoney(totalGave - totalReceived),
      },
    });
  } catch (err) {
    console.error('List transactions error:', err);
    res.status(500).json({ error: err.message || 'Error listing transactions.' });
  }
});

// Record new transaction (YOU GAVE or YOU RECEIVED)
router.post('/', authenticateToken, verifyCustomerAccess, checkPermission('can_add_transactions'), async (req, res) => {
  try {
    const {
      customer_id, type, amount, date, time, description,
      payment_method = 'Cash', reference_number, notes, attachment_url
    } = req.body;

    const numAmount = roundMoney(amount);
    if (!customer_id || !type || !numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Customer, transaction type, and valid positive amount are required.' });
    }

    if (!['GAVE', 'RECEIVED'].includes(type)) {
      return res.status(400).json({ error: 'Transaction type must be either GAVE or RECEIVED.' });
    }

    const customer = await db.prepare(`SELECT name, business_name FROM customers WHERE id = ? AND business_id = ?`).get(customer_id, req.businessId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const txId = 'tx_' + crypto.randomBytes(6).toString('hex');
    const txDate = date || new Date().toISOString().split('T')[0];
    const txTime = time || new Date().toTimeString().split(' ')[0];
    const salesmanId = req.user.role === 'salesman' ? req.user.id : (req.body.salesman_id || req.user.id);

    let collectionId = null;
    let receiptId = null;

    const insertTx = db.transaction(async () => {
      // 1. Insert transaction
      await db.prepare(`
        INSERT INTO transactions (
          id, business_id, customer_id, salesman_id, type, amount, date, time,
          description, payment_method, reference_number, notes, attachment_url, running_balance, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(
        txId,
        req.businessId,
        customer_id,
        salesmanId,
        type,
        numAmount,
        txDate,
        txTime,
        description || (type === 'GAVE' ? 'Goods supplied / Sale' : 'Payment received'),
        payment_method,
        reference_number || null,
        notes || null,
        attachment_url || null,
        req.user.id
      );

      // 2. If RECEIVED, automatically record in collections table
      if (type === 'RECEIVED') {
        collectionId = 'col_' + crypto.randomBytes(6).toString('hex');
        const isOwner = req.user.role === 'owner';
        const colStatus = isOwner ? 'verified' : 'pending';

        await db.prepare(`
          INSERT INTO collections (
            id, business_id, customer_id, salesman_id, transaction_id, amount,
            collection_date, payment_method, reference_number, status, notes,
            submitted_at, verified_by, verified_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          collectionId,
          req.businessId,
          customer_id,
          salesmanId,
          txId,
          numAmount,
          txDate,
          payment_method,
          reference_number || null,
          colStatus,
          notes || (isOwner ? 'Recorded by Owner' : `Collected by ${req.user.full_name}`),
          isOwner ? new Date().toISOString() : null,
          isOwner ? req.user.id : null,
          isOwner ? new Date().toISOString() : null
        );

        // If collected by salesman, notify owner for cash/payment accountability
        if (!isOwner) {
          await notifyOwner({
            businessId: req.businessId,
            title: 'Payment Collected',
            message: `${req.user.full_name} collected ₹${numAmount} (${payment_method}) from ${customer.name}.`,
            type: 'collection',
            link: '/collections',
          });
        }

        // Generate payment receipt
        receiptId = 'rec_' + crypto.randomBytes(6).toString('hex');
        const biz = await db.prepare(`SELECT receipt_prefix FROM businesses WHERE id = ?`).get(req.businessId);
        const receiptNumber = `${biz?.receipt_prefix || 'REC'}-${Date.now().toString().slice(-6)}`;

        await db.prepare(`
          INSERT INTO receipts (
            id, business_id, customer_id, salesman_id, transaction_id, collection_id,
            receipt_number, receipt_date, amount, payment_method, reference_number, remaining_balance, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `).run(
          receiptId,
          req.businessId,
          customer_id,
          salesmanId,
          txId,
          collectionId,
          receiptNumber,
          txDate,
          numAmount,
          payment_method,
          reference_number || null,
          notes || null
        );
      }
    });

    await insertTx();

    // Atomically recompute running balance and customer current_balance
    const newBalance = await recalculateCustomerLedger(customer_id);

    // Update receipt remaining balance if created
    if (receiptId) {
      await db.prepare(`UPDATE receipts SET remaining_balance = ? WHERE id = ?`).run(newBalance, receiptId);
    }

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: type === 'GAVE' ? 'Sale/Credit Recorded' : 'Payment Collection Recorded',
      entityType: 'Transaction',
      entityId: txId,
      details: `${req.user.full_name} recorded ${type} ₹${numAmount} for ${customer.name}. New balance: ₹${newBalance}.`,
      req,
    });

    const createdTx = await db.prepare(`
      SELECT t.*, c.name as customer_name, c.business_name as customer_biz, u.full_name as salesman_name
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u ON t.salesman_id = u.id
      WHERE t.id = ?
    `).get(txId);

    res.status(201).json({
      message: `${type === 'GAVE' ? 'Sale / Credit' : 'Payment'} recorded successfully.`,
      transaction: createdTx,
      customerBalance: newBalance,
      receiptId,
    });
  } catch (err) {
    console.error('Record transaction error:', err);
    res.status(500).json({ error: err.message || 'Error recording transaction.' });
  }
});

// Update transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const txId = req.params.id;
    const { amount, date, time, description, payment_method, reference_number, attachment_url, notes } = req.body;

    const existing = await db.prepare(`SELECT * FROM transactions WHERE id = ? AND business_id = ?`).get(txId, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    // Check salesman access
    if (req.user.role === 'salesman' && existing.salesman_id !== req.user.id && (!req.user.permissions || !req.user.permissions.can_view_other_salesmen)) {
      return res.status(403).json({ error: 'You cannot edit transactions recorded by other salesmen.' });
    }

    const numAmount = amount ? roundMoney(amount) : existing.amount;

    await db.prepare(`
      UPDATE transactions SET
        amount = ?,
        date = COALESCE(?, date),
        time = COALESCE(?, time),
        description = COALESCE(?, description),
        payment_method = COALESCE(?, payment_method),
        reference_number = COALESCE(?, reference_number),
        attachment_url = COALESCE(?, attachment_url),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND business_id = ?
    `).run(
      numAmount,
      date,
      time,
      description,
      payment_method,
      reference_number,
      attachment_url !== undefined ? attachment_url : null,
      notes,
      txId,
      req.businessId
    );

    // Recalculate customer running balances
    const newBalance = await recalculateCustomerLedger(existing.customer_id);

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Transaction Updated',
      entityType: 'Transaction',
      entityId: txId,
      details: `Updated transaction #${txId} for amount ₹${numAmount}.`,
      req,
    });

    res.json({ message: 'Transaction updated successfully.', customerBalance: newBalance });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: err.message || 'Error updating transaction.' });
  }
});

// Delete transaction
router.delete('/:id', authenticateToken, checkPermission('can_delete_transactions'), async (req, res) => {
  try {
    const txId = req.params.id;

    const existing = await db.prepare(`SELECT * FROM transactions WHERE id = ? AND business_id = ?`).get(txId, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const deleteTx = db.transaction(async () => {
      // Delete related receipts and collections
      await db.prepare(`DELETE FROM receipts WHERE transaction_id = ?`).run(txId);
      await db.prepare(`DELETE FROM collections WHERE transaction_id = ?`).run(txId);
      await db.prepare(`DELETE FROM transactions WHERE id = ?`).run(txId);
    });

    await deleteTx();

    // Recalculate customer running balances
    const newBalance = await recalculateCustomerLedger(existing.customer_id);

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Transaction Deleted',
      entityType: 'Transaction',
      entityId: txId,
      details: `Deleted ${existing.type} transaction of ₹${existing.amount}.`,
      req,
    });

    res.json({ message: 'Transaction deleted successfully.', customerBalance: newBalance });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: err.message || 'Error deleting transaction.' });
  }
});

module.exports = router;
