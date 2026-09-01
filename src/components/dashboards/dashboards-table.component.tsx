/**
 * Dashboards Admin Table
 */

import React from 'react';
import {
    Button,
    DataTable,
    DataTableSkeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
    Tag,
} from '@carbon/react';
import { Edit, TrashCan } from '@carbon/icons-react';
import type { DashboardDto } from '../../types/dashboard/dashboard.types';
import styles from './dashboards-admin.scss';

const headers = [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code' },
    { key: 'dashboardType', header: 'Type' },
    { key: 'active', header: 'Status' },
    { key: 'sortOrder', header: 'Order' },
    { key: 'description', header: 'Description' },
    { key: 'actions', header: 'Actions' },
];

interface DashboardsTableProps {
    rows: DashboardDto[];
    loading?: boolean;
    onEdit: (uuid: string) => void;
    onDelete: (uuid: string) => void;
}

export default function DashboardsTable({ rows, loading, onEdit, onDelete }: DashboardsTableProps) {
    if (loading && rows.length === 0) {
        return <DataTableSkeleton rowCount={4} columnCount={7} showHeader={false} showToolbar={false} />;
    }

    const tableRows = rows.map((row) => ({
        id: row.uuid,
        name: row.name,
        code: row.code || '—',
        dashboardType: row.dashboardType || 'CUSTOM',
        active: row.active === false || row.retired ? 'Inactive' : 'Active',
        sortOrder: row.sortOrder ?? 0,
        description: row.description || '—',
    }));

    return (
        <DataTable rows={tableRows} headers={headers}>
            {({ rows: dtRows, headers: dtHeaders, getHeaderProps, getRowProps }) => (
                <TableContainer>
                    <Table useZebraStyles>
                        <TableHead>
                            <TableRow>
                                {dtHeaders.map((header) => (
                                    <TableHeader key={header.key} {...getHeaderProps({ header })}>
                                        {header.header}
                                    </TableHeader>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dtRows.map((row) => {
                                const original = rows.find((d) => d.uuid === row.id);
                                return (
                                    <TableRow key={row.id} {...getRowProps({ row })}>
                                        <TableCell>{row.cells[0].value}</TableCell>
                                        <TableCell>{row.cells[1].value}</TableCell>
                                        <TableCell>
                                            <Tag size="sm" type="purple">
                                                {row.cells[2].value}
                                            </Tag>
                                        </TableCell>
                                        <TableCell>
                                            {original?.active === false || original?.retired ? (
                                                <Tag size="sm" type="gray">
                                                    Inactive
                                                </Tag>
                                            ) : (
                                                <Tag size="sm" type="green">
                                                    Active
                                                </Tag>
                                            )}
                                        </TableCell>
                                        <TableCell>{row.cells[4].value}</TableCell>
                                        <TableCell>{row.cells[5].value}</TableCell>
                                        <TableCell>
                                            <div className={styles['dashboards-table__actions']}>
                                                <Button
                                                    kind="ghost"
                                                    size="sm"
                                                    renderIcon={Edit}
                                                    iconDescription="Edit"
                                                    hasIconOnly
                                                    onClick={() => original && onEdit(original.uuid)}
                                                />
                                                <Button
                                                    kind="ghost"
                                                    size="sm"
                                                    renderIcon={TrashCan}
                                                    iconDescription="Retire"
                                                    hasIconOnly
                                                    onClick={() => original && onDelete(original.uuid)}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </DataTable>
    );
}
