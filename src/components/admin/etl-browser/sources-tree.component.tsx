/**
 * Sources tree — selectable ETL source groups. Clicking a source scopes the
 * Tables pane to it; tables themselves are browsed in the middle pane.
 */

import React from 'react';
import { Button, InlineLoading, InlineNotification, Search, Tag } from '@carbon/react';
import { CaretLeft, CaretRight, DataBase } from '@carbon/react/icons';
import classNames from 'classnames';
import type { TableGroup } from '../../../utils/etl-browser';
import styles from './etl-browser.component.scss';

interface SourcesTreeProps {
    groups: TableGroup[];
    /** Unmatched tables; rendered as its own group only when non-empty */
    other: TableGroup;
    selectedSourceId: string;
    searchValue: string;
    loading: boolean;
    error: string | null;
    /** Panel collapsed to a slim strip (linelist workspace pattern) */
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    onSearchChange: (value: string) => void;
    onSelectSource: (sourceId: string) => void;
}

export default function SourcesTree({
    groups,
    other,
    selectedSourceId,
    searchValue,
    loading,
    error,
    collapsed = false,
    onToggleCollapsed,
    onSearchChange,
    onSelectSource,
}: SourcesTreeProps) {
    const query = searchValue.trim().toLowerCase();
    const all: TableGroup[] = [...groups, ...(other.tables.length > 0 ? [other] : [])];
    const visible = query ? all.filter((group) => group.name.toLowerCase().includes(query)) : all;

    return (
        <div className={styles.pane}>
            <div className={styles.paneHeader}>
                {!collapsed && (
                    <>
                        <span className={styles.paneTitle}>Data Sources</span>
                        <span className={styles.paneActions}>
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
                            placeholder="Search sources..."
                            labelText="Search sources"
                            value={searchValue}
                            onChange={(e) => onSearchChange((e as React.ChangeEvent<HTMLInputElement>).target.value)}
                        />
                    </div>
                    <div className={styles.paneBody}>
                        {loading && <InlineLoading description="Loading sources..." />}
                        {error && <InlineNotification lowContrast kind="error" title="Error" subtitle={error} />}
                        {!loading && !error && visible.length === 0 && <p className={styles.treeEmpty}>No sources match</p>}
                        {visible.length > 0 && (
                            <ul className={styles.sourceList}>
                                {visible.map((group) => (
                                    <li key={group.id}>
                                        <button
                                            type="button"
                                            className={classNames(
                                                styles.sourceRow,
                                                selectedSourceId === group.id && styles.sourceRowSelected,
                                            )}
                                            onClick={() => onSelectSource(group.id)}>
                                            <span className={styles.sourceRowIcon}>
                                                <DataBase size={16} />
                                            </span>
                                            <span className={styles.sourceRowName}>{group.name}</span>
                                            <Tag size="sm" type="gray">
                                                {group.tables.length}
                                            </Tag>
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
