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
  doc.text(business?.name || 'KhataFlow Business', 12, 12);

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
  doc.text(`Powered by KhataFlow — Intelligent Business Ledger`, 12, 137);

  doc.save(`Receipt-${receipt.receipt_number}.pdf`);
}

// Generate customer ledger statement PDF
export function generateStatementPDF(statementData, business) {
  const { customer, period, openingBalance, totalGave, totalReceived, closingBalance, transactions } = statementData;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = business?.currency_symbol || 'Rs.';

  // Header
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(business?.name || 'KhataFlow Business', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(business?.address || '', 14, 20);
  doc.text(`GSTIN: ${business?.gstin || '-'} | Phone: ${business?.phone || ''} | UPI: ${business?.upi_id || ''}`, 14, 26);

  // Statement banner
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER LEDGER STATEMENT', 14, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Statement Period: ${formatDate(period.fromDate)} to ${formatDate(period.toDate)}`, 14, 48);

  // Customer Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 52, 182, 22, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${customer.name} ${customer.business_name ? `(${customer.business_name})` : ''}`, 18, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Mobile: ${customer.mobile || '-'} | City: ${customer.city || '-'} | GSTIN: ${customer.gstin || '-'}`, 18, 67);

  // Summary Metrics Table
  autoTable(doc, {
    startY: 78,
    theme: 'grid',
    head: [['Opening Balance', 'Total Sales (Given)', 'Total Payments (Received)', 'Net Closing Balance']],
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
    t.description || (t.type === 'GAVE' ? 'Goods supplied' : 'Payment received'),
    t.type === 'GAVE' ? `${currency} ${Number(t.amount).toLocaleString('en-IN')}` : '-',
    t.type === 'RECEIVED' ? `${currency} ${Number(t.amount).toLocaleString('en-IN')}` : '-',
    `${currency} ${Number(t.running_balance).toLocaleString('en-IN')}`,
    t.payment_method || '-',
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Date', 'Description', 'You Gave (Dr)', 'You Received (Cr)', 'Balance', 'Method']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      2: { textColor: [225, 29, 72], fontStyle: 'bold' }, // Gave (Rose)
      3: { textColor: [16, 185, 129], fontStyle: 'bold' }, // Received (Emerald)
      4: { fontStyle: 'bold' },
    },
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This statement reflects transactions recorded in the business digital ledger.', 14, Math.min(finalY, 280));

  doc.save(`Statement-${customer.name.replace(/\s+/g, '_')}-${formatDate(new Date())}.pdf`);
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
  doc.text(business?.name || 'KhataFlow Business', 14, 14);

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
