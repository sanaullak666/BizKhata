const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');

  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // Tables to completely empty
    const tablesToEmpty = [
      'transactions',
      'collections',
      'customer_assignments',
      'customers',
      'supplier_transactions',
      'suppliers',
      'cashbook_entries',
      'invoices',
      'invoice_items',
      'receipts',
      'reminders',
      'notifications',
      'audit_logs',
      'staff_permissions',
      'users',
      'businesses'
    ];

    for (const table of tablesToEmpty) {
      await conn.query(`TRUNCATE TABLE ${table}`);
      console.log(`   ✓ Cleaned table: ${table}`);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n🏢 Creating single primary business: Grihalakshmi Food Products...');
    const bizId = 'biz_default';
    await conn.query(`
      INSERT INTO businesses (
        id, name, tagline, address, city, state, pincode, phone, email, 
        gstin, upi_id, currency, currency_symbol, invoice_prefix, receipt_prefix
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', '₹', 'INV', 'REC')
    `, [
      bizId,
      'Grihalakshmi Food Products',
      'Spices, Pure Curry Powders & Millets Ledger',
      'Main Commercial Hub, Calicut, Kerala',
      'Calicut',
      'Kerala',
      '673001',
      '07356617891',
      'amalanoj00700@gmail.com',
      '32AABCB1234F1Z1',
      'grihalakshmi@upi'
    ]);

    const passwordHash = bcrypt.hashSync('admin123', 10);

    console.log('👤 Creating default clean accounts (Password: admin123)...');

    // 1. Owner: Amal E (07356617891)
    await conn.query(`
      INSERT INTO users (
        id, business_id, role, full_name, mobile, email, employee_id, password_hash,
        designation, joining_date, address, status
      ) VALUES (?, ?, 'owner', ?, ?, ?, 'OWNER-001', ?, 'Managing Director', CURDATE(), 'Head Office', 'active')
    `, [
      'usr_owner_amal',
      bizId,
      'Amal E',
      '07356617891',
      'amalanoj00700@gmail.com',
      passwordHash
    ]);

    // 2. Owner: Admin User (9876543210)
    await conn.query(`
      INSERT INTO users (
        id, business_id, role, full_name, mobile, email, employee_id, password_hash,
        designation, joining_date, address, status
      ) VALUES (?, ?, 'owner', ?, ?, ?, 'ADMIN-001', ?, 'Administrator', CURDATE(), 'Head Office', 'active')
    `, [
      'usr_owner_admin',
      bizId,
      'Admin User',
      '9876543210',
      'admin@bizkhata.com',
      passwordHash
    ]);

    // 3. Salesman: Sanaulla K (9495105852)
    const salesmanId = 'usr_sales_sanaulla';
    await conn.query(`
      INSERT INTO users (
        id, business_id, role, full_name, mobile, email, employee_id, password_hash,
        designation, joining_date, address, status
      ) VALUES (?, ?, 'salesman', ?, ?, ?, 'STAFF-001', ?, 'Field Sales Executive', CURDATE(), 'Field Office', 'active')
    `, [
      salesmanId,
      bizId,
      'Sanaulla K',
      '9495105852',
      'sanaullak294@gmail.com',
      passwordHash
    ]);

    // Staff permissions for salesman
    await conn.query(`
      INSERT INTO staff_permissions (
        id, user_id, can_view_customers, can_add_customers, can_edit_customers,
        can_delete_customers, can_add_transactions, can_delete_transactions,
        can_create_invoices, can_record_collections, can_send_reminders,
        can_view_other_salesmen, can_view_reports, can_manage_staff, can_change_settings
      ) VALUES (?, ?, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0)
    `, [
      'perm_sanaulla',
      salesmanId
    ]);

    console.log('\n📊 Verifying clean database state:');
    for (const table of tablesToEmpty) {
      const [rows] = await conn.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ${table.padEnd(25)}: ${rows[0].count} rows`);
    }

    console.log('\n✅ Database has been cleaned and freshly initialized!');
    console.log('   Owner Accounts:');
    console.log('     - Mobile: 07356617891 (Amal E) | Password: admin123');
    console.log('     - Mobile: 9876543210 (Admin User) | Password: admin123');
    console.log('   Salesman Account:');
    console.log('     - Mobile: 9495105852 (Sanaulla K) | Password: admin123');
    console.log('   Customers: 0');
    console.log('   Transactions: 0');
    console.log('   Suppliers: 0');
    console.log('   Cashbook entries: 0');

  } catch (err) {
    console.error('❌ Error cleaning database:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

cleanDatabase();
