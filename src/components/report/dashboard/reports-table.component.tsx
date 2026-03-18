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

export type ReportSummary = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
};

type HeaderDef = {
  key: string;
  header: string;
};

type Props = {
  reports: ReportSummary[];
  headers: HeaderDef[];
  onRowClick: (reportId: string) => void;
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

  const rows = React.useMemo(
      () =>
          reports.map((r) => ({
            id: r.id,
            name: r.name,
            status: r.status,
            updatedAt: r.updatedAt,
          })),
      [reports],
  );

  return (
      <DataTable rows={rows} headers={headers} useZebraStyles>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
            <TableContainer
                data-testid="reports-table"
                style={{
                  background: 'var(--cds-layer, #ffffff)',
                  borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)',
                }}
            >
              <TableToolbar>
                <TableToolbarContent
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                >
                  <TableToolbarSearch
                      expanded
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

              <Table {...getTableProps()}>
                <TableHead
                    style={{
                      display: 'table-header-group',
                      visibility: 'visible',
                    }}
                >
                  <TableRow>
                    {headers.map((header) => (
                        <TableHeader
                            {...getHeaderProps({ header })}
                            key={header.key}
                            style={{
                              fontWeight: 600,
                              backgroundColor: 'var(--cds-layer-accent, #f4f4f4)',
                              color: 'var(--cds-text-primary, #161616)',
                              borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)',
                              display: 'table-cell',
                              visibility: 'visible',
                            }}
                        >
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
                          onClick={() => onRowClick(row.id)}
                          style={{ cursor: 'pointer' }}
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