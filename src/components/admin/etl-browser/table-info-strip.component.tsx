/**
 * Table information strip — one-line facts about the selected table.
 */

import React from 'react';
import type { SchemaTable } from '../../../resources/theme/etl-schema.api';
import { formatRelativeTime } from '../../../utils/etl-monitor/value-formatters.util';
import type { DetailSource } from './table-detail.component';
import styles from './etl-browser.component.scss';

interface TableInfoStripProps {
    source?: DetailSource;
    table?: SchemaTable | null;
}

export default function TableInfoStrip({ source, table }: TableInfoStripProps) {
    if (!table) {
        return null;
    }

    const cells: Array<{ label: string; value: React.ReactNode }> = [
        { label: 'Source', value: source?.name ?? '—' },
        { label: 'Schema', value: source?.schemaName ?? '—' },
        { label: 'Table', value: table.name },
        { label: 'Type', value: table.tableType === 'VIEW' ? 'View' : 'Table' },
        {
            label: 'Rows',
            value:
                typeof table.rows === 'number' ? (
                    <strong>{table.rows.toLocaleString()}</strong>
                ) : (
                    '—'
                ),
        },
        {
            label: 'Last refreshed',
            value: table.updateTime ? formatRelativeTime(table.updateTime, { pastOnly: true }) : '—',
        },
    ];

    return (
        <div className={styles.infoStrip}>
            {cells.map((cell) => (
                <div key={cell.label} className={styles.infoCell}>
                    <span className={styles.infoLabel}>{cell.label}</span>
                    <span className={styles.infoValue}>{cell.value}</span>
                </div>
            ))}
        </div>
    );
}
