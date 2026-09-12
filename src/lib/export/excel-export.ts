import * as XLSX from 'xlsx';

export interface ColumnDef {
  header: string;
  key: string;
  width?: number;
}

export interface SheetConfig {
  sheetName: string;
  data: Record<string, any>[];
  columns?: ColumnDef[];
}

export interface ExcelExportOptions {
  filename: string;
  sheets: SheetConfig[];
}

export interface CSVExportOptions {
  filename: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

/**
 * Calculates responsive column widths based on the maximum string length of each column.
 */
function calculateColumnWidths(data: Record<string, any>[], columns?: ColumnDef[]): { wch: number }[] {
  if (!columns || columns.length === 0) {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]);
    return keys.map(key => {
      const maxLen = Math.max(
        key.length,
        ...data.map(row => String(row[key] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
  }

  return columns.map(col => {
    if (col.width) return { wch: col.width };
    const maxLen = Math.max(
      col.header.length,
      ...data.map(row => String(row[col.key] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });
}

/**
 * Exports data to a genuine Microsoft Excel (.xlsx) workbook with multiple sheets,
 * auto-calculated column widths, and proper formatting.
 */
export function exportToExcel(options: ExcelExportOptions): void {
  const { filename, sheets } = options;
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    let worksheetData: any[];

    if (sheet.columns && sheet.columns.length > 0) {
      // Map data according to defined columns with friendly headers
      worksheetData = sheet.data.map(item => {
        const mappedRow: Record<string, any> = {};
        for (const col of sheet.columns!) {
          mappedRow[col.header] = item[col.key] ?? '';
        }
        return mappedRow;
      });
    } else {
      worksheetData = sheet.data;
    }

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Apply auto column widths
    worksheet['!cols'] = calculateColumnWidths(sheet.data, sheet.columns);

    // Sanitize sheet name (max 31 chars, no invalid characters)
    const sanitizedSheetName = sheet.sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Sheet';
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedSheetName);
  }

  // Generate file and trigger browser download
  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}

/**
 * Exports data to a standard CSV file with proper CRLF line breaks and UTF-8 BOM
 * ensuring perfect rendering in Microsoft Excel across Windows and Mac.
 */
export function exportToCSV(options: CSVExportOptions): void {
  const { filename, headers, rows } = options;

  const escapeCell = (cell: any): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvRows = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ];

  // \uFEFF is the UTF-8 Byte Order Mark (BOM) needed by Excel to recognize UTF-8 encoding
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
