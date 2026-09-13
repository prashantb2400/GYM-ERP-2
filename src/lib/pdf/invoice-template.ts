import { InvoiceData } from './types';

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const { gym, member, items, invoiceNo, date, dueDate, subtotal, cgstAmount, sgstAmount, totalAmount, status, amountInWords } = data;

  const safeGym = {
    name: escapeHtml(gym.name),
    address: escapeHtml(gym.address),
    phone: escapeHtml(gym.phone),
    email: escapeHtml(gym.email),
    gstin: escapeHtml(gym.gstin),
    pan: escapeHtml(gym.pan),
    upiId: gym.upiId,
  };

  const safeMember = {
    id: escapeHtml(member.id),
    name: escapeHtml(member.name),
    phone: escapeHtml(member.phone),
    email: escapeHtml(member.email),
    address: escapeHtml(member.address),
  };

  const safeInvoiceNo = escapeHtml(invoiceNo);
  const safeAmountInWords = escapeHtml(amountInWords);
  const safeStatus = escapeHtml(status);

  const safeItems = items.map(item => ({
    description: escapeHtml(item.description),
    hsnCode: escapeHtml(item.hsnCode),
    amount: item.amount,
  }));

  const upiQrUrl = safeGym.upiId ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=${safeGym.upiId}&am=${totalAmount}&tn=Invoice${invoiceNo}`)}` : '';

  const statusColors = {
    PAID: { bg: '#dcfce7', text: '#166534' },
    PENDING: { bg: '#fef9c3', text: '#854d0e' },
    OVERDUE: { bg: '#fee2e2', text: '#991b1b' },
    CANCELLED: { bg: '#f3f4f6', text: '#374151' },
    REFUNDED: { bg: '#e0e7ff', text: '#3730a3' },
  };

  const statusStyle = statusColors[status] || statusColors.PENDING;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https:;">
  <title>Invoice - ${safeInvoiceNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #111827;
      --border: #e5e7eb;
      --text: #374151;
      --text-light: #6b7280;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      color: var(--text);
      line-height: 1.5;
      background-color: #f9fafb;
      padding: 2rem;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--border);
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }

    .gym-info h1 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 3rem;
      letter-spacing: 1px;
      color: var(--primary);
      margin-bottom: 0.5rem;
      line-height: 1;
    }

    .gym-details {
      font-size: 0.875rem;
      color: var(--text-light);
    }

    .gym-details p {
      margin-bottom: 0.25rem;
    }

    .invoice-title {
      text-align: right;
    }

    .invoice-title h2 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 2.5rem;
      color: var(--primary);
      letter-spacing: 1px;
      margin-bottom: 0.5rem;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background-color: ${statusStyle.bg};
      color: ${statusStyle.text};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .meta-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2rem;
    }

    .bill-to h3 {
      font-size: 0.875rem;
      text-transform: uppercase;
      color: var(--text-light);
      font-weight: 600;
      margin-bottom: 0.5rem;
      letter-spacing: 0.05em;
    }

    .bill-to p {
      font-size: 0.95rem;
      color: var(--primary);
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    
    .bill-to .light-text {
      font-weight: 400;
      color: var(--text-light);
      font-size: 0.875rem;
    }

    .invoice-details table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
      font-size: 0.875rem;
    }
    
    .invoice-details td {
      padding: 0.25rem 0;
    }
    
    .invoice-details td:first-child {
      color: var(--text-light);
      padding-right: 1rem;
    }
    
    .invoice-details td:last-child {
      font-weight: 500;
      color: var(--primary);
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
    }

    .items-table th {
      background-color: #f3f4f6;
      text-align: left;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-light);
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .items-table th.right {
      text-align: right;
    }

    .items-table td {
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
      color: var(--primary);
    }

    .items-table td.right {
      text-align: right;
    }

    .summary-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 3rem;
    }

    .payment-info {
      width: 50%;
    }

    .payment-info h4 {
      font-size: 0.875rem;
      color: var(--text-light);
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .amount-words {
      font-size: 0.875rem;
      font-style: italic;
      color: var(--text-light);
      margin-bottom: 1rem;
    }

    .qr-container {
      margin-top: 1rem;
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      display: inline-block;
    }
    
    .qr-container img {
      display: block;
      width: 100px;
      height: 100px;
    }
    
    .qr-text {
      text-align: center;
      font-size: 0.75rem;
      margin-top: 0.5rem;
      color: var(--text-light);
    }

    .totals {
      width: 40%;
    }

    .totals table {
      width: 100%;
      border-collapse: collapse;
    }

    .totals td {
      padding: 0.5rem 0;
      font-size: 0.875rem;
    }

    .totals td.right {
      text-align: right;
      font-weight: 500;
    }

    .totals tr.border-top td {
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
    }

    .totals tr.grand-total td {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--primary);
      padding-top: 1rem;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
    }

    .terms h4 {
      font-size: 0.75rem;
      color: var(--text-light);
      text-transform: uppercase;
      margin-bottom: 0.25rem;
    }

    .terms p {
      font-size: 0.75rem;
      color: var(--text-light);
    }

    .signatory {
      text-align: center;
    }

    .signatory-line {
      width: 200px;
      border-bottom: 1px solid var(--primary);
      margin-bottom: 0.5rem;
    }

    .signatory p {
      font-size: 0.75rem;
      color: var(--text-light);
    }

    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      /* Ensure colors are printed */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="gym-info">
        <h1>${safeGym.name}</h1>
        <div class="gym-details">
          <p>${safeGym.address}</p>
          <p>Phone: ${safeGym.phone} | Email: ${safeGym.email}</p>
          ${safeGym.gstin ? `<p><strong>GSTIN:</strong> ${safeGym.gstin}</p>` : ''}
          ${safeGym.pan ? `<p><strong>PAN:</strong> ${safeGym.pan}</p>` : ''}
        </div>
      </div>
      <div class="invoice-title">
        <h2>TAX INVOICE</h2>
        <div class="status-badge">${safeStatus}</div>
      </div>
    </div>

    <div class="meta-info">
      <div class="bill-to">
        <h3>Bill To:</h3>
        <p>${safeMember.name}</p>
        <p class="light-text">Member ID: ${safeMember.id}</p>
        <p class="light-text">${safeMember.phone}</p>
        ${safeMember.email ? `<p class="light-text">${safeMember.email}</p>` : ''}
        ${safeMember.address ? `<p class="light-text">${safeMember.address}</p>` : ''}
      </div>
      <div class="invoice-details">
        <table>
          <tr>
            <td>Invoice No:</td>
            <td>${safeInvoiceNo}</td>
          </tr>
          <tr>
            <td>Date:</td>
            <td>${new Date(date).toLocaleDateString()}</td>
          </tr>
          ${dueDate ? `
          <tr>
            <td>Due Date:</td>
            <td>${new Date(dueDate).toLocaleDateString()}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>HSN/SAC</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${safeItems.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.hsnCode || '-'}</td>
          <td class="right">₹${item.amount.toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="payment-info">
        <h4>Amount in Words</h4>
        <p class="amount-words">${safeAmountInWords}</p>
        
        ${upiQrUrl && status !== 'PAID' ? `
        <div class="qr-container">
          <img src="${upiQrUrl}" alt="UPI QR Code" />
          <div class="qr-text">Scan to Pay</div>
        </div>
        ` : ''}
      </div>

      <div class="totals">
        <table>
          <tr>
            <td>Subtotal</td>
            <td class="right">₹${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>CGST (9%)</td>
            <td class="right">₹${cgstAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>SGST (9%)</td>
            <td class="right">₹${sgstAmount.toFixed(2)}</td>
          </tr>
          <tr class="border-top grand-total">
            <td>Grand Total</td>
            <td class="right">₹${totalAmount.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="footer">
      <div class="terms">
        <h4>Terms & Conditions</h4>
        <p>1. All payments are non-refundable.</p>
        <p>2. Subject to local jurisdiction.</p>
      </div>
      <div class="signatory">
        <div class="signatory-line"></div>
        <p>Authorized Signatory</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
