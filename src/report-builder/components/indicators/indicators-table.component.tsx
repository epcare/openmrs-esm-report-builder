import React from 'react';
import {
    DataTable,
    Table,
    TableHead,
    TableRow,
    TableHeader,
    TableBody,
    TableCell,
} from '@carbon/react';

import IndicatorStatusTag from './indicator-status-tag.component';

export type IndicatorRow = {
    id: string;
    code: string; // ✅ NEW
    name: string;
    theme: string;
    unit: 'Patients' | 'Encounters';
    status: 'Draft' | 'Published';
};

type Props = {
    rows: IndicatorRow[];
    onOpen: (id: string) => void;
};

const headers = [
    { key: 'code', header: 'Code' }, // ✅ NEW
    { key: 'name', header: 'Name' },
    { key: 'theme', header: 'Theme' },
    { key: 'unit', header: 'Counting Unit' },
    { key: 'status', header: 'Status' },
];

const IndicatorsTable: React.FC<Props> = ({ rows, onOpen }) => {
    return (
        <DataTable rows={rows} headers={headers} size="lg" useZebraStyles>
            {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
                <Table {...getTableProps()}>
                    <TableHead>
                        <TableRow>
                            {headers.map((header) => (
                                <TableHeader key={header.key} {...getHeaderProps({ header })}>
                                    {header.header}
                                </TableHeader>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row) => (
                            <TableRow
                                key={row.id}
                                {...getRowProps({ row })}
                                onClick={() => onOpen(row.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                {row.cells.map((cell) => {
                                    if (cell.info.header === 'status') {
                                        return (
                                            <TableCell key={cell.id}>
                                                <IndicatorStatusTag status={cell.value as any} />
                                            </TableCell>
                                        );
                                    }
                                    return <TableCell key={cell.id}>{cell.value as any}</TableCell>;
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </DataTable>
    );
};

export default IndicatorsTable;