/**
 * Middle pane — searchable list of the tables in the selected source
 * (or all tables), with approximate row counts and freshness subtitles.
 */

import React from 'react';
import { Button, InlineLoading, InlineNotification, Search, Tag } from '@carbon/react';
import { CaretLeft, CaretRight, TableBuilt } from '@carbon/react/icons';
import classNames from 'classnames';
import type { SchemaTable } from '../../../resources/theme/etl-schema.api';
import { formatRelativeTime } from '../../../utils/etl-monitor/value-formatters.util';
import styles from './etl-browser.component.scss';

interface TableListProps {
    title: string;
    tables: SchemaTable[];
    selectedTable: string | null;
    searchValue: string;
    loading: boolean;
    error: string | null;
    /** Panel collapsed to a slim strip (linelist workspace pattern) */
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    /** Shown as a reset control when a single source is in scope */
    onResetFilter?: () => void;
    onSearchChange: (value: string) => void;
    onSelectTable: (tableName: string) => void;
}

function tableSubtitle(table: SchemaTable): string {
    const rows = typeof table.rows === 'number' ? `${table.rows.toLocaleString()} rows` : 'rows unknown';
    const freshness = table.updateTime ? formatRelativeTime(table.updateTime, { pastOnly: true }) : '—';
    return `${rows} • ${freshness}`;
}

export default function TableList({
    title,
    tables,
    selectedTable,
    searchValue,
    loading,
    error,
    collapsed = false,
    onToggleCollapsed,
    onResetFilter,
    onSearchChange,
    onSelectTable,
}: TableListProps) {
    const query = searchValue.trim().toLowerCase();
    const visible = query ? tables.filter((t) => t.name.toLowerCase().includes(query)) : tables;

    return (
        <div className={styles.pane}>
            <div className={styles.paneHeader}>
                {!collapsed && (
                    <>
                        <span className={styles.paneTitle}>{title}</span>
                        <span className={styles.paneActions}>
                            {onResetFilter && (
                                <button type="button" className={styles.iconAction} title="Show all sources" onClick={onResetFilter}>
                                    All sources
                                </button>
                            )}
                            <Tag size="sm" type="cool-gray">
                                {tables.length}
                            </Tag>
                            {onToggleCollapsed && (
                                <Button
                                    kind="ghost"
                                    size="sm"
                                    hasIconOnly
                                    renderIcon={CaretLeft}
                                    iconDescription="Collapse panel"
                                    onClick={onToggleCollapsed}
                                />
                            )}
                        </span>
                    </>
                )}
                {collapsed && onToggleCollapsed && (
                    <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={CaretRight}
                        iconDescription="Expand panel"
                        onClick={onToggleCollapsed}
                    />
                )}
            </div>
            {!collapsed && (
                <>
                    <div className={styles.paneSearch}>
                        <Search
                            size="sm"
                            placeholder="Search tables..."
                            labelText="Search tables"
                            value={searchValue}
                            onChange={(e) => onSearchChange((e as React.ChangeEvent<HTMLInputElement>).target.value)}
                        />
                    </div>
                    <div className={styles.paneBody}>
                        {loading && <InlineLoading description="Loading tables..." />}
                        {error && <InlineNotification lowContrast kind="error" title="Error" subtitle={error} />}
                        {!loading && !error && visible.length === 0 && (
                            <p className={styles.treeEmpty}>No tables match</p>
                        )}
                        {visible.length > 0 && (
                            <ul className={styles.tableList}>
                                {visible.map((table) => (
                                    <li key={table.name}>
                                        <button
                                            type="button"
                                            className={classNames(
                                                styles.tableRow,
                                                selectedTable === table.name && styles.tableRowSelected,
                                            )}
                                            onClick={() => onSelectTable(table.name)}>
                                            <span className={styles.tableRowIcon}>
                                                <TableBuilt size={18} />
                                            </span>
                                            <span className={styles.tableRowText}>
                                                <span className={styles.tableName}>{table.name}</span>
                                                <span className={styles.tableMeta}>{tableSubtitle(table)}</span>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
