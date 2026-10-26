const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// List suppliers with search and summary
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, filter } = req.query;
    let query = `
      SELECT s.*, 
        (SELECT MAX(created_at) FROM supplier_transactions WHERE supplier_id = s.id) as last_activity
      FROM suppliers s 
      WHERE s.business_id = ?
    `;
    const params = [req.businessId];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (s.name LIKE ? OR s.mobile LIKE ?)`;
      params.push(term, term);
    }

    if (filter === 'will_give') {
      query += ` AND s.current_balance > 0`;
    } else if (filter === 'will_get') {
      query += ` AND s.current_balance < 0`;
    }

    query += ` ORDER BY s.name ASC`;
    const suppliers = await db.prepare(query).all(...params);

    let willGive = 0; // You will give (you owe them)
    let willGet = 0;  // You will get (advance given to them)
    for (const s of suppliers) {
      if (s.current_balance > 0) willGive += s.current_balance;
      if (s.current_balance < 0) willGet += Math.abs(s.current_balance);
    }

    res.json({
      suppliers,
      summary: {
        totalSuppliers: suppliers.length,
        willGive: Math.round(willGive * 100) / 100,
        willGet: Math.round(willGet * 100) / 100,
      },
    });
  } catch (err) {
    console.error('List suppliers error:', err);
    res.status(500).json({ error: err.message || 'Error listing suppliers.' });
  }
});

// Add new supplier
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, mobile, opening_balance = 0, opening_balance_type = 'owe_supplier', address, city } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Supplier name is required.' });
    }

    const supplierId = 'sup_' + crypto.randomBytes(6).toString('hex');
    const numOpening = Math.abs(parseFloat(opening_balance) || 0);
    // If owe_supplier (You will give) -> positive balance. If supplier_owes (You will get) -> negative balance.
    const initialBalance = opening_balance_type === 'owe_supplier' ? numOpening : -numOpening;

    await db.prepare(`
      INSERT INTO suppliers (
        id, business_id, name, mobile, address, city, opening_balance, opening_balance_type, current_balance, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      supplierId,
      req.businessId,
      name.trim(),
      mobile || null,
      address || null,
      city || null,
      numOpening,
      opening_balance_type,
      initialBalance
    );

    // If opening balance > 0, insert opening transaction
    if (numOpening > 0) {
      const txId = 'stx_' + crypto.randomBytes(6).toString('hex');
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0];
      const txType = opening_balance_type === 'owe_supplier' ? 'GOT' : 'GAVE';

      await db.prepare(`
        INSERT INTO supplier_transactions (
          id, business_id, supplier_id, type, amount, date, time, description, running_balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Opening Balance', ?)
      `).run(txId, req.businessId, supplierId, txType, numOpening, today, time, initialBalance);
    }

    const created = await db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(supplierId);
    res.status(201).json({ message: 'Supplier added successfully', supplier: created });
  } catch (err) {
    console.error('Create supplier error:', err);
    res.status(500).json({ error: err.message || 'Error creating supplier.' });
  }
});

// Get single supplier details and ledger
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supplier = await db.prepare(`
      SELECT * FROM suppliers WHERE id = ? AND business_id = ?
    `).get(req.params.id, req.businessId);

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    const transactions = await db.prepare(`
      SELECT * FROM supplier_transactions 
      WHERE supplier_id = ? 
      ORDER BY date DESC, time DESC, created_at DESC
    `).all(req.params.id);

    res.json({ supplier, transactions });
  } catch (err) {
    console.error('Get supplier error:', err);
    res.status(500).json({ error: err.message || 'Error fetching supplier details.' });
  }
});

// Record a transaction with a supplier
router.post('/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const supplierId = req.params.id;
    const { type, amount, date, time, description, payment_method = 'Cash', reference_number, attachment_url } = req.body;

    const numAmount = parseFloat(amount);
    if (!type || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid transaction type and positive amount are required.' });
    }

    const supplier = await db.prepare(`
      SELECT * FROM suppliers WHERE id = ? AND business_id = ?
    `).get(supplierId, req.businessId);

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    // GAVE: You gave money to supplier -> decreases what you owe (current_balance - amount)
    // GOT: You got goods/supplies from supplier -> increases what you owe (current_balance + amount)
    const newBalance = type === 'GAVE'
      ? supplier.current_balance - numAmount
      : supplier.current_balance + numAmount;

    const txId = 'stx_' + crypto.randomBytes(6).toString('hex');
    const txDate = date || new Date().toISOString().split('T')[0];
    const txTime = time || new Date().toTimeString().split(' ')[0];

    const addTx = db.transaction(async () => {
      await db.prepare(`
        INSERT INTO supplier_transactions (
          id, business_id, supplier_id, type, amount, date, time, description, payment_method, reference_number, attachment_url, running_balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        req.businessId,
        supplierId,
        type,
        numAmount,
        txDate,
        txTime,
        description || (type === 'GAVE' ? 'Payment to supplier' : 'Goods received / Purchase'),
        payment_method,
        reference_number || null,
        attachment_url || null,
        newBalance
      );

      await db.prepare(`
        UPDATE suppliers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(newBalance, supplierId);
    });

    await addTx();

    const updatedSupplier = await db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(supplierId);
    const transactions = await db.prepare(`
      SELECT * FROM supplier_transactions WHERE supplier_id = ? ORDER BY date DESC, time DESC, created_at DESC
    `).all(supplierId);

    res.status(201).json({
      message: 'Transaction recorded successfully',
      supplier: updatedSupplier,
      transactions,
    });
  } catch (err) {
    console.error('Record supplier tx error:', err);
    res.status(500).json({ error: err.message || 'Error recording transaction.' });
  }
});

async function recalculateSupplierLedger(supplierId) {
  const txs = await db.prepare(`
    SELECT id, type, amount FROM supplier_transactions 
    WHERE supplier_id = ? 
    ORDER BY date ASC, time ASC, created_at ASC
  `).all(supplierId);

  let running = 0;
  for (const t of txs) {
    if (t.type === 'GAVE') {
      running += parseFloat(t.amount);
    } else {
      running -= parseFloat(t.amount);
    }
    await db.prepare(`UPDATE supplier_transactions SET running_balance = ? WHERE id = ?`).run(running, t.id);
  }

  await db.prepare(`UPDATE suppliers SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(running, supplierId);
  return running;
}

// Update supplier details
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, mobile, address, city } = req.body;
    const existing = await db.prepare(`SELECT * FROM suppliers WHERE id = ? AND business_id = ?`).get(req.params.id, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    await db.prepare(`
      UPDATE suppliers SET
        name = COALESCE(?, name),
        mobile = COALESCE(?, mobile),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND business_id = ?
    `).run(
      name,
      mobile,
      address,
      city,
      req.params.id,
      req.businessId
    );

    const updated = await db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(req.params.id);
    res.json({ message: 'Supplier updated successfully.', supplier: updated });
  } catch (err) {
    console.error('Update supplier error:', err);
    res.status(500).json({ error: err.message || 'Error updating supplier.' });
  }
});

// Update supplier transaction
router.put('/transactions/:txId', authenticateToken, async (req, res) => {
  try {
    const { txId } = req.params;
    const { amount, date, description, reference_number, attachment_url } = req.body;

    const existing = await db.prepare(`SELECT * FROM supplier_transactions WHERE id = ? AND business_id = ?`).get(txId, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    await db.prepare(`
      UPDATE supplier_transactions SET
        amount = COALESCE(?, amount),
        date = COALESCE(?, date),
        description = COALESCE(?, description),
        reference_number = COALESCE(?, reference_number),
        attachment_url = COALESCE(?, attachment_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND business_id = ?
    `).run(
      amount ? parseFloat(amount) : null,
      date,
      description,
      reference_number,
      attachment_url !== undefined ? attachment_url : null,
      txId,
      req.businessId
    );

    const newBalance = await recalculateSupplierLedger(existing.supplier_id);
    const updatedSupplier = await db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(existing.supplier_id);
    const transactions = await db.prepare(`
      SELECT * FROM supplier_transactions WHERE supplier_id = ? ORDER BY date DESC, time DESC, created_at DESC
    `).all(existing.supplier_id);

    res.json({
      message: 'Supplier transaction updated successfully.',
      supplierBalance: newBalance,
      supplier: updatedSupplier,
      transactions,
    });
  } catch (err) {
    console.error('Update supplier tx error:', err);
    res.status(500).json({ error: err.message || 'Error updating transaction.' });
  }
});

// Delete supplier transaction
router.delete('/transactions/:txId', authenticateToken, async (req, res) => {
  try {
    const { txId } = req.params;
    const existing = await db.prepare(`SELECT * FROM supplier_transactions WHERE id = ? AND business_id = ?`).get(txId, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    await db.prepare(`DELETE FROM supplier_transactions WHERE id = ? AND business_id = ?`).run(txId, req.businessId);
    const newBalance = await recalculateSupplierLedger(existing.supplier_id);
    const updatedSupplier = await db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(existing.supplier_id);
    const transactions = await db.prepare(`
      SELECT * FROM supplier_transactions WHERE supplier_id = ? ORDER BY date DESC, time DESC, created_at DESC
    `).all(existing.supplier_id);

    res.json({
      message: 'Supplier transaction deleted successfully.',
      supplierBalance: newBalance,
      supplier: updatedSupplier,
      transactions,
    });
  } catch (err) {
    console.error('Delete supplier tx error:', err);
    res.status(500).json({ error: err.message || 'Error deleting transaction.' });
  }
});

// Delete supplier
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`DELETE FROM suppliers WHERE id = ? AND business_id = ?`).run(req.params.id, req.businessId);
    res.json({ message: 'Supplier deleted successfully.' });
  } catch (err) {
    console.error('Delete supplier error:', err);
    res.status(500).json({ error: err.message || 'Error deleting supplier.' });
  }
});

module.exports = router;
