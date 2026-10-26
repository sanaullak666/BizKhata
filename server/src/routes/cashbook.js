const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// List cashbook entries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, filter } = req.query;
    let query = `SELECT * FROM cashbook_entries WHERE business_id = ?`;
    const params = [req.businessId];

    if (date) {
      query += ` AND date = ?`;
      params.push(date);
    }

    if (filter === 'in') {
      query += ` AND type = 'in'`;
    } else if (filter === 'out') {
      query += ` AND type = 'out'`;
    }

    query += ` ORDER BY date DESC, time DESC, created_at DESC`;
    const entries = await db.prepare(query).all(...params);

    // Calculate totals
    const allQuery = `SELECT type, SUM(amount) as total FROM cashbook_entries WHERE business_id = ? GROUP BY type`;
    const summaryRows = await db.prepare(allQuery).all(req.businessId);

    let totalIn = 0;
    let totalOut = 0;
    for (const row of summaryRows) {
      if (row.type === 'in') totalIn = row.total || 0;
      if (row.type === 'out') totalOut = row.total || 0;
    }

    res.json({
      entries,
      summary: {
        totalIn: Math.round(totalIn * 100) / 100,
        totalOut: Math.round(totalOut * 100) / 100,
        netBalance: Math.round((totalIn - totalOut) * 100) / 100,
      },
    });
  } catch (err) {
    console.error('List cashbook error:', err);
    res.status(500).json({ error: err.message || 'Error listing cashbook entries.' });
  }
});

// Add cashbook entry (Cash In or Cash Out)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, amount, category, description, date, time, payment_mode = 'Cash' } = req.body;
    const numAmount = parseFloat(amount);

    if (!['in', 'out'].includes(type) || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid entry type (in/out) and positive amount are required.' });
    }

    const id = 'csh_' + crypto.randomBytes(6).toString('hex');
    const entryDate = date || new Date().toISOString().split('T')[0];
    const entryTime = time || new Date().toTimeString().split(' ')[0];

    await db.prepare(`
      INSERT INTO cashbook_entries (
        id, business_id, type, amount, date, time, category, description, payment_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.businessId,
      type,
      numAmount,
      entryDate,
      entryTime,
      category || (type === 'in' ? 'Cash In' : 'Cash Out'),
      description || null,
      payment_mode
    );

    const created = await db.prepare(`SELECT * FROM cashbook_entries WHERE id = ?`).get(id);
    res.status(201).json({ message: 'Cashbook entry recorded successfully.', entry: created });
  } catch (err) {
    console.error('Add cashbook entry error:', err);
    res.status(500).json({ error: err.message || 'Error recording cashbook entry.' });
  }
});

// Update cashbook entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { amount, type, category, description, date, payment_mode } = req.body;
    const existing = await db.prepare(`SELECT * FROM cashbook_entries WHERE id = ? AND business_id = ?`).get(req.params.id, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Cashbook entry not found.' });
    }

    await db.prepare(`
      UPDATE cashbook_entries SET
        amount = COALESCE(?, amount),
        type = COALESCE(?, type),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        date = COALESCE(?, date),
        payment_mode = COALESCE(?, payment_mode),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND business_id = ?
    `).run(
      amount ? parseFloat(amount) : null,
      type,
      category,
      description,
      date,
      payment_mode,
      req.params.id,
      req.businessId
    );

    const updated = await db.prepare(`SELECT * FROM cashbook_entries WHERE id = ?`).get(req.params.id);
    res.json({ message: 'Cashbook entry updated successfully.', entry: updated });
  } catch (err) {
    console.error('Update cashbook error:', err);
    res.status(500).json({ error: err.message || 'Error updating cashbook entry.' });
  }
});

// Delete entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`DELETE FROM cashbook_entries WHERE id = ? AND business_id = ?`).run(req.params.id, req.businessId);
    res.json({ message: 'Entry deleted successfully.' });
  } catch (err) {
    console.error('Delete cashbook error:', err);
    res.status(500).json({ error: err.message || 'Error deleting cashbook entry.' });
  }
});

module.exports = router;
