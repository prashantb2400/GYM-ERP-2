import { MemberReportData } from './types';
import { escapeHtml } from './invoice-template';

export function generateMemberReportHTML(data: MemberReportData): string {
  const { gym, member, reportDate, attendanceStats, planHistory, paymentSummary } = data;

  const resolvedGymName = (gym.name?.trim() && gym.name !== 'Gym Name' && gym.name !== 'Gym Center')
    ? gym.name.trim()
    : 'Fitness Club';

  const safeGym = {
    name: escapeHtml(resolvedGymName),
    tagline: escapeHtml(gym.tagline || ''),
    branchName: escapeHtml(gym.branchName || ''),
    address: escapeHtml(gym.address || 'Facility Address Registered'),
    phone: escapeHtml(gym.phone || 'N/A'),
    email: escapeHtml(gym.email || 'N/A'),
    gstin: escapeHtml(gym.gstin || ''),
  };

  const safeMember = {
    id: escapeHtml(member.id),
    name: escapeHtml(member.name),
    phone: escapeHtml(member.phone),
    email: escapeHtml(member.email || 'N/A'),
    joinDate: member.joinDate ? new Date(member.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
    status: escapeHtml(member.status),
    bloodGroup: escapeHtml(member.bloodGroup || 'N/A'),
    height: member.height,
    weight: member.weight,
    bmi: member.bmi,
  };

  const formattedReportDate = reportDate
    ? new Date(reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Member Report - ${member.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #111827;
      --secondary: #2563eb;
      --border: #e5e7eb;
      --text: #374151;
      --text-light: #6b7280;
      --success: #16a34a;
      --warning: #ca8a04;
      --danger: #dc2626;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .print-toolbar {
      position: sticky;
      top: 12px;
      z-index: 1000;
      max-width: 800px;
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
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }

    .gym-name {
      font-size: 34px;
      font-weight: 900;
      color: #000000;
      letter-spacing: -0.5px;
      text-transform: uppercase;
      line-height: 1.05;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .branch-pill {
      font-size: 11px;
      font-weight: 700;
      background: #f4f4f5;
      color: #18181b;
      border: 1.5px solid #a1a1aa;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .gym-tagline {
      font-size: 11.5px;
      color: #52525b;
      font-style: italic;
      margin-top: 2px;
      margin-bottom: 6px;
    }

    .gym-meta-details {
      font-size: 12px;
      color: #3f3f46;
      line-height: 1.5;
    }

    .gym-meta-details strong {
      color: #09090b;
    }

    .doc-title {
      font-size: 1.125rem;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--primary);
      letter-spacing: 1px;
    }

    .report-meta {
      text-align: right;
      font-size: 0.875rem;
      color: var(--text-light);
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--primary);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
      margin-top: 2.5rem;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin-bottom: 1rem;
    }

    .profile-item {
      display: flex;
      flex-direction: column;
    }

    .profile-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-light);
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .profile-value {
      font-size: 1rem;
      color: var(--primary);
      font-weight: 500;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: #f8fafc;
      border: 1px solid var(--border);
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
    }

    .stat-value {
      font-family: 'Bebas Neue', Impact, 'Arial Black', -apple-system, sans-serif;
      font-size: 2.5rem;
      color: var(--secondary);
      line-height: 1;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-light);
      font-weight: 500;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.5rem;
    }

    .data-table th {
      background: #f3f4f6;
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-light);
      font-weight: 600;
    }

    .data-table td {
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
      color: var(--primary);
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-active { background: #dcfce7; color: #166534; }
    .status-inactive { background: #f3f4f6; color: #374151; }
    .status-expired { background: #fee2e2; color: #991b1b; }

    .finance-summary {
      display: flex;
      justify-content: flex-end;
      gap: 2rem;
      background: #f8fafc;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .finance-item {
      text-align: right;
    }
    
    .finance-item .label {
      font-size: 0.75rem;
      color: var(--text-light);
      text-transform: uppercase;
      margin-bottom: 0.25rem;
    }

    .finance-item .value {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .text-success { color: var(--success); }
    .text-danger { color: var(--danger); }

    .footer {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
      color: var(--text-light);
      font-size: 0.875rem;
      margin-top: 3rem;
    }

    @media print {
      .no-print {
        display: none !important;
      }
      body {
        background-color: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .stat-card {
        border: 1px solid #000;
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
      <span>Official Member Report</span>
      <span class="status-badge status-${safeMember.status.toLowerCase()}">${safeMember.status}</span>
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
    <div class="header">
      <div class="gym-branding" style="max-width: 65%;">
        <h1 class="gym-name">
          ${safeGym.name}
          ${safeGym.branchName ? `<span class="branch-pill">${safeGym.branchName}</span>` : ''}
        </h1>
        ${safeGym.tagline ? `<div class="gym-tagline">${safeGym.tagline}</div>` : ''}
        <div class="gym-meta-details">
          <p>${safeGym.address}</p>
          <p><strong>Phone:</strong> ${safeGym.phone} &nbsp;|&nbsp; <strong>Email:</strong> ${safeGym.email}</p>
          ${safeGym.gstin ? `<p><strong>GSTIN:</strong> ${safeGym.gstin}</p>` : ''}
        </div>
      </div>
      <div class="report-meta">
        <div class="doc-title">Member Report</div>
        <div class="report-meta-details">
          <div><strong>Date:</strong> ${formattedReportDate}</div>
          <div><strong>Member ID:</strong> ${safeMember.id.slice(0, 10)}</div>
        </div>
      </div>
    </div>

    <h2 class="section-title" style="margin-top: 0;">Member Profile</h2>
    <div class="profile-grid">
      <div class="profile-item">
        <span class="profile-label">Name</span>
        <span class="profile-value">${member.name}</span>
      </div>
      <div class="profile-item">
        <span class="profile-label">Phone</span>
        <span class="profile-value">${member.phone}</span>
      </div>
      <div class="profile-item">
        <span class="profile-label">Email</span>
        <span class="profile-value">${member.email || 'N/A'}</span>
      </div>
      <div class="profile-item">
        <span class="profile-label">Join Date</span>
        <span class="profile-value">${new Date(member.joinDate).toLocaleDateString()}</span>
      </div>
      <div class="profile-item">
        <span class="profile-label">Status</span>
        <div>
          <span class="status-badge status-${member.status.toLowerCase()}">${member.status}</span>
        </div>
      </div>
      <div class="profile-item">
        <span class="profile-label">Blood Group</span>
        <span class="profile-value">${member.bloodGroup || 'N/A'}</span>
      </div>
      ${member.height && member.weight && member.bmi ? `
      <div class="profile-item">
        <span class="profile-label">Physical Stats</span>
        <span class="profile-value">${member.height}cm / ${member.weight}kg (BMI: ${member.bmi})</span>
      </div>
      ` : ''}
    </div>

    <h2 class="section-title">Attendance Overview</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${attendanceStats.totalDays}</div>
        <div class="stat-label">Total Days Present</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${attendanceStats.presentDaysThisMonth}</div>
        <div class="stat-label">Present This Month</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${attendanceStats.currentStreak}</div>
        <div class="stat-label">Current Streak (Days)</div>
      </div>
    </div>

    <h2 class="section-title">Plan & Subscription History</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Plan Name</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${planHistory.length > 0 ? planHistory.map(plan => `
        <tr>
          <td style="font-weight: 500;">${plan.planName}</td>
          <td>${new Date(plan.startDate).toLocaleDateString()}</td>
          <td>${new Date(plan.endDate).toLocaleDateString()}</td>
          <td>₹${plan.amount}</td>
          <td>
            <span class="status-badge status-${plan.status.toLowerCase()}">${plan.status}</span>
          </td>
        </tr>
        `).join('') : `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-light);">No plan history found.</td>
        </tr>
        `}
      </tbody>
    </table>

    <div class="finance-summary">
      <div class="finance-item">
        <div class="label">Total Amount Paid</div>
        <div class="value text-success">₹${paymentSummary.totalPaid}</div>
      </div>
      <div class="finance-item">
        <div class="label">Total Pending Dues</div>
        <div class="value ${paymentSummary.totalPending > 0 ? 'text-danger' : 'text-success'}">₹${paymentSummary.totalPending}</div>
      </div>
    </div>

    <div class="footer">
      <p>Official record generated by ${safeGym.name}</p>
      <p>${safeGym.address} &nbsp;|&nbsp; Phone: ${safeGym.phone}</p>
    </div>
  </div>
</body>
</html>
  `;
}
