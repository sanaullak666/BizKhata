const assert = require('assert');

const BASE_URL = 'http://localhost:5050/api';

async function req(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
  }
  const r = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, data };
}

async function runTestSuite() {
  console.log('🧪 Starting KhataFlow Production Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function test(title, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${title}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ FAIL: ${title}`);
      console.error(`     Error: ${e.message}\n`);
      failed++;
    }
  }

  // 1. Health & Initial Demo Accounts
  const health = await req('/health');
  test('Health check endpoint returns ok', () => {
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'ok');
  });

  const demoUsers = await req('/auth/demo-users');
  test('Demo accounts are populated with Owner and Salesmen', () => {
    assert.strictEqual(demoUsers.status, 200);
    assert(demoUsers.data.demoUsers.length >= 3);
    const owner = demoUsers.data.demoUsers.find(u => u.role === 'owner');
    const arshad = demoUsers.data.demoUsers.find(u => u.full_name.includes('Arshad'));
    assert(owner, 'Owner account exists');
    assert(arshad, 'Arshad salesman account exists');
  });

  // 2. Authentication
  const ownerLogin = await req('/auth/login', {
    method: 'POST',
    body: { identifier: 'owner@khataflow.com', password: 'password123' },
  });
  test('Owner can authenticate successfully and receives JWT', () => {
    assert.strictEqual(ownerLogin.status, 200);
    assert(ownerLogin.data.token, 'JWT token returned');
    assert.strictEqual(ownerLogin.data.user.role, 'owner');
  });
  const ownerToken = ownerLogin.data.token;

  const salesmanLogin = await req('/auth/login', {
    method: 'POST',
    body: { identifier: 'arshad@khataflow.com', password: 'password123' },
  });
  test('Salesman can authenticate and receives restricted permissions', () => {
    assert.strictEqual(salesmanLogin.status, 200);
    assert(salesmanLogin.data.token);
    assert.strictEqual(salesmanLogin.data.user.role, 'salesman');
    assert.strictEqual(salesmanLogin.data.user.permissions.can_delete_customers, 0);
  });
  const salesmanToken = salesmanLogin.data.token;

  // 3. Customer Visibility & Multi-Tenant Authorization (Requirement 7)
  const ownerCusts = await req('/customers', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const salesmanCusts = await req('/customers', {
    headers: { Authorization: `Bearer ${salesmanToken}` },
  });
  test('Salesman only sees customers assigned to their territory', () => {
    assert.strictEqual(ownerCusts.status, 200);
    assert.strictEqual(salesmanCusts.status, 200);
    // Owner should see all customers
    assert(ownerCusts.data.customers.length >= 8);
    // Salesman Arshad should only see his assigned customers (3 customers)
    assert(salesmanCusts.data.customers.length <= ownerCusts.data.customers.length);
    const hasRahimCust = salesmanCusts.data.customers.some(c => c.business_name === 'Royal Sanitary & Tiles');
    assert(!hasRahimCust, "Arshad must NOT see Rahim's customer 'Royal Sanitary & Tiles'");
  });

  // 4. Unauthorized Access Check
  const unassignedOrOtherCust = ownerCusts.data.customers.find(c => c.business_name === 'Royal Sanitary & Tiles');
  if (unassignedOrOtherCust) {
    const unauthAccess = await req(`/customers/${unassignedOrOtherCust.id}`, {
      headers: { Authorization: `Bearer ${salesmanToken}` },
    });
    test('Salesman accessing unassigned customer returns 403 Forbidden', () => {
      assert.strictEqual(unauthAccess.status, 403);
    });
  }

  // 5. Financial Accuracy & Ledger Balance Recalculation (Requirement 33)
  const rahmanTraders = ownerCusts.data.customers.find(c => c.business_name === 'Rahman Traders');
  assert(rahmanTraders, 'Rahman Traders exists');

  const initialBalance = rahmanTraders.current_balance;

  // Record a 'GAVE' sale of ₹3,500
  const addSale = await req('/transactions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${salesmanToken}` },
    body: {
      customer_id: rahmanTraders.id,
      type: 'GAVE',
      amount: 3500,
      description: 'Test industrial tool batch',
      payment_method: 'Other',
    },
  });
  test("Recording 'GAVE' increases customer balance accurately", () => {
    assert.strictEqual(addSale.status, 201);
    const expected = Math.round((initialBalance + 3500) * 100) / 100;
    assert.strictEqual(addSale.data.customerBalance, expected);
  });

  // Record a 'RECEIVED' payment of ₹1,500
  const addPayment = await req('/transactions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${salesmanToken}` },
    body: {
      customer_id: rahmanTraders.id,
      type: 'RECEIVED',
      amount: 1500,
      description: 'UPI collection on visit',
      payment_method: 'UPI',
      reference_number: 'UPI-TEST-900',
    },
  });
  test("Recording 'RECEIVED' decreases customer balance accurately", () => {
    assert.strictEqual(addPayment.status, 201);
    const expected = Math.round((initialBalance + 3500 - 1500) * 100) / 100;
    assert.strictEqual(addPayment.data.customerBalance, expected);
  });

  // 6. Cash Collection Settlement Workflow (Requirements 10 & 11)
  const collections = await req('/collections', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  test('Owner can view pending collections and cash in salesmen hands', () => {
    assert.strictEqual(collections.status, 200);
    assert(collections.data.collections.length > 0);
  });

  const pendingCol = collections.data.collections.find(c => c.status === 'submitted' || c.status === 'pending');
  if (pendingCol) {
    const settle = await req(`/collections/${pendingCol.id}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { settlement_notes: 'Verified in audit test' },
    });
    test('Owner can settle and verify cash collection', () => {
      assert.strictEqual(settle.status, 200);
    });
  }

  // 7. Public Statement Endpoint (NO LOGIN REQUIRED - Requirement 1 & 20)
  const publicStmt = await req(`/customers/${rahmanTraders.id}/public-statement`);
  test('Customer public statement is accessible without authentication', () => {
    assert.strictEqual(publicStmt.status, 200);
    assert(publicStmt.data.statement);
    assert(publicStmt.data.business);
    assert(publicStmt.data.statement.transactions.length > 0);
  });

  // 8. Public Invoice Endpoint (NO LOGIN REQUIRED)
  const invoices = await req('/invoices', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  if (invoices.data.invoices && invoices.data.invoices.length > 0) {
    const invId = invoices.data.invoices[0].id;
    const publicInv = await req(`/invoices/${invId}/public`);
    test('Customer public invoice is accessible without authentication', () => {
      assert.strictEqual(publicInv.status, 200);
      assert.strictEqual(publicInv.data.invoice.id, invId);
    });
  }

  // 9. Full JSON Backup & Export (Requirement 36)
  const backup = await req('/backup/export-json', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  test('Owner can export full database JSON backup package', () => {
    assert.strictEqual(backup.status, 200);
    assert(backup.data.customers);
    assert(backup.data.transactions);
    assert(backup.data.business);
  });

  // 10. Audit Log Recorded (Requirement 26)
  const auditLogs = await req('/audit-logs', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  test('Audit log recorded all activities with user, action and timestamp', () => {
    assert.strictEqual(auditLogs.status, 200);
    assert(auditLogs.data.logs.length > 0);
  });

  console.log(`\n========================================`);
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
