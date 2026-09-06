/**
 * ETL Data Browser Page
 *
 * Three-pane browser (mirrors docs/importexport/etl/etl-browser.html):
 * - Data Sources: selectable ETL source list (tables grouped under their
 *   source by tablePatterns prefix matching); panes drag-resize and collapse
 *   like the linelist editor workspace
 * - Tables: searchable list of the selected source's tables (or all), with
 *   approximate row counts and freshness
 * - Detail: Data / Columns / Metadata / Relationships tabs for one table,
 *   with the table information strip at the bottom of the pane
 *
 * The selected table deep-links via ?table=<name> (and ?source=<uuid>).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Stack } from '@carbon/react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { listETLSources } from '../../../resources/etl-source/etl-source.api';
import type { ETLSourceDto } from '../../../resources/etl-source/etl-source.api';
import { useETLSchemaTables, useETLTableMeta } from '../../../hooks/theme';
import { groupTablesBySource, OTHER_GROUP_ID } from '../../../utils/etl-browser';
import type { TableGroup } from '../../../utils/etl-browser';
import Header from '../../shared/header/header.component';
import SourcesTree from './sources-tree.component';
import TableList from './table-list.component';
import TableDetail, { TableDetailEmpty } from './table-detail.component';
import type { DetailTab } from './table-detail.component';
import styles from './etl-browser.component.scss';

const ALL_SOURCES = 'all';

/* Pane resize bounds (mirrors the linelist editor workspace) */
const SOURCES_DEFAULT_WIDTH = 260;
const SOURCES_MIN_WIDTH = 200;
const SOURCES_MAX_WIDTH = 500;
const TABLES_DEFAULT_WIDTH = 300;
const TABLES_MIN_WIDTH = 240;
const TABLES_MAX_WIDTH = 600;
const COLLAPSED_WIDTH = 48;

export default function EtlBrowserPage() {
    const { t } = useTranslation();

    const [sources, setSources] = useState<ETLSourceDto[]>([]);
    const [sourcesLoading, setSourcesLoading] = useState(true);
    const [sourcesError, setSourcesError] = useState<string | null>(null);

    const { tables, loading: tablesLoading, error: tablesError } = useETLSchemaTables(true);

    const [sourceSearch, setSourceSearch] = useState('');
    const [tableSearch, setTableSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState<string>(ALL_SOURCES);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<DetailTab>('data');

    const [searchParams, setSearchParams] = useSearchParams();

    // Pane sizing/collapse (linelist editor workspace pattern)
    const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
    const [sourcesWidth, setSourcesWidth] = useState(SOURCES_DEFAULT_WIDTH);
    const [tablesCollapsed, setTablesCollapsed] = useState(false);
    const [tablesWidth, setTablesWidth] = useState(TABLES_DEFAULT_WIDTH);
    const [isResizingSources, setIsResizingSources] = useState(false);
    const [isResizingTables, setIsResizingTables] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const gridRect = document.querySelector(`.${styles.browserGrid}`)?.getBoundingClientRect();
            if (!gridRect) return;
            if (isResizingSources) {
                const next = Math.max(SOURCES_MIN_WIDTH, Math.min(SOURCES_MAX_WIDTH, e.clientX - gridRect.left));
                setSourcesWidth(next);
            }
            if (isResizingTables) {
                const sourcesEnd = (sourcesCollapsed ? COLLAPSED_WIDTH : sourcesWidth) + gridRect.left;
                const next = Math.max(TABLES_MIN_WIDTH, Math.min(TABLES_MAX_WIDTH, e.clientX - sourcesEnd));
                setTablesWidth(next);
            }
        };

        const handleMouseUp = () => {
            setIsResizingSources(false);
            setIsResizingTables(false);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
        };

        if (isResizingSources || isResizingTables) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = 'default';
                document.body.style.userSelect = '';
            };
        }
    }, [isResizingSources, isResizingTables, sourcesWidth, sourcesCollapsed]);

    const startResizeSources = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingSources(true);
    }, []);

    const startResizeTables = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingTables(true);
    }, []);

    // Load ETL sources for the grouping
    useEffect(() => {
        const ac = new AbortController();
        setSourcesLoading(true);
        setSourcesError(null);
        listETLSources(undefined, ac.signal)
            .then((data) => {
                if (!ac.signal.aborted) setSources(data);
            })
            .catch((e) => {
                if (e?.name !== 'AbortError') setSourcesError(e?.message ?? 'Failed to load ETL sources');
            })
            .finally(() => {
                if (!ac.signal.aborted) setSourcesLoading(false);
            });
        return () => ac.abort();
    }, []);

    const { groups, other } = useMemo(() => groupTablesBySource(tables, sources), [tables, sources]);
    const allGroups = useMemo(() => [...groups, ...(other.tables.length > 0 ? [other] : [])], [groups, other]);

    const tableByName = useMemo(() => new Map(tables.map((table) => [table.name, table])), [tables]);
    const groupByTable = useMemo(() => {
        const map = new Map<string, TableGroup>();
        for (const group of allGroups) {
            for (const table of group.tables) {
                map.set(table.name, group);
            }
        }
        return map;
    }, [allGroups]);

    // Restore selection from the ?table= / ?source= deep link once tables load
    useEffect(() => {
        if (tablesLoading || tables.length === 0) return;
        const tableParam = searchParams.get('table');
        if (!tableParam || !tableByName.has(tableParam)) return;

        setSelectedTable(tableParam);
        const group = groupByTable.get(tableParam);
        if (group) {
            setSourceFilter(group.id);
        }
        const sourceParam = searchParams.get('source');
        if (sourceParam) {
            setSourceFilter(sourceParam);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tablesLoading, tables]);

    const updateUrlParams = useCallback(
        (tableName: string | null, sourceId: string) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    if (tableName) {
                        next.set('table', tableName);
                    } else {
                        next.delete('table');
                    }
                    if (sourceId && sourceId !== ALL_SOURCES) {
                        next.set('source', sourceId);
                    } else {
                        next.delete('source');
                    }
                    return next;
                },
                { replace: true },
            );
        },
        [setSearchParams],
    );

    const handleSelectSource = useCallback(
        (sourceId: string) => {
            setSourceFilter(sourceId);
            updateUrlParams(selectedTable, sourceId);
        },
        [selectedTable, updateUrlParams],
    );

    const handleSelectTable = useCallback(
        (tableName: string) => {
            setSelectedTable(tableName);
            setActiveTab('data');
            const group = groupByTable.get(tableName)?.id;
            const nextSourceFilter = group ?? sourceFilter;
            setSourceFilter(nextSourceFilter);
            updateUrlParams(tableName, nextSourceFilter);
        },
        [groupByTable, sourceFilter, updateUrlParams],
    );

    const handleResetSourceFilter = useCallback(() => {
        setSourceFilter(ALL_SOURCES);
        updateUrlParams(selectedTable, ALL_SOURCES);
    }, [selectedTable, updateUrlParams]);

    const selectedTableMeta = selectedTable ? tableByName.get(selectedTable) : undefined;
    const selectedGroup = selectedTableMeta ? groupByTable.get(selectedTableMeta.name) : undefined;
    const selectedSource = groups.find((g) => g.id === selectedGroup?.id);

    // Middle pane contents follow the source filter (tree selection syncs it)
    const listedTables = useMemo(() => {
        if (sourceFilter === ALL_SOURCES) return tables;
        return sourceFilter === OTHER_GROUP_ID
            ? other.tables
            : groups.find((g) => g.id === sourceFilter)?.tables ?? tables;
    }, [sourceFilter, tables, groups, other]);

    const listTitle =
        sourceFilter === ALL_SOURCES
            ? t('etlBrowserAllTables', 'All tables')
            : t('etlBrowserTablesIn', 'Tables in {{name}}', {
                  name: allGroups.find((g) => g.id === sourceFilter)?.name ?? '',
              });

    // Columns are fetched once per table and shared by the Columns + Metadata tabs
    const columnsHook = useETLTableMeta(selectedTable ?? undefined, Boolean(selectedTable));

    return (
        <Stack gap={5}>
            <Header
                title={t('etlBrowser', 'ETL Data Browser')}
                subtitle={t('etlBrowserSubtitle', 'Explore ETL schemas, tables, columns, and sample records.')}
            />

            <div className={styles.browserGrid}>
                <aside
                    className={styles.paneWrap}
                    style={{ width: sourcesCollapsed ? COLLAPSED_WIDTH : sourcesWidth }}>
                    <SourcesTree
                        groups={groups}
                        other={other}
                        selectedSourceId={sourceFilter}
                        searchValue={sourceSearch}
                        loading={sourcesLoading}
                        error={sourcesError}
                        collapsed={sourcesCollapsed}
                        onToggleCollapsed={() => setSourcesCollapsed((collapsed) => !collapsed)}
                        onSearchChange={setSourceSearch}
                        onSelectSource={handleSelectSource}
                    />
                </aside>

                <div
                    className={styles.resizeHandle}
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={startResizeSources}
                />

                <aside
                    className={styles.paneWrap}
                    style={{ width: tablesCollapsed ? COLLAPSED_WIDTH : tablesWidth }}>
                    <TableList
                        title={listTitle}
                        tables={listedTables}
                        selectedTable={selectedTable}
                        searchValue={tableSearch}
                        loading={tablesLoading}
                        error={tablesError}
                        collapsed={tablesCollapsed}
                        onToggleCollapsed={() => setTablesCollapsed((collapsed) => !collapsed)}
                        onResetFilter={sourceFilter !== ALL_SOURCES ? handleResetSourceFilter : undefined}
                        onSearchChange={setTableSearch}
                        onSelectTable={(name) => handleSelectTable(name)}
                    />
                </aside>

                <div
                    className={classNames(styles.resizeHandle, styles.resizeHandleBeforeDetail)}
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={startResizeTables}
                />

                {selectedTableMeta ? (
                    <TableDetail
                        table={selectedTableMeta}
                        source={selectedSource}
                        columns={columnsHook.columns}
                        columnsLoading={columnsHook.loading}
                        columnsError={columnsHook.error}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                ) : (
                    <TableDetailEmpty />
                )}
            </div>
        </Stack>
    );
}
