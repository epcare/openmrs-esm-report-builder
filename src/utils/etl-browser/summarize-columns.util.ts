/**
 * ETL Data Browser — column metadata summary for the Metadata tab
 */

import type { TableColumn } from '../../resources/theme/etl-table-meta.api';

export type ColumnTypeSummary = { type: string; count: number };

/**
 * Summarize a column list into a total count and a per-data-type breakdown
 * (sorted by count desc, then alphabetically). Columns without a type are
 * grouped under 'unknown'.
 */
export function summarizeColumns(columns: TableColumn[]): { total: number; byType: ColumnTypeSummary[] } {
    const counts = new Map<string, number>();

    for (const column of columns ?? []) {
        const type = column?.type?.trim() || 'unknown';
        counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    const byType = Array.from(counts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

    return { total: columns?.length ?? 0, byType };
}
