import { DietChartData } from './types';

export function generateDietChartHTML(data: DietChartData): string {
  const { gym, member, dateIssued, trainerName, trainerNotes, meals, totalCalories, totalProtein, totalCarbs, totalFats } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diet Chart - ${member.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #111827;
      --secondary: #4f46e5;
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
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .header {
      text-align: center;
      border-bottom: 2px solid var(--border);
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }

    .gym-name {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 3rem;
      color: var(--primary);
      letter-spacing: 1px;
      margin-bottom: 0.5rem;
    }

    .doc-title {
      font-size: 1.25rem;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--secondary);
      letter-spacing: 2px;
    }

    .member-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-light);
      font-weight: 600;
    }

    .info-value {
      font-weight: 500;
      color: var(--primary);
    }

    .macros-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2.5rem;
      text-align: center;
    }

    .macro-card {
      background: #ffffff;
      border: 1px solid var(--border);
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    .macro-val {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 2rem;
      color: var(--primary);
      line-height: 1;
      margin-bottom: 0.25rem;
    }

    .macro-label {
      font-size: 0.75rem;
      color: var(--text-light);
      text-transform: uppercase;
      font-weight: 600;
    }

    .meals-container {
      margin-bottom: 3rem;
    }

    .meal-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }

    .meal-header {
      background: #f3f4f6;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
    }

    .meal-title {
      font-weight: 600;
      color: var(--primary);
      font-size: 1.125rem;
    }

    .meal-time {
      font-size: 0.875rem;
      color: var(--text-light);
      background: white;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid var(--border);
    }

    .meal-content {
      padding: 1.5rem;
    }

    .meal-items {
      list-style-type: none;
      margin-bottom: 1rem;
    }

    .meal-items li {
      position: relative;
      padding-left: 1.5rem;
      margin-bottom: 0.5rem;
      color: var(--primary);
    }

    .meal-items li::before {
      content: "•";
      color: var(--secondary);
      font-weight: bold;
      position: absolute;
      left: 0;
    }

    .meal-macros {
      display: flex;
      gap: 1.5rem;
      padding-top: 1rem;
      border-top: 1px dashed var(--border);
      font-size: 0.875rem;
    }

    .meal-macro {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
    }

    .meal-macro strong {
      color: var(--primary);
    }

    .meal-macro span {
      color: var(--text-light);
      font-size: 0.75rem;
    }

    .notes-section {
      background: #fefce8;
      border: 1px solid #fef08a;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .notes-section h3 {
      font-size: 0.875rem;
      text-transform: uppercase;
      color: #ca8a04;
      margin-bottom: 0.5rem;
    }

    .notes-section p {
      color: #854d0e;
      font-size: 0.95rem;
    }

    .footer {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
      color: var(--text-light);
      font-size: 0.875rem;
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
      .meal-card {
        page-break-inside: avoid;
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
      <h1 class="gym-name">${gym.name}</h1>
      <div class="doc-title">Personalized Diet Chart</div>
    </div>

    <div class="member-info">
      <div class="info-item">
        <span class="info-label">Member Name</span>
        <span class="info-value">${member.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Date Issued</span>
        <span class="info-value">${new Date(dateIssued).toLocaleDateString()}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Current Goal</span>
        <span class="info-value">${member.goal || 'General Fitness'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Trainer / Nutritionist</span>
        <span class="info-value">${trainerName || 'Assigned Trainer'}</span>
      </div>
      ${member.weight ? `
      <div class="info-item">
        <span class="info-label">Weight</span>
        <span class="info-value">${member.weight} kg</span>
      </div>
      ` : ''}
      ${member.height ? `
      <div class="info-item">
        <span class="info-label">Height</span>
        <span class="info-value">${member.height}</span>
      </div>
      ` : ''}
    </div>

    <div class="macros-summary">
      <div class="macro-card">
        <div class="macro-val">${totalCalories}</div>
        <div class="macro-label">Calories</div>
      </div>
      <div class="macro-card">
        <div class="macro-val">${totalProtein}g</div>
        <div class="macro-label">Protein</div>
      </div>
      <div class="macro-card">
        <div class="macro-val">${totalCarbs}g</div>
        <div class="macro-label">Carbs</div>
      </div>
      <div class="macro-card">
        <div class="macro-val">${totalFats}g</div>
        <div class="macro-label">Fats</div>
      </div>
    </div>

    <div class="meals-container">
      ${meals.map(meal => `
      <div class="meal-card">
        <div class="meal-header">
          <div class="meal-title">${meal.name}</div>
          ${meal.time ? `<div class="meal-time">${meal.time}</div>` : ''}
        </div>
        <div class="meal-content">
          <ul class="meal-items">
            ${meal.items.map(item => `<li>${item}</li>`).join('')}
          </ul>
          <div class="meal-macros">
            <div class="meal-macro"><strong>${meal.calories}</strong> <span>kcal</span></div>
            <div class="meal-macro"><strong>${meal.protein}g</strong> <span>Protein</span></div>
            <div class="meal-macro"><strong>${meal.carbs}g</strong> <span>Carbs</span></div>
            <div class="meal-macro"><strong>${meal.fats}g</strong> <span>Fats</span></div>
          </div>
        </div>
      </div>
      `).join('')}
    </div>

    ${trainerNotes ? `
    <div class="notes-section">
      <h3>Trainer Notes & Instructions</h3>
      <p>${trainerNotes}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>${gym.name} - ${gym.address}</p>
      <p>Phone: ${gym.phone} | Email: ${gym.email}</p>
      <p style="margin-top: 1rem; font-size: 0.75rem;">This diet chart is generalized. Consult a certified nutritionist before starting any drastic dietary changes.</p>
    </div>
  </div>
</body>
</html>
  `;
}
