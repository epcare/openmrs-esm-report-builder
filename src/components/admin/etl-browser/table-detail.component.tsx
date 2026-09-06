/**
 * Detail pane — table header, meta line, actions and the four detail tabs
 * (Data / Columns / Metadata / Relationships).
 */

import React from 'react';
import { Button, Tab, TabList, TabPanel, TabPanels, Tabs, Tile } from '@carbon/react';
import { Renew, TableBuilt } from '@carbon/react/icons';
import type { SchemaTable } from '../../../resources/theme/etl-schema.api';
import type { TableColumn } from '../../../resources/theme/etl-table-meta.api';
import { formatRelativeTime } from '../../../utils/etl-monitor/value-formatters.util';
import ColumnsTab from './columns-tab.component';
import MetadataTab from './metadata-tab.component';
import PreviewGrid from './preview-grid.component';
import RelationshipsTab from './relationships-tab.component';
import TableInfoStrip from './table-info-strip.component';
import { useTablePreview } from './use-table-preview';
import styles from './etl-browser.component.scss';

export type DetailTab = 'data' | 'columns' | 'metadata' | 'relationships';

/** Minimal source facts the detail pane needs (satisfied by a TableGroup) */
export type DetailSource = { name?: string; schemaName?: string };

interface TableDetailProps {
    table: SchemaTable;
    source?: DetailSource;
    columns: TableColumn[];
    columnsLoading: boolean;
    columnsError: string | null;
    activeTab: DetailTab;
    onTabChange: (tab: DetailTab) => void;
}

const TAB_INDEX: DetailTab[] = ['data', 'columns', 'metadata', 'relationships'];

export default function TableDetail({
    table,
    source,
    columns,
    columnsLoading,
    columnsError,
    activeTab,
    onTabChange,
}: TableDetailProps) {
    const preview = useTablePreview(table.name);

    const metaParts = [
        `Source: ${source?.name ?? '—'}`,
        `Schema: ${source?.schemaName ?? '—'}`,
        `Type: ${table.tableType === 'VIEW' ? 'View' : 'Table'}`,
        `Rows: ${typeof table.rows === 'number' ? table.rows.toLocaleString() : '—'}`,
        `Last refreshed: ${table.updateTime ? formatRelativeTime(table.updateTime, { pastOnly: true }) : '—'}`,
    ];

    return (
        <div className={`${styles.pane} ${styles.detailPane}`}>
            <div className={styles.detailHeader}>
                <span className={styles.detailIcon}>
                    <TableBuilt size={22} />
                </span>
                <div className={styles.detailHeaderText}>
                    <h4 className={styles.detailTitle} title={table.name}>
                        Table: {table.name}
                    </h4>
                    <p className={styles.detailMeta}>{metaParts.join('     ')}</p>
                </div>
                <div className={styles.detailActions}>
                    <Button kind="secondary" size="sm" renderIcon={Renew} onClick={preview.refresh}>
                        Refresh
                    </Button>
                </div>
            </div>

            <div className={styles.detailBody}>
                <Tabs
                    selectedIndex={TAB_INDEX.indexOf(activeTab)}
                    onChange={({ selectedIndex }) => onTabChange(TAB_INDEX[selectedIndex] ?? 'data')}>
                    <TabList aria-label="Table detail tabs">
                        <Tab>Data</Tab>
                        <Tab>Columns</Tab>
                        <Tab>Metadata</Tab>
                        <Tab>Relationships</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel>
                            <PreviewGrid
                                table={table.name}
                                data={preview.data}
                                loading={preview.status === 'loading'}
                                error={preview.error}
                                onRefresh={preview.refresh}
                            />
                        </TabPanel>
                        <TabPanel>
                            <ColumnsTab columns={columns} loading={columnsLoading} error={columnsError} />
                        </TabPanel>
                        <TabPanel>
                            <MetadataTab table={table} source={source} columns={columns} />
                        </TabPanel>
                        <TabPanel>
                            <RelationshipsTab />
                        </TabPanel>
                    </TabPanels>
                </Tabs>

                <TableInfoStrip source={source} table={table} />
            </div>
        </div>
    );
}

/** Empty detail pane shown when no table is selected */
export function TableDetailEmpty() {
    return (
        <div className={`${styles.pane} ${styles.detailPane}`}>
            <Tile className={styles.emptyState}>
                <TableBuilt size={32} />
                <h5>No table selected</h5>
                <p>Select a table from the list to explore its columns and preview its data.</p>
            </Tile>
        </div>
    );
}
