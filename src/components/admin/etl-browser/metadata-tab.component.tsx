/**
 * Metadata tab — known facts about the table plus a column-type breakdown.
 */

import React from 'react';
import { Tag } from '@carbon/react';
import type { SchemaTable } from '../../../resources/theme/etl-schema.api';
import type { TableColumn } from '../../../resources/theme/etl-table-meta.api';
import { summarizeColumns } from '../../../utils/etl-browser';
import { formatRelativeTime } from '../../../utils/etl-monitor/value-formatters.util';
import type { DetailSource } from './table-detail.component';
import styles from './etl-browser.component.scss';

interface MetadataTabProps {
    table: SchemaTable;
    source?: DetailSource;
    columns: TableColumn[];
}

function formatRows(rows?: number | null): string {
    return typeof rows === 'number' ? `${rows.toLocaleString()} (approximate)` : '—';
}

function formatFreshness(updateTime?: string | null): string {
    return updateTime ? formatRelativeTime(updateTime, { pastOnly: true }) : '—';
}

export default function MetadataTab({ table, source, columns }: MetadataTabProps) {
    const summary = summarizeColumns(columns);

    const facts: Array<{ label: string; value: string }> = [
        { label: 'Source', value: source?.name ?? '—' },
        { label: 'Schema', value: source?.schemaName ?? '—' },
        { label: 'Type', value: table.tableType === 'VIEW' ? 'View' : 'Table' },
        { label: 'Rows', value: formatRows(table.rows) },
        { label: 'Last refreshed', value: formatFreshness(table.updateTime) },
        { label: 'Columns', value: columns.length ? String(columns.length) : '—' },
    ];

    return (
        <div>
            <div className={styles.metadataFacts}>
                {facts.map((fact) => (
                    <div key={fact.label} className={styles.infoCell}>
                        <span className={styles.infoLabel}>{fact.label}</span>
                        <span className={styles.infoValue}>{fact.value}</span>
                    </div>
                ))}
            </div>

            <h6 className={styles.metadataHeading}>Column types</h6>
            {summary.byType.length === 0 ? (
                <p className={styles.truncateNote}>Column metadata not loaded yet.</p>
            ) : (
                <div className={styles.metadataTypes}>
                    {summary.byType.map((entry) => (
                        <Tag key={entry.type} size="sm" type="cool-gray">
                            {entry.type}: {entry.count}
                        </Tag>
                    ))}
                </div>
            )}
        </div>
    );
}
