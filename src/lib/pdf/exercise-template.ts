import { ExercisePlanData } from './types';

export function generateExercisePlanHTML(data: ExercisePlanData): string {
  const {
    gym,
    planTitle,
    isTemplate,
    member,
    dateIssued,
    trainerName,
    duration,
    trainerNotes,
    days,
  } = data;

  const effectiveTitle = planTitle || (isTemplate ? member.name : 'Personalized Workout Program');
  const formattedDate = new Date(dateIssued).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const totalExercises = days.reduce((sum, d) => sum + (d.exercises?.length || 0), 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${effectiveTitle} - ${gym.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #09090b;
      --primary-accent: #dc2626; /* Energetic red for workout theme */
      --primary-accent-light: #fef2f2;
      --border-dark: #cbd5e1;
      --border-light: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #475569;
      --bg-page: #f8fafc;
      --bg-card: #ffffff;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-sans);
      color: var(--text-main);
      background-color: var(--bg-page);
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      padding: 24px 0 48px;
    }

    /* Screen-Only Toolbar */
    .print-toolbar {
      position: sticky;
      top: 12px;
      z-index: 1000;
      max-width: 900px;
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

    .print-toolbar-badge {
      background: #dc2626;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .print-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-print {
      background: #dc2626;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
    }

    .btn-print:hover {
      background: #b91c1c;
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

    /* Main Print Document Container */
    .document-container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--bg-card);
      padding: 36px 44px;
      border-radius: 16px;
      border: 1px solid var(--border-light);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
    }

    /* Document Header */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--border-dark);
      padding-bottom: 20px;
      margin-bottom: 20px;
    }

    .gym-branding {
      max-width: 60%;
    }

    .gym-name {
      font-size: 34px;
      font-weight: 900;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      line-height: 1.05;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .branch-badge {
      background: var(--primary-accent-light);
      color: var(--primary-accent);
      border: 1px solid #fecaca;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .gym-tagline {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
      font-weight: 500;
    }

    .gym-contact-info {
      margin-top: 8px;
      font-size: 11.5px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .doc-meta {
      text-align: right;
    }

    .doc-type-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .doc-meta-item {
      margin-top: 6px;
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .doc-meta-item strong {
      color: var(--text-main);
    }

    /* Client / Routine Card */
    .client-card {
      background: #f8fafc;
      border: 1px solid var(--border-light);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }

    .client-field-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      font-weight: 700;
      margin-bottom: 2px;
    }

    .client-field-value {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    .client-field-value.highlight {
      color: var(--primary-accent);
      font-weight: 700;
    }

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1.5px solid var(--border-light);
      border-radius: 12px;
      padding: 12px 14px;
      text-align: center;
    }

    .kpi-card.target {
      border-color: #fecaca;
      background: #fff5f5;
    }

    .kpi-value {
      font-family: var(--font-mono);
      font-size: 20px;
      font-weight: 700;
      color: var(--primary);
      line-height: 1.1;
    }

    .kpi-value.accent {
      color: var(--primary-accent);
    }

    .kpi-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .kpi-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Days Sections */
    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-main);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-light);
    }

    .days-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 24px;
    }

    .day-block {
      border: 1px solid var(--border-dark);
      border-radius: 10px;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
      background: #ffffff;
    }

    .day-block-header {
      background: #0f172a;
      color: #ffffff;
      padding: 9px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .day-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .day-index-pill {
      background: var(--primary-accent);
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: var(--font-mono);
      text-transform: uppercase;
    }

    .day-name {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
    }

    .day-exercise-count {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 8px;
      border-radius: 6px;
    }

    .warmup-strip {
      background: #f8fafc;
      border-bottom: 1px solid var(--border-light);
      padding: 6px 16px;
      font-size: 11px;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .warmup-label {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #b91c1c;
      background: #fee2e2;
      padding: 1px 6px;
      border-radius: 4px;
    }

    /* Exercises Table */
    .exercise-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .exercise-table th {
      background: #f1f5f9;
      text-align: left;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      padding: 7px 12px;
      border-bottom: 1px solid var(--border-dark);
    }

    .exercise-table th.text-center {
      text-align: center;
    }

    .exercise-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: var(--text-main);
      vertical-align: middle;
    }

    .exercise-table tr:last-child td {
      border-bottom: none;
    }

    .exercise-table td.num {
      text-align: center;
      font-family: var(--font-mono);
      font-weight: 700;
    }

    .exercise-table td.sets {
      color: #7c3aed;
    }

    .exercise-table td.reps {
      color: #0f172a;
    }

    .exercise-table td.rest {
      color: #475569;
    }

    .ex-name-cell {
      font-weight: 700;
      color: var(--text-main);
    }

    .ex-notes-text {
      font-size: 11px;
      color: #64748b;
      margin-top: 1px;
      font-style: italic;
    }

    .ex-log-box {
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      height: 22px;
      width: 100%;
      background: #fafafa;
    }

    /* Training Laws Card */
    .rules-card {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .rules-header {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #991b1b;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .rules-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 18px;
      font-size: 11.5px;
      color: #7f1d1d;
    }

    .rule-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .rule-bullet {
      color: #dc2626;
      font-weight: bold;
      font-size: 13px;
      line-height: 1.2;
    }

    /* Trainer Notes */
    .notes-card {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 24px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .notes-card-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #92400e;
      margin-bottom: 4px;
    }

    .notes-card-content {
      font-size: 12px;
      color: #78350f;
      line-height: 1.45;
    }

    /* Sign-Off Section */
    .signature-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-light);
      margin-bottom: 20px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .sign-box {
      border-top: 1.5px dashed #94a3b8;
      padding-top: 8px;
      text-align: center;
    }

    .sign-role {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-main);
      text-transform: uppercase;
    }

    .sign-date {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Footer */
    .doc-footer {
      text-align: center;
      padding-top: 14px;
      border-top: 1px solid var(--border-light);
      color: var(--text-muted);
      font-size: 10.5px;
      line-height: 1.5;
    }

    .doc-footer-legal {
      margin-top: 4px;
      font-size: 9px;
      color: #94a3b8;
    }

    /* Print Formatting */
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }

      .no-print, .print-toolbar {
        display: none !important;
      }

      .document-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
        border-radius: 0;
      }

      .day-block {
        border: 1px solid #94a3b8 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .day-block-header {
        background: #0f172a !important;
        color: #ffffff !important;
      }

      .rules-card {
        background: #fef2f2 !important;
        border: 1px solid #fecaca !important;
      }

      .notes-card {
        background: #fffbeb !important;
        border: 1px solid #fcd34d !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Screen Toolbar -->
  <div class="print-toolbar no-print">
    <div class="print-toolbar-title">
      <span>🏋️</span>
      <span>${effectiveTitle}</span>
      <span class="print-toolbar-badge">${isTemplate ? 'Master Split' : 'Member Routine'}</span>
    </div>
    <div class="print-toolbar-actions">
      <button type="button" onclick="window.print()" class="btn-print">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Print / Save PDF
      </button>
      <button type="button" onclick="window.close()" class="btn-close">Close</button>
    </div>
  </div>

  <!-- Main Document Container -->
  <div class="document-container">

    <!-- Executive Gym Header -->
    <div class="doc-header">
      <div class="gym-branding">
        <div class="gym-name">
          <span>${gym.name}</span>
          ${gym.branchName ? `<span class="branch-badge">${gym.branchName}</span>` : ''}
        </div>
        ${gym.tagline ? `<div class="gym-tagline">${gym.tagline}</div>` : ''}
        <div class="gym-contact-info">
          <div>📍 ${gym.address}</div>
          <div>📞 ${gym.phone} ${gym.email ? `• ✉️ ${gym.email}` : ''}</div>
        </div>
      </div>

      <div class="doc-meta">
        <div class="doc-type-badge">Training Program</div>
        <div class="doc-meta-item">Issue Date: <strong>${formattedDate}</strong></div>
        <div class="doc-meta-item">Doc ID: <strong>WKT-${member.id.substring(0, 8).toUpperCase()}</strong></div>
      </div>
    </div>

    <!-- Client / Program Details Card -->
    <div class="client-card">
      <div>
        <div class="client-field-label">Program Split</div>
        <div class="client-field-value highlight">${effectiveTitle}</div>
      </div>
      <div>
        <div class="client-field-label">${isTemplate ? 'Classification' : 'Trainee / Member'}</div>
        <div class="client-field-value">
          ${isTemplate ? 'Master Gym Training Split' : member.name}
          ${member.memberCode ? `<span style="font-size: 11px; color: #64748b; font-family: monospace;"> (${member.memberCode})</span>` : ''}
        </div>
      </div>
      <div>
        <div class="client-field-label">Training Goal</div>
        <div class="client-field-value">${member.goal || 'Hypertrophy & Strength'}</div>
      </div>
      <div>
        <div class="client-field-label">Strength & Conditioning Coach</div>
        <div class="client-field-value">${trainerName || 'Head Fitness Coach'}</div>
      </div>
      <div>
        <div class="client-field-label">Training Frequency</div>
        <div class="client-field-value">${days.length} Days / Week</div>
      </div>
      <div>
        <div class="client-field-label">Experience Level</div>
        <div class="client-field-value">${member.level || 'Intermediate'}</div>
      </div>
      <div>
        <div class="client-field-label">Cycle Duration</div>
        <div class="client-field-value">${duration || '8 - 12 Weeks'}</div>
      </div>
      <div>
        <div class="client-field-label">Total Movements</div>
        <div class="client-field-value">${totalExercises} Planned Exercises</div>
      </div>
    </div>

    <!-- Program KPI Summary Cards -->
    <div class="kpi-grid">
      <div class="kpi-card target">
        <div class="kpi-value accent">${days.length} Days</div>
        <div class="kpi-label">Weekly Frequency</div>
        <div class="kpi-sub">Optimal Muscle Recovery</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${totalExercises}</div>
        <div class="kpi-label">Total Exercises</div>
        <div class="kpi-sub">Compound + Isolation</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">60-90s</div>
        <div class="kpi-label">Target Rest Interval</div>
        <div class="kpi-sub">Strict Timer Discipline</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${duration || '8 Wks'}</div>
        <div class="kpi-label">Mesocycle Length</div>
        <div class="kpi-sub">Progressive Overload</div>
      </div>
    </div>

    <!-- Day-by-Day Training Sections -->
    <div class="section-title">Periodized Workout Day-by-Day Schedule</div>

    <div class="days-container">
      ${days.map((day, dayIdx) => {
        const exercises = day.exercises || [];

        return `
        <div class="day-block">
          <div class="day-block-header">
            <div class="day-title-group">
              <span class="day-index-pill">Day #${dayIdx + 1}</span>
              <span class="day-name">${day.dayName}</span>
            </div>
            <span class="day-exercise-count">${exercises.length} Movements</span>
          </div>

          <!-- Dynamic Warmup Banner -->
          <div class="warmup-strip">
            <span class="warmup-label">Warm-Up (5-8 Mins)</span>
            <span>Dynamic Joint Mobility: arm swings, shoulder dislocates, hip openers & light treadmill incline walk.</span>
          </div>

          <table class="exercise-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 38%;">Movement / Exercise</th>
                <th class="text-center" style="width: 9%;">Sets</th>
                <th class="text-center" style="width: 12%;">Target Reps</th>
                <th class="text-center" style="width: 12%;">Rest</th>
                <th style="width: 14%;">Form / Tempo Cue</th>
                <th class="text-center" style="width: 10%;">Weight Log</th>
              </tr>
            </thead>
            <tbody>
              ${exercises.map((ex, exIdx) => `
              <tr>
                <td style="color: #94a3b8; font-family: monospace; font-weight: 600;">${exIdx + 1}</td>
                <td>
                  <div class="ex-name-cell">${ex.name}</div>
                  ${ex.notes ? `<div class="ex-notes-text">${ex.notes}</div>` : ''}
                </td>
                <td class="num sets">${ex.sets}</td>
                <td class="num reps">${ex.reps}</td>
                <td class="num rest">${ex.rest}</td>
                <td style="font-size: 11px; color: #475569;">${ex.tempo || '2-0-1 Control'}</td>
                <td><div class="ex-log-box" title="Write working weight (kg)"></div></td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        `;
      }).join('')}
    </div>

    <!-- Golden Rules of Strength & Conditioning -->
    <div class="rules-card">
      <div class="rules-header">
        <span>⚡</span>
        <span>Universal Principles of Gym Progression & Safety</span>
      </div>
      <div class="rules-grid">
        <div class="rule-item">
          <span class="rule-bullet">1.</span>
          <div><strong>Progressive Overload:</strong> When you complete all sets at the top rep target, increase load by 1.25kg to 2.5kg the following week.</div>
        </div>
        <div class="rule-item">
          <span class="rule-bullet">2.</span>
          <div><strong>Eccentric Control:</strong> Lower weights under strict 2-3 second control. Avoid jerking or using body momentum to move the weight.</div>
        </div>
        <div class="rule-item">
          <span class="rule-bullet">3.</span>
          <div><strong>Feeder Sets:</strong> Perform 1-2 lighter warm-up sets before your working weight to prime neuromuscular recruitment without fatiguing.</div>
        </div>
        <div class="rule-item">
          <span class="rule-bullet">4.</span>
          <div><strong>Safety & Etiquette:</strong> Always use barbell collars. Re-rack all weights and dumbbells immediately after finishing each exercise.</div>
        </div>
      </div>
    </div>

    <!-- Trainer Coaching Notes -->
    ${trainerNotes ? `
    <div class="notes-card">
      <div class="notes-card-title">Strength & Conditioning Coach Instructions</div>
      <div class="notes-card-content">${trainerNotes}</div>
    </div>
    ` : ''}

    <!-- Sign-off & Review Section -->
    <div class="signature-section">
      <div class="sign-box">
        <div class="sign-role">Head S&C Coach / Trainer</div>
        <div class="sign-date">${trainerName || 'Fitness Coach'} • Signature</div>
      </div>
      <div class="sign-box">
        <div class="sign-role">Athlete / Member Acknowledgment</div>
        <div class="sign-date">${isTemplate ? 'Client' : member.name} • Signature</div>
      </div>
      <div class="sign-box">
        <div class="sign-role">Progress Checkpoint</div>
        <div class="sign-date">4-Week Strength & Form Review</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="doc-footer">
      <div>${gym.name} ${gym.branchName ? `(${gym.branchName})` : ''} • ${gym.address} • Ph: ${gym.phone}</div>
      <div class="doc-footer-legal">
        Disclaimer: Perform all exercises with certified supervision. Warm up thoroughly before starting. If you feel sharp joint pain or dizziness, stop immediately and alert the gym floor manager.
      </div>
    </div>

  </div>

  <!-- Auto-focus print helper for instant print dialog when user presses Ctrl+P -->
  <script>
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        window.print();
      }
    });
  </script>
</body>
</html>`;
}
