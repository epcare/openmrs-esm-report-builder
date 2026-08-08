import React from 'react';
import {
  Button,
  Checkbox,
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
  // Selection props
  selectedReports?: Set<string>;
  onSelectReport?: (reportId: string) => void;
  onSelectAll?: () => void;
  showSelection?: boolean;
};

const ReportsTable: React.FC<Props> = ({
  reports,
  headers,
  onRowClick,
  searchValue,
  onSearchChange,
  onCreateReport,
  selectedReports = new Set(),
  onSelectReport,
  onSelectAll,
  showSelection = false,
}) => {
  const { t } = useTranslation();

  // Debug logging
  console.log('ReportsTable props:', { showSelection, reportsCount: reports.length });

  // Build headers with selection column when needed
  const tableHeaders = React.useMemo(() => {
    if (showSelection) {
      return [{ key: 'select', header: 'Select' }, ...headers];
    }
    return headers;
  }, [headers, showSelection]);

  console.log('tableHeaders:', tableHeaders);

  const rows = React.useMemo(
    () =>
      reports.map((r) => {
        const row: any = {
          id: r.id,
        };
        // Add all fields in the order they appear in tableHeaders
        tableHeaders.forEach((h) => {
          if (h.key === 'select') {
            row.select = r.id;
          } else {
            row[h.key] = (r as any)[h.key];
          }
        });
        return row;
      }),
    [reports, tableHeaders],
  );

  return (
      <DataTable rows={rows} headers={tableHeaders} useZebraStyles>
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
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                        <TableHeader
                            {...getHeaderProps({ header })}
                            key={header.key}
                        >
                          {header.key === 'select' ? (
                            <Checkbox
                              id="select-all-reports"
                              checked={selectedReports.size === reports.length && reports.length > 0}
                              indeterminate={selectedReports.size > 0 && selectedReports.size < reports.length}
                              onChange={onSelectAll}
                              labelText=""
                            />
                          ) : (
                            header.header
                          )}
                        </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      {...getRowProps({ row })}
                      key={row.id}
                      onClick={() => !showSelection && onRowClick(row.id)}
                    >
                      {row.cells.map((cell, cellIndex) => {
                        const isFirstCell = showSelection && cellIndex === 0;
                        return (
                          <TableCell key={cell.id}>
                            {isFirstCell ? (
                              <Checkbox
                                id={`select-report-${row.id}`}
                                checked={selectedReports.has(row.id)}
                                onChange={() => onSelectReport?.(row.id)}
                                labelText=""
                              />
                            ) : (
                              cell.value
                            )}
                          </TableCell>
                        );
                      })}
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