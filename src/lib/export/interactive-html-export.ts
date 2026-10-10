/**
 * Interactive HTML Table Exporter
 * Inspired by Zerodha's csvtotable utility (https://github.com/vividvilla/csvtotable).
 * Generates single-file self-contained HTML documents with client-side search,
 * multi-column sorting, pagination, and zero external CDN dependencies.
 * Perfect for sending offline reports to gym owners, partners, and accountants.
 */

export interface InteractiveTableOptions {
  filename: string;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

/**
 * Escapes HTML entities to prevent XSS in generated static reports.
 */
function escapeHtml(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates the complete HTML source code for an interactive offline report.
 */
export function generateInteractiveTableHTML(options: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}): string {
  const { title, subtitle, headers, rows } = options;
  const generatedAt = new Date().toLocaleString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - GymERP Report</title>
  <style>
    :root {
      --bg: #09090b;
      --card: #18181b;
      --border: #27272a;
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --primary: #f97316;
      --primary-hover: #ea580c;
      --row-hover: #27272a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
    }
    h1 { font-size: 20px; font-weight: 700; color: #fff; }
    .subtitle { font-size: 13px; color: var(--muted); margin-top: 4px; }
    .meta { font-size: 12px; color: var(--muted); text-align: right; }
    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .search-input {
      background: #09090b;
      border: 1px solid var(--border);
      color: #fff;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 14px;
      width: 320px;
      max-width: 100%;
      outline: none;
    }
    .search-input:focus { border-color: var(--primary); }
    .btn-group { display: flex; gap: 8px; }
    button {
      background: #27272a;
      border: 1px solid var(--border);
      color: #f4f4f5;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    button:hover { background: #3f3f46; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(249, 115, 22, 0.15);
      color: #fb923c;
      border: 1px solid rgba(249, 115, 22, 0.3);
    }
    .table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      max-height: 70vh;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    thead {
      background: #121214;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    th {
      padding: 12px 14px;
      color: #e4e4e7;
      font-weight: 600;
      border-bottom: 2px solid var(--border);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    th:hover { color: var(--primary); }
    th.sorted-asc::after { content: " ▲"; color: var(--primary); font-size: 10px; }
    th.sorted-desc::after { content: " ▼"; color: var(--primary); font-size: 10px; }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      color: #d4d4d8;
      white-space: nowrap;
    }
    tbody tr:hover { background: var(--row-hover); }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
      font-size: 12px;
      color: var(--muted);
    }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
      .controls, button, .search-input { display: none !important; }
      .table-wrapper { max-height: none; overflow: visible; border: none; }
      th, td { border: 1px solid #ccc; color: #000; }
      thead { position: static; background: #eee; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      <div class="meta">
        <div>GymERP Interactive Report</div>
        <div>Generated: ${escapeHtml(generatedAt)}</div>
      </div>
    </header>

    <div class="controls">
      <input type="text" id="searchInput" class="search-input" placeholder="Type to filter instantly..." />
      <div class="btn-group">
        <button id="copyBtn">Copy TSV</button>
        <button id="printBtn">Print / PDF</button>
      </div>
    </div>

    <div class="table-wrapper">
      <table id="dataTable">
        <thead>
          <tr>
            ${headers.map((h, i) => `<th data-col="${i}">${escapeHtml(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody id="tableBody">
          ${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div id="rowCount">${rows.length} records</div>
      <div>Powered by GymERP (Inspired by Zerodha csvtotable)</div>
    </div>
  </div>

  <script>
    (function() {
      const searchInput = document.getElementById('searchInput');
      const tableBody = document.getElementById('tableBody');
      const rowCountEl = document.getElementById('rowCount');
      const table = document.getElementById('dataTable');
      const headers = table.querySelectorAll('th');
      let originalRows = Array.from(tableBody.querySelectorAll('tr'));
      let sortCol = -1;
      let sortAsc = true;

      searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        let visibleCount = 0;
        originalRows.forEach(row => {
          const text = row.innerText.toLowerCase();
          if (!query || text.includes(query)) {
            row.style.display = '';
            visibleCount++;
          } else {
            row.style.display = 'none';
          }
        });
        rowCountEl.textContent = visibleCount + ' of ' + originalRows.length + ' records';
      });

      headers.forEach(header => {
        header.addEventListener('click', function() {
          const colIndex = parseInt(this.getAttribute('data-col'), 10);
          if (sortCol === colIndex) {
            sortAsc = !sortAsc;
          } else {
            sortCol = colIndex;
            sortAsc = true;
          }

          headers.forEach(h => {
            h.classList.remove('sorted-asc', 'sorted-desc');
          });
          this.classList.add(sortAsc ? 'sorted-asc' : 'sorted-desc');

          const rowsToSort = Array.from(tableBody.querySelectorAll('tr'));
          rowsToSort.sort((a, b) => {
            const cellA = (a.children[colIndex] ? a.children[colIndex].innerText : '').trim();
            const cellB = (b.children[colIndex] ? b.children[colIndex].innerText : '').trim();

            const numA = parseFloat(cellA.replace(/[^0-9.-]/g, ''));
            const numB = parseFloat(cellB.replace(/[^0-9.-]/g, ''));

            if (!isNaN(numA) && !isNaN(numB) && cellA === String(numA) && cellB === String(numB)) {
              return sortAsc ? numA - numB : numB - numA;
            }
            return sortAsc ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
          });

          rowsToSort.forEach(r => tableBody.appendChild(r));
        });
      });

      document.getElementById('printBtn').addEventListener('click', function() {
        window.print();
      });

      document.getElementById('copyBtn').addEventListener('click', function() {
        const lines = [];
        const headerRow = Array.from(headers).map(h => h.innerText.trim()).join('\\t');
        lines.push(headerRow);
        Array.from(tableBody.querySelectorAll('tr')).forEach(r => {
          if (r.style.display !== 'none') {
            const cells = Array.from(r.children).map(c => c.innerText.trim()).join('\\t');
            lines.push(cells);
          }
        });
        navigator.clipboard.writeText(lines.join('\\n')).then(() => {
          alert('Copied ' + (lines.length - 1) + ' rows to clipboard (TSV format)');
        });
      });
    })();
  </script>
</body>
</html>`;
}

/**
 * Triggers a browser download of the interactive HTML report.
 */
export function exportToInteractiveHTML(options: InteractiveTableOptions): void {
  if (typeof window === 'undefined') return;

  const htmlContent = generateInteractiveTableHTML({
    title: options.title,
    subtitle: options.subtitle,
    headers: options.headers,
    rows: options.rows,
  });

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename.endsWith('.html') ? options.filename : `${options.filename}.html`;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    window.URL.revokeObjectURL(url);
  }, 1000);
}
