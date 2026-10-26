import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './utils';

// Generate professional PDF receipt
export function generateReceiptPDF(receipt, business) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const currency = business?.currency_symbol || 'Rs.';

  // Header banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 148, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(business?.name || 'Grihalakshmi Food Products', 12, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(business?.tagline || 'Official Payment Acknowledgement', 12, 18);
  doc.text(`Phone: ${business?.phone || ''} | Email: ${business?.email || ''}`, 12, 23);

  // Receipt title badge
  doc.setTextColor(16, 185, 129); // Emerald
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', 12, 38);

  // Metadata block
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: ${receipt.receipt_number}`, 12, 45);
  doc.text(`Date: ${formatDate(receipt.receipt_date)}`, 12, 50);
  doc.text(`Payment Mode: ${receipt.payment_method}`, 12, 55);
  if (receipt.reference_number) {
    doc.text(`Ref / Txn No: ${receipt.reference_number}`, 12, 60);
  }

  // Customer block
  doc.text(`Received From:`, 85, 45);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.customer_name || 'Customer', 85, 50);
  if (receipt.customer_biz) {
    doc.text(receipt.customer_biz, 85, 55);
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Mobile: ${receipt.customer_mobile || '-'}`, 85, 60);

  // Highlight Box for Amount
  doc.setFillColor(240, 253, 244); // Green-50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(12, 70, 124, 25, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52);
  doc.text('Amount Received:', 18, 79);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${currency} ${Number(receipt.amount).toLocaleString('en-IN')}`, 18, 89);

  // Balance status
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Remaining Balance: ${currency} ${Number(receipt.remaining_balance).toLocaleString('en-IN')}`, 18, 104);
  if (receipt.salesman_name) {
    doc.text(`Collected by Staff: ${receipt.salesman_name}`, 18, 109);
  }

  // Footer note
  doc.setDrawColor(226, 232, 240);
  doc.line(12, 125, 136, 125);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated digital receipt and requires no physical signature.', 12, 132);
  doc.text(`Powered by Grihalakshmi Food Products — Intelligent Business Ledger`, 12, 137);

  doc.save(`Receipt-${receipt.receipt_number}.pdf`);
}

// Generate customer / supplier ledger statement PDF
export function generateStatementPDF(statementData, business) {
  const party = statementData.customer || statementData.party || statementData.supplier || {};
  const period = statementData.period || { fromDate: new Date().toISOString().slice(0, 10), toDate: new Date().toISOString().slice(0, 10) };
  const openingBalance = statementData.openingBalance || 0;
  const totalGave = statementData.totalGave || 0;
  const totalReceived = statementData.totalReceived || 0;
  const closingBalance = statementData.closingBalance !== undefined ? statementData.closingBalance : (party.current_balance || 0);
  const transactions = statementData.transactions || [];

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = business?.currency_symbol || 'Rs.';
  const isSupplier = statementData.partyType === 'supplier' || party.type === 'supplier';

  // Header
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(business?.name || 'Grihalakshmi Food Products', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(business?.address || '', 14, 20);
  doc.text(`GSTIN: ${business?.gstin || '-'} | Phone: ${business?.phone || ''} | UPI: ${business?.upi_id || ''}`, 14, 26);

  // Statement banner
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(isSupplier ? 'SUPPLIER LEDGER STATEMENT' : 'CUSTOMER LEDGER STATEMENT', 14, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const fromText = period.fromDate ? formatDate(period.fromDate) : 'Start';
  const toText = period.toDate ? formatDate(period.toDate) : formatDate(new Date());
  doc.text(`Statement Period: ${fromText} to ${toText}`, 14, 48);

  // Party Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 52, 182, 22, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${party.name || 'Account'} ${party.business_name ? `(${party.business_name})` : ''}`, 18, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Mobile: ${party.mobile || '-'} | City: ${party.city || '-'} | GSTIN: ${party.gstin || '-'}`, 18, 67);

  // Summary Metrics Table
  autoTable(doc, {
    startY: 78,
    theme: 'grid',
    head: [['Opening Balance', isSupplier ? 'Purchases (Cr)' : 'Total Sales (Given/Dr)', isSupplier ? 'Payments (Dr)' : 'Total Received (Cr)', 'Net Closing Balance']],
    body: [[
      `${currency} ${Number(openingBalance).toLocaleString('en-IN')}`,
      `${currency} ${Number(totalGave).toLocaleString('en-IN')}`,
      `${currency} ${Number(totalReceived).toLocaleString('en-IN')}`,
      `${currency} ${Number(closingBalance).toLocaleString('en-IN')}`,
    ]],
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 10 },
  });

  // Transactions Table
  const tableRows = transactions.map((t) => [
    formatDate(t.date),
    t.description || (t.type === 'GAVE' ? (isSupplier ? 'Payment Made' : 'Goods Supplied') : (isSupplier ? 'Goods Received' : 'Payment Received')),
    t.type === 'GAVE' ? `${currency} ${Number(t.amount).toLocaleString('en-IN')}` : '-',
    t.type === 'RECEIVED' ? `${currency} ${Number(t.amount).toLocaleString('en-IN')}` : '-',
    `${currency} ${Number(t.running_balance).toLocaleString('en-IN')}`,
    t.payment_method || '-',
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Date', 'Description / Ref', isSupplier ? 'You Paid (Dr)' : 'You Gave (Dr)', isSupplier ? 'Received Goods (Cr)' : 'You Received (Cr)', 'Balance', 'Method']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      2: { textColor: [225, 29, 72], fontStyle: 'bold' },
      3: { textColor: [16, 185, 129], fontStyle: 'bold' },
      4: { fontStyle: 'bold' },
    },
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This statement reflects transactions recorded in the Grihalakshmi Food Products digital ledger.', 14, Math.min(finalY, 280));

  doc.save(`Statement-${(party.name || 'Account').replace(/\s+/g, '_')}-${formatDate(new Date())}.pdf`);
}

// Generate Tax Invoice PDF
export function generateInvoicePDF(invoice, items, business) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = business?.currency_symbol || 'Rs.';

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(business?.name || 'Grihalakshmi Food Products', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(business?.address || '', 14, 20);
  doc.text(`GSTIN: ${business?.gstin || '-'} | Phone: ${business?.phone || ''}`, 14, 26);

  // Invoice title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', 14, 42);

  // Invoice Details & Customer Info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Invoice No: ${invoice.invoice_number}`, 14, 50);
  doc.text(`Invoice Date: ${formatDate(invoice.invoice_date)}`, 14, 55);
  doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 14, 60);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 14, 65);

  doc.text('Bill To:', 120, 50);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${invoice.customer_name}`, 120, 55);
  if (invoice.customer_biz) {
    doc.text(invoice.customer_biz, 120, 60);
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Mobile: ${invoice.customer_mobile || '-'}`, 120, 65);
  doc.text(`GSTIN: ${invoice.customer_gstin || '-'}`, 120, 70);

  // Items table
  const itemRows = items.map((it, idx) => [
    idx + 1,
    it.item_name + (it.description ? `\n${it.description}` : ''),
    it.quantity,
    `${currency} ${Number(it.unit_price).toLocaleString('en-IN')}`,
    `${it.discount_percent}%`,
    `${it.tax_percent}%`,
    `${currency} ${Number(it.total_price).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: 78,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Disc %', 'Tax %', 'Total Amount']],
    body: itemRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    bodyStyles: { fontSize: 8.5 },
  });

  // Totals Box
  const finalY = doc.lastAutoTable.finalY + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Subtotal:`, 124, finalY + 8);
  doc.text(`${currency} ${Number(invoice.subtotal).toLocaleString('en-IN')}`, 165, finalY + 8);

  doc.text(`Total Tax:`, 124, finalY + 15);
  doc.text(`${currency} ${Number(invoice.tax_amount).toLocaleString('en-IN')}`, 165, finalY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Grand Total:`, 124, finalY + 25);
  doc.text(`${currency} ${Number(invoice.total_amount).toLocaleString('en-IN')}`, 165, finalY + 25);

  // Bank & UPI details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Payment Information:', 14, finalY + 8);
  doc.text(`UPI ID: ${business?.upi_id || 'Not configured'}`, 14, finalY + 14);
  doc.text(`Bank: ${business?.bank_name || ''} | A/C: ${business?.bank_account_no || ''}`, 14, finalY + 20);
  doc.text(`IFSC: ${business?.bank_ifsc || ''}`, 14, finalY + 26);

  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
}

// Generate Business Summary / Reports PDF
export function generateBusinessReportPDF(reportData, business) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const currency = business?.currency_symbol || 'Rs.';

  // Header banner
  doc.setFillColor(27, 94, 32); // #1b5e20 Forest Green
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(business?.name || 'Grihalakshmi Food Products', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(business?.tagline || 'Spices, Pure Curry Powders & Millets Ledger', 14, 19);
  doc.text(`Phone: ${business?.phone || '-'} | GSTIN: ${business?.gstin || '-'} | Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 25);

  // Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(reportData.title || 'BUSINESS ANALYTICS & RECOVERY REPORT', 14, 40);

  // Key Metrics Grid
  autoTable(doc, {
    startY: 46,
    theme: 'grid',
    head: [['Total Receivable (Len)', 'Total Payable (Den)', 'Net Working Balance', 'Active Accounts']],
    body: [[
      `${currency} ${Number(reportData.totalReceivable || 0).toLocaleString('en-IN')}`,
      `${currency} ${Number(reportData.totalPayable || 0).toLocaleString('en-IN')}`,
      `${currency} ${Number((reportData.totalReceivable || 0) - (reportData.totalPayable || 0)).toLocaleString('en-IN')}`,
      `${reportData.totalAccounts || 0}`
    ]],
    headStyles: { fillColor: [27, 94, 32], textColor: 255, halign: 'center', fontStyle: 'bold' },
    bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 10 },
  });

  // Table of Balances or Accounts
  if (reportData.items && reportData.items.length > 0) {
    const tableRows = reportData.items.map((it, idx) => [
      idx + 1,
      it.name || '-',
      it.mobile || '-',
      it.city || it.address || '-',
      it.status || (it.current_balance > 0 ? 'You Will Get' : it.current_balance < 0 ? 'You Will Give' : 'Settled'),
      `${currency} ${Math.abs(Number(it.current_balance || 0)).toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['#', 'Account Name', 'Mobile', 'Location', 'Status', 'Balance']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
    });
  }

  // Footer
  const finalY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential internal report — Grihalakshmi Food Products Enterprise.', 14, Math.min(finalY, 280));

  doc.save(`${(reportData.filename || 'Business-Report').replace(/\s+/g, '_')}-${formatDate(new Date())}.pdf`);
}

// Generate Field Staff Daily Handover Settlement PDF
export function generateDailyHandoverPDF(handoverData, business) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });
  const currency = business?.currency_symbol || 'Rs.';

  doc.setFillColor(27, 94, 32);
  doc.rect(0, 0, 148, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(business?.name || 'Grihalakshmi Food Products', 12, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Field Sales Staff — Daily Collection & Cash Handover Settlement', 12, 17);
  doc.text(`Settlement Date: ${formatDate(new Date())}`, 12, 22);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DAILY HANDOVER SLIP', 12, 34);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Salesman / Collector: ${handoverData.salesmanName || 'Field Executive'}`, 12, 41);
  doc.text(`Total Collections Recorded: ${handoverData.collectionsCount || 0}`, 12, 47);

  autoTable(doc, {
    startY: 53,
    theme: 'grid',
    head: [['Payment Channel', 'Amount Collected']],
    body: [
      ['Physical Cash in Hand', `${currency} ${Number(handoverData.cashAmount || 0).toLocaleString('en-IN')}`],
      ['Digital / UPI Online', `${currency} ${Number(handoverData.upiAmount || 0).toLocaleString('en-IN')}`],
      ['Total Recovered Today', `${currency} ${Number(handoverData.totalAmount || 0).toLocaleString('en-IN')}`]
    ],
    headStyles: { fillColor: [27, 94, 32], textColor: 255 },
    bodyStyles: { fontStyle: 'bold' }
  });

  const finalY = doc.lastAutoTable.finalY + 16;
  doc.setFontSize(8);
  doc.text('Salesman Signature: __________________', 12, Math.min(finalY, 195));
  doc.text('Admin Signature: __________________', 80, Math.min(finalY, 195));

  doc.save(`Handover-${(handoverData.salesmanName || 'Staff').replace(/\s+/g, '_')}-${formatDate(new Date())}.pdf`);
}

// Export statement transactions directly to CSV
export function exportStatementToCSV(statementData) {
  const party = statementData.customer || statementData.party || statementData.supplier || {};
  const transactions = statementData.transactions || [];
  const headers = ['Date', 'Description', 'You Gave / Dr', 'You Received / Cr', 'Running Balance', 'Payment Method', 'Reference'];
  const rows = transactions.map(t => [
    `"${formatDate(t.date)}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.type === 'GAVE' ? t.amount : '',
    t.type === 'RECEIVED' ? t.amount : '',
    t.running_balance,
    `"${t.payment_method || ''}"`,
    `"${t.reference_number || ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Statement-${(party.name || 'Account').replace(/\s+/g, '_')}-${formatDate(new Date())}.csv`;
  a.click();
}
