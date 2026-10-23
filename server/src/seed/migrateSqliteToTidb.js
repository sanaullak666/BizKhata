const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');
const path = require('path');

async function migrate() {
  const sqlite = new Database(path.join(__dirname, '../../data/khataflow.db'));
  const tidb = await mysql.createConnection({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'U32xJ4R96dasLqF.root',
    password: 'uOW8cSZNTWy7TRBl',
    database: 'khataflow',
    ssl: { rejectUnauthorized: true }
  });

  console.log('Migrating data from SQLite to TiDB Cloud...');

  const tableOrder = [
    'businesses',
    'users',
    'staff_permissions',
    'customers',
    'customer_assignments',
    'transactions',
    'collections',
    'invoices',
    'invoice_items',
    'receipts',
    'reminders',
    'audit_logs',
    'notifications'
  ];

  for (const table of tableOrder) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    for (const row of rows) {
      const values = columns.map(col => row[col]);
      await tidb.query(sql, values);
    }
    console.log(`  ✓ Migrated ${rows.length} rows into ${table}`);
  }

  console.log('✅ Migration of SQLite data to TiDB complete!');
  await tidb.end();
  sqlite.close();
}

migrate().catch(console.error);
