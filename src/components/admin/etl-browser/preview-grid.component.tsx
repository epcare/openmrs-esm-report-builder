/**
 * Data tab — preview grid over the fetched ≤1000-row sample.
 * Search spans all fetched rows; pagination is client-side.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  DataTable,
  InlineLoading,
  InlineNotification,
  Pagination,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from '@carbon/react';
import { Renew } from '@carbon/react/icons';
import type { SqlPreviewResponse } from '../../../resources/preview/sql-preview.api';
import { downloadCsv } from '../../../utils/etl-browser';
import styles from './etl-browser.component.scss';

const PREVIEW_ROW_CAP = 1000;
const PAGE_SIZES = [10, 25, 50, 100];

interface PreviewGridProps {
    table: string;
    data?: SqlPreviewResponse;
    loading: boolean;
    error?: string;
    onRefresh: () => void;
}

export default function PreviewGrid({ table, data, loading, error, onRefresh }: PreviewGridProps) {
    const [rowSearch, setRowSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        setRowSearch('');
        setCurrentPage(1);
    }, [table, data]);

    const filtered = useMemo(() => {
        if (!data) return [];
        const query = rowSearch.trim().toLowerCase();
        if (!query) return data.rows;
        return data.rows.filter((row) => row.some((cell) => String(cell ?? '').toLowerCase().includes(query)));
    }, [data, rowSearch]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pageRows = filtered.slice(startIndex, startIndex + pageSize);
    const showTruncatedNote = Boolean(data && (data.truncated || data.rows.length >= PREVIEW_ROW_CAP));

    const headers = (data?.columns ?? []).map((column) => ({ key: column, header: column }));
    const rows: Array<Record<string, any> & { id: string }> = pageRows.map((row, index) => {
        const mapped: Record<string, any> & { id: string } = { id: String(startIndex + index) };
        data?.columns.forEach((column, columnIndex) => {
            const value = row[columnIndex];
            mapped[column] = value === null || value === undefined ? '' : String(value);
        });
        return mapped;
    });

    if (loading) {
        return <InlineLoading description={`Loading preview of ${table}...`} />;
    }

    if (error) {
        return (
            <div>
                <InlineNotification
                    lowContrast
                    kind="error"
                    title="Preview failed"
                    subtitle={error}
                />
                <div className={styles.toolbar}>
                    <Button kind="secondary" size="sm" renderIcon={Renew} onClick={onRefresh}>
                        Retry
                    </Button>
                </div>
                <p className={styles.truncateNote}>
                    Preview needs the &quot;View Reports&quot; privilege and a valid table name.
                </p>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div>
            <div className={styles.toolbar}>
                <Search
                    size="sm"
                    className={styles.rowSearch}
                    placeholder="Search rows..."
                    labelText="Search rows"
                    value={rowSearch}
                    onChange={(e) => setRowSearch((e as React.ChangeEvent<HTMLInputElement>).target.value)}
                />
                <Tag size="sm" type="cool-gray">
                    {data.rowCount.toLocaleString()} rows in preview
                </Tag>
                <span className={styles.toolbarSpacer} />
                <Button kind="secondary" size="sm" renderIcon={Renew} onClick={onRefresh}>
                    Refresh
                </Button>
                <Button
                    kind="tertiary"
                    size="sm"
                    onClick={() => downloadCsv(`${table}-preview`, data.columns, data.rows)}
                    disabled={data.rows.length === 0}>
                    Export CSV
                </Button>
            </div>

            {showTruncatedNote && (
                <p className={styles.truncateNote}>
                    Preview shows the first {PREVIEW_ROW_CAP.toLocaleString()} rows — use the search or export to
                    work with more.
                </p>
            )}

            {data.rows.length === 0 ? (
                <Tile className={styles.emptyState}>
                    <h5>This table has no rows</h5>
                    <p>The table may be empty, or it is a view that currently returns no rows.</p>
                </Tile>
            ) : (
                <>
                    <DataTable rows={rows} headers={headers} size="sm" isSortable>
                        {({
                            rows: tableRows,
                            headers: tableHeaders,
                            getHeaderProps,
                            getRowProps,
                            getTableProps,
                        }) => (
                            <TableContainer className={styles.gridScroll}>
                                <Table {...getTableProps()} useZebraStyles>
                                    <TableHead>
                                        <TableRow>
                                            {tableHeaders.map((header) => (
                                                <TableHeader key={header.key} {...getHeaderProps({ header })}>
                                                    {header.header}
                                                </TableHeader>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {tableRows.map((row) => (
                                            <TableRow key={row.id} {...getRowProps({ row })}>
                                                {row.cells.map((cell) => (
                                                    <TableCell key={cell.id}>{cell.value}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </DataTable>
                    <Pagination
                        page={safePage}
                        pageSize={pageSize}
                        pageSizes={PAGE_SIZES}
                        totalItems={filtered.length}
                        onChange={({ page, pageSize: newSize }) => {
                            setPageSize(newSize);
                            setCurrentPage(page);
                        }}
                    />
                </>
            )}
        </div>
    );
}
