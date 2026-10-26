const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { checkPermission, verifyCustomerAccess } = require('../middleware/permissions');
const { recalculateCustomerLedger, getCustomerStatement } = require('../services/ledgerService');
const { logAudit, notifyUser } = require('../services/auditService');

// Public statement endpoint for customers (NO LOGIN REQUIRED - Requirement 1 & 20)
router.get('/:id/public-statement', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { fromDate, toDate } = req.query;

    const statement = await getCustomerStatement(customerId, fromDate, toDate);
    if (!statement) {
      return res.status(404).json({ error: 'Customer ledger statement not found.' });
    }

    const business = await db.prepare(`SELECT name, phone, email, address, gstin, upi_id, currency, currency_symbol FROM businesses WHERE id = ?`).get(statement.customer.business_id);

    res.json({
      business,
      statement,
    });
  } catch (err) {
    console.error('Public statement error:', err);
    res.status(500).json({ error: err.message || 'Error fetching statement.' });
  }
});

// List customers with visibility restrictions & search filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, salesman_id, balance_filter, status } = req.query;

    let query = `
      SELECT c.*, 
             ca.salesman_id as assigned_salesman_id,
             u.full_name as assigned_salesman_name,
             u.mobile as assigned_salesman_mobile
      FROM customers c
      LEFT JOIN customer_assignments ca ON c.id = ca.customer_id AND ca.status = 'active'
      LEFT JOIN users u ON ca.salesman_id = u.id
      WHERE c.business_id = ?
    `;
    const params = [req.businessId];

    // In Grihalakshmi Food Products single-business model, all customers are visible to salesmen.
    if (salesman_id) {
      if (salesman_id === 'unassigned') {
        query += ` AND ca.salesman_id IS NULL`;
      } else {
        query += ` AND ca.salesman_id = ?`;
        params.push(salesman_id);
      }
    }

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      query += ` AND (c.name LIKE ? OR c.business_name LIKE ? OR c.mobile LIKE ? OR c.city LIKE ?)`;
      params.push(term, term, term, term);
    }

    if (status) {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    if (balance_filter === 'owe_business') {
      query += ` AND c.current_balance > 0`;
    } else if (balance_filter === 'business_owes') {
      query += ` AND c.current_balance < 0`;
    } else if (balance_filter === 'zero') {
      query += ` AND c.current_balance = 0`;
    }

    query += ` ORDER BY c.name ASC`;

    const customers = await db.prepare(query).all(...params);

    // Summary counts
    let totalReceivable = 0;
    let totalPayable = 0;
    for (const c of customers) {
      if (c.current_balance > 0) totalReceivable += c.current_balance;
      if (c.current_balance < 0) totalPayable += Math.abs(c.current_balance);
    }

    res.json({
      customers,
      summary: {
        totalCustomers: customers.length,
        totalReceivable: Math.round(totalReceivable * 100) / 100,
        totalPayable: Math.round(totalPayable * 100) / 100,
      },
    });
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: err.message || 'Error listing customers.' });
  }
});

// Get single customer profile and ledger
router.get('/:id', authenticateToken, verifyCustomerAccess, async (req, res) => {
  try {
    const customerId = req.params.id;

    const customer = await db.prepare(`
      SELECT c.*, 
             ca.salesman_id as assigned_salesman_id,
             u.full_name as assigned_salesman_name,
             u.mobile as assigned_salesman_mobile
      FROM customers c
      LEFT JOIN customer_assignments ca ON c.id = ca.customer_id AND ca.status = 'active'
      LEFT JOIN users u ON ca.salesman_id = u.id
      WHERE c.id = ? AND c.business_id = ?
    `).get(customerId, req.businessId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Get complete chronological ledger
    const transactions = await db.prepare(`
      SELECT t.*, u.full_name as salesman_name
      FROM transactions t
      LEFT JOIN users u ON t.salesman_id = u.id
      WHERE t.customer_id = ?
      ORDER BY t.date DESC, t.time DESC, t.created_at DESC
    `).all(customerId);

    // Invoices for this customer
    const invoices = await db.prepare(`
      SELECT * FROM invoices 
      WHERE customer_id = ? 
      ORDER BY invoice_date DESC
    `).all(customerId);

    // Recent collections
    const collections = await db.prepare(`
      SELECT col.*, u.full_name as salesman_name
      FROM collections col
      LEFT JOIN users u ON col.salesman_id = u.id
      WHERE col.customer_id = ?
      ORDER BY col.collection_date DESC
    `).all(customerId);

    res.json({
      customer,
      transactions,
      invoices,
      collections,
    });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: err.message || 'Error fetching customer profile.' });
  }
});

// Get customer statement for date range
router.get('/:id/statement', authenticateToken, verifyCustomerAccess, async (req, res) => {
  try {
    const customerId = req.params.id;
    const { fromDate, toDate } = req.query;

    const statement = await getCustomerStatement(customerId, fromDate, toDate);
    if (!statement) {
      return res.status(404).json({ error: 'Customer ledger statement not found.' });
    }

    res.json({ statement });
  } catch (err) {
    console.error('Customer statement error:', err);
    res.status(500).json({ error: err.message || 'Error generating statement.' });
  }
});

// Create new customer
router.post('/', authenticateToken, checkPermission('can_add_customers'), async (req, res) => {
  try {
    const {
      name, business_name, mobile, email, address, city, state, pincode,
      gstin, opening_balance_type = 'owe_business', opening_balance = 0,
      credit_limit = 0, notes, assigned_salesman_id
    } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ error: 'Customer name and mobile number are required.' });
    }

    const newCustomerId = 'cust_' + crypto.randomBytes(6).toString('hex');
    const numOpeningBalance = Number(opening_balance) || 0;

    const createTx = db.transaction(async () => {
      await db.prepare(`
        INSERT INTO customers (
          id, business_id, name, business_name, mobile, email, address, city, state, pincode,
          gstin, opening_balance_type, opening_balance, current_balance, credit_limit, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).run(
        newCustomerId,
        req.businessId,
        name,
        business_name || null,
        mobile,
        email || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        gstin || null,
        opening_balance_type,
        numOpeningBalance,
        Number(credit_limit) || 0,
        notes || null,
        req.user.id
      );

      // If created by salesman, automatically assign to them; if created by owner, use assigned_salesman_id if provided
      const salesmanToAssign = req.user.role === 'salesman' ? req.user.id : assigned_salesman_id;
      if (salesmanToAssign) {
        await db.prepare(`
          INSERT INTO customer_assignments (
            id, business_id, customer_id, salesman_id, assigned_by, status, notes
          ) VALUES (?, ?, ?, ?, ?, 'active', 'Assigned upon customer creation')
        `).run(
          'asgn_' + crypto.randomBytes(6).toString('hex'),
          req.businessId,
          newCustomerId,
          salesmanToAssign,
          req.user.id
        );
      }
    });

    await createTx();

    // Recalculate ledger balance with opening balance
    await recalculateCustomerLedger(newCustomerId);

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Customer Created',
      entityType: 'Customer',
      entityId: newCustomerId,
      details: `${req.user.full_name} created customer ${name} (${business_name || 'Retail'}) with opening balance ₹${numOpeningBalance}.`,
      req,
    });

    const created = await db.prepare(`SELECT * FROM customers WHERE id = ?`).get(newCustomerId);
    res.status(201).json({ message: 'Customer created successfully.', customer: created });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: err.message || 'Error creating customer.' });
  }
});

// Update customer
router.put('/:id', authenticateToken, verifyCustomerAccess, checkPermission('can_edit_customers'), async (req, res) => {
  try {
    const customerId = req.params.id;
    const {
      name, business_name, mobile, email, address, city, state, pincode,
      gstin, opening_balance_type, opening_balance, credit_limit, notes, status
    } = req.body;

    const existing = await db.prepare(`SELECT * FROM customers WHERE id = ? AND business_id = ?`).get(customerId, req.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const updateTx = db.transaction(async () => {
      await db.prepare(`
        UPDATE customers SET
          name = COALESCE(?, name),
          business_name = COALESCE(?, business_name),
          mobile = COALESCE(?, mobile),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          pincode = COALESCE(?, pincode),
          gstin = COALESCE(?, gstin),
          opening_balance_type = COALESCE(?, opening_balance_type),
          opening_balance = COALESCE(?, opening_balance),
          credit_limit = COALESCE(?, credit_limit),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND business_id = ?
      `).run(
        name, business_name, mobile, email, address, city, state, pincode,
        gstin, opening_balance_type, opening_balance, credit_limit, notes, status,
        customerId, req.businessId
      );
    });

    await updateTx();

    // Recalculate in case opening balance changed
    await recalculateCustomerLedger(customerId);

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Customer Updated',
      entityType: 'Customer',
      entityId: customerId,
      details: `Updated details for customer ${name || existing.name}.`,
      req,
    });

    const updated = await db.prepare(`SELECT * FROM customers WHERE id = ?`).get(customerId);
    res.json({ message: 'Customer updated successfully.', customer: updated });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: err.message || 'Error updating customer.' });
  }
});

// Delete customer
router.delete('/:id', authenticateToken, checkPermission('can_delete_customers'), async (req, res) => {
  try {
    const customerId = req.params.id;

    const customer = await db.prepare(`SELECT * FROM customers WHERE id = ? AND business_id = ?`).get(customerId, req.businessId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Delete customer and associated records
    await db.prepare(`DELETE FROM customers WHERE id = ? AND business_id = ?`).run(customerId, req.businessId);

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Customer Deleted',
      entityType: 'Customer',
      entityId: customerId,
      details: `Deleted customer ${customer.name} (${customer.business_name || 'Retail'}).`,
      req,
    });

    res.json({ message: 'Customer deleted successfully.' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: err.message || 'Error deleting customer.' });
  }
});

// Assign / Reassign / Transfer customer (Owner only - Requirement 6)
router.post('/:id/assign', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const customerId = req.params.id;
    const { salesman_id, notes } = req.body;

    const customer = await db.prepare(`SELECT name, business_name FROM customers WHERE id = ? AND business_id = ?`).get(customerId, req.businessId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const assignTx = db.transaction(async () => {
      // 1. Mark existing active assignment as transferred or unassigned
      const currentActive = await db.prepare(`
        SELECT id, salesman_id FROM customer_assignments 
        WHERE customer_id = ? AND status = 'active'
      `).get(customerId);

      if (currentActive) {
        await db.prepare(`
          UPDATE customer_assignments 
          SET status = ?, transferred_to = ?, notes = COALESCE(?, notes)
          WHERE id = ?
        `).run(
          salesman_id ? 'transferred' : 'unassigned',
          salesman_id || null,
          notes || 'Reassigned by owner',
          currentActive.id
        );
      }

      // 2. If new salesman assigned, create new active assignment
      if (salesman_id) {
        await db.prepare(`
          INSERT INTO customer_assignments (
            id, business_id, customer_id, salesman_id, assigned_by, status, notes
          ) VALUES (?, ?, ?, ?, ?, 'active', ?)
        `).run(
          'asgn_' + crypto.randomBytes(6).toString('hex'),
          req.businessId,
          customerId,
          salesman_id,
          req.user.id,
          notes || 'Assigned by owner'
        );

        // Notify the salesman
        await notifyUser({
          businessId: req.businessId,
          userId: salesman_id,
          title: 'Customer Assigned',
          message: `You have been assigned ${customer.name} (${customer.business_name || 'Retail'}).`,
          type: 'assignment',
          link: `/customers/${customerId}`,
        });
      }
    });

    await assignTx();

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Customer Assignment Changed',
      entityType: 'Customer',
      entityId: customerId,
      details: salesman_id ? `Assigned ${customer.name} to salesman ID ${salesman_id}.` : `Unassigned customer ${customer.name}.`,
      req,
    });

    res.json({ message: 'Customer assignment updated successfully.' });
  } catch (err) {
    console.error('Assign customer error:', err);
    res.status(500).json({ error: err.message || 'Error assigning customer.' });
  }
});

// Bulk assign customers (Owner only)
router.post('/bulk-assign', authenticateToken, requireRole('owner'), async (req, res) => {
  try {
    const { customer_ids, salesman_id, notes } = req.body;

    if (!Array.isArray(customer_ids) || customer_ids.length === 0 || !salesman_id) {
      return res.status(400).json({ error: 'Please provide customer_ids array and salesman_id.' });
    }

    const bulkTx = db.transaction(async () => {
      for (const cId of customer_ids) {
        // Deactivate old assignment
        await db.prepare(`
          UPDATE customer_assignments 
          SET status = 'transferred', transferred_to = ?, notes = 'Bulk transfer by owner'
          WHERE customer_id = ? AND status = 'active'
        `).run(salesman_id, cId);

        // Add new assignment
        await db.prepare(`
          INSERT INTO customer_assignments (
            id, business_id, customer_id, salesman_id, assigned_by, status, notes
          ) VALUES (?, ?, ?, ?, ?, 'active', ?)
        `).run(
          'asgn_' + crypto.randomBytes(6).toString('hex'),
          req.businessId,
          cId,
          salesman_id,
          req.user.id,
          notes || 'Bulk assigned by owner'
        );
      }
    });

    await bulkTx();

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Bulk Customer Assignment',
      entityType: 'Customer',
      details: `Transferred ${customer_ids.length} customers to salesman ID ${salesman_id}.`,
      req,
    });

    res.json({ message: `Successfully assigned ${customer_ids.length} customers.` });
  } catch (err) {
    console.error('Bulk assign error:', err);
    res.status(500).json({ error: err.message || 'Error bulk assigning customers.' });
  }
});

// Customer assignment history
router.get('/:id/assignments-history', authenticateToken, async (req, res) => {
  try {
    const customerId = req.params.id;

    const history = await db.prepare(`
      SELECT ca.*, 
             sm.full_name as salesman_name,
             sm.employee_id as salesman_emp_id,
             assigner.full_name as assigned_by_name,
             target_sm.full_name as transferred_to_name
      FROM customer_assignments ca
      JOIN users sm ON ca.salesman_id = sm.id
      LEFT JOIN users assigner ON ca.assigned_by = assigner.id
      LEFT JOIN users target_sm ON ca.transferred_to = target_sm.id
      WHERE ca.customer_id = ? AND ca.business_id = ?
      ORDER BY ca.assigned_at DESC
    `).all(customerId, req.businessId);

    res.json({ history });
  } catch (err) {
    console.error('Assignment history error:', err);
    res.status(500).json({ error: err.message || 'Error fetching assignment history.' });
  }
});

module.exports = router;
