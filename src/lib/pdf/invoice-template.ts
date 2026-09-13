import { InvoiceData } from './types';
import { numberToIndianWords } from '@/lib/utils/number-to-words';

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
  const {
    gym,
    member,
    items,
    invoiceNo,
    date,
    dueDate,
    subtotal,
    discountAmount = 0,
    cgstAmount = 0,
    sgstAmount = 0,
    totalAmount,
    amountPaid = 0,
    amountDue = 0,
    paymentMode,
    cashierName,
    status,
    amountInWords,
  } = data;

  const resolvedGymName = (gym.name?.trim() && gym.name !== 'Gym Center')
    ? gym.name.trim()
    : (gym.business_name?.trim() || 'Fitness Club');

  const safeGym = {
    name: escapeHtml(resolvedGymName),
    tagline: escapeHtml(gym.tagline || ''),
    branchName: escapeHtml(gym.branchName || ''),
    address: escapeHtml(gym.address || 'Address not provided'),
    phone: escapeHtml(gym.phone || 'N/A'),
    email: escapeHtml(gym.email || 'N/A'),
    gstin: escapeHtml(gym.gstin || ''),
    pan: escapeHtml(gym.pan || ''),
    upiId: gym.upiId ? gym.upiId.trim() : '',
  };

  const safeMember = {
    id: escapeHtml(member.id || 'N/A'),
    memberCode: escapeHtml(member.memberCode || member.id?.slice(0, 8) || 'N/A'),
    name: escapeHtml(member.name || 'Walk-in Member'),
    phone: escapeHtml(member.phone || 'N/A'),
    email: escapeHtml(member.email || ''),
    address: escapeHtml(member.address || ''),
  };

  const safeInvoiceNo = escapeHtml(invoiceNo);
  const safeDate = date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  const safeDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const safePaymentMode = escapeHtml(paymentMode || 'Cash');
  const safeCashier = escapeHtml(cashierName || 'Front Desk Staff');
  const safeStatus = escapeHtml(status || (amountDue <= 0 ? 'PAID' : 'PENDING'));

  const words = amountInWords && amountInWords !== 'Amount generated electronically'
    ? amountInWords
    : numberToIndianWords(totalAmount);
  const safeAmountInWords = escapeHtml(words);

  const safeItems = items.map(item => ({
    description: escapeHtml(item.description || 'Gym Membership & Services'),
    hsnCode: escapeHtml(item.hsnCode || '999723'), // SAC 999723: Physical well-being & fitness center services
    qty: item.qty || 1,
    rate: item.rate !== undefined ? item.rate : item.amount,
    amount: item.amount,
  }));

  const isPaid = status === 'PAID' || amountDue <= 0;
  const payableAmount = amountDue > 0 ? amountDue : totalAmount;

  // Real NPCI dynamic UPI QR Code generation
  let upiQrUrl = '';
  let upiPayload = '';
  if (safeGym.upiId && !isPaid) {
    upiPayload = `upi://pay?pa=${encodeURIComponent(safeGym.upiId)}&pn=${encodeURIComponent(safeGym.name)}&am=${payableAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Inv-${invoiceNo}`)}`;
    upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(upiPayload)}`;
  }

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    PAID: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    PENDING: { bg: '#fef9c3', text: '#854d0e', border: '#fef08a' },
    OVERDUE: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    CANCELLED: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
    REFUNDED: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
  };

  const statusStyle = statusColors[safeStatus] || statusColors.PENDING;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${safeInvoiceNo}</title>
  <style>
    :root {
      --primary: #09090b;
      --secondary: #4f46e5;
      --border: #e4e4e7;
      --text: #18181b;
      --text-muted: #71717a;
      --bg: #fafafa;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: var(--text);
      line-height: 1.4;
      background-color: var(--bg);
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border-radius: 8px;
      border: 1px solid var(--border);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    /* Header Section */
    /* Screen-Only Toolbar */
    .print-toolbar {
      position: sticky;
      top: 12px;
      z-index: 1000;
      max-width: 820px;
      margin: 0 auto 20px;
      background: #09090b;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }

    .print-toolbar-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
    }

    .status-pill-small {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      background: ${statusStyle.bg};
      color: ${statusStyle.text};
      border: 1px solid ${statusStyle.border};
    }

    .print-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-print {
      background: #18181b;
      color: #ffffff;
      border: 1px solid #3f3f46;
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-print:hover {
      background: #27272a;
    }

    .btn-close {
      background: #27272a;
      color: #d4d4d8;
      border: none;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-close:hover {
      background: #3f3f46;
      color: #ffffff;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #000000;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .gym-branding h1 {
      font-size: 34px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #000000;
      text-transform: uppercase;
      line-height: 1.05;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .branch-pill {
      font-size: 11.5px;
      font-weight: 700;
      background: #f4f4f5;
      color: #09090b;
      border: 1.5px solid #a1a1aa;
      padding: 2px 9px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: inline-block;
    }

    .gym-tagline {
      font-size: 11.5px;
      color: #52525b;
      font-style: italic;
      margin-top: 2px;
      margin-bottom: 8px;
    }

    .gym-details {
      font-size: 12px;
      color: #3f3f46;
      line-height: 1.5;
    }

    .gym-details strong {
      color: #09090b;
    }

    .invoice-title-area {
      text-align: right;
    }

    .tax-badge {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--primary);
      text-transform: uppercase;
    }

    .status-pill {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background-color: ${statusStyle.bg};
      color: ${statusStyle.text};
      border: 1px solid ${statusStyle.border};
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 6px;
    }

    /* Meta Info Grid */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      background-color: #fafafa;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 12px;
    }

    .meta-box h3 {
      font-size: 10.5px;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 700;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 4px;
    }

    .meta-box p {
      margin-bottom: 3px;
    }

    .meta-box .name {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 4px;
    }

    .invoice-numbers-table {
      width: 100%;
      border-collapse: collapse;
    }

    .invoice-numbers-table td {
      padding: 2.5px 0;
      font-size: 12px;
    }

    .invoice-numbers-table td:first-child {
      color: var(--text-muted);
      width: 45%;
    }

    .invoice-numbers-table td:last-child {
      font-weight: 600;
      color: var(--text);
      text-align: right;
    }

    /* Itemized Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .items-table th {
      background-color: #f4f4f5;
      text-align: left;
      padding: 10px 12px;
      font-size: 10.5px;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 700;
      letter-spacing: 0.05em;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }

    .items-table td {
      padding: 11px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 12.5px;
      color: var(--text);
    }

    .items-table .text-center { text-align: center; }
    .items-table .text-right { text-align: right; }

    /* Summary & Settlement Area */
    .summary-area {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 24px;
      margin-bottom: 28px;
    }

    .payment-instruction {
      background: #fafafa;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .amount-words-box h4 {
      font-size: 10.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .amount-words-text {
      font-size: 12px;
      font-weight: 600;
      font-style: italic;
      color: var(--primary);
      line-height: 1.4;
    }

    /* Dynamic Real UPI QR Container */
    .upi-qr-card {
      margin-top: 14px;
      display: flex;
      align-items: center;
      gap: 14px;
      background: #ffffff;
      border: 1px solid #d4d4d8;
      border-radius: 6px;
      padding: 10px;
    }

    .upi-qr-img {
      width: 100px;
      height: 100px;
      border-radius: 4px;
      border: 1px solid var(--border);
      display: block;
    }

    .upi-qr-info {
      font-size: 11px;
    }

    .upi-qr-info strong {
      display: block;
      color: #047857;
      font-size: 11.5px;
      margin-bottom: 2px;
    }

    .upi-vpa {
      font-family: monospace;
      font-size: 10.5px;
      background: #f4f4f5;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin: 3px 0;
      color: #18181b;
      font-weight: bold;
    }

    /* Official Paid Stamp Seal */
    .paid-stamp {
      margin-top: 14px;
      border: 2px dashed #16a34a;
      background: #f0fdf4;
      color: #15803d;
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }

    .paid-stamp-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    .paid-stamp-details {
      font-size: 11px;
      margin-top: 4px;
      color: #166534;
      font-weight: 500;
    }

    .no-upi-banner {
      margin-top: 14px;
      font-size: 11px;
      color: #854d0e;
      background: #fef9c3;
      border: 1px solid #fde047;
      padding: 8px 10px;
      border-radius: 4px;
    }

    /* Financial Totals Table */
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }

    .totals-table td {
      padding: 5px 0;
    }

    .totals-table td:first-child {
      color: var(--text-muted);
    }

    .totals-table td:last-child {
      text-align: right;
      font-weight: 600;
      color: var(--text);
    }

    .totals-table tr.grand-total td {
      border-top: 2px solid var(--border);
      border-bottom: 2px solid var(--border);
      padding: 8px 0;
      font-size: 14.5px;
      font-weight: 800;
      color: var(--primary);
    }

    .totals-table tr.highlight-due td {
      color: #dc2626;
      font-weight: 700;
      padding-top: 6px;
    }

    /* Footer / Terms */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid var(--border);
      padding-top: 20px;
      margin-top: 20px;
    }

    .terms {
      max-width: 55%;
      font-size: 10px;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .terms h4 {
      font-size: 10.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 3px;
    }

    .signatory {
      text-align: center;
      width: 180px;
    }

    .signatory-line {
      border-bottom: 1px solid var(--text);
      margin-bottom: 6px;
    }

    .signatory p {
      font-size: 10.5px;
      color: var(--text-muted);
      font-weight: 600;
    }

    @media print {
      .no-print {
        display: none !important;
      }
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <div class="print-toolbar-title">
      <span>Official Tax Invoice</span>
      <span class="status-pill-small">${safeStatus}</span>
    </div>
    <div class="print-toolbar-actions">
      <button class="btn-print" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print / Save PDF
      </button>
      <button class="btn-close" onclick="window.history.back()">Back</button>
    </div>
  </div>

  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="gym-branding">
        <h1>
          ${safeGym.name}
          ${safeGym.branchName ? `<span class="branch-pill">${safeGym.branchName}</span>` : ''}
        </h1>
        ${safeGym.tagline ? `<div class="gym-tagline">${safeGym.tagline}</div>` : ''}
        <div class="gym-details">
          <p>${safeGym.address}</p>
          <p><strong>Phone:</strong> ${safeGym.phone} &nbsp;|&nbsp; <strong>Email:</strong> ${safeGym.email}</p>
          <p>
            ${safeGym.gstin ? `<strong>GSTIN:</strong> ${safeGym.gstin}` : '<strong>Tax Status:</strong> Unregistered / Regular'}
            ${safeGym.pan ? ` &nbsp;|&nbsp; <strong>PAN:</strong> ${safeGym.pan}` : ''}
          </p>
        </div>
      </div>
      <div class="invoice-title-area">
        <div class="tax-badge">TAX INVOICE</div>
        <div class="status-pill">${safeStatus}</div>
      </div>
    </div>

    <!-- Meta Info: Billed To and Invoice Credentials -->
    <div class="meta-grid">
      <div class="meta-box">
        <h3>Billed To (Member Details)</h3>
        <p class="name">${safeMember.name}</p>
        <p><strong>Member ID:</strong> ${safeMember.memberCode}</p>
        <p><strong>Phone:</strong> ${safeMember.phone}</p>
        ${safeMember.email ? `<p><strong>Email:</strong> ${safeMember.email}</p>` : ''}
        ${safeMember.address ? `<p><strong>Address:</strong> ${safeMember.address}</p>` : ''}
      </div>

      <div class="meta-box">
        <h3>Invoice Details</h3>
        <table class="invoice-numbers-table">
          <tr>
            <td>Invoice No:</td>
            <td>${safeInvoiceNo}</td>
          </tr>
          <tr>
            <td>Date of Issue:</td>
            <td>${safeDate}</td>
          </tr>
          ${safeDueDate ? `
          <tr>
            <td>Payment Due:</td>
            <td>${safeDueDate}</td>
          </tr>` : ''}
          <tr>
            <td>Payment Mode:</td>
            <td>${safePaymentMode}</td>
          </tr>
          <tr>
            <td>Billed By:</td>
            <td>${safeCashier}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Description / Service Plan</th>
          <th class="text-center" style="width: 15%;">SAC Code</th>
          <th class="text-center" style="width: 10%;">Qty</th>
          <th class="text-right" style="width: 12%;">Rate</th>
          <th class="text-right" style="width: 13%;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${safeItems.map(item => `
        <tr>
          <td>
            <strong>${item.description}</strong>
          </td>
          <td class="text-center" style="font-family: monospace; font-size: 11px;">${item.hsnCode}</td>
          <td class="text-center">${item.qty}</td>
          <td class="text-right">₹${Number(item.rate).toFixed(2)}</td>
          <td class="text-right"><strong>₹${Number(item.amount).toFixed(2)}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Financial Summary & Real Dynamic UPI QR / Paid Seal -->
    <div class="summary-area">
      <!-- Left Column: Amount in words & Dynamic Payment QR / Paid Stamp -->
      <div class="payment-instruction">
        <div class="amount-words-box">
          <h4>Amount in Words:</h4>
          <div class="amount-words-text">${safeAmountInWords}</div>
        </div>

        ${isPaid ? `
        <!-- Official Paid Seal for Settled Invoices -->
        <div class="paid-stamp">
          <div class="paid-stamp-title">✓ PAID & VERIFIED</div>
          <div class="paid-stamp-details">
            Settled in full via ${safePaymentMode} on ${safeDate}<br/>
            Zero Balance Outstanding
          </div>
        </div>
        ` : upiQrUrl ? `
        <!-- Real Dynamic NPCI UPI QR Code for Unpaid / Due Invoices -->
        <div class="upi-qr-card">
          <img class="upi-qr-img" src="${upiQrUrl}" alt="Real UPI Payment QR Code" />
          <div class="upi-qr-info">
            <strong>Scan to Pay Dues (₹${payableAmount.toFixed(2)})</strong>
            <span>Scan with any UPI App (GPay / PhonePe / Paytm)</span>
            <div><span class="upi-vpa">${safeGym.upiId}</span></div>
            <span style="color: #71717a; font-size: 10px;">Instant credit to ${safeGym.name}</span>
          </div>
        </div>
        ` : `
        <div class="no-upi-banner">
          <strong>UPI Setup Notice:</strong> Official Gym UPI ID is not configured. Set up your UPI VPA in Settings &gt; Billing to enable real instant payment QR codes on invoices.
        </div>
        `}
      </div>

      <!-- Right Column: Tax Breakdown -->
      <div style="background: #fafafa; border: 1px solid var(--border); border-radius: 6px; padding: 16px;">
        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td>₹${subtotal.toFixed(2)}</td>
          </tr>
          ${discountAmount > 0 ? `
          <tr>
            <td style="color: #16a34a;">Discount Applied:</td>
            <td style="color: #16a34a;">-₹${discountAmount.toFixed(2)}</td>
          </tr>` : ''}
          <tr>
            <td>CGST (9%):</td>
            <td>₹${cgstAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>SGST (9%):</td>
            <td>₹${sgstAmount.toFixed(2)}</td>
          </tr>
          <tr class="grand-total">
            <td>Total Invoice Value:</td>
            <td>₹${totalAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="color: #15803d; font-weight: 600;">Amount Paid:</td>
            <td style="color: #15803d; font-weight: 600;">₹${amountPaid.toFixed(2)}</td>
          </tr>
          ${amountDue > 0 ? `
          <tr class="highlight-due">
            <td>Balance Due:</td>
            <td>₹${amountDue.toFixed(2)}</td>
          </tr>` : `
          <tr>
            <td style="color: var(--text-muted);">Balance Due:</td>
            <td>₹0.00</td>
          </tr>`}
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="terms">
        <h4>Terms & Conditions</h4>
        <p>1. Membership fees and personal training packages are strictly non-refundable and non-transferable.</p>
        <p>2. Members must comply with facility safety guidelines, hygiene rules, and dress codes at all times.</p>
        <p>3. This document is a computer-generated tax invoice issued in accordance with GST rules.</p>
      </div>
      <div class="signatory">
        <div class="signatory-line"></div>
        <p>Authorized Signatory</p>
        <p style="font-size: 9.5px; color: #a1a1aa; margin-top: 2px;">For ${safeGym.name}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
