const mysql = require('mysql2/promise');

async function cleanDatabase() {
  const connection = await mysql.createConnection({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'U32xJ4R96dasLqF.root',
    password: 'uOW8cSZNTWy7TRBl',
    database: 'khataflow',
    ssl: { rejectUnauthorized: true }
  });

  console.log('Connecting to TiDB Cloud khataflow database...');

  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

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

  for (const table of tables) {
    await connection.query(`TRUNCATE TABLE ${table}`);
    console.log(`  ✓ Cleared table: ${table}`);
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

  console.log('\nVerifying table counts:');
  let allEmpty = true;
  for (const table of tables) {
    const [rows] = await connection.query(`SELECT count(*) as count FROM ${table}`);
    const count = rows[0].count;
    console.log(`  ${table}: ${count} rows`);
    if (count !== 0) allEmpty = false;
  }

  if (allEmpty) {
    console.log('\n✅ All database tables in TiDB Cloud are completely cleaned and ready for production!');
  } else {
    console.log('\n⚠️ Some tables still have rows!');
  }

  await connection.end();
}

cleanDatabase().catch(console.error);
