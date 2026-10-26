const bcrypt = require('bcryptjs');
const { db } = require('../config/database');

async function createAdmin() {
  const bizId = 'biz_default';
  const ownerId = 'usr_owner_01';
  const passwordHash = bcrypt.hashSync('admin123', 10);

  // 1. Create Business
  await db.prepare(`
    INSERT INTO businesses (
      id, name, tagline, address, city, state, pincode, phone, email, 
      gstin, upi_id, currency, currency_symbol, invoice_prefix, receipt_prefix
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', '₹', 'INV', 'REC')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `).run(
    bizId,
    'Grihalakshmi Food Products',
    'Food Products Wholesale & Distribution Digital Ledger',
    'Main Commercial Hub',
    'Mumbai',
    'Maharashtra',
    '400001',
    '9876543210',
    'admin@bizkhata.com',
    '27AABCB1234F1Z1',
    'bizkhata@upi'
  );

  // 2. Create Admin / Owner
  await db.prepare(`
    INSERT INTO users (
      id, business_id, role, full_name, mobile, email, employee_id, password_hash,
      designation, joining_date, address, status
    ) VALUES (?, ?, 'owner', ?, ?, ?, 'ADMIN-001', ?, 'Managing Director / Admin', CURDATE(), 'Head Office', 'active')
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status = 'active'
  `).run(
    ownerId,
    bizId,
    'Admin User',
    '9876543210',
    'admin@bizkhata.com',
    passwordHash
  );

  console.log('✅ Admin account created successfully in TiDB Cloud:');
  console.log('   Mobile: 9876543210');
  console.log('   Email: admin@bizkhata.com');
  console.log('   Password: admin123');
  process.exit(0);
}

createAdmin().catch(console.error);
