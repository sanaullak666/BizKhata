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

  // 1. Health check
  const health = await req('/health');
  test('Health check endpoint returns ok', () => {
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'ok');
  });

  // 2. Production Business Registration (Sign-up) Flow
  const testMobile = '99' + Math.floor(10000000 + Math.random() * 90000000);
  const testEmail = `host_${Date.now()}@testbusiness.com`;
  const regRes = await req('/auth/register-business', {
    method: 'POST',
    body: {
      business_name: 'Metro Wholesale Traders',
      owner_name: 'Harish Mehta',
      mobile: testMobile,
      email: testEmail,
      password: 'SecurePassword123!',
      city: 'Delhi',
      gstin: '07AAAAA0000A1Z5',
      upi_id: 'metrowholesale@upi',
    },
  });

  test('Owner can register a new business and receive JWT authentication token', () => {
    assert.strictEqual(regRes.status, 201);
    assert(regRes.data.token, 'JWT token returned on registration');
    assert.strictEqual(regRes.data.user.role, 'owner');
    assert.strictEqual(regRes.data.user.full_name, 'Harish Mehta');
  });

  let ownerToken = regRes.data.token;

  // 3. Owner Login via registered credentials
  const ownerLogin = await req('/auth/login', {
    method: 'POST',
    body: { identifier: testMobile, password: 'SecurePassword123!' },
  });
  test('Owner can authenticate via mobile and password', () => {
    assert.strictEqual(ownerLogin.status, 200);
    assert(ownerLogin.data.token, 'JWT token returned');
    assert.strictEqual(ownerLogin.data.user.role, 'owner');
  });
  ownerToken = ownerLogin.data.token;

  // 4. Owner creates a new Salesman
  const salesmanMobile = '98' + Math.floor(10000000 + Math.random() * 90000000);
  const createSalesmanRes = await req('/salesmen', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: {
      full_name: 'Devendra Patel',
      mobile: salesmanMobile,
      email: `dev_${Date.now()}@testbusiness.com`,
      employee_id: 'EMP-DELHI-01',
      password: 'SalesmanPass123!',
      designation: 'Senior Route Executive',
      address: 'Connaught Place, Delhi',
    },
  });
  test('Owner can create a new salesman account with credentials', () => {
    assert.strictEqual(createSalesmanRes.status, 201);
    assert(createSalesmanRes.data.salesman.id);
  });
  const salesmanId = createSalesmanRes.data.salesman.id;

  // 5. Salesman Login
  const salesmanLogin = await req('/auth/login', {
    method: 'POST',
    body: { identifier: salesmanMobile, password: 'SalesmanPass123!' },
  });
  test('Salesman can authenticate and receives staff permissions', () => {
    assert.strictEqual(salesmanLogin.status, 200);
    assert(salesmanLogin.data.token);
    assert.strictEqual(salesmanLogin.data.user.role, 'salesman');
    assert.strictEqual(salesmanLogin.data.user.permissions.can_delete_customers, 0);
  });
  const salesmanToken = salesmanLogin.data.token;

  // 6. Owner creates Customer 1 and assigns to Salesman
  const cust1Res = await req('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: {
      name: 'Ramesh Sharma',
      business_name: 'Sharma Electronics',
      mobile: '9123456789',
      opening_balance_type: 'owe_business',
      opening_balance: 5000,
      assigned_salesman_id: salesmanId,
    },
  });
  test('Owner can create customer with opening balance and territory assignment', () => {
    assert.strictEqual(cust1Res.status, 201);
    assert.strictEqual(cust1Res.data.customer.current_balance, 5000);
  });
  const cust1Id = cust1Res.data.customer.id;

  // 7. Owner creates Customer 2 WITHOUT assigning to Salesman
  const cust2Res = await req('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: {
      name: 'Sunil Verma',
      business_name: 'Verma Hardware',
      mobile: '9876543211',
      opening_balance_type: 'owe_business',
      opening_balance: 8000,
    },
  });
  test('Owner can create unassigned customer', () => {
    assert.strictEqual(cust2Res.status, 201);
  });
  const cust2Id = cust2Res.data.customer.id;

  // 8. Salesman Territory Customer Isolation
  const salesmanCusts = await req('/customers', {
    headers: { Authorization: `Bearer ${salesmanToken}` },
  });
  test('Salesman only sees assigned customers (Territory Isolation)', () => {
    assert.strictEqual(salesmanCusts.status, 200);
    const hasAssigned = salesmanCusts.data.customers.some(c => c.id === cust1Id);
    const hasUnassigned = salesmanCusts.data.customers.some(c => c.id === cust2Id);
    assert(hasAssigned, 'Salesman sees assigned customer');
    assert(!hasUnassigned, 'Salesman CANNOT see unassigned customer');
  });

  // 9. Unauthorized Cross-Territory Access Check (403 Forbidden)
  const unauthAccess = await req(`/customers/${cust2Id}`, {
    headers: { Authorization: `Bearer ${salesmanToken}` },
  });
  test('Salesman accessing unassigned customer returns 403 Forbidden', () => {
    assert.strictEqual(unauthAccess.status, 403);
  });

  // 10. Financial Accuracy & Ledger Balance Recalculation
  // Customer 1 started with 5000. Give ₹3,000 credit.
  const addSale = await req('/transactions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${salesmanToken}` },
    body: {
      customer_id: cust1Id,
      type: 'GAVE',
      amount: 3000,
      description: 'Stock supply batch #101',
      payment_method: 'Other',
    },
  });
  test("Recording 'GAVE' increases customer balance accurately", () => {
    assert.strictEqual(addSale.status, 201);
    assert.strictEqual(addSale.data.customerBalance, 8000);
  });

  // Record a 'RECEIVED' payment of ₹2,500
  const addPayment = await req('/transactions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${salesmanToken}` },
    body: {
      customer_id: cust1Id,
      type: 'RECEIVED',
      amount: 2500,
      description: 'UPI collection',
      payment_method: 'UPI',
      reference_number: 'UPI-METRO-001',
    },
  });
  test("Recording 'RECEIVED' decreases customer balance accurately", () => {
    assert.strictEqual(addPayment.status, 201);
    assert.strictEqual(addPayment.data.customerBalance, 5500);
  });

  // 11. Cash Collection Submission & Settlement Workflow
  const cashSaleRes = await req('/transactions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${salesmanToken}` },
    body: {
      customer_id: cust1Id,
      type: 'RECEIVED',
      amount: 1000,
      description: 'Cash collection at store visit',
      payment_method: 'Cash',
      reference_number: 'CASH-REC-01',
    },
  });
  test('Salesman can record cash collection which triggers pending settlement', () => {
    assert.strictEqual(cashSaleRes.status, 201);
  });

  const collections = await req('/collections', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  test('Owner can view pending cash collections across salesmen', () => {
    assert.strictEqual(collections.status, 200);
    const foundCash = collections.data.collections.find(c => c.customer_id === cust1Id && c.payment_method === 'Cash');
    assert(foundCash, 'Cash collection recorded in collections queue');
  });

  // 12. Public Customer Statement (NO LOGIN REQUIRED)
  const publicStmt = await req(`/customers/${cust1Id}/public-statement`);
  test('Customer public statement is viewable without login', () => {
    assert.strictEqual(publicStmt.status, 200);
    assert.strictEqual(publicStmt.data.statement.customer.id, cust1Id);
    assert.strictEqual(publicStmt.data.statement.closingBalance, 4500);
  });

  // 13. Audit Log Recorded
  const auditLogs = await req('/audit-logs', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  test('Audit log recorded all activities with actor, action and timestamp', () => {
    assert.strictEqual(auditLogs.status, 200);
    assert(auditLogs.data.logs.length >= 3);
  });

  // 14. Full Backup Export
  const backup = await req('/backup/export-json', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  test('Owner can export complete business data backup', () => {
    assert.strictEqual(backup.status, 200);
    assert(backup.data.customers);
    assert(backup.data.transactions);
    assert.strictEqual(backup.data.business.name, 'Metro Wholesale Traders');
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
