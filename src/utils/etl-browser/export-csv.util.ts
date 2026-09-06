/**
 * ETL Data Browser — client-side CSV export for table previews
 */

import { saveAs } from 'file-saver';

/**
 * Escape one CSV cell: quote when needed, double embedded quotes, and guard
 * against spreadsheet formula injection from leading = + @ characters.
 * (Leading '-' is left alone so negative numbers survive the round-trip.)
 */
export function escapeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return '';

    let str = typeof value === 'object' ? JSON.stringify(value) : String(value);

    if (/^[=+@]/.test(str)) {
        str = `'${str}`;
    }

    if (/[",\n\r]/.test(str)) {
        str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

/** Serialize columns + rows to CSV text (\n-separated, header row first). */
export function toCsv(columns: string[], rows: unknown[][]): string {
    const lines = [columns.map(escapeCsvCell).join(',')];
    for (const row of rows ?? []) {
        lines.push(row.map(escapeCsvCell).join(','));
    }
    return lines.join('\n');
}

/** Build and download a CSV file for a table preview. */
export function downloadCsv(filename: string, columns: string[], rows: unknown[][]): void {
    const csv = toCsv(columns, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const dated = `${filename}_${new Date().toISOString().replace(/:/g, '-')}.csv`;
    saveAs(blob, dated);
}
