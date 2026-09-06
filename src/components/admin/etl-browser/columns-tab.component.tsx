/**
 * Columns tab — column metadata (name / data type) for the selected table.
 */

import React from 'react';
import { DataTable, InlineLoading, InlineNotification, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag, Tile } from '@carbon/react';
import type { TableColumn } from '../../../resources/theme/etl-table-meta.api';
import styles from './etl-browser.component.scss';

interface ColumnsTabProps {
    columns: TableColumn[];
    loading: boolean;
    error: string | null;
}

const headers = [
    { key: 'name', header: 'Column' },
    { key: 'type', header: 'Data type' },
];

export default function ColumnsTab({ columns, loading, error }: ColumnsTabProps) {
    if (loading) {
        return <InlineLoading description="Loading columns..." />;
    }

    if (error) {
        return <InlineNotification lowContrast kind="error" title="Error" subtitle={error} />;
    }

    if (columns.length === 0) {
        return (
            <Tile className={styles.emptyState}>
                <h5>No columns returned</h5>
                <p>The backend returned no column metadata for this table.</p>
            </Tile>
        );
    }

    const rows = columns.map((column) => ({
        id: column.name,
        name: column.name,
        type: column.type ?? '—',
    }));

    return (
        <div>
            <div className={styles.toolbar}>
                <Tag size="sm" type="cool-gray">
                    {columns.length} columns
                </Tag>
            </div>
            <DataTable rows={rows} headers={headers} size="sm">
                {({ rows: tableRows, headers: tableHeaders, getHeaderProps, getRowProps, getTableProps }) => (
                    <TableContainer className={styles.gridScroll}>
                        <Table {...getTableProps()}>
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
        </div>
    );
}
