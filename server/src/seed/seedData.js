const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { recalculateCustomerLedger } = require('../services/ledgerService');

function seedDatabase(force = false) {
  if (!force && process.env.SEED_DEMO !== 'true') {
    return;
  }

  const existingBiz = db.prepare(`SELECT count(*) as count FROM businesses`).get();
  if (existingBiz.count > 0) {
    console.log('Database already has data. Skipping initial seed.');
    return;
  }

  console.log('Seeding initial data for KhataFlow...');

  const passwordHash = bcrypt.hashSync('password123', 10);

  const seedTx = db.transaction(() => {
    // 1. Business
    const bizId = 'biz_apex_01';
    db.prepare(`
      INSERT INTO businesses (
        id, name, tagline, address, city, state, pincode, phone, email, 
        gstin, upi_id, bank_name, bank_account_no, bank_ifsc, currency, currency_symbol,
        invoice_prefix, receipt_prefix, reminder_template
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bizId,
      'Grihalakshmi Food Products',
      'Food Products Wholesale & Distribution Digital Ledger',
      'Plot 45, MIDC Industrial Area, Phase II',
      'Mumbai',
      'Maharashtra',
      '400093',
      '+91 98765 43210',
      'contact@apexsupplies.in',
      '27AABCA1234F1Z8',
      'apexsupplies@hdfcbank',
      'HDFC Bank Ltd',
      '50200049281729',
      'HDFC0000123',
      'INR',
      '₹',
      'INV-2026',
      'REC-2026',
      'Dear {customer_name}, your balance of {amount} with {business_name} is outstanding. Kindly clear via UPI {upi_id} or bank transfer. Thank you!'
    );

    // 2. Owner
    const ownerId = 'usr_owner_01';
    db.prepare(`
      INSERT INTO users (
        id, business_id, role, full_name, mobile, email, employee_id, password_hash, 
        designation, joining_date, address, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ownerId,
      bizId,
      'owner',
      'Vikram Malhotra',
      '9876543210',
      'owner@khataflow.com',
      'EMP-001',
      passwordHash,
      'Managing Director & Owner',
      '2022-01-01',
      'Bandra West, Mumbai',
      'active'
    );

    // 3. Salesmen
    const salesmen = [
      {
        id: 'usr_sales_arshad',
        name: 'Arshad Khan',
        mobile: '9811223344',
        email: 'arshad@khataflow.com',
        empId: 'EMP-101',
        designation: 'Senior Field Sales Executive',
        joining: '2024-01-15',
        address: 'Kurla West, Mumbai',
        status: 'active',
      },
      {
        id: 'usr_sales_rahim',
        name: 'Rahim Sheikh',
        mobile: '9822334455',
        email: 'rahim@khataflow.com',
        empId: 'EMP-102',
        designation: 'Area Sales Officer',
        joining: '2024-06-01',
        address: 'Andheri East, Mumbai',
        status: 'active',
      },
      {
        id: 'usr_sales_sameer',
        name: 'Sameer Joshi',
        mobile: '9833445566',
        email: 'sameer@khataflow.com',
        empId: 'EMP-103',
        designation: 'Field Representative',
        joining: '2024-09-10',
        address: 'Thane West, Mumbai',
        status: 'active',
      },
    ];

    for (const sm of salesmen) {
      db.prepare(`
        INSERT INTO users (
          id, business_id, role, full_name, mobile, email, employee_id, password_hash, 
          designation, joining_date, address, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        sm.id,
        bizId,
        'salesman',
        sm.name,
        sm.mobile,
        sm.email,
        sm.empId,
        passwordHash,
        sm.designation,
        sm.joining,
        sm.address,
        sm.status
      );

      // Default granular permissions
      db.prepare(`
        INSERT INTO staff_permissions (
          id, user_id, can_view_customers, can_add_customers, can_edit_customers,
          can_delete_customers, can_add_transactions, can_delete_transactions,
          can_create_invoices, can_record_collections, can_send_reminders,
          can_view_other_salesmen, can_view_reports, can_manage_staff, can_change_settings
        ) VALUES (?, ?, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0)
      `).run('perm_' + sm.id, sm.id);
    }

    // 4. Customers
    const customersData = [
      {
        id: 'cust_rahman',
        name: 'Rahman Khan',
        business_name: 'Rahman Traders',
        mobile: '9845011223',
        email: 'rahmantraders@gmail.com',
        address: 'Shop 12, Market Road, Dadar',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400014',
        gstin: '27AABCR9912C1ZT',
        opening_type: 'owe_business',
        opening_bal: 10000,
        credit_limit: 100000,
        assigned_to: 'usr_sales_arshad',
        notes: 'Regular wholesale buyer of industrial fasteners and wire bundles.',
      },
      {
        id: 'cust_national',
        name: 'Suresh Patel',
        business_name: 'National Hardware Stores',
        mobile: '9845022334',
        email: 'nationalhw@yahoo.com',
        address: '44 Station Road, Chembur',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400071',
        gstin: '27BBBCP1122D1ZA',
        opening_type: 'owe_business',
        opening_bal: 15000,
        credit_limit: 150000,
        assigned_to: 'usr_sales_arshad',
        notes: 'Key partner for power tools and cutting wheels. Usually pays by UPI.',
      },
      {
        id: 'cust_madina',
        name: 'Mohammad Farooq',
        business_name: 'Al-Madina Electricals',
        mobile: '9845033445',
        email: 'madinaelec@gmail.com',
        address: '108 Grant Road, Lamington East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400007',
        gstin: '27CCCFM3344E1ZX',
        opening_type: 'owe_business',
        opening_bal: 8500,
        credit_limit: 80000,
        assigned_to: 'usr_sales_arshad',
        notes: 'Bulk copper wire and switchgear client.',
      },
      {
        id: 'cust_royal',
        name: 'Gopal Shenoy',
        business_name: 'Royal Sanitary & Tiles',
        mobile: '9845044556',
        email: 'royalsanitary@outlook.com',
        address: 'B-7 Link Road, Malad West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400064',
        gstin: '27DDDSG5566F1ZS',
        opening_type: 'owe_business',
        opening_bal: 22000,
        credit_limit: 200000,
        assigned_to: 'usr_sales_rahim',
        notes: 'Pipe fittings and PVC valves. High credit reliability.',
      },
      {
        id: 'cust_evergreen',
        name: 'Anand Shinde',
        business_name: 'Evergreen Agro Corp',
        mobile: '9845055667',
        email: 'evergreenagro@gmail.com',
        address: 'Warehouse 4, APMC Market, Vashi',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        pincode: '400703',
        gstin: '27EEEAS7788G1ZQ',
        opening_type: 'owe_business',
        opening_bal: 35000,
        credit_limit: 250000,
        assigned_to: 'usr_sales_rahim',
        notes: 'Agricultural motors, submersible cables.',
      },
      {
        id: 'cust_bharat',
        name: 'Rameshwar Gupta',
        business_name: 'Bharat Paints & Chemicals',
        mobile: '9845066778',
        email: 'bharatpaints@gmail.com',
        address: '22 GIDC Estate, Ghatkopar',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400086',
        gstin: '27FFFRG9900H1ZO',
        opening_type: 'business_owes', // Advance paid!
        opening_bal: 5000,
        credit_limit: 120000,
        assigned_to: 'usr_sales_rahim',
        notes: 'Supplies primers and coatings. Keeps advance credit with us.',
      },
      {
        id: 'cust_metro',
        name: 'Kavita Deshmukh',
        business_name: 'Metro City Mart',
        mobile: '9845077889',
        email: 'metromart@rediffmail.com',
        address: '77 Central Avenue, Thane',
        city: 'Thane',
        state: 'Maharashtra',
        pincode: '400601',
        gstin: '27GGGKD2233J1ZM',
        opening_type: 'owe_business',
        opening_bal: 12000,
        credit_limit: 90000,
        assigned_to: 'usr_sales_sameer',
        notes: 'Hardware consumables and cleaning chemicals.',
      },
      {
        id: 'cust_delta',
        name: 'Deepak Verma',
        business_name: 'Delta Engineering Works',
        mobile: '9845088990',
        email: 'deltaengg@gmail.com',
        address: 'C-18 Wagle Estate, Thane',
        city: 'Thane',
        state: 'Maharashtra',
        pincode: '400604',
        gstin: '27HHHDV4455K1ZK',
        opening_type: 'owe_business',
        opening_bal: 18000,
        credit_limit: 150000,
        assigned_to: null, // Unassigned! Owner can assign
        notes: 'Heavy machinery spare parts client.',
      },
    ];

    for (const c of customersData) {
      db.prepare(`
        INSERT INTO customers (
          id, business_id, name, business_name, mobile, email, address, city, state, pincode,
          gstin, opening_balance_type, opening_balance, current_balance, credit_limit, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).run(
        c.id,
        bizId,
        c.name,
        c.business_name,
        c.mobile,
        c.email,
        c.address,
        c.city,
        c.state,
        c.pincode,
        c.gstin,
        c.opening_type,
        c.opening_bal,
        c.credit_limit,
        c.notes,
        ownerId
      );

      if (c.assigned_to) {
        db.prepare(`
          INSERT INTO customer_assignments (
            id, business_id, customer_id, salesman_id, assigned_by, status, notes
          ) VALUES (?, ?, ?, ?, ?, 'active', 'Initial assignment by owner')
        `).run(
          'asgn_' + c.id,
          bizId,
          c.id,
          c.assigned_to,
          ownerId
        );
      }
    }

    // 5. Transactions for Rahman Traders & others (Oct 2026)
    const transactions = [
      // Rahman Traders transactions
      {
        id: 'tx_01',
        cust: 'cust_rahman',
        salesman: 'usr_sales_arshad',
        type: 'GAVE',
        amount: 5000,
        date: '2026-10-15',
        time: '11:30:00',
        desc: 'Supplied 20 boxes high-tensile hex bolts & washers',
        method: 'Cash',
        ref: 'DC-9081',
      },
      {
        id: 'tx_02',
        cust: 'cust_rahman',
        salesman: 'usr_sales_arshad',
        type: 'RECEIVED',
        amount: 3000,
        date: '2026-10-18',
        time: '15:45:00',
        desc: 'Part payment collected at shop visit',
        method: 'Cash',
        ref: 'CSH-1082',
      },
      {
        id: 'tx_03',
        cust: 'cust_rahman',
        salesman: 'usr_sales_arshad',
        type: 'GAVE',
        amount: 7500,
        date: '2026-10-20',
        time: '14:20:00',
        desc: 'Supplied 5 sets Bosch drill bits & safety helmets',
        method: 'Other',
        ref: 'INV-2026-001',
      },
      {
        id: 'tx_04',
        cust: 'cust_rahman',
        salesman: 'usr_sales_arshad',
        type: 'RECEIVED',
        amount: 2000,
        date: '2026-10-23',
        time: '10:15:00',
        desc: 'Collection via GooglePay UPI',
        method: 'UPI',
        ref: 'UPI-992019284',
      },

      // National Hardware transactions
      {
        id: 'tx_05',
        cust: 'cust_national',
        salesman: 'usr_sales_arshad',
        type: 'GAVE',
        amount: 18000,
        date: '2026-10-16',
        time: '12:00:00',
        desc: 'Delivered 10 units industrial angle grinders',
        method: 'Other',
        ref: 'INV-2026-002',
      },
      {
        id: 'tx_06',
        cust: 'cust_national',
        salesman: 'usr_sales_arshad',
        type: 'RECEIVED',
        amount: 15000,
        date: '2026-10-21',
        time: '16:30:00',
        desc: 'Cheque received and cleared',
        method: 'Cheque',
        ref: 'CHQ-882910',
      },

      // Al-Madina transactions
      {
        id: 'tx_07',
        cust: 'cust_madina',
        salesman: 'usr_sales_arshad',
        type: 'RECEIVED',
        amount: 5000,
        date: '2026-10-19',
        time: '11:15:00',
        desc: 'Cash collection by Arshad',
        method: 'Cash',
        ref: 'CSH-1090',
      },
      {
        id: 'tx_08',
        cust: 'cust_madina',
        salesman: 'usr_sales_arshad',
        type: 'GAVE',
        amount: 12000,
        date: '2026-10-22',
        time: '17:00:00',
        desc: 'Heavy duty insulated copper cables 100m roll',
        method: 'Other',
        ref: 'INV-2026-003',
      },

      // Royal Sanitary (Rahim)
      {
        id: 'tx_09',
        cust: 'cust_royal',
        salesman: 'usr_sales_rahim',
        type: 'RECEIVED',
        amount: 12000,
        date: '2026-10-17',
        time: '13:00:00',
        desc: 'NEFT online transfer',
        method: 'Bank Transfer',
        ref: 'NEFT-550912',
      },
      {
        id: 'tx_10',
        cust: 'cust_royal',
        salesman: 'usr_sales_rahim',
        type: 'GAVE',
        amount: 15000,
        date: '2026-10-22',
        time: '15:10:00',
        desc: 'Brass valve fittings & CPVC pipes lot',
        method: 'Other',
        ref: 'INV-2026-004',
      },

      // Evergreen Agro (Rahim)
      {
        id: 'tx_11',
        cust: 'cust_evergreen',
        salesman: 'usr_sales_rahim',
        type: 'RECEIVED',
        amount: 20000,
        date: '2026-10-20',
        time: '16:00:00',
        desc: 'Cash collected by Rahim',
        method: 'Cash',
        ref: 'CSH-2011',
      },

      // Metro Mart (Sameer)
      {
        id: 'tx_12',
        cust: 'cust_metro',
        salesman: 'usr_sales_sameer',
        type: 'RECEIVED',
        amount: 6000,
        date: '2026-10-21',
        time: '12:30:00',
        desc: 'UPI PhonePe payment',
        method: 'UPI',
        ref: 'UPI-77182903',
      },
    ];

    for (const t of transactions) {
      db.prepare(`
        INSERT INTO transactions (
          id, business_id, customer_id, salesman_id, type, amount, date, time,
          description, payment_method, reference_number, running_balance, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(
        t.id,
        bizId,
        t.cust,
        t.salesman,
        t.type,
        t.amount,
        t.date,
        t.time,
        t.desc,
        t.method,
        t.ref,
        t.salesman
      );
    }

    // 6. Collections (For the Collection Management & Cash Settlement feature!)
    // Cash collection by Arshad (₹20,000 pending cash settlement with owner)
    db.prepare(`
      INSERT INTO collections (
        id, business_id, customer_id, salesman_id, transaction_id, amount,
        collection_date, payment_method, reference_number, status, notes, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'col_01',
      bizId,
      'cust_rahman',
      'usr_sales_arshad',
      'tx_02',
      20000,
      '2026-10-23',
      'Cash',
      'CSH-ARSH-101',
      'submitted', // Submitted to owner! Owner can click "Settle Cash"
      'Cash collected from Rahman Traders during morning round. Handed over in packet.',
      '2026-10-23 11:00:00'
    );

    // Verified collection
    db.prepare(`
      INSERT INTO collections (
        id, business_id, customer_id, salesman_id, transaction_id, amount,
        collection_date, payment_method, reference_number, status, notes, submitted_at, verified_by, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'col_02',
      bizId,
      'cust_national',
      'usr_sales_arshad',
      'tx_06',
      15000,
      '2026-10-21',
      'Cheque',
      'CHQ-882910',
      'verified',
      'Cheque cleared in HDFC account.',
      '2026-10-21 16:30:00',
      ownerId,
      '2026-10-22 09:30:00'
    );

    // Pending collection by Rahim
    db.prepare(`
      INSERT INTO collections (
        id, business_id, customer_id, salesman_id, transaction_id, amount,
        collection_date, payment_method, reference_number, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'col_03',
      bizId,
      'cust_evergreen',
      'usr_sales_rahim',
      'tx_11',
      20000,
      '2026-10-22',
      'Cash',
      'CSH-RAH-202',
      'pending',
      'Cash collected at Vashi mandi. Salesman yet to submit.',
    );

    // 7. Invoices
    const inv1 = 'inv_2026_01';
    db.prepare(`
      INSERT INTO invoices (
        id, business_id, customer_id, salesman_id, invoice_number, invoice_date, due_date,
        subtotal, discount_amount, tax_amount, total_amount, paid_amount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inv1,
      bizId,
      'cust_rahman',
      'usr_sales_arshad',
      'INV-2026-001',
      '2026-10-20',
      '2026-11-05',
      7142.86,
      0,
      357.14,
      7500,
      2000,
      'partially_paid',
      'Goods once sold will only be replaced if defective within 7 days.'
    );

    db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('item_01', inv1, 'Bosch High-Impact Drill Bit Set (13 Pcs)', 'Industrial tungsten carbide tipped', 5, 1200, 0, 5, 6300);

    db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('item_02', inv1, 'Karam Safety Hard Hat Helmet (Yellow)', 'ISI certified high-density polyethylene', 10, 114.28, 0, 5, 1200);

    // 8. Payment Receipts
    db.prepare(`
      INSERT INTO receipts (
        id, business_id, customer_id, salesman_id, transaction_id, collection_id,
        receipt_number, receipt_date, amount, payment_method, reference_number, remaining_balance, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'rec_01',
      bizId,
      'cust_rahman',
      'usr_sales_arshad',
      'tx_04',
      'col_01',
      'REC-2026-001',
      '2026-10-23',
      2000,
      'UPI',
      'UPI-992019284',
      17500,
      'Official receipt generated upon digital payment verification.'
    );

    // 9. Payment Reminders log
    db.prepare(`
      INSERT INTO reminders (
        id, business_id, customer_id, salesman_id, reminder_type, amount_due, message, status, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'rem_01',
      bizId,
      'cust_rahman',
      'usr_sales_arshad',
      'whatsapp',
      17500,
      'Dear Rahman Traders, your balance of ₹17,500 with Apex Supplies is pending. Please pay via UPI apexsupplies@hdfcbank.',
      'delivered',
      '2026-10-22 09:15:00'
    );

    // 10. Audit Logs
    const auditEntries = [
      {
        user: ownerId,
        name: 'Vikram Malhotra (Owner)',
        action: 'System Initialized',
        type: 'Business',
        id: bizId,
        details: 'Business created and base ledger initialized.',
      },
      {
        user: ownerId,
        name: 'Vikram Malhotra (Owner)',
        action: 'Salesman Added',
        type: 'Salesman',
        id: 'usr_sales_arshad',
        details: 'Created account for Arshad Khan (EMP-101).',
      },
      {
        user: 'usr_sales_arshad',
        name: 'Arshad Khan (Salesman)',
        action: 'Customer Assigned',
        type: 'Customer',
        id: 'cust_rahman',
        details: 'Assigned customer Rahman Traders to Arshad Khan.',
      },
      {
        user: 'usr_sales_arshad',
        name: 'Arshad Khan (Salesman)',
        action: 'Payment Collected',
        type: 'Transaction',
        id: 'tx_04',
        details: 'Recorded ₹2,000 collection via UPI from Rahman Traders.',
      },
      {
        user: 'usr_sales_arshad',
        name: 'Arshad Khan (Salesman)',
        action: 'Cash Submitted',
        type: 'Collection',
        id: 'col_01',
        details: 'Submitted ₹20,000 cash collection to Owner for settlement.',
      },
    ];

    for (const a of auditEntries) {
      db.prepare(`
        INSERT INTO audit_logs (id, business_id, user_id, user_name, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, '127.0.0.1')
      `).run(
        'aud_' + Math.random().toString(36).substring(2, 9),
        bizId,
        a.user,
        a.name,
        a.action,
        a.type,
        a.id,
        a.details
      );
    }

    // 11. Notifications
    db.prepare(`
      INSERT INTO notifications (id, business_id, user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'notif_01',
      bizId,
      ownerId,
      'Cash Settlement Pending',
      'Arshad Khan has submitted ₹20,000 in cash collection awaiting your verification and settlement.',
      'cash_submission',
      '/collections'
    );

    db.prepare(`
      INSERT INTO notifications (id, business_id, user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'notif_02',
      bizId,
      'usr_sales_arshad',
      'Customer Assigned',
      'Rahman Traders has been assigned to your territory.',
      'assignment',
      '/customers'
    );
  });

  seedTx();

  // Recalculate balances for all customers to ensure exact mathematical precision
  const allCustomers = db.prepare(`SELECT id FROM customers`).all();
  for (const c of allCustomers) {
    recalculateCustomerLedger(c.id);
  }

  console.log('✅ Initial seed data created and all ledger balances accurately calculated!');
}

if (require.main === module) {
  const { initializeDatabase } = require('../config/database');
  initializeDatabase();
  seedDatabase(true);
}

module.exports = { seedDatabase };
