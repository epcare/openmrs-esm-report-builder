/**
 * Report Table Component
 *
 * DataTable for displaying report results with sticky header.
 * Supports pagination, sorting, column visibility controls, and status color coding.
 *
 * Phase 7: Complete column visibility menu integration
 */
import React, { useState, useMemo } from 'react';
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  Button,
  Tile,
  Tag,
} from '@carbon/react';
import { Renew as Refresh } from '@carbon/react/icons';
import { getStatusTagColor, isStatusColumn } from '../../utils/status-colors';
import ColumnVisibilityMenu from './ColumnVisibilityMenu';

interface ReportTableProps {
  data: Record<string, any>[];
  columns: string[];
  loading?: boolean;
  onRefresh?: () => void;
  title?: string;
  description?: string;
}

const ReportTable: React.FC<ReportTableProps> = ({
  data,
  columns,
  loading,
  onRefresh,
  title,
  description,
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Column visibility state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // Calculate pagination and add unique IDs
  const { paginatedData, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = data.slice(startIndex, endIndex);
    const total = Math.ceil(data.length / pageSize);
    // Add unique IDs required by Carbon DataTable
    const rowsWithIds = pageData.map((row, index) => ({
      ...row,
      id: `row-${startIndex + index}`,
    }));
    return { paginatedData: rowsWithIds, totalPages: total };
  }, [data, currentPage, pageSize]);

  // Filter visible columns
  const visibleColumns = useMemo(() => {
    return columns.filter(col => !hiddenColumns.has(col));
  }, [columns, hiddenColumns]);

  const toggleColumnVisibility = (columnName: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnName)) {
        newSet.delete(columnName);
      } else {
        newSet.add(columnName);
      }
      return newSet;
    });
  };

  const handleShowAllColumns = () => {
    setHiddenColumns(new Set());
  };

  const handleHideAllColumns = () => {
    setHiddenColumns(new Set(columns));
  };

  const renderCellValue = (columnName: string, value: any) => {
    if (value == null) return '—';

    // Check if this is a status column
    if (isStatusColumn(columnName)) {
      const colorProps = getStatusTagColor(value);
      return <Tag {...colorProps}>{String(value)}</Tag>;
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    // Handle serialized Java date objects (from backend serialization)
    // Format: {year: 2004, month: 1, day: 1, hour: 0, minute: 0, second: 0}
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const { year, month, day, date } = value as any;
      // Check if this looks like a serialized date
      if (typeof year === 'number' && typeof month === 'number') {
        const d = (day || date) || 1;
        const dateObj = new Date(year, month - 1, d);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString();
        }
      }
    }

    // Handle date arrays (like [2004,1,1,0,0] from legacy serialization)
    if (Array.isArray(value) && value.length >= 3) {
      const [year, month, day] = value;
      // Check if it looks like a date array (numeric values)
      if (typeof year === 'number' && typeof month === 'number' && typeof day === 'number') {
        // Java months are 1-based (1=Jan), JavaScript months are 0-based (0=Jan)
        // So we subtract 1 from the month
        const date = new Date(year, month - 1, day);
        // Sanity check: dates like year=-153 or negative values should be shown as-is
        if (year > 1000 && !isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      }
    }

    // Return string value for everything else
    return String(value);
  };

  if (loading) {
    return (
      <Tile style={{ width: '100%', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading data...
      </Tile>
    );
  }

  if (data.length === 0) {
    return (
      <Tile style={{ width: '100%', minHeight: '200px' }}>
        <h4>No results</h4>
        <p>No data found for the current parameters.</p>
        {onRefresh && (
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Refresh}
            onClick={onRefresh}
            style={{ marginTop: '1rem' }}
          >
            Refresh
          </Button>
        )}
      </Tile>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Table with toolbar and pagination */}
      <DataTable
        rows={paginatedData}
        headers={visibleColumns.map((col) => ({ key: col, header: col }))}
        render={({
          rows,
          headers,
          getHeaderProps,
          getRowProps,
          getTableProps,
        }) => (
          <TableContainer title={title} description={description}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <strong>{data.length} total results</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {columns.length > 1 && (
                  <ColumnVisibilityMenu
                    columns={columns}
                    hiddenColumns={hiddenColumns}
                    onToggleColumn={toggleColumnVisibility}
                    onShowAll={handleShowAllColumns}
                    onHideAll={handleHideAllColumns}
                    disabled={loading}
                  />
                )}
                {onRefresh && (
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Refresh}
                    iconDescription="Refresh data"
                    onClick={onRefresh}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                )}
              </div>
            </div>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow {...getRowProps({ row })}>
                    {row.cells.map((cell) => {
                      const columnName = cell.info.header;
                      return (
                        <TableCell key={cell.id}>
                          {renderCellValue(columnName, cell.value)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <Pagination
                page={currentPage}
                pageSize={pageSize}
                pageSizes={[10, 25, 50, 100]}
                totalItems={data.length}
                onChange={({ page, pageSize: newSize }) => {
                  setCurrentPage(page);
                  if (newSize) setPageSize(newSize);
                }}
              />
            )}
          </TableContainer>
        )}
      />
    </div>
  );
};

export default ReportTable;
