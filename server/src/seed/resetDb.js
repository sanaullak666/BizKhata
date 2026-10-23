const { db, initializeDatabase } = require('../config/database');

function resetDatabase() {
  console.log('🧹 Clearing all data for production-clean database...');
  
  const tables = [
    'audit_logs',
    'notifications',
    'reminders',
    'receipts',
    'invoice_items',
    'invoices',
    'collections',
    'transactions',
    'customer_assignments',
    'customers',
    'staff_permissions',
    'users',
    'businesses'
  ];

  db.pragma('foreign_keys = OFF');
  const wipeTx = db.transaction(() => {
    for (const table of tables) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch (err) {
        console.error(`Error clearing ${table}:`, err.message);
      }
    }
  });

  wipeTx();
  db.pragma('foreign_keys = ON');
  
  // Re-run vacuum to reclaim space
  try {
    db.pragma('vacuum');
  } catch (err) {
    // ignore if WAL active
  }

  console.log('✨ All tables cleared! KhataFlow is in a fresh, clean state ready for production hosting.');
}

if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };
