import { MemberReportData } from './types';

export function generateMemberReportHTML(data: MemberReportData): string {
  const { gym, member, reportDate, attendanceStats, planHistory, paymentSummary } = data;

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
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--border);
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }

    .gym-name {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 2.5rem;
      color: var(--primary);
      letter-spacing: 1px;
      margin-bottom: 0.25rem;
    }

    .doc-title {
      font-size: 1.125rem;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--secondary);
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
      font-family: 'Bebas Neue', sans-serif;
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
  <div class="container">
    <div class="header">
      <div>
        <h1 class="gym-name">${gym.name}</h1>
        <div class="doc-title">Comprehensive Member Report</div>
      </div>
      <div class="report-meta">
        <div>Date: ${new Date(reportDate).toLocaleDateString()}</div>
        <div>Member ID: ${member.id}</div>
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
      <p>Generated by ${gym.name} Management System</p>
      <p>${gym.address} | Phone: ${gym.phone}</p>
    </div>
  </div>
</body>
</html>
  `;
}
