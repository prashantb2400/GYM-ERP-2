import { ExercisePlanData } from './types';

export function generateExercisePlanHTML(data: ExercisePlanData): string {
  const { gym, member, dateIssued, trainerName, duration, days } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workout Plan - ${member.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #111827;
      --secondary: #ef4444; /* red for workout theme */
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
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid var(--border);
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }

    .gym-name {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 3rem;
      color: var(--primary);
      letter-spacing: 1px;
      margin-bottom: 0.25rem;
      line-height: 1;
    }

    .doc-title {
      font-size: 1.25rem;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--secondary);
      letter-spacing: 2px;
    }

    .header-right {
      text-align: right;
    }

    .member-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2.5rem;
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
      margin-bottom: 0.25rem;
    }

    .info-value {
      font-weight: 500;
      color: var(--primary);
      font-size: 1.125rem;
    }

    .day-section {
      margin-bottom: 3rem;
      page-break-inside: avoid;
    }

    .day-header {
      background: var(--primary);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .day-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 1.5rem;
      letter-spacing: 1px;
    }

    .day-focus {
      font-size: 0.875rem;
      background: rgba(255,255,255,0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
    }

    .exercise-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-top: none;
    }

    .exercise-table th {
      background: #f3f4f6;
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-light);
      font-weight: 600;
    }

    .exercise-table td {
      padding: 1rem;
      border-top: 1px solid var(--border);
      font-size: 0.875rem;
      color: var(--primary);
      vertical-align: top;
    }

    .exercise-name {
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .muscle-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.5rem;
    }

    .muscle-tag {
      font-size: 0.65rem;
      background: #fee2e2;
      color: #991b1b;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      text-transform: uppercase;
    }
    
    .exercise-notes {
      font-size: 0.75rem;
      color: var(--text-light);
      font-style: italic;
      margin-top: 0.5rem;
    }

    .text-center {
      text-align: center;
    }

    .footer {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
      color: var(--text-light);
      font-size: 0.875rem;
      margin-top: 4rem;
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
      .day-header {
        background: #e5e7eb !important;
        color: black !important;
        border: 1px solid var(--border);
      }
      .day-focus {
        background: white !important;
        color: black !important;
        border: 1px solid var(--border);
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
        <div class="doc-title">Workout Program</div>
      </div>
      <div class="header-right">
        <div style="font-size: 0.875rem; color: var(--text-light);">Date: ${new Date(dateIssued).toLocaleDateString()}</div>
      </div>
    </div>

    <div class="member-info">
      <div class="info-item">
        <span class="info-label">Member</span>
        <span class="info-value">${member.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Trainer</span>
        <span class="info-value">${trainerName || 'N/A'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Program Duration</span>
        <span class="info-value">${duration || '4 Weeks'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Goal / Focus</span>
        <span class="info-value">${member.goal || 'General Fitness'}</span>
      </div>
    </div>

    <div class="days-container">
      ${days.map(day => `
      <div class="day-section">
        <div class="day-header">
          <div class="day-title">${day.dayName}</div>
          ${day.focus ? `<div class="day-focus">${day.focus}</div>` : ''}
        </div>
        <table class="exercise-table">
          <thead>
            <tr>
              <th style="width: 40%">Exercise</th>
              <th class="text-center" style="width: 15%">Sets</th>
              <th class="text-center" style="width: 20%">Reps</th>
              <th class="text-center" style="width: 25%">Rest</th>
            </tr>
          </thead>
          <tbody>
            ${day.exercises.map(ex => `
            <tr>
              <td>
                <div class="exercise-name">${ex.name}</div>
                ${ex.muscleGroups && ex.muscleGroups.length > 0 ? `
                <div class="muscle-tags">
                  ${ex.muscleGroups.map(m => `<span class="muscle-tag">${m}</span>`).join('')}
                </div>
                ` : ''}
                ${ex.notes ? `<div class="exercise-notes">${ex.notes}</div>` : ''}
              </td>
              <td class="text-center" style="font-weight: 600;">${ex.sets}</td>
              <td class="text-center">${ex.reps}</td>
              <td class="text-center">${ex.rest}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>${gym.name} - ${gym.address}</p>
      <p>Phone: ${gym.phone} | Email: ${gym.email}</p>
      <p style="margin-top: 1rem; font-size: 0.75rem;">Warm up properly before starting any workout. Listen to your body and stay hydrated.</p>
    </div>
  </div>
</body>
</html>
  `;
}
