import React from 'react';
import {
    Button,
    DataTable,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
    TableToolbar,
    TableToolbarContent,
    TableToolbarSearch,
} from '@carbon/react';
import { Add } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';

import styles from './reports-dashboard.scss';

export type ReportSummary = {
    id: string;
    name: string;
    status: 'Draft' | 'Published';
    updatedAt: string;
};

type Props = {
    reports: ReportSummary[];
    headers: { key: string; header: string }[];
    onRowClick: (reportId: string) => void;

    /** Toolbar */
    searchValue: string;
    onSearchChange: (value: string) => void;
    onCreateReport: () => void;
};

const ReportsTable: React.FC<Props> = ({
                                           reports,
                                           headers,
                                           onRowClick,
                                           searchValue,
                                           onSearchChange,
                                           onCreateReport,
                                       }) => {
    const { t } = useTranslation();

    const rows = reports.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        updatedAt: r.updatedAt,
    }));

    return (
        <DataTable rows={rows} headers={headers} useZebraStyles>
            {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
                <TableContainer className={styles.tableContainer} data-testid="reports-table">
                    {/* ✅ Toolbar (search left, create right) */}
                    <div className={styles.toolbarWrapper}>
                        <TableToolbar className={styles.tableToolbar}>
                            <TableToolbarContent className={styles.toolbarContent}>
                                <TableToolbarSearch
                                    expanded
                                    className={styles.searchbox}
                                    value={searchValue}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                                    placeholder={t('searchThisList', 'Search this list')}
                                />

                                <Button
                                    kind="primary"
                                    renderIcon={() => <Add size={16} />}
                                    size="sm"
                                    onClick={onCreateReport}
                                >
                                    {t('createReport', 'Create report')}
                                </Button>
                            </TableToolbarContent>
                        </TableToolbar>
                    </div>

                    <Table {...getTableProps()} className={styles.table}>
                        <TableHead>
                            <TableRow>
                                {headers.map((header) => (
                                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                                        {header.header}
                                    </TableHeader>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {rows.map((row) => (
                                <TableRow
                                    {...getRowProps({ row })}
                                    key={row.id}
                                    className={styles.rowClickable}
                                    onClick={() => onRowClick(row.id)}
                                >
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
    );
};

export default ReportsTable;