import React from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  OverflowMenu,
  OverflowMenuItem,
} from '@carbon/react';

import type { DataThemeRow } from '../../types/theme/data-theme.types';

type Props = {
  rows: DataThemeRow[];
  onEdit: (uuid: string) => void;
  onDelete: (uuid: string) => Promise<void> | void;
};

const headers = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code' },
  { key: 'domain', header: 'Domain' },
  { key: 'description', header: 'Description' },
  { key: 'actions', header: '' },
];

export default function DataThemesTable({ rows, onEdit, onDelete }: Props) {
  const tableRows = React.useMemo(
    () =>
      (rows ?? []).map((r) => ({
        id: r.uuid,
        name: r.name,
        code: r.code,
        domain: r.domain,
        description: r.description ?? '',
        actions: r.uuid,
      })),
    [rows],
  );

  return (
    <DataTable rows={tableRows} headers={headers}>
      {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getTableContainerProps }) => (
        <TableContainer title="Data Themes" description="Manage derived data themes used by the indicator builder." {...getTableContainerProps()}>
          <TableToolbar>
            <TableToolbarContent />
          </TableToolbar>

          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((h) => (
                  <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                    {h.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} {...getRowProps({ row })}>
                  {row.cells.map((cell) => {
                    if (cell.info.header === 'actions') {
                      return (
                        <TableCell key={cell.id}>
                          <OverflowMenu size="sm" ariaLabel="Theme actions">
                            <OverflowMenuItem itemText="Edit" onClick={() => onEdit(row.id)} />
                            <OverflowMenuItem hasDivider isDelete itemText="Delete" onClick={() => onDelete(row.id)} />
                          </OverflowMenu>
                        </TableCell>
                      );
                    }

                    return <TableCell key={cell.id}>{cell.value}</TableCell>;
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  );
}
