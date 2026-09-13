import { DietChartData, DietFoodItem } from './types';

export function generateDietChartHTML(data: DietChartData): string {
  const {
    gym,
    planTitle,
    isTemplate,
    member,
    dateIssued,
    targetCalories,
    trainerName,
    trainerNotes,
    waterIntakeLiters,
    meals,
    totalCalories,
    totalProtein,
  } = data;

  const effectiveTitle = planTitle || (isTemplate ? member.name : 'Personalized Nutrition Protocol');
  const targetKcal = targetCalories || totalCalories;
  const targetWater = waterIntakeLiters || 3.5;
  const formattedDate = new Date(dateIssued).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

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
      --primary-accent: #7c3aed;
      --primary-accent-light: #f5f3ff;
      --secondary: #2563eb;
      --success: #16a34a;
      --warning: #d97706;
      --border-dark: #cbd5e1;
      --border-light: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #475569;
      --bg-page: #f8fafc;
      --bg-card: #ffffff;
      --bg-accent: #f1f5f9;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--text-main);
      background-color: var(--bg-page);
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      padding: 24px 0 48px;
    }

    /* Interactive On-Screen Toolbar (Hidden during Print) */
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
      background: #7c3aed;
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
      background: #7c3aed;
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
      background: #6d28d9;
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

    /* Print Document Container */
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
      border: 1px solid #ddd6fe;
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

    /* Client / Plan Metadata Card */
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

    /* KPI Target Summary Bar */
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
      border-color: #ddd6fe;
      background: #faf5ff;
    }

    .kpi-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      font-weight: 700;
      color: var(--primary);
      line-height: 1.1;
    }

    .kpi-value.accent {
      color: var(--primary-accent);
    }

    .kpi-value.success {
      color: var(--success);
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

    /* Meals Schedule Section */
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

    .meals-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .meal-block {
      border: 1px solid var(--border-dark);
      border-radius: 10px;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
      background: #ffffff;
    }

    .meal-block-header {
      background: #f1f5f9;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-dark);
    }

    .meal-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .meal-index-pill {
      background: var(--primary);
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
    }

    .meal-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
    }

    .meal-time-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      background: #ffffff;
      border: 1px solid var(--border-light);
      padding: 1px 7px;
      border-radius: 6px;
    }

    .meal-subtotal-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--primary);
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .meal-subtotal-badge .kcal {
      color: var(--warning);
    }

    .meal-subtotal-badge .pro {
      color: var(--success);
    }

    /* Food Items Table */
    .meal-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .meal-table th {
      background: #fafafa;
      text-align: left;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      padding: 6px 14px;
      border-bottom: 1px solid var(--border-light);
    }

    .meal-table th.num {
      text-align: right;
    }

    .meal-table td {
      padding: 8px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: var(--text-main);
      vertical-align: middle;
    }

    .meal-table tr:last-child td {
      border-bottom: none;
    }

    .meal-table td.item-name {
      font-weight: 600;
    }

    .meal-table td.item-qty {
      color: var(--text-muted);
      font-weight: 500;
    }

    .meal-table td.num {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
    }

    .meal-table td.kcal {
      color: #b45309;
    }

    .meal-table td.pro {
      color: #15803d;
    }

    .meal-table-footer {
      background: #f8fafc;
      border-top: 1px solid var(--border-light);
      font-weight: 700;
      font-size: 11.5px;
    }

    .meal-table-footer td {
      padding: 6px 14px;
    }

    /* Guidelines / Golden Rules Section */
    .guidelines-card {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .guidelines-header {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b21a8;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .guidelines-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 18px;
      font-size: 11.5px;
      color: #3b0764;
    }

    .guideline-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .guideline-bullet {
      color: #9333ea;
      font-weight: bold;
      font-size: 13px;
      line-height: 1.2;
    }

    /* Trainer Notes Box */
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

    /* Signatures Section */
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

    /* Print Engine Optimizations */
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

      .meal-block {
        border: 1px solid #94a3b8 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .meal-block-header {
        background: #f1f5f9 !important;
      }

      .guidelines-card {
        background: #faf5ff !important;
        border: 1px solid #d8b4fe !important;
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
      <span>🥗</span>
      <span>${effectiveTitle}</span>
      <span class="print-toolbar-badge">${isTemplate ? 'Master Plan' : 'Member Chart'}</span>
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

  <!-- Document Container -->
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
        <div class="doc-type-badge">Nutrition Protocol</div>
        <div class="doc-meta-item">Issue Date: <strong>${formattedDate}</strong></div>
        <div class="doc-meta-item">Doc ID: <strong>DIET-${member.id.substring(0, 8).toUpperCase()}</strong></div>
      </div>
    </div>

    <!-- Client / Plan Metadata Card -->
    <div class="client-card">
      <div>
        <div class="client-field-label">Plan Title</div>
        <div class="client-field-value highlight">${effectiveTitle}</div>
      </div>
      <div>
        <div class="client-field-label">${isTemplate ? 'Classification' : 'Member Name'}</div>
        <div class="client-field-value">
          ${isTemplate ? 'Standard Gym Template' : member.name}
          ${member.memberCode ? `<span style="font-size: 11px; color: #64748b; font-family: monospace;"> (${member.memberCode})</span>` : ''}
        </div>
      </div>
      <div>
        <div class="client-field-label">Primary Goal</div>
        <div class="client-field-value">${member.goal || 'Hypertrophy & Fat Loss'}</div>
      </div>
      <div>
        <div class="client-field-label">Assigned Nutritionist</div>
        <div class="client-field-value">${trainerName || 'Fitness & Nutrition Coach'}</div>
      </div>
      ${member.weight ? `
      <div>
        <div class="client-field-label">Current Weight</div>
        <div class="client-field-value">${member.weight} kg</div>
      </div>
      ` : ''}
      ${member.height ? `
      <div>
        <div class="client-field-label">Height</div>
        <div class="client-field-value">${member.height}</div>
      </div>
      ` : ''}
      <div>
        <div class="client-field-label">Daily Meals</div>
        <div class="client-field-value">${meals.length} Scheduled Meals</div>
      </div>
      <div>
        <div class="client-field-label">Hydration Target</div>
        <div class="client-field-value">${targetWater}L / Day</div>
      </div>
    </div>

    <!-- Target Nutrition Summary Dashboard -->
    <div class="kpi-grid">
      <div class="kpi-card target">
        <div class="kpi-value accent">${targetKcal}</div>
        <div class="kpi-label">Daily Target Calories</div>
        <div class="kpi-sub">Planned: ${totalCalories} kcal</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value success">${totalProtein}g</div>
        <div class="kpi-label">Total Daily Protein</div>
        <div class="kpi-sub">Lean Tissue Protection</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${targetWater}L</div>
        <div class="kpi-label">Daily Water Intake</div>
        <div class="kpi-sub">500ml on Waking</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${meals.length}</div>
        <div class="kpi-label">Meals Frequency</div>
        <div class="kpi-sub">Every 3-3.5 Hours</div>
      </div>
    </div>

    <!-- Meals Schedule Section -->
    <div class="section-title">Daily Meal-by-Meal Nutrition Schedule</div>

    <div class="meals-container">
      ${meals.map((meal, idx) => {
        const mealItems: DietFoodItem[] = (meal.items || []).map((it) => {
          if (typeof it === 'string') {
            return { name: it, qty: '1 serving', calories: 0, protein: 0 };
          }
          return it;
        });

        const mealCalories = meal.calories || mealItems.reduce((s, it) => s + (Number(it.calories) || 0), 0);
        const mealProtein = meal.protein || mealItems.reduce((s, it) => s + (Number(it.protein) || 0), 0);

        return `
        <div class="meal-block">
          <div class="meal-block-header">
            <div class="meal-title-group">
              <span class="meal-index-pill">Meal #${idx + 1}</span>
              <span class="meal-name">${meal.name}</span>
              ${meal.time ? `<span class="meal-time-badge">⏰ ${meal.time}</span>` : ''}
            </div>
            <div class="meal-subtotal-badge">
              <span class="kcal">${mealCalories} kcal</span> • <span class="pro">${mealProtein}g protein</span>
            </div>
          </div>

          <table class="meal-table">
            <thead>
              <tr>
                <th style="width: 6%;">#</th>
                <th style="width: 48%;">Food Item / Description</th>
                <th style="width: 26%;">Portion / Quantity</th>
                <th class="num" style="width: 10%;">Calories</th>
                <th class="num" style="width: 10%;">Protein</th>
              </tr>
            </thead>
            <tbody>
              ${mealItems.map((item, itemIdx) => `
              <tr>
                <td style="color: #94a3b8; font-family: monospace;">${itemIdx + 1}</td>
                <td class="item-name">${item.name}</td>
                <td class="item-qty">${item.qty || '1 serving'}</td>
                <td class="num kcal">${item.calories ? `${item.calories} <span style="font-size: 9px; color: #94a3b8;">kcal</span>` : '-'}</td>
                <td class="num pro">${item.protein ? `${item.protein} <span style="font-size: 9px; color: #94a3b8;">g</span>` : '-'}</td>
              </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="meal-table-footer">
                <td colspan="3" style="text-align: right; text-transform: uppercase; font-size: 10px; color: #64748b;">Meal #${idx + 1} Total:</td>
                <td class="num kcal">${mealCalories} kcal</td>
                <td class="num pro">${mealProtein}g</td>
              </tr>
            </tfoot>
          </table>
        </div>
        `;
      }).join('')}
    </div>

    <!-- Golden Rules of Gym Nutrition -->
    <div class="guidelines-card">
      <div class="guidelines-header">
        <span>⚡</span>
        <span>Golden Rules of Fitness Nutrition & Lifestyle</span>
      </div>
      <div class="guidelines-grid">
        <div class="guideline-item">
          <span class="guideline-bullet">1.</span>
          <div><strong>Hydration Protocol:</strong> Consume 500ml water immediately on waking. Maintain at least 3.5 Litres throughout the day to support muscle fullness and digestion.</div>
        </div>
        <div class="guideline-item">
          <span class="guideline-bullet">2.</span>
          <div><strong>Workout Nutrient Timing:</strong> Consume complex carbohydrates 60-90 min pre-workout. Have your post-workout protein shake within 45 min of training.</div>
        </div>
        <div class="guideline-item">
          <span class="guideline-bullet">3.</span>
          <div><strong>Cooking Standards:</strong> Prefer grilling, boiling, steaming, or air-frying. Measure all cooking oils with a tablespoon (maximum 2 tbsp / day).</div>
        </div>
        <div class="guideline-item">
          <span class="guideline-bullet">4.</span>
          <div><strong>Foods to Eliminate:</strong> Avoid sugary carbonated drinks, deep-fried snacks, processed meats, refined flour, and alcohol during active fat-loss phases.</div>
        </div>
      </div>
    </div>

    <!-- Trainer Coaching Notes -->
    ${trainerNotes ? `
    <div class="notes-card">
      <div class="notes-card-title">Coaching & Special Instructions</div>
      <div class="notes-card-content">${trainerNotes}</div>
    </div>
    ` : ''}

    <!-- Sign-off & Review Section -->
    <div class="signature-section">
      <div class="sign-box">
        <div class="sign-role">Certified Nutritionist / Coach</div>
        <div class="sign-date">${trainerName || 'Head Coach'} • Signature</div>
      </div>
      <div class="sign-box">
        <div class="sign-role">Member Acknowledgment</div>
        <div class="sign-date">${isTemplate ? 'Client' : member.name} • Signature</div>
      </div>
      <div class="sign-box">
        <div class="sign-role">Progress Review Checkpoint</div>
        <div class="sign-date">Every 14 Days (Biometrics & Weight)</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="doc-footer">
      <div>${gym.name} ${gym.branchName ? `(${gym.branchName})` : ''} • ${gym.address} • Ph: ${gym.phone}</div>
      <div class="doc-footer-legal">
        Disclaimer: This nutrition chart is designed for fitness conditioning and physique goals. Consult a qualified medical practitioner or registered dietitian prior to starting any aggressive caloric deficit or supplement protocol.
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
