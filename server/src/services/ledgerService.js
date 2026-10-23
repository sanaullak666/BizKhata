const { db } = require('../config/database');

/**
 * Accurately round money amounts to 2 decimal places
 */
function roundMoney(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Atomically recalculate all running balances for a customer
 * and update the customer's current_balance.
 */
async function recalculateCustomerLedger(customerId) {
  const recalculateTx = db.transaction(async () => {
    // 1. Fetch customer opening balance details
    const customer = await db.prepare(`
      SELECT id, opening_balance_type, opening_balance 
      FROM customers 
      WHERE id = ?
    `).get(customerId);

    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Starting balance:
    // 'owe_business' means positive balance (Customer owes business)
    // 'business_owes' means negative balance (Business owes customer)
    let currentBalance = customer.opening_balance_type === 'owe_business'
      ? roundMoney(customer.opening_balance || 0)
      : -roundMoney(customer.opening_balance || 0);

    // 2. Fetch all transactions for this customer ordered chronologically
    const transactions = await db.prepare(`
      SELECT id, type, amount 
      FROM transactions 
      WHERE customer_id = ? 
      ORDER BY date ASC, time ASC, created_at ASC
    `).all(customerId);

    const updateTxBalance = db.prepare(`
      UPDATE transactions 
      SET running_balance = ? 
      WHERE id = ?
    `);

    // 3. Recompute running balance for every transaction
    for (const tx of transactions) {
      const amount = roundMoney(tx.amount);
      if (tx.type === 'GAVE') {
        currentBalance = roundMoney(currentBalance + amount);
      } else if (tx.type === 'RECEIVED') {
        currentBalance = roundMoney(currentBalance - amount);
      }
      await updateTxBalance.run(currentBalance, tx.id);
    }

    // 4. Update the customer's current_balance field
    await db.prepare(`
      UPDATE customers 
      SET current_balance = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(currentBalance, customerId);

    return currentBalance;
  });

  return await recalculateTx();
}

/**
 * Get ledger statement for a customer in a date range
 */
async function getCustomerStatement(customerId, fromDate, toDate) {
  const customer = await db.prepare(`
    SELECT * FROM customers WHERE id = ?
  `).get(customerId);

  if (!customer) return null;

  let query = `
    SELECT t.*, u.full_name as salesman_name
    FROM transactions t
    LEFT JOIN users u ON t.salesman_id = u.id
    WHERE t.customer_id = ?
  `;
  const params = [customerId];

  if (fromDate) {
    query += ` AND t.date >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    query += ` AND t.date <= ?`;
    params.push(toDate);
  }

  query += ` ORDER BY t.date ASC, t.time ASC, t.created_at ASC`;

  const transactions = await db.prepare(query).all(...params);

  // Calculate opening balance at 'fromDate'
  let openingAtFromDate = customer.opening_balance_type === 'owe_business'
    ? roundMoney(customer.opening_balance || 0)
    : -roundMoney(customer.opening_balance || 0);

  if (fromDate) {
    const priorTotals = await db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'GAVE' THEN amount ELSE 0 END), 0) as prior_gave,
        COALESCE(SUM(CASE WHEN type = 'RECEIVED' THEN amount ELSE 0 END), 0) as prior_received
      FROM transactions
      WHERE customer_id = ? AND date < ?
    `).get(customerId, fromDate);

    openingAtFromDate = roundMoney(
      openingAtFromDate + (priorTotals.prior_gave || 0) - (priorTotals.prior_received || 0)
    );
  }

  let totalGave = 0;
  let totalReceived = 0;

  for (const t of transactions) {
    if (t.type === 'GAVE') totalGave = roundMoney(totalGave + t.amount);
    if (t.type === 'RECEIVED') totalReceived = roundMoney(totalReceived + t.amount);
  }

  const closingBalance = roundMoney(openingAtFromDate + totalGave - totalReceived);

  return {
    customer,
    period: {
      fromDate: fromDate || 'Beginning',
      toDate: toDate || 'Present',
    },
    openingBalance: openingAtFromDate,
    totalGave,
    totalReceived,
    closingBalance,
    transactions,
  };
}

module.exports = {
  roundMoney,
  recalculateCustomerLedger,
  getCustomerStatement,
};
